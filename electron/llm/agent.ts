/**
 * Agent orchestrator for Jeni AI.
 * Implements the agent loop: LLM → tool detection → execution → feedback → repeat.
 */

import { LLMClient } from './client';
import { LLMMessage, LLMResponse, LLMChoice } from '../types/llm';
import { AgentLoopOptions, ToolCall, ToolResult, ToolContext } from '../types/tools';
import { initializeToolRegistry, getToolDefinitions, executeTool, validateToolCall } from './tools/index';
import { JENI_SYSTEM_PROMPT } from './prompts';
import { ProgressEventCallback } from '../types/agentProgress';
import { AgentProgressTracker } from './progressTracker';
import { createPlan, shouldPlanRequest, formatPlanForMessage } from './planner';
import { Plan } from '../types/plan';
import { verifyToolExecution } from './verifier';
import { RecoveryTracker } from './recoveryTracker';
import { AgentRunObserver } from '../types/telemetry';

export function buildAgentRequest(
  model: string,
  workspaceRoot: string,
  ideContext: any,
  conversationHistory: LLMMessage[],
  tools: unknown[]
) {
  const ideContextPrompt = ideContext
    ? `Current IDE context (authoritative; do not guess):\n${JSON.stringify(ideContext, null, 2)}`
    : 'Current IDE context: unavailable (no renderer context has been received).';

  return {
    model,
    messages: [
      {
        role: 'system' as const,
        content: JENI_SYSTEM_PROMPT
      },
      {
        role: 'system' as const,
        content: `Current workspace root: ${workspaceRoot}\nFilesystem paths are relative to the current workspace by default. When the user says "my directory", "my project", "workspace", "here", or similar, interpret that as the current workspace root. Do not ask the user for the workspace path when the workspace is already known. Only ask for a path when the user's request explicitly specifies a different location that cannot be resolved from the available context.`
      },
      {
        role: 'system' as const,
        content: ideContextPrompt
      },
      ...conversationHistory
    ],
    tools,
    temperature: 0.7,
    // Tool arguments contain full file contents and need more room than chat text.
    max_tokens: 8000
  };
}

/**
 * Agent orchestrator.
 * Manages conversation with LLM and executes tools as needed.
 */
export class AgentOrchestrator {
  private llmClient: LLMClient;
  private conversationHistory: LLMMessage[] = [];
  private loopOptions: AgentLoopOptions;
  private workspaceRoot: string;
  private progressCallback?: ProgressEventCallback;
  private ideContext?: any; // Current IDE context from renderer
  private recoveryTracker: RecoveryTracker = new RecoveryTracker();
  private observer?: AgentRunObserver;
  private llmResponseProvider?: (request: unknown) => Promise<LLMResponse>;
  private toolCallParseError?: string;

  constructor(llmClient: LLMClient, workspaceRoot: string, options?: Partial<AgentLoopOptions>) {
    this.llmClient = llmClient;
    this.workspaceRoot = workspaceRoot;
    this.ideContext = undefined;
    this.loopOptions = {
      maxIterations: options?.maxIterations ?? 15,
      maxTotalTimeMs: options?.maxTotalTimeMs ?? 5 * 60 * 1000, // 5 minutes
      toolTimeoutMs: options?.toolTimeoutMs ?? 30000, // 30 seconds
      observer: options?.observer,
      llmResponseProvider: options?.llmResponseProvider
    };
    this.observer = this.loopOptions.observer;
    this.llmResponseProvider = this.loopOptions.llmResponseProvider;

    // Initialize tool registry on first instantiation
    try {
      initializeToolRegistry();
    } catch (err) {
      // Registry might already be initialized
    }
  }

  /**
   * Set a progress event callback.
   */
  setProgressCallback(callback: ProgressEventCallback | undefined): void {
    this.progressCallback = callback;
  }

  /**
   * Update the current workspace root used by tools.
   */
  setWorkspaceRoot(workspaceRoot: string): void {
    if (this.workspaceRoot === workspaceRoot) return;
    this.workspaceRoot = workspaceRoot;
    // A conversation from another project can contain stale files and large
    // tool payloads, so it must not be sent with the new workspace context.
    this.conversationHistory = [];
    this.recoveryTracker.reset();
    this.ideContext = undefined;
  }

  /**
   * Set the current IDE context (from renderer).
   * This is called before sendMessage to provide live IDE state to tools.
   * Preserve the most recent terminal result so a fresh renderer snapshot does not
   * wipe out the agent's live command context between messages.
   */
  setIDEContext(ideContext: any): void {
    if (!ideContext) {
      this.ideContext = ideContext;
      return;
    }

    const previousTerminal = this.ideContext?.terminal ?? {};
    const incomingTerminal = ideContext.terminal ?? {};
    const preservedLastCommandResult = incomingTerminal.lastCommandResult ?? previousTerminal.lastCommandResult ?? null;

    this.ideContext = {
      ...ideContext,
      terminal: {
        ...incomingTerminal,
        lastCommandExitCode: incomingTerminal.lastCommandExitCode ?? (preservedLastCommandResult ? preservedLastCommandResult.exitCode : null) ?? previousTerminal.lastCommandExitCode ?? null,
        lastCommandResult: preservedLastCommandResult
      }
    };
  }

  /**
   * Send a user message and run the agent loop.
   * Returns final response after tool execution(s) if needed.
   */
  async sendMessage(userMessage: string): Promise<string> {
    const loopStartTime = Date.now();
    const messageId = `msg-${Date.now()}`;
    let iterationCount = 0;
    let completed = false;

    const completeRun = (response: string): string => {
      if (!completed) {
        completed = true;
        this.notify('onComplete', {
          totalIterations: iterationCount,
          totalDurationMs: Date.now() - loopStartTime,
          finalResponse: response
        });
      }
      return response;
    };

    this.compactConversationHistory();
    
    // Initialize progress tracker
    const progressTracker = new AgentProgressTracker(messageId);
    if (this.progressCallback) {
      progressTracker.subscribe(this.progressCallback);
    }

    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage
    });

    // Reset recovery state for new message
    this.recoveryTracker.reset();

    // Milestone 2.7: Adaptive Planning Phase
    if (shouldPlanRequest(userMessage)) {
      try {
        console.log('[Jeni Agent] Complex request detected. Running adaptive planning phase...');
        const plan = await createPlan(this.llmClient, {
          request: userMessage,
          workspaceRoot: this.workspaceRoot,
          ideContext: this.ideContext
        });
        const planSystemPrompt = formatPlanForMessage(plan);
        this.conversationHistory.push({
          role: 'system',
          content: planSystemPrompt
        });
      } catch (planErr: any) {
        console.warn('[Jeni Agent] Upfront planning phase failed or was ungrounded:', planErr?.message ?? planErr);
      }
    }

    // Agent loop: keep iterating until LLM doesn't request tools or we hit limits
    while (iterationCount < this.loopOptions.maxIterations) {
      // Check time budget
      const elapsedMs = Date.now() - loopStartTime;
      if (elapsedMs > this.loopOptions.maxTotalTimeMs) {
        progressTracker.finish();
        return completeRun(`⏱️ Request timeout (exceeded ${this.loopOptions.maxTotalTimeMs}ms budget). Partial response: ${this.getConversationSummary()}`);
      }

      iterationCount++;
      this.notify('onIterationStart', { iteration: iterationCount });

      // Get LLM response with tool definitions
      let llmResponse: LLMResponse;
      try {
        llmResponse = await this.callLLMWithTools();
      } catch (err: any) {
        progressTracker.finish();
        const errorMsg = err instanceof Error ? err.message : String(err);
        return completeRun(`❌ LLM request failed: ${errorMsg}`);
      }

      // Extract response text
      if (!llmResponse.choices || llmResponse.choices.length === 0) {
        progressTracker.finish();
        return completeRun('❌ No response from LLM');
      }

      const choice = llmResponse.choices[0];
      let assistantMessage = choice.message.content ?? '';
      assistantMessage = assistantMessage.replace(/<pad>\s*/g, '').trim();

      // Parse structured tool calls first, fallback to inline text parsing.
      const toolCalls = this.parseToolCalls(choice);

      if (toolCalls.length === 0) {
        if (this.toolCallParseError) {
          const parseError = this.toolCallParseError;
          this.toolCallParseError = undefined;
          this.conversationHistory.push({
            role: 'system',
            content: `The previous tool call was truncated or had invalid JSON (${parseError}). Resend the complete tool call with valid JSON arguments. Do not omit or abbreviate file content.`
          });
          console.warn('[Jeni Agent] Invalid tool arguments; requesting a complete tool call on the next turn.');
          continue;
        }

        if (!assistantMessage || assistantMessage.trim().length === 0) {
          if (this.recoveryTracker.getInRecovery() && !this.recoveryTracker.isLimitReached()) {
            console.warn('[Jeni Agent] LLM returned an empty response during recovery; requesting another recovery turn.');
            continue;
          }

          progressTracker.finish();
          const recoveryFailure = this.recoveryTracker.getInRecovery()
            ? ` Last failure: ${this.recoveryTracker.getLastFailureReason()}`
            : '';
          return completeRun(`❌ LLM returned no content and no executable tool call.${recoveryFailure}`);
        }

        // Final-response enforcement layer (Milestone 2.5)
        const recentToolMessages = this.conversationHistory.filter((m) => m.role === 'tool');
        const lastToolContent = recentToolMessages.length > 0 ? recentToolMessages[recentToolMessages.length - 1].content : '';
        const hasVerifiedFailure = lastToolContent.includes('"verificationStatus": "verified_failure"');

        let finalResponse = assistantMessage;
        if (hasVerifiedFailure) {
          const claimsSuccess = /\b(successfully|succeeded|worked|done|completed successfully|built successfully|installed successfully)\b/i.test(assistantMessage)
            && !/\b(failed|error|unsuccessful|failure|exit code)\b/i.test(assistantMessage);

          if (claimsSuccess) {
            console.warn('[Jeni Agent] Intercepted false success claim following verified_failure');
            finalResponse = `${assistantMessage}\n\n⚠️ **Verification Enforcement Notice**: Verification detected that a tool execution resulted in \`verified_failure\`. Please check the failure details and output above.`;
          }
        }

        // Add assistant's response to history
        this.conversationHistory.push({
          role: 'assistant',
          content: finalResponse
        });

        console.log(`[Jeni Agent] Agent loop complete after ${iterationCount} iteration(s)`);
        progressTracker.finish();
        return completeRun(finalResponse);
      }

      // Preserve the assistant tool-call message from the LLM response.
      const assistantToolCallMessage = this.buildAssistantToolCallMessage(choice, toolCalls);
      if (assistantToolCallMessage) {
        this.conversationHistory.push(assistantToolCallMessage);
      } else if (assistantMessage && assistantMessage.trim().length > 0) {
        this.conversationHistory.push({
          role: 'assistant',
          content: assistantMessage
        });
      }

      // Execute all requested tools
      const toolResults: Array<{ name: string; result: ToolResult; callId: string }> = [];

      for (const toolCall of toolCalls) {
        // Validate tool call
        const validation = validateToolCall(toolCall);
        if (!validation.valid) {
          console.warn(`[Jeni Agent] Invalid tool call: ${toolCall.name}`, validation.error);
          toolResults.push({
            name: toolCall.name,
            callId: toolCall.id,
            result: {
              success: false,
              output: `Error: ${validation.error}`,
              error: validation.error
            }
          });
          continue;
        }

        // Recovery Enforcement (Milestone 2.6): Check for repeated identical action during recovery
        const repeatedAction = this.recoveryTracker.isRepeatedAction(toolCall);
        if (repeatedAction) {
          console.warn(`[Jeni Agent] Intercepted repeated action during recovery: ${toolCall.name}`);
          const blockedResult: ToolResult = {
            success: false,
            output: `Error: Repeated action blocked. The exact tool '${toolCall.name}' with identical arguments was already executed during this recovery sequence without resolving the failure. Try an investigative step or a different corrective fix.`,
            error: 'Repeated action blocked',
            verification: {
              status: 'verified_failure',
              reason: `Repeated action '${toolCall.name}' blocked to prevent infinite execution loop.`,
              evidence: { errorMessages: ['Identical tool name and arguments repeated during recovery sequence.'] }
            }
          };
          const blockedVerification = blockedResult.verification!;
          const recoveryState = this.recoveryTracker.recordToolExecution(toolCall, blockedResult);
          this.notify('onRecovery', {
            iteration: iterationCount,
            toolCall,
            category: recoveryState.category,
            attemptNumber: this.recoveryTracker.getRecoveryAttemptCount(),
            maxAttempts: this.recoveryTracker.getMaxRecoveryAttempts(),
            inRecovery: this.recoveryTracker.getInRecovery(),
            repeatedAction: true,
            limitReached: this.recoveryTracker.isLimitReached(),
            verification: blockedVerification
          });
          toolResults.push({ name: toolCall.name, callId: toolCall.id, result: blockedResult });
          continue;
        }

        // Recovery Enforcement (Milestone 2.6): Check hard recovery limit (maxRecoveryAttempts = 3)
        const toolCategory = this.recoveryTracker.classifyToolCall(toolCall.name);
        if (this.recoveryTracker.getInRecovery() && this.recoveryTracker.isLimitReached() && toolCategory === 'RECOVERY_ACTION') {
          console.warn(`[Jeni Agent] Hard recovery limit reached (${this.recoveryTracker.getMaxRecoveryAttempts()} attempts). Blocking recovery action.`);
          const blockedResult: ToolResult = {
            success: false,
            output: `Error: Hard recovery limit of ${this.recoveryTracker.getMaxRecoveryAttempts()} attempts reached. Automatic recovery is stopped. Please report the failure details to the user for human escalation.`,
            error: 'Recovery limit reached',
            verification: {
              status: 'verified_failure',
              reason: `Hard recovery limit of ${this.recoveryTracker.getMaxRecoveryAttempts()} attempts reached. Human escalation required.`,
              evidence: { errorMessages: ['Maximum recovery attempts exhausted without resolving failure.'] }
            }
          };
          const blockedVerification = blockedResult.verification!;
          const recoveryState = this.recoveryTracker.recordToolExecution(toolCall, blockedResult);
          this.notify('onRecovery', {
            iteration: iterationCount,
            toolCall,
            category: recoveryState.category,
            attemptNumber: this.recoveryTracker.getRecoveryAttemptCount(),
            maxAttempts: this.recoveryTracker.getMaxRecoveryAttempts(),
            inRecovery: this.recoveryTracker.getInRecovery(),
            repeatedAction: false,
            limitReached: this.recoveryTracker.isLimitReached(),
            verification: blockedVerification
          });
          toolResults.push({ name: toolCall.name, callId: toolCall.id, result: blockedResult });
          continue;
        }

        // Track tool start
        progressTracker.startTool(toolCall.name, toolCall.arguments);

        // Execute tool
        const context: ToolContext = {
          workspaceRoot: this.workspaceRoot,
          ideContext: this.ideContext
        };

        const toolStartTime = Date.now();
        const toolResult = await executeTool(toolCall, context);
        const toolDuration = Date.now() - toolStartTime;

        // Perform Verification (Milestone 2.5)
        const verification = verifyToolExecution(toolCall, toolResult, context);
        toolResult.verification = verification;

        // Record in RecoveryTracker (Milestone 2.6)
        const recoveryState = this.recoveryTracker.recordToolExecution(toolCall, toolResult);
        this.notify('onToolComplete', {
          iteration: iterationCount,
          toolCall,
          result: toolResult,
          durationMs: toolDuration,
          verification
        });
        this.notify('onRecovery', {
          iteration: iterationCount,
          toolCall,
          category: recoveryState.category,
          attemptNumber: this.recoveryTracker.getRecoveryAttemptCount(),
          maxAttempts: this.recoveryTracker.getMaxRecoveryAttempts(),
          inRecovery: this.recoveryTracker.getInRecovery(),
          repeatedAction,
          limitReached: this.recoveryTracker.isLimitReached(),
          verification
        });
        
        toolResults.push({
          name: toolCall.name,
          callId: toolCall.id,
          result: toolResult
        });

        // Track tool completion
        if (toolResult.success) {
          progressTracker.completeTool(toolCall.name, toolResult.output, toolDuration);
        } else {
          progressTracker.failTool(toolCall.name, toolResult.error ?? 'Unknown error', toolDuration);
        }

        console.log(`[Jeni Agent] Tool executed: ${toolCall.name}`, toolResult.success ? '✓' : '✗', `[Verification: ${verification.status}]`);
      }

      // Add tool results to conversation history as tool messages.
      for (const tr of toolResults) {
        const toolMessageContent = this.serializeToolResult(tr.result);
        this.conversationHistory.push({
          role: 'tool',
          content: toolMessageContent,
          tool_call_id: tr.callId
        });

        console.log('[Jeni Agent] TOOL RESULT:', {
          tool_call_id: tr.callId,
          success: tr.result.success,
          verification: tr.result.verification,
          stdout: tr.result.data && typeof tr.result.data === 'object' ? (tr.result.data as any).stdout : undefined,
          stderr: tr.result.data && typeof tr.result.data === 'object' ? (tr.result.data as any).stderr : undefined,
          exitCode: tr.result.data && typeof tr.result.data === 'object' ? (tr.result.data as any).exitCode : undefined
        });
      }

      // Recovery Notice Injection (Milestone 2.6):
      // Inject recovery status instruction into conversation history before next LLM turn
      if (this.recoveryTracker.getInRecovery()) {
        const attemptCount = this.recoveryTracker.getRecoveryAttemptCount();
        const maxAttempts = this.recoveryTracker.getMaxRecoveryAttempts();
        if (this.recoveryTracker.isLimitReached()) {
          this.conversationHistory.push({
            role: 'system',
            content: `CRITICAL RECOVERY NOTICE: Hard recovery limit reached (${attemptCount}/${maxAttempts} attempts). You MUST NOT attempt any more corrective actions or rerun commands. Honestly report the exact failure details to the user and request human guidance.`
          });
        } else {
          this.conversationHistory.push({
            role: 'system',
            content: `RECOVERY MODE ACTIVE (Attempt ${attemptCount}/${maxAttempts}): Previous action failed (${this.recoveryTracker.getLastFailureReason()}). Investigate using read-only tools or apply a DIFFERENT targeted fix. Do NOT repeat exact identical commands or arguments.`
          });
        }
      }

      if (assistantToolCallMessage) {
        const toolCallInfo = assistantToolCallMessage.function_call
          ? {
              id: (assistantToolCallMessage.function_call as any).id ?? '(no id)',
              name: assistantToolCallMessage.function_call.name,
              arguments: assistantToolCallMessage.function_call.arguments
            }
          : assistantToolCallMessage.tool_calls?.map((call) => ({
              id: call.id ?? '(no id)',
              name: call.function?.name ?? call.name,
              arguments: call.function?.arguments ?? call.arguments
            }));

        console.log('[Jeni Agent] ASSISTANT TOOL CALL:', toolCallInfo);
      }

      console.log('[Jeni Agent] Conversation history before next LLM request:', {
        totalMessages: this.conversationHistory.length,
        lastMessages: this.conversationHistory.slice(-3).map((msg) => ({
          role: msg.role,
          contentPreview: msg.content?.substring(0, 120),
          tool_call_id: (msg as any).tool_call_id
        }))
      });

      // Continue to next iteration
    }

    // Max iterations reached
    progressTracker.finish();
    return completeRun(`⚠️ Reached maximum iterations (${this.loopOptions.maxIterations}). Final response: ${this.getConversationSummary()}`);
  }

  private notify<K extends keyof AgentRunObserver>(event: K, payload: Parameters<NonNullable<AgentRunObserver[K]>>[0]): void {
    const callback = this.observer?.[event] as ((value: unknown) => void) | undefined;
    if (!callback) return;
    try {
      callback(payload);
    } catch (error) {
      console.warn(`[Jeni Agent] Telemetry observer '${String(event)}' failed:`, error);
    }
  }

  async createPlan(userMessage: string): Promise<Plan> {
    return createPlan(this.llmClient, {
      request: userMessage,
      workspaceRoot: this.workspaceRoot,
      ideContext: this.ideContext
    });
  }

  /**
   * Call LLM with tool definitions available.
   * Sends conversation history + tool definitions to LLM.
   */
  private async callLLMWithTools(): Promise<LLMResponse> {
    const tools = getToolDefinitions();
    const request = buildAgentRequest(
      (this.llmClient as any).config.model,
      this.workspaceRoot,
      this.ideContext,
      this.conversationHistory,
      tools
    );

    if (this.llmResponseProvider) {
      return this.llmResponseProvider(request);
    }

    // Call LLM via fetch (same as LLMClient but with tools)
    const config = (this.llmClient as any).config;
    const endpoint = `${config.baseUrl}/chat/completions`;
    let response: Response | undefined;
    let lastError: unknown;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
          },
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(config.timeoutMs ?? 120000)
        });
        break;
      } catch (error) {
        lastError = error;
        if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    if (!response) {
      const reason = lastError instanceof Error ? lastError.message : String(lastError);
      throw new Error(`Network error contacting ${config.baseUrl} for model ${config.model}: ${reason}`);
    }

    const data = await response.json();

    if (!response.ok || (data as any).error) {
      const errorMsg = (data as any).error?.message || `HTTP ${response.status}`;
      console.error('[Jeni Agent] OpenRouter API Error:', {
        status: response.status,
        error: (data as any).error
      });
      throw new Error(errorMsg);
    }

    return data as LLMResponse;
  }

  /**
   * Parse tool calls from LLM response.
   * Extracts JSON-formatted tool call blocks like:
   * {"tool": "read_file", "path": "..."}
   */
  private parseToolCalls(choice: LLMChoice): ToolCall[] {
    const toolCalls: ToolCall[] = [];
    const msg = choice.message;
    this.toolCallParseError = undefined;

    const addToolCall = (name: string | undefined, args: unknown, id?: string) => {
      if (!name) return;

      let parsedArgs: Record<string, unknown> = {};
      if (typeof args === 'string') {
        try {
          parsedArgs = JSON.parse(args);
        } catch (err: any) {
          this.toolCallParseError = err instanceof Error ? err.message : String(err);
          console.warn('[Jeni Agent] Failed to parse tool arguments JSON:', err.message);
          return;
        }
      } else if (typeof args === 'object' && args !== null) {
        parsedArgs = args as Record<string, unknown>;
      }

      toolCalls.push({
        id: id || `tool_${Date.now()}_${Math.random()}`,
        name,
        arguments: parsedArgs
      });
    };

    if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
      for (const call of msg.tool_calls) {
        const functionPayload = (call as any).function;
        const toolName = functionPayload?.name || (call as any).name;
        const toolArgs = functionPayload?.arguments ?? (call as any).arguments;
        addToolCall(toolName, toolArgs, (call as any).id);
      }
    }

    if (msg.function_call) {
      addToolCall(msg.function_call.name, msg.function_call.arguments, undefined);
    }

    if (toolCalls.length > 0) {
      console.log('[Jeni Agent] Parsed structured tool calls:', toolCalls.map((tc) => ({ name: tc.name, id: tc.id, args: tc.arguments })));
      return toolCalls;
    }

    const assistantMessage = msg.content || '';
    const inlineToolCalls = this.parseToolCallsFromText(assistantMessage);
    if (inlineToolCalls.length > 0) {
      console.log('[Jeni Agent] Parsed inline tool calls from assistant message:', inlineToolCalls.map((tc) => ({ name: tc.name, id: tc.id })));
      return inlineToolCalls;
    }

    return [];
  }

  private parseToolCallsFromText(message: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    // Try to find JSON tool call patterns
    // Support both standalone JSON and code blocks
    const jsonPatterns = [
      /```json\n([\s\S]*?)\n```/g,
      /```\n([\s\S]*?)\n```/g,
      /(\{[\s\S]*?"tool"[\s\S]*?\})/g
    ];

    for (const pattern of jsonPatterns) {
      let match;
      while ((match = pattern.exec(message)) !== null) {
        try {
          const jsonStr = match[1];
          const obj = JSON.parse(jsonStr);

          if (obj.tool) {
            toolCalls.push({
              id: `tool_${Date.now()}_${Math.random()}`,
              name: obj.tool,
              arguments: obj
            });
          }
        } catch {
          // Not valid JSON, skip
        }
      }
    }

    return toolCalls;
  }

  /**
   * Get summary of conversation for partial responses.
   */
  private serializeToolResult(result: ToolResult): string {
    const serializedData = result.data && typeof result.data === 'object'
      ? { ...(result.data as Record<string, unknown>) }
      : result.data;
    if (serializedData && typeof serializedData === 'object' && typeof (serializedData as Record<string, unknown>).content === 'string') {
      const content = (serializedData as Record<string, unknown>).content as string;
      (serializedData as Record<string, unknown>).content = content.length > 12000
        ? `${content.slice(0, 12000)}\n... (tool content truncated for conversation context)`
        : content;
    }

    return JSON.stringify(
      {
        success: result.success,
        verificationStatus: result.verification?.status ?? 'unable_to_verify',
        verificationReason: result.verification?.reason ?? '',
        verificationEvidence: result.verification?.evidence ?? {},
        output: result.output,
        error: result.error ?? null,
        data: serializedData ?? null
      },
      null,
      2
    );
  }

  private compactConversationHistory(): void {
    const compacted = this.conversationHistory
      .filter((message) => message.role === 'user' || (message.role === 'assistant' && !message.tool_calls && !message.function_call))
      .slice(-6)
      .map((message) => ({
        ...message,
        content: message.content.length > 4000
          ? `${message.content.slice(0, 4000)}\n... (previous response truncated)`
          : message.content
      }));
    this.conversationHistory = compacted;
  }

  private buildAssistantToolCallMessage(choice: LLMChoice, parsedToolCalls: ToolCall[]): LLMMessage | null {
    const message = choice.message;
    if (Array.isArray(message.tool_calls) && message.tool_calls.length > 0 && parsedToolCalls.length > 0) {
      return {
        role: 'assistant',
        content: message.content ?? '',
        tool_calls: parsedToolCalls.map((toolCall) => ({
          type: 'function',
          id: toolCall.id,
          function: {
            name: toolCall.name,
            arguments: JSON.stringify(toolCall.arguments)
          }
        }))
      };
    }

    if (message.function_call && parsedToolCalls.length > 0) {
      const toolCall = parsedToolCalls[0];
      return {
        role: 'assistant',
        content: message.content ?? '',
        function_call: {
          name: toolCall.name,
          arguments: JSON.stringify(toolCall.arguments)
        }
      };
    }

    return null;
  }

  private getConversationSummary(): string {
    if (this.conversationHistory.length === 0) return '(no conversation)';
    const lastMsg = this.conversationHistory[this.conversationHistory.length - 1];
    return lastMsg.content.substring(0, 200);
  }

  /**
   * Clear conversation history.
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Get current conversation history.
   */
  getHistory(): LLMMessage[] {
    return [...this.conversationHistory];
  }
}

/**
 * LLM client for Jeni AI agent.
 * Communicates with OpenAI-compatible LLM APIs.
 * Handles request/response serialization and error handling.
 */

import { LLMMessage, LLMRequest, LLMResponse, LLMError } from '../types/llm';
import { LLMConfig } from '../config';

export class LLMClient {
  private config: LLMConfig;
  private conversationHistory: LLMMessage[] = [];

  constructor(config: LLMConfig) {
    this.config = config;
    // Initialize with empty history—caller manages state
  }

  /**
   * Send a message and get a response.
   * Maintains conversation history for context.
   */
  async sendMessage(userMessage: string): Promise<string> {
    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage
    });

    try {
      const request: LLMRequest = {
        model: this.config.model,
        messages: this.conversationHistory,
        temperature: 0.7,
        max_tokens: 2000
      };

      const response = await this.call(request);

      // Extract assistant response
      if (!response.choices || response.choices.length === 0) {
        throw new Error('No response from LLM');
      }

      const assistantMessage = response.choices[0].message.content ?? '';

      // Add assistant response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage
      });

      return assistantMessage;
    } catch (error) {
      // Do NOT include API key in error messages
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`LLM request failed: ${errorMessage}`);
    }
  }

  async sendCompletion(request: Omit<LLMRequest, 'model'> & { model?: string }): Promise<LLMResponse> {
    return this.call({
      ...request,
      model: request.model ?? this.config.model
    });
  }

  /**
   * Raw API call (internal).
   * Handles HTTP request/response and error detection.
   */
  private async call(request: LLMRequest): Promise<LLMResponse> {
    const endpoint = `${this.config.baseUrl}/chat/completions`;
    let response: Response | undefined;
    let lastError: unknown;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(this.config.timeoutMs)
        });
        break;
      } catch (error) {
        lastError = error;
        if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    if (!response) {
      const reason = lastError instanceof Error ? lastError.message : String(lastError);
      throw new Error(`Network error contacting ${this.config.baseUrl} for model ${this.config.model}: ${reason}`);
    }

    const data = await response.json();

    // Check for API error response
    if (!response.ok || (data as LLMError).error) {
      const errorMsg = (data as LLMError).error?.message || `HTTP ${response.status}`;
      console.error('[Jeni Agent] OpenRouter API Error:', {
        status: response.status,
        error: (data as LLMError).error,
        fullResponse: data
      });
      throw new Error(errorMsg);
    }

    return data as LLMResponse;
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

  /**
   * Set conversation history (for restoring state).
   */
  setHistory(messages: LLMMessage[]): void {
    this.conversationHistory = [...messages];
  }
}

/**
 * LLM Request/Response types for the agent backend.
 * Separate from aiAgent.ts (which is for UI types).
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  function_call?: {
    name: string;
    arguments: string;
    [key: string]: unknown;
  };
  tool_calls?: Array<{
    type: string;
    index?: number;
    id?: string;
    function?: {
      name: string;
      arguments: string;
      [key: string]: unknown;
    };
    name?: string;
    arguments?: string;
    [key: string]: unknown;
  }>;
  tool_call_id?: string;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

export interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  max_tokens?: number;
  tools?: ToolDefinition[];
}

export interface LLMChoice {
  message: {
    role: string;
    content: string | null;
    function_call?: {
      name: string;
      arguments: string;
      [key: string]: unknown;
    };
    tool_calls?: Array<{
      type: string;
      index?: number;
      id?: string;
      function?: {
        name: string;
        arguments: string;
        [key: string]: unknown;
      };
      name?: string;
      arguments?: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  finish_reason: string;
}

export interface LLMResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: LLMChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMError {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

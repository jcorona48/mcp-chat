import { generateObject, generateText, jsonSchema } from 'ai';
import { model } from '@/ai/providers';
import { getErrorMessageText } from '@/lib/chat/error-utils';

type JsonSchemaNode = {
  type?: string | string[];
  properties?: Record<string, JsonSchemaNode>;
  items?: JsonSchemaNode;
  anyOf?: JsonSchemaNode[];
  oneOf?: JsonSchemaNode[];
  allOf?: JsonSchemaNode[];
};

type TraceFn = (stage: string, extra?: Record<string, unknown>) => void;

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function unwrapScalarCandidate(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  const asObject = value as Record<string, unknown>;
  const preferredKeys = ['value', 'text', 'query', 'input', 'id'];

  for (const key of preferredKeys) {
    if (key in asObject) {
      return unwrapScalarCandidate(asObject[key]);
    }
  }

  const entries = Object.entries(asObject);
  if (entries.length === 1) {
    return unwrapScalarCandidate(entries[0][1]);
  }

  return value;
}

function getPrimarySchemaType(schema?: JsonSchemaNode): string | undefined {
  if (!schema?.type) {
    return undefined;
  }

  if (Array.isArray(schema.type)) {
    return schema.type.find((candidate) => candidate !== 'null') ?? schema.type[0];
  }

  return schema.type;
}

function coercePrimitiveByType(value: unknown, type?: string): unknown {
  if (!type) {
    return value;
  }

  const normalizedValue = unwrapScalarCandidate(value);

  if (type === 'number' || type === 'integer') {
    if (typeof normalizedValue === 'string' && normalizedValue.trim().length > 0) {
      const parsed = Number(normalizedValue);
      if (Number.isFinite(parsed)) {
        return type === 'integer' ? Math.trunc(parsed) : parsed;
      }
    }

    if (typeof normalizedValue === 'number' && Number.isFinite(normalizedValue)) {
      return type === 'integer' ? Math.trunc(normalizedValue) : normalizedValue;
    }

    return value;
  }

  if (type === 'boolean') {
    if (typeof normalizedValue === 'boolean') {
      return normalizedValue;
    }

    if (typeof normalizedValue !== 'string') {
      return value;
    }

    const lower = normalizedValue.toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
  }

  if (type === 'string') {
    if (typeof normalizedValue === 'string') {
      return normalizedValue;
    }

    if (typeof normalizedValue === 'number' || typeof normalizedValue === 'boolean') {
      return String(normalizedValue);
    }
  }

  return value;
}

function coerceArgsBySchema(value: unknown, schema?: JsonSchemaNode): unknown {
  if (!schema) {
    return value;
  }

  const composite = schema.oneOf ?? schema.anyOf ?? schema.allOf;
  if (composite && composite.length > 0) {
    return coerceArgsBySchema(value, composite[0]);
  }

  const type = getPrimarySchemaType(schema);

  if (type === 'object' && value && typeof value === 'object' && !Array.isArray(value)) {
    const asObject = value as Record<string, unknown>;
    const properties = schema.properties ?? {};
    const output: Record<string, unknown> = {};

    for (const key of Object.keys(asObject)) {
      output[key] = coerceArgsBySchema(asObject[key], properties[key]);
    }

    return output;
  }

  if (type === 'array' && Array.isArray(value)) {
    return value.map((item) => coerceArgsBySchema(item, schema.items));
  }

  return coercePrimitiveByType(value, type);
}

function normalizeToolCallArgs(args: unknown): unknown {
  if (typeof args === 'string') {
    const parsed = tryParseJson(args);
    return parsed ?? args;
  }

  return args;
}

function toToolCallArgsString(args: unknown): string {
  if (typeof args === 'string') {
    return args;
  }

  return JSON.stringify(args ?? {});
}

export async function repairToolCallInput(options: {
  toolCall: { toolName: string; args?: unknown; [key: string]: unknown };
  parameterSchema: (options: { toolName: string }) => unknown;
  error: unknown;
  trace?: TraceFn;
  system?: string;
  messages?: any[];
  tools?: Record<string, any>;
}): Promise<any> {
  const message = getErrorMessageText(options.error);
  if (!message) {
    return null;
  }

  const trace = options.trace;
  trace?.('tool_call_repair_invoked', {
    toolName: options.toolCall.toolName,
    error: message,
  });

  const currentArgs = normalizeToolCallArgs(options.toolCall.args);
  const schema = options.parameterSchema({ toolName: options.toolCall.toolName }) as JsonSchemaNode;
  const schemaCoercedArgs = coerceArgsBySchema(currentArgs, schema);

  if (JSON.stringify(schemaCoercedArgs) !== JSON.stringify(currentArgs)) {
    trace?.('tool_call_repaired_by_schema_coercion', {
      toolName: options.toolCall.toolName,
      error: message,
    });

    return {
      ...options.toolCall,
      args: toToolCallArgsString(schemaCoercedArgs),
    };
  }

  try {
    const { object: repairedArgs } = await generateObject({
      model: model.languageModel('qwen3-32b'),
      schema: jsonSchema(schema as never),
      prompt: [
        `The model tried to call the tool "${options.toolCall.toolName}" with invalid inputs.`,
        `Error: ${message}`,
        'Current inputs:',
        JSON.stringify(currentArgs),
        'The tool accepts this JSON schema:',
        JSON.stringify(schema),
        'Return only corrected JSON arguments for the tool.',
      ].join('\n'),
    });

    if (repairedArgs && typeof repairedArgs === 'object') {
      trace?.('tool_call_repaired_by_model', {
        toolName: options.toolCall.toolName,
      });

      return {
        ...options.toolCall,
        args: toToolCallArgsString(repairedArgs),
      };
    }
  } catch (error) {
    trace?.('tool_call_model_repair_failed', {
      toolName: options.toolCall.toolName,
      error: getErrorMessageText(error),
    });
  }

  // Re-ask strategy from AI SDK docs to trigger a second attempt with explicit tool error context.
  if (options.system && options.messages && options.tools) {
    try {
      const reask = await generateText({
        model: model.languageModel('qwen3-32b'),
        system: options.system,
        messages: [
          ...options.messages,
          {
            role: 'assistant',
            content: [
              {
                type: 'tool-call',
                toolCallId: (options.toolCall as any).toolCallId,
                toolName: options.toolCall.toolName,
                args: toToolCallArgsString(options.toolCall.args),
              },
            ],
          },
          {
            role: 'tool',
            content: [
              {
                type: 'tool-result',
                toolCallId: (options.toolCall as any).toolCallId,
                toolName: options.toolCall.toolName,
                result: message,
              },
            ],
          },
        ],
        tools: options.tools,
      });

      const repairedToolCall = reask.toolCalls.find(
        (candidate) => candidate.toolName === options.toolCall.toolName,
      );

      if (repairedToolCall) {
        trace?.('tool_call_repaired_by_reask', {
          toolName: options.toolCall.toolName,
        });

        return {
          toolCallType: 'function',
          toolCallId: (options.toolCall as any).toolCallId,
          toolName: options.toolCall.toolName,
          args: toToolCallArgsString(repairedToolCall.args),
        };
      }
    } catch (error) {
      trace?.('tool_call_reask_failed', {
        toolName: options.toolCall.toolName,
        error: getErrorMessageText(error),
      });
    }
  }

  trace?.('tool_call_repair_failed', {
    toolName: options.toolCall.toolName,
    error: message,
  });

  return null;
}

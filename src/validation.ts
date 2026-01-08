import { z } from 'zod';
import type { ImageGenerateInput, NormalizedInput, ProviderType } from './types.js';

// 基础输入 Schema
const chatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
});

const outputOptionsSchema = z.object({
  dir: z.string().optional(),
  filename: z.string().optional(),
  overwrite: z.enum(['error', 'overwrite', 'suffix']).optional(),
});

// 通用参数 Schema（简化版）
const paramsSchema = z.record(z.unknown()).optional();

// 输入 Schema
const imageGenerateInputSchema = z.object({
  provider: z.enum(['openai', 'gemini', 'openrouter']),
  model: z.string().optional(),
  prompt: z.string().optional(),
  messages: z.array(chatMessageSchema).optional(),
  params: paramsSchema,
  output: outputOptionsSchema.optional(),
  requestId: z.string().optional(),
}).refine(
  (data) => data.prompt || (data.messages && data.messages.length > 0),
  { message: '必须提供 prompt 或 messages' }
);

// 验证输入
export function validateInput(input: unknown): ImageGenerateInput {
  const result = imageGenerateInputSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`输入验证失败: ${result.error.message}`);
  }
  return result.data as ImageGenerateInput;
}

// 验证 Provider 参数（简化版，不再严格校验）
export function validateProviderParams(_provider: ProviderType, _params: unknown) {
  return _params || {};
}

// 标准化输入
export function normalizeInput(
  input: ImageGenerateInput,
  defaults: { outputDir: string; filenamePrefix: string; overwrite: 'error' | 'overwrite' | 'suffix'; model: string }
): NormalizedInput {
  const prompt = input.prompt || extractPromptFromMessages(input.messages || []);
  const messages = input.messages || [{ role: 'user' as const, content: prompt }];

  return {
    provider: input.provider,
    model: input.model || defaults.model,
    prompt,
    messages,
    params: input.params || {},
    output: {
      dir: input.output?.dir || defaults.outputDir,
      filename: input.output?.filename || generateFilename(defaults.filenamePrefix),
      overwrite: input.output?.overwrite || defaults.overwrite,
    },
    requestId: input.requestId || generateRequestId(),
  };
}

// 从消息中提取 prompt
function extractPromptFromMessages(messages: Array<{ role: string; content: string }>): string {
  const userMessages = messages.filter((m) => m.role === 'user');
  if (userMessages.length === 0) {
    throw new Error('消息中必须包含至少一条用户消息');
  }
  return userMessages[userMessages.length - 1].content;
}

// 生成文件名
function generateFilename(prefix: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${prefix}-${timestamp}`;
}

// 生成请求 ID
function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

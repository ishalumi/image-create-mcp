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

// OpenAI 参数 Schema
const openaiParamsSchema = z.object({
  n: z.number().int().min(1).max(10).optional(),
  size: z.enum(['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792']).optional(),
  quality: z.enum(['standard', 'hd', 'high']).optional(),
  style: z.enum(['vivid', 'natural']).optional(),
  response_format: z.enum(['url', 'b64_json']).optional(),
  background: z.enum(['transparent', 'opaque', 'auto']).optional(),
});

// Gemini 参数 Schema
const geminiParamsSchema = z.object({
  aspectRatio: z.enum(['1:1', '16:9', '4:3', '9:16', '3:2', '2:3', '4:5', '5:4', '21:9', '3:4']).optional(),
  imageSize: z.enum(['1K', '2K', '4K']).optional(),
});

// OpenRouter 参数 Schema
const openrouterParamsSchema = z.object({
  modalities: z.array(z.enum(['image', 'text'])).optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  max_tokens: z.number().int().positive().optional(),
});

// 输入 Schema
const imageGenerateInputSchema = z.object({
  provider: z.enum(['openai', 'gemini', 'openrouter']),
  model: z.string().optional(),
  prompt: z.string().optional(),
  messages: z.array(chatMessageSchema).optional(),
  params: z.record(z.unknown()).optional(),
  output: outputOptionsSchema.optional(),
  requestId: z.string().optional(),
}).refine(
  (data) => data.prompt || (data.messages && data.messages.length > 0),
  { message: '必须提供 prompt 或 messages' }
);

// Provider 参数 Schema 映射
const providerParamsSchemas: Record<ProviderType, z.ZodSchema> = {
  openai: openaiParamsSchema,
  gemini: geminiParamsSchema,
  openrouter: openrouterParamsSchema,
};

// 验证输入
export function validateInput(input: unknown): ImageGenerateInput {
  const result = imageGenerateInputSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`输入验证失败: ${result.error.message}`);
  }
  return result.data as ImageGenerateInput;
}

// 验证 Provider 参数
export function validateProviderParams(provider: ProviderType, params: unknown) {
  const schema = providerParamsSchemas[provider];
  const result = schema.safeParse(params || {});
  if (!result.success) {
    throw new Error(`Provider 参数验证失败: ${result.error.message}`);
  }
  return result.data;
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

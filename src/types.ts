// Provider 类型
export type ProviderType = 'openai' | 'gemini' | 'openrouter';

// 聊天消息
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// 输出选项
export interface OutputOptions {
  dir?: string;
  filename?: string;
  overwrite?: 'error' | 'overwrite' | 'suffix';
}

// 图片生成输入
export interface ImageGenerateInput {
  provider: ProviderType;
  model?: string;
  prompt?: string;
  messages?: ChatMessage[];
  params?: ProviderParams;
  output?: OutputOptions;
  requestId?: string;
}

// OpenAI 参数
export interface OpenAIImageParams {
  n?: number;
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd' | 'high';
  style?: 'vivid' | 'natural';
  response_format?: 'url' | 'b64_json';
  background?: 'transparent' | 'opaque' | 'auto';
}

// Gemini 参数
export interface GeminiImageParams {
  aspectRatio?: '1:1' | '16:9' | '4:3' | '9:16' | '3:2' | '2:3' | '4:5' | '5:4' | '21:9' | '3:4';
  imageSize?: '1K' | '2K' | '4K';
}

// OpenRouter 参数
export interface OpenRouterImageParams {
  modalities?: Array<'image' | 'text'>;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
}

// Provider 参数联合类型
export type ProviderParams = OpenAIImageParams | GeminiImageParams | OpenRouterImageParams;

// 标准化输入
export interface NormalizedInput {
  provider: ProviderType;
  model: string;
  prompt: string;
  messages: ChatMessage[];
  params: ProviderParams;
  output: Required<OutputOptions>;
  requestId: string;
}

// HTTP 请求
export interface HttpRequest {
  method: 'GET' | 'POST';
  url: string;
  headers: Record<string, string>;
  body?: unknown;
}

// HTTP 响应
export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

// 图片载荷
export interface ImagePayload {
  bytes: Uint8Array;
  mimeType: string;
  source: 'b64' | 'url' | 'inline';
}

// 保存的图片
export interface SavedImage {
  path: string;
  mimeType: string;
  sizeBytes: number;
  index: number;
  source: ImagePayload['source'];
}

// 图片生成结果
export interface ImageGenerateResult {
  provider: ProviderType;
  model: string;
  images: SavedImage[];
  warnings?: string[];
}

// Provider 配置
export interface ProviderConfig {
  baseUrl?: string;
  apiKey: string;
  model?: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

// 应用配置
export interface AppConfig {
  defaults: {
    provider: ProviderType;
    outputDir?: string;
    filenamePrefix?: string;
    overwrite?: 'error' | 'overwrite' | 'suffix';
  };
  providers: {
    openai?: ProviderConfig;
    gemini?: ProviderConfig;
    openrouter?: ProviderConfig;
  };
}

// 错误类型
export type ErrorCode =
  | 'CONFIG_MISSING'
  | 'INVALID_PARAMS'
  | 'HTTP_ERROR'
  | 'DECODE_ERROR'
  | 'SAVE_ERROR'
  | 'PROVIDER_ERROR';

export class ImageGenError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ImageGenError';
  }
}

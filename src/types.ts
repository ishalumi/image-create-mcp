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
  provider: string;
  model?: string;
  prompt?: string;
  messages?: ChatMessage[];
  output?: OutputOptions;
}

// 标准化输入
export interface NormalizedInput {
  provider: string;
  model: string;
  prompt: string;
  messages: ChatMessage[];
  output: Required<OutputOptions>;
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
  source: 'b64' | 'url';
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
  provider: string;
  model: string;
  images: SavedImage[];
}

// Provider 配置
export interface ProviderConfig {
  apiKey: string;
  apiUrl: string;
  model: string;
}

// 应用配置
export interface AppConfig {
  defaults: {
    outputDir: string;
    filenamePrefix: string;
    overwrite: 'error' | 'overwrite' | 'suffix';
  };
  providers: Record<string, ProviderConfig>;
}

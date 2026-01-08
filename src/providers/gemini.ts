import type { HttpRequest, HttpResponse, ImagePayload, NormalizedInput, GeminiImageParams, ProviderConfig } from '../types.js';
import { decodeBase64, inferMimeType, type ProviderAdapter } from './base.js';

export class GeminiAdapter implements ProviderAdapter {
  type = 'gemini' as const;

  validate(input: NormalizedInput, config: ProviderConfig): void {
    if (!config.apiKey) {
      throw new Error('Gemini API Key 未配置');
    }
    if (!input.prompt && input.messages.length === 0) {
      throw new Error('Gemini 需要 prompt 或 messages');
    }
  }

  buildRequest(input: NormalizedInput, config: ProviderConfig): HttpRequest {
    const params = input.params as GeminiImageParams;
    const baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    const model = input.model || 'gemini-2.0-flash-exp-image-generation';

    // 构建 contents
    const contents = input.messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }],
    }));

    // 如果只有 prompt，构建单条消息
    if (contents.length === 0 && input.prompt) {
      contents.push({
        role: 'user',
        parts: [{ text: input.prompt }],
      });
    }

    return {
      method: 'POST',
      url: `${baseUrl}/models/${model}:generateContent?key=${config.apiKey}`,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body: {
        contents,
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          // 当 aspectRatio 或 imageSize 存在时构建 imageConfig
          ...((params.aspectRatio || params.imageSize) && {
            imageConfig: {
              ...(params.aspectRatio && { aspectRatio: params.aspectRatio }),
              ...(params.imageSize && { imageSize: params.imageSize }),
            },
          }),
        },
      },
    };
  }

  parseResponse(response: HttpResponse): ImagePayload[] {
    if (response.status !== 200) {
      const error = response.body as { error?: { message?: string } };
      // 脱敏错误信息，避免泄露 API Key
      const errorMsg = error.error?.message || `HTTP ${response.status}`;
      throw new Error(`Gemini API 错误: ${errorMsg.replace(/key=[^&\s]+/gi, 'key=***')}`);
    }

    const body = response.body as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
            inlineData?: { mimeType: string; data: string };
          }>;
        };
      }>;
    };

    const images: ImagePayload[] = [];

    for (const candidate of body.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        if (part.inlineData) {
          const bytes = decodeBase64(part.inlineData.data);
          images.push({
            bytes,
            mimeType: part.inlineData.mimeType || inferMimeType(bytes),
            source: 'inline',
          });
        }
      }
    }

    if (images.length === 0) {
      throw new Error('Gemini 响应中没有图片数据');
    }

    return images;
  }
}

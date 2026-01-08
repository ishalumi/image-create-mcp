import type { HttpRequest, HttpResponse, ImagePayload, NormalizedInput, ProviderConfig } from '../types.js';
import { decodeBase64, downloadImage, inferMimeType, type ProviderAdapter } from './base.js';

export class OpenAIAdapter implements ProviderAdapter {
  type = 'openai' as const;

  validate(input: NormalizedInput, config: ProviderConfig): void {
    if (!config.apiKey) {
      throw new Error('OpenAI API Key 未配置');
    }
    if (!input.prompt && input.messages.length === 0) {
      throw new Error('OpenAI 需要 prompt 或 messages');
    }
  }

  buildRequest(input: NormalizedInput, config: ProviderConfig): HttpRequest {
    const baseUrl = config.baseUrl || 'https://api.openai.com/v1';

    // 构建 messages（对话式接口）
    const messages = input.messages.length > 0
      ? input.messages.map((msg) => ({ role: msg.role, content: msg.content }))
      : [{ role: 'user', content: input.prompt }];

    return {
      method: 'POST',
      url: `${baseUrl}/chat/completions`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        ...config.headers,
      },
      body: {
        model: input.model,
        messages,
      },
    };
  }

  parseResponse(response: HttpResponse): ImagePayload[] {
    if (response.status !== 200) {
      const error = response.body as { error?: { message?: string } };
      throw new Error(`OpenAI API 错误: ${error.error?.message || response.status}`);
    }

    const body = response.body as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    const images: ImagePayload[] = [];

    for (const choice of body.choices || []) {
      const content = choice.message?.content;
      if (typeof content === 'string') {
        // 从 markdown 图片语法提取 base64
        const base64Matches = content.matchAll(/!\[.*?\]\((data:image\/[^;]+;base64,([^)]+))\)/g);
        for (const match of base64Matches) {
          const bytes = decodeBase64(match[2]);
          images.push({
            bytes,
            mimeType: inferMimeType(bytes),
            source: 'b64',
          });
        }

        // 从 markdown 图片语法提取 URL
        const urlMatches = content.matchAll(/!\[.*?\]\((https?:\/\/[^)]+)\)/g);
        for (const match of urlMatches) {
          images.push({
            bytes: new Uint8Array(),
            mimeType: 'image/png',
            source: 'url',
            _url: match[1],
          } as ImagePayload & { _url: string });
        }
      }
    }

    if (images.length === 0) {
      throw new Error('OpenAI 响应中没有图片数据');
    }

    return images;
  }
}

// 处理 URL 类型的图片
export async function resolveImagePayloads(payloads: ImagePayload[]): Promise<ImagePayload[]> {
  return Promise.all(
    payloads.map(async (payload) => {
      if (payload.source === 'url' && (payload as ImagePayload & { _url?: string })._url) {
        const url = (payload as ImagePayload & { _url: string })._url;
        const bytes = await downloadImage(url);
        return {
          bytes,
          mimeType: inferMimeType(bytes),
          source: 'url' as const,
        };
      }
      return payload;
    })
  );
}

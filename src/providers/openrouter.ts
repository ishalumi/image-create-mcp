import type { HttpRequest, HttpResponse, ImagePayload, NormalizedInput, OpenRouterImageParams, ProviderConfig } from '../types.js';
import { decodeBase64, downloadImage, inferMimeType, type ProviderAdapter } from './base.js';

export class OpenRouterAdapter implements ProviderAdapter {
  type = 'openrouter' as const;

  validate(input: NormalizedInput, config: ProviderConfig): void {
    if (!config.apiKey) {
      throw new Error('OpenRouter API Key 未配置');
    }
    if (input.messages.length === 0 && !input.prompt) {
      throw new Error('OpenRouter 需要 messages 或 prompt');
    }
  }

  buildRequest(input: NormalizedInput, config: ProviderConfig): HttpRequest {
    const params = input.params as OpenRouterImageParams;
    const baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1';

    // 构建 messages
    const messages = input.messages.length > 0
      ? input.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }))
      : [{ role: 'user', content: input.prompt }];

    return {
      method: 'POST',
      url: `${baseUrl}/chat/completions`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'HTTP-Referer': 'https://github.com/image-create-mcp',
        'X-Title': 'Image Create MCP',
        ...config.headers,
      },
      body: {
        model: input.model,
        messages,
        modalities: params.modalities || ['image', 'text'],
        temperature: params.temperature,
        top_p: params.top_p,
        max_tokens: params.max_tokens || 4096,
      },
    };
  }

  parseResponse(response: HttpResponse): ImagePayload[] {
    if (response.status !== 200) {
      const error = response.body as { error?: { message?: string } };
      throw new Error(`OpenRouter API 错误: ${error.error?.message || response.status}`);
    }

    const body = response.body as {
      choices?: Array<{
        message?: {
          content?: string | Array<{
            type: string;
            text?: string;
            image_url?: { url: string };
          }>;
        };
      }>;
    };

    const images: ImagePayload[] = [];

    for (const choice of body.choices || []) {
      const content = choice.message?.content;

      if (typeof content === 'string') {
        // 尝试从 markdown 图片语法中提取
        const matches = content.matchAll(/!\[.*?\]\((data:image\/[^;]+;base64,([^)]+))\)/g);
        for (const match of matches) {
          const base64 = match[2];
          const bytes = decodeBase64(base64);
          images.push({
            bytes,
            mimeType: inferMimeType(bytes),
            source: 'b64',
          });
        }

        // 尝试从 URL 中提取
        const urlMatches = content.matchAll(/!\[.*?\]\((https?:\/\/[^)]+)\)/g);
        for (const match of urlMatches) {
          images.push({
            bytes: new Uint8Array(),
            mimeType: 'image/png',
            source: 'url',
            _url: match[1],
          } as ImagePayload & { _url: string });
        }
      } else if (Array.isArray(content)) {
        for (const part of content) {
          if (part.type === 'image_url' && part.image_url?.url) {
            const url = part.image_url.url;
            if (url.startsWith('data:')) {
              const base64Match = url.match(/base64,(.+)/);
              if (base64Match) {
                const bytes = decodeBase64(base64Match[1]);
                images.push({
                  bytes,
                  mimeType: inferMimeType(bytes),
                  source: 'b64',
                });
              }
            } else {
              images.push({
                bytes: new Uint8Array(),
                mimeType: 'image/png',
                source: 'url',
                _url: url,
              } as ImagePayload & { _url: string });
            }
          }
        }
      }
    }

    if (images.length === 0) {
      throw new Error('OpenRouter 响应中没有图片数据');
    }

    return images;
  }
}

// 处理 URL 类型的图片
export async function resolveOpenRouterImages(payloads: ImagePayload[]): Promise<ImagePayload[]> {
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

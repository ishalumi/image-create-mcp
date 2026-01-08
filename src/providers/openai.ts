import type { HttpRequest, HttpResponse, ImagePayload, NormalizedInput, OpenAIImageParams, ProviderConfig } from '../types.js';
import { decodeBase64, downloadImage, inferMimeType, type ProviderAdapter } from './base.js';

export class OpenAIAdapter implements ProviderAdapter {
  type = 'openai' as const;

  validate(input: NormalizedInput, config: ProviderConfig): void {
    if (!config.apiKey) {
      throw new Error('OpenAI API Key 未配置');
    }
    if (!input.prompt) {
      throw new Error('OpenAI 需要 prompt');
    }
  }

  buildRequest(input: NormalizedInput, config: ProviderConfig): HttpRequest {
    const params = input.params as OpenAIImageParams;
    const baseUrl = config.baseUrl || 'https://api.openai.com/v1';

    return {
      method: 'POST',
      url: `${baseUrl}/images/generations`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        ...config.headers,
      },
      body: {
        model: input.model,
        prompt: input.prompt,
        n: params.n || 1,
        size: params.size || '1024x1024',
        quality: params.quality || 'standard',
        style: params.style,
        response_format: params.response_format || 'b64_json',
        background: params.background,
      },
    };
  }

  parseResponse(response: HttpResponse): ImagePayload[] {
    if (response.status !== 200) {
      const error = response.body as { error?: { message?: string } };
      throw new Error(`OpenAI API 错误: ${error.error?.message || response.status}`);
    }

    const body = response.body as {
      data: Array<{ url?: string; b64_json?: string; revised_prompt?: string }>;
    };

    return body.data.map((item) => {
      if (item.b64_json) {
        const bytes = decodeBase64(item.b64_json);
        return {
          bytes,
          mimeType: inferMimeType(bytes),
          source: 'b64' as const,
        };
      } else if (item.url) {
        return {
          bytes: new Uint8Array(),
          mimeType: 'image/png',
          source: 'url' as const,
          _url: item.url,
        } as ImagePayload & { _url: string };
      }
      throw new Error('OpenAI 响应中没有图片数据');
    });
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

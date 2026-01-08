import type { HttpRequest, HttpResponse } from '../types.js';

// 发送 HTTP 请求
export async function sendRequest(request: HttpRequest, timeoutMs = 60000): Promise<HttpResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body ? JSON.stringify(request.body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    let body: unknown;
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    if (contentType.includes('application/json') && text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { rawText: text };
      }
    } else {
      body = { rawText: text };
    }

    return { status: response.status, headers, body };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Base64 解码
export function decodeBase64(base64: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

// 最大图片大小 (50MB)
const MAX_IMAGE_SIZE = 50 * 1024 * 1024;

// 从 URL 下载图片
export async function downloadImage(url: string): Promise<Uint8Array> {
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== 'https:') {
    throw new Error('仅支持 HTTPS 协议的图片 URL');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`下载图片失败: ${response.status}`);
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_SIZE) {
      throw new Error(`图片大小超过限制: ${contentLength} bytes`);
    }

    const buffer = await response.arrayBuffer();

    if (buffer.byteLength > MAX_IMAGE_SIZE) {
      throw new Error(`图片大小超过限制: ${buffer.byteLength} bytes`);
    }

    if (buffer.byteLength === 0) {
      throw new Error('下载的图片为空');
    }

    return new Uint8Array(buffer);
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// 推断 MIME 类型
export function inferMimeType(data: Uint8Array): string {
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
    return 'image/png';
  }
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return 'image/jpeg';
  }
  if (data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46) {
    return 'image/webp';
  }
  if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x38) {
    return 'image/gif';
  }
  return 'image/png';
}

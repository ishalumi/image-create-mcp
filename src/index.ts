#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

import { loadConfigFromEnv, getProviderConfig, getAvailableProviders } from './config.js';
import { saveImages, resolveOutputDir } from './image-save.js';
import { sendRequest, decodeBase64, downloadImage, inferMimeType } from './providers/base.js';
import type {
  ChatMessage,
  HttpRequest,
  ImageGenerateInput,
  ImageGenerateResult,
  ImagePayload,
  MessagePart,
  NormalizedInput,
} from './types.js';

// 加载配置
const config = loadConfigFromEnv();

// 创建 MCP 服务器
const server = new Server(
  { name: 'image-create-mcp', version: '1.0.3' },
  { capabilities: { tools: {} } }
);

// 注册工具列表
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const providers = getAvailableProviders(config);
  return {
    tools: [
      {
        name: 'generate_image',
        description: `通过 AI 生成图片并保存。可用配置组: ${providers.length > 0 ? providers.join(', ') : '(未配置)'}`,
        inputSchema: {
          type: 'object',
          required: ['provider'],
          properties: {
            provider: {
              type: 'string',
              description: `配置组名称: ${providers.join(' / ') || '未配置任何 Provider'}`,
            },
            model: {
              type: 'string',
              description: '模型名称（可选，覆盖环境变量配置）',
            },
            prompt: {
              type: 'string',
              description: '图片生成提示词',
            },
            messages: {
              type: 'array',
              description: '对话消息列表',
              items: {
                type: 'object',
                required: ['role', 'content'],
                properties: {
                  role: { type: 'string', enum: ['system', 'user', 'assistant'] },
                  content: {
                    oneOf: [
                      { type: 'string' },
                      {
                        type: 'array',
                        items: {
                          type: 'object',
                          required: ['type'],
                          properties: {
                            type: { type: 'string', enum: ['text', 'image_url', 'image'] },
                            text: { type: 'string' },
                            image_url: {
                              type: 'object',
                              properties: {
                                url: { type: 'string' },
                              },
                            },
                            inline_data: {
                              type: 'object',
                              properties: {
                                mime_type: { type: 'string' },
                                data: { type: 'string' },
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            images: {
              type: 'array',
              description: '上传图片路径列表（支持多图）',
              items: {
                type: 'string',
                description: '本地图片路径或 data URL',
              },
            },
            output: {
              type: 'object',
              description: '输出选项',
              properties: {
                dir: { type: 'string', description: '保存目录' },
                filename: { type: 'string', description: '文件名（不含扩展名）' },
                overwrite: { type: 'string', enum: ['error', 'overwrite', 'suffix'] },
              },
            },
          },
        },
      },
    ],
  };
});

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== 'generate_image') {
    throw new Error(`未知工具: ${request.params.name}`);
  }

  try {
    const input = request.params.arguments as unknown as ImageGenerateInput;

    // 验证输入
    if (!input.provider) {
      throw new Error('必须指定 provider');
    }
    const hasMessages = Array.isArray(input.messages) && input.messages.length > 0;
    const hasImages = Array.isArray(input.images) && input.images.length > 0;

    if (!input.prompt && !hasMessages && !hasImages) {
      throw new Error('必须提供 prompt、messages 或 images');
    }

    // 获取 Provider 配置
    const providerConfig = getProviderConfig(config, input.provider);

    // 标准化输入
    const imageParts = await buildImageParts(input.images || []);
    const baseMessages: ChatMessage[] = hasMessages ? [...input.messages!] : [];
    const shouldAppendUserMessage = !hasMessages || hasImages;
    const userContent = shouldAppendUserMessage ? buildUserMessageContent(input.prompt, imageParts) : null;

    if (userContent) {
      baseMessages.push({ role: 'user', content: userContent });
    }

    const derivedPrompt = input.prompt || extractPromptFromMessages(baseMessages);
    if (!derivedPrompt && !hasImages) {
      throw new Error('必须提供 prompt 或 messages 中包含用户文本');
    }

    const normalized: NormalizedInput = {
      provider: input.provider,
      model: input.model || providerConfig.model,
      prompt: derivedPrompt,
      messages: baseMessages,
      output: {
        dir: resolveOutputDir(input.output?.dir || config.defaults.outputDir),
        filename: input.output?.filename || generateFilename(config.defaults.filenamePrefix),
        overwrite: input.output?.overwrite || config.defaults.overwrite,
      },
    };

    const httpRequest: HttpRequest = {
      method: 'POST',
      url: providerConfig.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${providerConfig.apiKey}`,
      },
      body: {
        model: normalized.model,
        messages: normalized.messages,
      },
    };

    // 发送请求
    const httpResponse = await sendRequest(httpRequest);

    if (httpResponse.status !== 200) {
      const error = httpResponse.body as { error?: { message?: string } };
      throw new Error(`API 错误: ${error.error?.message || httpResponse.status}`);
    }

    // 解析响应
    const images = parseResponse(httpResponse.body);
    if (images.length === 0) {
      // 调试：输出原始响应结构
      console.error('原始响应:', JSON.stringify(httpResponse.body, null, 2).slice(0, 500));
    }

    // 下载 URL 类型的图片
    const resolvedImages = await resolveImages(images);

    // 保存图片
    const savedImages = await saveImages(resolvedImages, normalized.output);

    // 构建结果
    const result: ImageGenerateResult = {
      provider: input.provider,
      model: normalized.model,
      images: savedImages,
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: message }, null, 2) }],
      isError: true,
    };
  }
});

const IMAGE_EXT_PATTERN = /\.(jpg|jpeg|png|gif|webp)$/i;

async function buildImageParts(images: string[]): Promise<MessagePart[]> {
  const parts: MessagePart[] = [];
  for (const imageInput of images) {
    if (!imageInput) {
      throw new Error('images 中包含空的图片路径');
    }
    if (imageInput.startsWith('data:image/')) {
      parts.push({ type: 'image_url', image_url: { url: imageInput } });
      continue;
    }
    if (!existsSync(imageInput)) {
      throw new Error(`图片文件不存在: ${imageInput}`);
    }
    if (!IMAGE_EXT_PATTERN.test(imageInput)) {
      throw new Error(`不支持的图片格式: ${imageInput}`);
    }

    const imageBytes = await readFile(imageInput);
    const base64 = Buffer.from(imageBytes).toString('base64');
    const mimeType = inferMimeType(new Uint8Array(imageBytes));

    parts.push({
      type: 'image_url',
      image_url: { url: `data:${mimeType};base64,${base64}` },
    });
  }
  return parts;
}

function buildUserMessageContent(
  prompt: string | undefined,
  imageParts: MessagePart[]
): string | MessagePart[] | null {
  if (!prompt && imageParts.length === 0) {
    return null;
  }
  if (imageParts.length === 0) {
    return prompt || null;
  }

  const parts: MessagePart[] = [...imageParts];
  if (prompt) {
    parts.push({ type: 'text', text: prompt });
  }
  return parts;
}

// 解析响应中的图片
function parseResponse(body: unknown): ImagePayload[] {
  const response = body as {
    choices?: Array<{
      message?: {
        content?: string | Array<{
          type: string;
          text?: string;
          image_url?: { url: string };
          inline_data?: { mime_type: string; data: string };
        }>;
        images?: Array<{
          type?: string;
          image_url?: { url: string };
        }>;
      };
    }>;
  };

  const images: ImagePayload[] = [];

  for (const choice of response.choices || []) {
    const message = choice.message;
    const content = message?.content;

    // 处理 message.images 字段（gcli 格式）
    if (message?.images && Array.isArray(message.images)) {
      for (const img of message.images) {
        if (img.image_url?.url) {
          const url = img.image_url.url;
          if (url.startsWith('data:')) {
            const base64Match = url.match(/base64,(.+)/);
            if (base64Match) {
              const bytes = decodeBase64(base64Match[1]);
              images.push({ bytes, mimeType: inferMimeType(bytes), source: 'b64' });
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

    if (typeof content === 'string') {
      // Markdown base64 格式: ![...](data:image/...;base64,...)
      for (const match of content.matchAll(/!\[.*?\]\((data:image\/[^;]+;base64,([^)]+))\)/g)) {
        const bytes = decodeBase64(match[2]);
        images.push({ bytes, mimeType: inferMimeType(bytes), source: 'b64' });
      }

      // Markdown URL 格式: ![...](https://...)
      for (const match of content.matchAll(/!\[.*?\]\((https?:\/\/[^)]+)\)/g)) {
        images.push({
          bytes: new Uint8Array(),
          mimeType: 'image/png',
          source: 'url',
          _url: match[1],
        } as ImagePayload & { _url: string });
      }
    } else if (Array.isArray(content)) {
      // 数组格式
      for (const part of content) {
        // image_url 格式
        if (part.type === 'image_url' && part.image_url?.url) {
          const url = part.image_url.url;
          if (url.startsWith('data:')) {
            const base64Match = url.match(/base64,(.+)/);
            if (base64Match) {
              const bytes = decodeBase64(base64Match[1]);
              images.push({ bytes, mimeType: inferMimeType(bytes), source: 'b64' });
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
        // inline_data 格式 (Gemini/OpenRouter 风格)
        if (part.type === 'image' && part.inline_data?.data) {
          const bytes = decodeBase64(part.inline_data.data);
          images.push({
            bytes,
            mimeType: part.inline_data.mime_type || inferMimeType(bytes),
            source: 'b64',
          });
        }
      }
    }
  }

  if (images.length === 0) {
    const rawResponse = JSON.stringify(body, null, 2);
    throw new Error(`响应中没有图片数据。原始响应: ${rawResponse}`);
  }

  return images;
}

// 下载 URL 类型的图片
async function resolveImages(payloads: ImagePayload[]): Promise<ImagePayload[]> {
  return Promise.all(
    payloads.map(async (payload) => {
      const urlPayload = payload as ImagePayload & { _url?: string };
      if (payload.source === 'url' && urlPayload._url) {
        const bytes = await downloadImage(urlPayload._url);
        return { bytes, mimeType: inferMimeType(bytes), source: 'url' as const };
      }
      return payload;
    })
  );
}

// 从消息中提取 prompt
function extractPromptFromMessages(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role !== 'user') {
      continue;
    }
    if (typeof message.content === 'string') {
      const trimmed = message.content.trim();
      if (trimmed) {
        return trimmed;
      }
      continue;
    }
    if (Array.isArray(message.content)) {
      for (let j = message.content.length - 1; j >= 0; j -= 1) {
        const part = message.content[j];
        if (part.type === 'text' && part.text?.trim()) {
          return part.text.trim();
        }
      }
    }
  }
  return '';
}

// 生成文件名
function generateFilename(prefix: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${prefix}-${timestamp}`;
}

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Image Create MCP Server 已启动');
}

main().catch((error) => {
  console.error('服务器启动失败:', error);
  process.exit(1);
});

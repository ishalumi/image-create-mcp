#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { loadConfigFromEnv, getProviderConfig } from './config.js';
import { validateInput, validateProviderParams, normalizeInput } from './validation.js';
import { getProvider } from './providers/index.js';
import { sendRequest } from './providers/base.js';
import { resolveImagePayloads } from './providers/openai.js';
import { resolveOpenRouterImages } from './providers/openrouter.js';
import { saveImages, resolveOutputDir } from './image-save.js';
import type { ImageGenerateResult, ImagePayload } from './types.js';

// 加载配置
const config = loadConfigFromEnv();

// 创建 MCP 服务器
const server = new Server(
  {
    name: 'image-create-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 注册工具列表
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'generate_image',
        description: '通过 AI 生成图片并保存到指定目录。支持 OpenAI (DALL-E)、Gemini、OpenRouter 等多个 Provider。',
        inputSchema: {
          type: 'object',
          required: ['provider'],
          properties: {
            provider: {
              type: 'string',
              enum: ['openai', 'gemini', 'openrouter'],
              description: '图片生成服务提供商',
            },
            model: {
              type: 'string',
              description: '模型名称，不同 Provider 支持不同模型',
            },
            prompt: {
              type: 'string',
              description: '图片生成提示词',
            },
            messages: {
              type: 'array',
              description: '对话消息列表（用于支持多轮对话的 Provider）',
              items: {
                type: 'object',
                required: ['role', 'content'],
                properties: {
                  role: {
                    type: 'string',
                    enum: ['system', 'user', 'assistant'],
                  },
                  content: { type: 'string' },
                },
              },
            },
            params: {
              type: 'object',
              description: 'Provider 特定参数',
              properties: {
                // OpenAI 参数
                n: { type: 'number', description: '生成图片数量 (1-10)' },
                size: { type: 'string', description: '图片尺寸' },
                quality: { type: 'string', description: '图片质量' },
                style: { type: 'string', description: '图片风格' },
                // Gemini 参数
                aspectRatio: { type: 'string', description: '宽高比' },
                imageSize: { type: 'string', description: '图片分辨率' },
                // OpenRouter 参数
                modalities: { type: 'array', description: '输出模态' },
                temperature: { type: 'number', description: '温度参数' },
              },
            },
            output: {
              type: 'object',
              description: '输出选项',
              properties: {
                dir: {
                  type: 'string',
                  description: '保存目录，默认当前目录',
                },
                filename: {
                  type: 'string',
                  description: '文件名（不含扩展名）',
                },
                overwrite: {
                  type: 'string',
                  enum: ['error', 'overwrite', 'suffix'],
                  description: '文件存在时的处理方式',
                },
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
    // 验证输入
    const input = validateInput(request.params.arguments);

    // 获取 Provider 配置
    const providerConfig = getProviderConfig(config, input.provider);

    // 验证 Provider 参数
    validateProviderParams(input.provider, input.params);

    // 标准化输入
    const normalized = normalizeInput(input, {
      outputDir: config.defaults.outputDir || '.',
      filenamePrefix: config.defaults.filenamePrefix || 'image',
      overwrite: config.defaults.overwrite || 'suffix',
      model: providerConfig.model || getDefaultModel(input.provider),
    });

    // 解析输出目录
    normalized.output.dir = resolveOutputDir(normalized.output.dir);

    // 获取 Provider 适配器
    const provider = getProvider(input.provider);

    // 验证
    provider.validate(normalized, providerConfig);

    // 构建请求
    const httpRequest = provider.buildRequest(normalized, providerConfig);

    // 发送请求
    const httpResponse = await sendRequest(httpRequest);

    // 解析响应
    let payloads: ImagePayload[] = provider.parseResponse(httpResponse);

    // 处理 URL 类型的图片
    if (input.provider === 'openai') {
      payloads = await resolveImagePayloads(payloads);
    } else if (input.provider === 'openrouter') {
      payloads = await resolveOpenRouterImages(payloads);
    }

    // 保存图片
    const savedImages = await saveImages(payloads, normalized.output);

    // 构建结果
    const result: ImageGenerateResult = {
      provider: input.provider,
      model: normalized.model,
      images: savedImages,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: message }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// 获取默认模型
function getDefaultModel(provider: string): string {
  switch (provider) {
    case 'openai':
      return 'dall-e-3';
    case 'gemini':
      return 'gemini-2.0-flash-exp-image-generation';
    case 'openrouter':
      return 'google/gemini-2.5-flash-preview:thinking';
    default:
      return '';
  }
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

import { z } from 'zod';
import type { AppConfig, ProviderType } from './types.js';

// Provider 配置 Schema
const providerConfigSchema = z.object({
  baseUrl: z.string().url().optional(),
  apiKey: z.string().min(1, 'API Key 不能为空'),
  model: z.string().optional(),
  timeoutMs: z.number().positive().optional(),
  headers: z.record(z.string()).optional(),
});

// 应用配置 Schema
const appConfigSchema = z.object({
  defaults: z.object({
    provider: z.enum(['openai', 'gemini', 'openrouter']),
    outputDir: z.string().optional(),
    filenamePrefix: z.string().optional(),
    overwrite: z.enum(['error', 'overwrite', 'suffix']).optional(),
  }),
  providers: z.object({
    openai: providerConfigSchema.optional(),
    gemini: providerConfigSchema.optional(),
    openrouter: providerConfigSchema.optional(),
  }),
});

// 默认配置
const defaultConfig: AppConfig = {
  defaults: {
    provider: 'openai',
    outputDir: '.',
    filenamePrefix: 'image',
    overwrite: 'suffix',
  },
  providers: {},
};

// 从环境变量加载配置
export function loadConfigFromEnv(): AppConfig {
  const config: AppConfig = {
    defaults: {
      provider: (process.env.IMAGE_GEN_DEFAULT_PROVIDER as ProviderType) || defaultConfig.defaults.provider,
      outputDir: process.env.IMAGE_GEN_OUTPUT_DIR || defaultConfig.defaults.outputDir,
      filenamePrefix: process.env.IMAGE_GEN_FILENAME_PREFIX || defaultConfig.defaults.filenamePrefix,
      overwrite: (process.env.IMAGE_GEN_OVERWRITE as AppConfig['defaults']['overwrite']) || defaultConfig.defaults.overwrite,
    },
    providers: {},
  };

  // OpenAI 配置
  if (process.env.OPENAI_API_KEY) {
    config.providers.openai = {
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      model: process.env.OPENAI_IMAGE_MODEL || 'dall-e-3',
    };
  }

  // Gemini 配置
  if (process.env.GEMINI_API_KEY) {
    config.providers.gemini = {
      apiKey: process.env.GEMINI_API_KEY,
      baseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
      model: process.env.GEMINI_IMAGE_MODEL || 'gemini-2.0-flash-exp-image-generation',
    };
  }

  // OpenRouter 配置
  if (process.env.OPENROUTER_API_KEY) {
    config.providers.openrouter = {
      apiKey: process.env.OPENROUTER_API_KEY,
      baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      model: process.env.OPENROUTER_IMAGE_MODEL || 'google/gemini-2.5-flash-preview:thinking',
    };
  }

  return config;
}

// 验证配置
export function validateConfig(config: unknown): AppConfig {
  const result = appConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`配置验证失败: ${result.error.message}`);
  }
  return result.data;
}

// 合并配置
export function mergeConfig(base: AppConfig, override: Partial<AppConfig>): AppConfig {
  return {
    defaults: { ...base.defaults, ...override.defaults },
    providers: {
      openai: override.providers?.openai || base.providers.openai,
      gemini: override.providers?.gemini || base.providers.gemini,
      openrouter: override.providers?.openrouter || base.providers.openrouter,
    },
  };
}

// 获取 Provider 配置
export function getProviderConfig(config: AppConfig, provider: ProviderType) {
  const providerConfig = config.providers[provider];
  if (!providerConfig) {
    throw new Error(`Provider "${provider}" 未配置`);
  }
  return providerConfig;
}

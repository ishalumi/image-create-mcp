import type { AppConfig, ProviderConfig } from './types.js';

// 默认配置
const defaultConfig: AppConfig = {
  defaults: {
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
      outputDir: process.env.IMAGE_GEN_OUTPUT_DIR || defaultConfig.defaults.outputDir,
      filenamePrefix: process.env.IMAGE_GEN_FILENAME_PREFIX || defaultConfig.defaults.filenamePrefix,
      overwrite: (process.env.IMAGE_GEN_OVERWRITE as AppConfig['defaults']['overwrite']) || defaultConfig.defaults.overwrite,
    },
    providers: {},
  };

  // 动态加载所有 PROVIDER_* 环境变量
  // 格式: PROVIDER_{NAME}_API_KEY, PROVIDER_{NAME}_API_URL, PROVIDER_{NAME}_MODEL
  const providerPattern = /^PROVIDER_([A-Z0-9_]+)_(API_KEY|API_URL|MODEL)$/;
  const providerData: Record<string, Partial<ProviderConfig>> = {};

  for (const [key, value] of Object.entries(process.env)) {
    const match = key.match(providerPattern);
    if (match && value) {
      const providerName = match[1].toLowerCase();
      const field = match[2];

      if (!providerData[providerName]) {
        providerData[providerName] = {};
      }

      switch (field) {
        case 'API_KEY':
          providerData[providerName].apiKey = value;
          break;
        case 'API_URL':
          providerData[providerName].apiUrl = value;
          break;
        case 'MODEL':
          providerData[providerName].model = value;
          break;
      }
    }
  }

  // 验证并添加完整的 provider 配置
  for (const [name, data] of Object.entries(providerData)) {
    if (data.apiKey && data.apiUrl && data.model) {
      config.providers[name] = data as ProviderConfig;
    }
  }

  return config;
}

// 获取 Provider 配置
export function getProviderConfig(config: AppConfig, provider: string): ProviderConfig {
  const providerConfig = config.providers[provider];
  if (!providerConfig) {
    const available = Object.keys(config.providers);
    if (available.length === 0) {
      throw new Error('未配置任何 Provider，请设置 PROVIDER_{NAME}_API_KEY/API_URL/MODEL 环境变量');
    }
    throw new Error(`Provider "${provider}" 未配置，可用: ${available.join(', ')}`);
  }
  return providerConfig;
}

// 获取可用的 Provider 列表
export function getAvailableProviders(config: AppConfig): string[] {
  return Object.keys(config.providers);
}

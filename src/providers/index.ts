import type { ProviderType } from '../types.js';
import { type ProviderAdapter } from './base.js';
import { OpenAIAdapter } from './openai.js';
import { GeminiAdapter } from './gemini.js';
import { OpenRouterAdapter } from './openrouter.js';

// Provider 注册表
const providerRegistry: Map<ProviderType, ProviderAdapter> = new Map();

// 注册默认 Provider
providerRegistry.set('openai', new OpenAIAdapter());
providerRegistry.set('gemini', new GeminiAdapter());
providerRegistry.set('openrouter', new OpenRouterAdapter());

// 获取 Provider 适配器
export function getProvider(type: ProviderType): ProviderAdapter {
  const provider = providerRegistry.get(type);
  if (!provider) {
    throw new Error(`不支持的 Provider: ${type}`);
  }
  return provider;
}

// 注册自定义 Provider
export function registerProvider(adapter: ProviderAdapter): void {
  providerRegistry.set(adapter.type, adapter);
}

// 获取所有支持的 Provider
export function getSupportedProviders(): ProviderType[] {
  return Array.from(providerRegistry.keys());
}

export { type ProviderAdapter } from './base.js';
export { OpenAIAdapter, resolveImagePayloads } from './openai.js';
export { GeminiAdapter } from './gemini.js';
export { OpenRouterAdapter, resolveOpenRouterImages } from './openrouter.js';

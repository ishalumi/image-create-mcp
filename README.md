# Image Create MCP

[![npm version](https://badge.fury.io/js/image-create-mcp.svg)](https://www.npmjs.com/package/image-create-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

多 Provider 支持的 AI 图片生成 MCP 服务器。支持 OpenAI (DALL-E)、Google Gemini、OpenRouter。

## 功能特性

- **多 Provider 支持**：OpenAI (DALL-E 3)、Gemini、OpenRouter
- **灵活配置**：通过环境变量配置
- **Provider 专属参数**：尺寸、质量、风格、宽高比等
- **自动保存**：将生成的图片保存到指定目录，支持自定义文件名
- **安全特性**：路径穿越防护、HTTPS 验证、大小限制

## 安装

### Claude Code 安装（推荐）

**用户级安装**（所有项目可用）：

```bash
claude mcp add image-create-mcp -s user -- npx image-create-mcp
```

**项目级安装**（仅当前项目可用）：

```bash
claude mcp add image-create-mcp -s project -- npx image-create-mcp
```

安装后需要设置环境变量，编辑对应的配置文件添加 `env` 字段。

### 手动配置

#### Claude Code / Claude Desktop

**用户级配置**（`~/.claude/claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "image-create": {
      "command": "npx",
      "args": ["-y", "image-create-mcp"],
      "env": {
        "OPENAI_API_KEY": "sk-xxx",
        "GEMINI_API_KEY": "xxx",
        "OPENROUTER_API_KEY": "sk-or-xxx"
      }
    }
  }
}
```

**项目级配置**（项目根目录 `.mcp.json`）：

```json
{
  "mcpServers": {
    "image-create": {
      "command": "npx",
      "args": ["-y", "image-create-mcp"],
      "env": {
        "OPENAI_API_KEY": "sk-xxx",
        "GEMINI_API_KEY": "xxx",
        "OPENROUTER_API_KEY": "sk-or-xxx"
      }
    }
  }
}
```

#### Cursor

在 Cursor MCP 设置中添加（`.cursor/mcp.json`）：

```json
{
  "mcpServers": {
    "image-create": {
      "command": "npx",
      "args": ["-y", "image-create-mcp"],
      "env": {
        "OPENAI_API_KEY": "sk-xxx",
        "GEMINI_API_KEY": "xxx",
        "OPENROUTER_API_KEY": "sk-or-xxx"
      }
    }
  }
}
```

#### Roo Code / Roo Cline

在 Roo 设置中添加：

```json
{
  "mcpServers": {
    "image-create": {
      "command": "npx",
      "args": ["-y", "image-create-mcp"],
      "env": {
        "OPENAI_API_KEY": "sk-xxx",
        "GEMINI_API_KEY": "xxx",
        "OPENROUTER_API_KEY": "sk-or-xxx"
      }
    }
  }
}
```

#### Windsurf

在 Windsurf MCP 配置中添加：

```json
{
  "mcpServers": {
    "image-create": {
      "command": "npx",
      "args": ["-y", "image-create-mcp"],
      "env": {
        "OPENAI_API_KEY": "sk-xxx",
        "GEMINI_API_KEY": "xxx",
        "OPENROUTER_API_KEY": "sk-or-xxx"
      }
    }
  }
}
```

#### Cline (VS Code 扩展)

在 Cline MCP 设置中添加：

```json
{
  "mcpServers": {
    "image-create": {
      "command": "npx",
      "args": ["-y", "image-create-mcp"],
      "env": {
        "OPENAI_API_KEY": "sk-xxx",
        "GEMINI_API_KEY": "xxx",
        "OPENROUTER_API_KEY": "sk-or-xxx"
      }
    }
  }
}
```

### 使用 npx 直接运行

```bash
npx image-create-mcp
```

### 全局安装

```bash
npm install -g image-create-mcp
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `OPENAI_API_KEY` | OpenAI API 密钥 | - |
| `OPENAI_BASE_URL` | OpenAI API 地址 | `https://api.openai.com/v1` |
| `OPENAI_IMAGE_MODEL` | OpenAI 图片模型 | `dall-e-3` |
| `GEMINI_API_KEY` | Gemini API 密钥 | - |
| `GEMINI_BASE_URL` | Gemini API 地址 | `https://generativelanguage.googleapis.com/v1beta` |
| `GEMINI_IMAGE_MODEL` | Gemini 图片模型 | `gemini-2.0-flash-exp-image-generation` |
| `OPENROUTER_API_KEY` | OpenRouter API 密钥 | - |
| `OPENROUTER_BASE_URL` | OpenRouter API 地址 | `https://openrouter.ai/api/v1` |
| `OPENROUTER_IMAGE_MODEL` | OpenRouter 图片模型 | `google/gemini-2.5-flash-preview:thinking` |
| `IMAGE_GEN_DEFAULT_PROVIDER` | 默认 Provider | `openai` |
| `IMAGE_GEN_OUTPUT_DIR` | 默认输出目录 | `.` |
| `IMAGE_GEN_FILENAME_PREFIX` | 默认文件名前缀 | `image` |
| `IMAGE_GEN_OVERWRITE` | 文件覆盖模式 | `suffix` |

## 工具使用

### generate_image

生成图片并保存到指定目录。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `provider` | string | 是 | `openai` / `gemini` / `openrouter` |
| `model` | string | 否 | 模型名称 |
| `prompt` | string | 否* | 图片描述 |
| `messages` | array | 否* | 对话消息（用于多轮对话） |
| `params` | object | 否 | Provider 专属参数 |
| `output` | object | 否 | 输出选项 |

*`prompt` 和 `messages` 至少提供一个

**Provider 专属参数：**

**OpenAI (DALL-E 3 / GPT-Image-1)：**
- `n`：生成数量 (1-10)
- `size`：`1024x1024` / `1792x1024` / `1024x1792`
- `quality`：`standard` / `hd` / `high`
- `style`：`vivid` / `natural`
- `response_format`：`url` / `b64_json`

**Gemini：**
- `aspectRatio`：`1:1` / `16:9` / `4:3` / `9:16` 等
- `imageSize`：`1K` / `2K` / `4K`

**OpenRouter：**
- `modalities`：`['image', 'text']`
- `temperature`：0-2
- `max_tokens`：正整数

**输出选项：**
- `dir`：输出目录（默认：当前目录）
- `filename`：文件名（不含扩展名）
- `overwrite`：`error` / `overwrite` / `suffix`

**示例：**

```json
{
  "provider": "openai",
  "prompt": "一只可爱的猫咪在阳光下睡觉",
  "params": {
    "size": "1024x1024",
    "quality": "hd"
  },
  "output": {
    "dir": "./images",
    "filename": "cute-cat"
  }
}
```

## 开发

```bash
# 克隆仓库
git clone https://github.com/ishailluminas/image-create-mcp.git
cd image-create-mcp

# 安装依赖
npm install

# 构建
npm run build

# 开发模式运行
npm run dev
```

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！

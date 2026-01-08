# Image Create MCP

[![npm version](https://badge.fury.io/js/image-create-mcp.svg)](https://www.npmjs.com/package/image-create-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

AI 图片生成 MCP 服务器。通过对话式接口调用图像生成模型，自动解析返回的 base64 或图床 URL 格式。

## 功能特性

- **自定义配置组**：可配置任意数量的 API 端点，名称自定义
- **对话式接口**：统一使用 `/chat/completions` 格式
- **自动解析**：自动识别返回的 base64 或 `![image](url)` 格式
- **自动保存**：将生成的图片保存到指定目录

## 安装

### Claude Code 安装

```bash
claude mcp add image-create-mcp -s user -- npx image-create-mcp
```

安装后编辑 `~/.claude.json` 添加环境变量。

### 手动配置

```json
{
  "mcpServers": {
    "image-create-mcp": {
      "command": "cmd",
      "args": ["/c", "npx", "image-create-mcp"],
      "env": {
        "PROVIDER_MYAPI_API_KEY": "sk-xxx",
        "PROVIDER_MYAPI_API_URL": "https://api.example.com/v1/chat/completions",
        "PROVIDER_MYAPI_MODEL": "gpt-image-1"
      }
    }
  }
}
```

## 环境变量

### 配置组格式

每个配置组需要 3 个环境变量，格式为 `PROVIDER_{NAME}_{FIELD}`：

| 变量 | 说明 |
|------|------|
| `PROVIDER_{NAME}_API_KEY` | API 密钥 |
| `PROVIDER_{NAME}_API_URL` | 完整请求地址 |
| `PROVIDER_{NAME}_MODEL` | 默认模型名称 |

`{NAME}` 可以是任意名称（大写字母、数字、下划线），例如：

```bash
# 配置组 "main"
PROVIDER_MAIN_API_KEY=sk-xxx
PROVIDER_MAIN_API_URL=https://api.example.com/v1/chat/completions
PROVIDER_MAIN_MODEL=gpt-image-1

# 配置组 "backup"
PROVIDER_BACKUP_API_KEY=sk-yyy
PROVIDER_BACKUP_API_URL=https://backup.example.com/v1/chat/completions
PROVIDER_BACKUP_MODEL=dall-e-3
```

### 通用配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `IMAGE_GEN_OUTPUT_DIR` | 默认输出目录 | `.` |
| `IMAGE_GEN_FILENAME_PREFIX` | 默认文件名前缀 | `image` |
| `IMAGE_GEN_OVERWRITE` | 文件覆盖模式 | `suffix` |

## 使用示例

```json
{
  "provider": "main",
  "prompt": "一只可爱的猫咪在阳光下睡觉",
  "images": ["./inputs/cat-1.png", "./inputs/cat-2.jpg"],
  "output": {
    "dir": "./images",
    "filename": "cute-cat"
  }
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `provider` | string | 是 | 配置组名称（小写） |
| `model` | string | 否 | 模型名称（覆盖默认配置） |
| `prompt` | string | 否* | 图片描述 |
| `messages` | array | 否* | 对话消息 |
| `images` | array | 否* | 上传图片路径列表（支持多图） |
| `output.dir` | string | 否 | 输出目录 |
| `output.filename` | string | 否 | 文件名（不含扩展名） |
| `output.overwrite` | string | 否 | `error` / `overwrite` / `suffix` |

*`prompt` / `messages` / `images` 至少提供一个

## 响应格式

服务器会自动解析以下返回格式：

- `![image](https://example.com/image.jpg)` - 图床 URL
- `![image](data:image/png;base64,...)` - Base64 数据

## 开发

```bash
git clone https://github.com/ishailluminas/image-create-mcp.git
cd image-create-mcp
npm install
npm run build
```

## 许可证

MIT

# Image Create MCP

[![npm version](https://badge.fury.io/js/image-create-mcp.svg)](https://www.npmjs.com/package/image-create-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

MCP server for AI image generation with multi-provider support. Generate images using OpenAI (DALL-E), Google Gemini, or OpenRouter.

## Features

- **Multi-Provider Support**: OpenAI (DALL-E 3), Gemini, OpenRouter
- **Flexible Configuration**: Configure via environment variables
- **Provider-Specific Parameters**: Size, quality, style, aspect ratio, etc.
- **Auto Save**: Save generated images to specified directory with custom filename
- **Security**: Path traversal protection, HTTPS validation, size limits

## Installation

### Using npx (Recommended)

No installation required, just configure in your AI tool:

```bash
npx image-create-mcp
```

### Global Installation

```bash
npm install -g image-create-mcp
```

## Configuration

### Claude Code

Add to your Claude Code MCP settings (`~/.claude/claude_desktop_config.json` or via Claude Code settings):

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

### Cursor

Add to Cursor MCP settings (`.cursor/mcp.json`):

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

### Roo Code / Roo Cline

Add to Roo settings:

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

### Windsurf

Add to Windsurf MCP configuration:

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

### Cline (VS Code Extension)

Add to Cline MCP settings:

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

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API Key | - |
| `OPENAI_BASE_URL` | OpenAI API Base URL | `https://api.openai.com/v1` |
| `OPENAI_IMAGE_MODEL` | OpenAI Image Model | `dall-e-3` |
| `GEMINI_API_KEY` | Gemini API Key | - |
| `GEMINI_BASE_URL` | Gemini API Base URL | `https://generativelanguage.googleapis.com/v1beta` |
| `GEMINI_IMAGE_MODEL` | Gemini Image Model | `gemini-2.0-flash-exp-image-generation` |
| `OPENROUTER_API_KEY` | OpenRouter API Key | - |
| `OPENROUTER_BASE_URL` | OpenRouter API Base URL | `https://openrouter.ai/api/v1` |
| `OPENROUTER_IMAGE_MODEL` | OpenRouter Image Model | `google/gemini-2.5-flash-preview:thinking` |
| `IMAGE_GEN_DEFAULT_PROVIDER` | Default Provider | `openai` |
| `IMAGE_GEN_OUTPUT_DIR` | Default Output Directory | `.` |
| `IMAGE_GEN_FILENAME_PREFIX` | Default Filename Prefix | `image` |
| `IMAGE_GEN_OVERWRITE` | File Overwrite Mode | `suffix` |

## Tool Usage

### generate_image

Generate images and save to specified directory.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider` | string | Yes | `openai` / `gemini` / `openrouter` |
| `model` | string | No | Model name |
| `prompt` | string | No* | Image description |
| `messages` | array | No* | Chat messages (for multi-turn) |
| `params` | object | No | Provider-specific parameters |
| `output` | object | No | Output options |

*Either `prompt` or `messages` is required

**Provider-Specific Parameters:**

**OpenAI (DALL-E 3 / GPT-Image-1):**
- `n`: Number of images (1-10)
- `size`: `1024x1024` / `1792x1024` / `1024x1792`
- `quality`: `standard` / `hd` / `high`
- `style`: `vivid` / `natural`
- `response_format`: `url` / `b64_json`

**Gemini:**
- `aspectRatio`: `1:1` / `16:9` / `4:3` / `9:16` / etc.
- `imageSize`: `1K` / `2K` / `4K`

**OpenRouter:**
- `modalities`: `['image', 'text']`
- `temperature`: 0-2
- `max_tokens`: positive integer

**Output Options:**
- `dir`: Output directory (default: current directory)
- `filename`: Filename without extension
- `overwrite`: `error` / `overwrite` / `suffix`

**Example:**

```json
{
  "provider": "openai",
  "prompt": "A cute cat sleeping in the sunshine",
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

## Development

```bash
# Clone repository
git clone https://github.com/ishailluminas/image-create-mcp.git
cd image-create-mcp

# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev
```

## License

MIT

## Contributing

Issues and Pull Requests are welcome!

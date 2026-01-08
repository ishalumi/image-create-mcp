import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { ImagePayload, OutputOptions, SavedImage } from './types.js';

// MIME 类型到扩展名映射
const mimeToExt: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

// 安全文件名正则（只允许字母、数字、下划线、连字符、点）
const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9_\-\.]+$/;

// 清洗文件名，防止路径穿越
function sanitizeFilename(filename: string): string {
  // 移除路径分隔符和危险字符
  let safe = path.basename(filename);
  // 移除开头的点（防止隐藏文件）
  safe = safe.replace(/^\.+/, '');
  // 替换不安全字符
  safe = safe.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  // 如果为空，使用默认名
  if (!safe) {
    safe = 'image';
  }
  return safe;
}

// 获取文件扩展名
function getExtension(mimeType: string): string {
  return mimeToExt[mimeType] || '.png';
}

// 确保目录存在
async function ensureDir(dir: string): Promise<void> {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

// 检查文件是否存在
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// 生成唯一文件名
async function getUniqueFilename(
  dir: string,
  filename: string,
  ext: string,
  overwrite: OutputOptions['overwrite']
): Promise<string> {
  const basePath = path.join(dir, `${filename}${ext}`);

  if (overwrite === 'overwrite') {
    return basePath;
  }

  if (!(await fileExists(basePath))) {
    return basePath;
  }

  if (overwrite === 'error') {
    throw new Error(`文件已存在: ${basePath}`);
  }

  // suffix 模式：添加数字后缀
  let counter = 1;
  let newPath = path.join(dir, `${filename}-${counter}${ext}`);
  while (await fileExists(newPath)) {
    counter++;
    newPath = path.join(dir, `${filename}-${counter}${ext}`);
  }
  return newPath;
}

// 保存单张图片
async function saveImage(
  payload: ImagePayload,
  dir: string,
  filename: string,
  index: number,
  overwrite: OutputOptions['overwrite']
): Promise<SavedImage> {
  const ext = getExtension(payload.mimeType);
  const indexedFilename = index > 0 ? `${filename}-${String(index + 1).padStart(2, '0')}` : filename;
  const filePath = await getUniqueFilename(dir, indexedFilename, ext, overwrite);

  await fs.writeFile(filePath, payload.bytes);

  return {
    path: filePath,
    mimeType: payload.mimeType,
    sizeBytes: payload.bytes.length,
    index,
    source: payload.source,
  };
}

// 保存多张图片
export async function saveImages(
  payloads: ImagePayload[],
  options: Required<OutputOptions>
): Promise<SavedImage[]> {
  const { dir, overwrite } = options;
  // 清洗文件名
  const filename = sanitizeFilename(options.filename);

  // 确保目录存在
  await ensureDir(dir);

  // 保存所有图片
  const results: SavedImage[] = [];
  for (let i = 0; i < payloads.length; i++) {
    const saved = await saveImage(payloads[i], dir, filename, i, overwrite);
    results.push(saved);
  }

  return results;
}

// 获取绝对路径
export function resolveOutputDir(dir: string, cwd?: string): string {
  if (path.isAbsolute(dir)) {
    return dir;
  }
  return path.resolve(cwd || process.cwd(), dir);
}

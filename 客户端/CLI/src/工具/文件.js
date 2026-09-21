/**
 * 文件工具
 */
import { existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

export const 运行目录 = (() => {
  if (process.execPath.endsWith(".exe") && !process.execPath.includes("node.exe")) {
    return dirname(process.execPath);
  }
  try { return join(dirname(fileURLToPath(import.meta.url)), "../.."); } catch {}
  return process.cwd();
})();

export const 下载目录 = join(运行目录, "下载");
if (!existsSync(下载目录)) mkdirSync(下载目录, { recursive: true });

export function 清理文件名(原始文件名) {
  return 原始文件名.replace(/[<>:"/\\|?*]/g, "_");
}

export function 创建小说目录(书名) {
  const 目录名 = 清理文件名(书名);
  const 目录路径 = join(下载目录, 目录名);
  if (!existsSync(目录路径)) mkdirSync(目录路径, { recursive: true });
  return 目录路径;
}

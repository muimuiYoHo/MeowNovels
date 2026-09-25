import { join } from "node:path";
import { mkdirSync } from "node:fs";

function 环境(键, 默认值) {
  const 值 = process.env[键];
  return 值 === undefined || 值 === "" ? 默认值 : 值;
}

export const 端口 = Number(环境("端口", "3000"));
export const 监听地址 = 环境("监听地址", "0.0.0.0");
export const 资源库根路径 = 环境("资源库根路径", "E:\\资源库\\轻小说");
export const 并发数 = Number(环境("并发数", "2"));
export const 最大JSON请求体 = 2_000_000;

export const 索引目录 = join(资源库根路径, "索引");
export const 库路径 = join(索引目录, "库.json");
export const 开放资源路径 = join(索引目录, "开放资源.json");
export const 待处理索引路径 = join(索引目录, "待处理.json");
export const 资源记录路径 = join(索引目录, "资源记录.json");
export const 待处理目录 = join(资源库根路径, "待处理");
export const 待更新目录 = join(资源库根路径, "待更新");
export const 人工目录 = join(资源库根路径, "人工");
export const 资源目录 = join(资源库根路径, "资源");
export const 全文目录 = join(资源目录, "全文");
export const 分卷目录 = join(资源目录, "分卷");

export const 行为表 = ["新增", "更新", "异常"];
export const 编码表 = ["utf8", "gbk", "big5"];
export const 语言表 = ["简", "繁"];

export function 行为对应目录(行为) {
  if (行为 === "新增") return 待处理目录;
  if (行为 === "更新") return 待更新目录;
  return 人工目录;
}

export function 确保目录() {
  for (const 目录 of [资源库根路径, 索引目录, 待处理目录, 待更新目录, 人工目录, 全文目录, 分卷目录]) {
    mkdirSync(目录, { recursive: true });
  }
}
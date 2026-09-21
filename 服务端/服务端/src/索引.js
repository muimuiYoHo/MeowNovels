import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { 库路径, 开放资源路径, 待处理索引路径, 资源记录路径 } from "./配置.js";

const 锁表 = new Map();

export function 串行(键, 任务) {
  const 上一把 = 锁表.get(键) || Promise.resolve();
  const 本次 = 上一把.then(任务, 任务);
  let 解锁;
  const 尾巴 = new Promise((完成) => { 解锁 = 完成; });
  锁表.set(键, 本次.then(解锁, 解锁));
  return 本次;
}

export function 读数组(路径) {
  if (!existsSync(路径)) return [];
  let 文本 = "";
  try { 文本 = readFileSync(路径, "utf8"); } catch { return []; }
  if (!文本.trim()) return [];
  try {
    const 值 = JSON.parse(文本);
    return Array.isArray(值) ? 值 : [];
  } catch {
    return [];
  }
}

export function 写数组(路径, 数组) {
  writeFileSync(路径, JSON.stringify(数组, null, 4));
}

export async function 改索引(路径, 修改函数) {
  return 串行(路径, () => {
    const 数组 = 读数组(路径);
    const 返回 = 修改函数(数组);
    if (返回 === false) return undefined;
    写数组(路径, 数组);
    return 返回;
  });
}

export const 改库 = (修改函数) => 改索引(库路径, 修改函数);
export const 改开放资源 = (修改函数) => 改索引(开放资源路径, 修改函数);
export const 改待处理 = (修改函数) => 改索引(待处理索引路径, 修改函数);
export const 改资源记录 = (修改函数) => 改索引(资源记录路径, 修改函数);

export const 读库 = () => 读数组(库路径);
export const 读开放资源 = () => 读数组(开放资源路径);
export const 读待处理 = () => 读数组(待处理索引路径);
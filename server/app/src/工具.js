import { createHash, randomBytes } from "node:crypto";

export function 今日8位(日期 = new Date()) {
  const 年 = 日期.getFullYear();
  const 月 = String(日期.getMonth() + 1).padStart(2, "0");
  const 日 = String(日期.getDate()).padStart(2, "0");
  return `${年}${月}${日}`;
}

export function 本地时间文本(日期 = new Date()) {
  return `${日期.getFullYear()}/${日期.getMonth() + 1}/${日期.getDate()}`;
}

export function 本地时刻文本(日期 = new Date()) {
  const 时 = String(日期.getHours()).padStart(2, "0");
  const 分 = String(日期.getMinutes()).padStart(2, "0");
  const 秒 = String(日期.getSeconds()).padStart(2, "0");
  return `${本地时间文本(日期)} ${时}:${分}:${秒}`;
}

export function 清洗名称(名称) {
  const 清洗 = String(名称 ?? "")
    .replace(/[\\/:*?"<>|\r\n]+/g, "")
    .trim();
  return 清洗.slice(0, 120) || "未命名";
}

export function 计算sha256(缓冲) {
  return createHash("sha256").update(缓冲).digest("hex");
}

export function 随机令牌(字符数 = 12) {
  return randomBytes(Math.ceil(字符数 / 2)).toString("hex").slice(0, 字符数);
}

export function 解析时间(文本) {
  if (!文本) return null;
  const 时间 = new Date(String(文本).replace(/-/g, "/"));
  return isNaN(时间.getTime()) ? null : 时间;
}

export function 解析长度(文本) {
  const 长度 = Number(文本);
  return Number.isFinite(长度) && 长度 >= 0 ? 长度 : null;
}

export function 字符数(文本) {
  return String(文本 ?? "").length;
}

export function 归一化编码(编码) {
  const 原 = String(编码 ?? "utf8").toLowerCase().trim();
  if (原 === "utf-8" || 原 === "utf8") return "utf8";
  if (原 === "gb2312" || 原 === "gb18030" || 原 === "ansi") return "gbk";
  if (原 === "big5" || 原 === "utf16le" || 原 === "utf-16le") return "big5";
  return 原;
}
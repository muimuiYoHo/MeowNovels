/**
 * 后端对接（喵小说服务端）
 * 查询资源 / 上报+上传 / 从后端下载
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname, isAbsolute } from "path";
import { createHash } from "crypto";
import iconv from "iconv-lite";
import { 运行目录, 下载目录, 清理文件名 } from "./文件.js";

function 读设置() {
  try {
    const 文本 = readFileSync(join(运行目录, "设置.json"), "utf8").replace(/^\uFEFF/, "");
    return JSON.parse(文本);
  } catch {
    return {};
  }
}

export function 服务端地址() {
  const 地址 = (读设置().服务端地址 || "").trim();
  return 地址 || null;
}

export function 归一化编码客户端(编码) {
  const 原 = String(编码 ?? "utf8").toLowerCase().trim();
  if (原 === "utf-8" || 原 === "utf8") return "utf8";
  if (原 === "ansi" || 原 === "gbk" || 原 === "gb2312" || 原 === "gb18030") return "gbk";
  if (原 === "big5") return "big5";
  return 原;
}

const 语言映射 = {
  wenku8: { utf8: "简", ansi: "简", big5: "繁" },
  esjzone: { 原: "繁", 简: "简", 繁: "繁" },
};

export function 推导语言(源id, 本地编码) {
  return (语言映射[源id] || {})[本地编码] || "简";
}

function 完整地址(路径) {
  const 地址 = 服务端地址();
  if (!地址) return null;
  return `${地址.replace(/\/+$/, "")}/${路径}`;
}

async function 请求JSON(路径, 数据) {
  const url = 完整地址(路径);
  if (!url) return { 成功: false, 错误: "未配置服务端地址" };
  const 开始 = Date.now();
  const 控制器 = new AbortController();
  const 定时器 = setTimeout(() => 控制器.abort(), 20000);
  try {
    const 响应 = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(数据),
      signal: 控制器.signal,
    });
    const 文本 = await 响应.text();
    const 结果 = (() => { try { return JSON.parse(文本); } catch { return { 成功: false, 错误: `响应不是 JSON: ${文本.slice(0, 120)}` }; } })();
    结果.耗时ms = Date.now() - 开始;
    return 结果;
  } catch (错误) {
    return { 成功: false, 错误: `后端不可用（${错误.message}）`, 耗时ms: Date.now() - 开始 };
  } finally {
    clearTimeout(定时器);
  }
}

export async function 查询资源(元数据) {
  return 请求JSON("任务", { 行为: "查询", ...元数据 });
}

export async function 下载文件(元数据, 保存路径) {
  const 地址 = 服务端地址();
  if (!地址) return { 成功: false, 错误: "未配置服务端地址" };
  const 查询串 = new URLSearchParams({
    行为: "下载",
    来源: 元数据.来源,
    外部id: 元数据.外部id,
    卷: 元数据.全文 ? "0" : String(元数据.卷 ?? "0"),
    编码: 归一化编码客户端(元数据.编码),
    语言: 元数据.语言 || "简",
  });
  const 控制器 = new AbortController();
  const 定时器 = setTimeout(() => 控制器.abort(), 60000);
  const 开始 = Date.now();
  try {
    const 响应 = await fetch(`${地址.replace(/\/$/, "")}/下载?${查询串.toString()}`, { signal: 控制器.signal });
    if (响应.status !== 200) {
      const 错误 = await 响应.text();
      return { 成功: false, 错误: `后端返回 ${响应.status}: ${错误.slice(0, 120)}`, 耗时ms: Date.now() - 开始 };
    }
    const 缓冲 = Buffer.from(await 响应.arrayBuffer());
    mkdirSync(dirname(保存路径), { recursive: true });
    writeFileSync(保存路径, 缓冲);
    return { 成功: true, 保存路径, 字节数: 缓冲.length, 耗时ms: Date.now() - 开始 };
  } catch (错误) {
    return { 成功: false, 错误: `下载失败（${错误.message}）`, 耗时ms: Date.now() - 开始 };
  } finally {
    clearTimeout(定时器);
  }
}

export function 计算sha256(缓冲) {
  return createHash("sha256").update(缓冲).digest("hex");
}

export function 计算全文长度(缓冲, 编码) {
  const 标准 = 归一化编码客户端(编码);
  if (标准 === "utf8") return Buffer.byteLength(缓冲);
  const 文本 = iconv.decode(缓冲, 标准);
  return Buffer.byteLength(文本, "utf8");
}

export async function 上报上传(元数据, 文件路径) {
  const 地址 = 服务端地址();
  if (!地址) return { 成功: false, 错误: "未配置服务端地址" };
  let 缓冲;
  try {
    缓冲 = readFileSync(文件路径);
  } catch (错误) {
    return { 成功: false, 错误: `读取文件失败: ${错误.message}` };
  }
  const 编码 = 归一化编码客户端(元数据.编码);
  const 报告 = {
    行为: 元数据.行为,
    来源: 元数据.来源,
    外部id: 元数据.外部id,
    名称: 元数据.名称,
    编码,
    全文: 元数据.全文,
    卷: 元数据.全文 ? "0" : String(元数据.卷 ?? "0"),
    语言: 元数据.语言 || "简",
    外部更新时间: 元数据.外部更新时间 || "",
    全文长度: String(计算全文长度(缓冲, 编码)),
    sha256: 计算sha256(缓冲),
  };
  const 报告结果 = await 请求JSON("任务", 报告);
  if (!报告结果.成功) return 报告结果;
  const 令牌 = 报告结果.令牌;
  const url = 完整地址(`上传/${令牌}`);
  if (!url) return { 成功: false, 错误: "未配置服务端地址" };
  const 控制器 = new AbortController();
  const 定时器 = setTimeout(() => 控制器.abort(), 60000);
  const 开始 = Date.now();
  try {
    const 文件名 = basename文件(文件路径) || `${清理文件名(报告.名称 || "未命名")}.txt`;
    const 响应 = await fetch(`${url}?文件名=${encodeURIComponent(文件名)}`, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: 缓冲,
      signal: 控制器.signal,
    });
    const 文本 = await 响应.text();
    const 结果 = JSON.parse(文本);
    结果.耗时ms = Date.now() - 开始;
    return 结果;
  } catch (错误) {
    return { 成功: false, 错误: `上传失败: ${错误.message}`, 耗时ms: Date.now() - 开始 };
  } finally {
    clearTimeout(定时器);
  }
}

function basename文件(路径) {
  const 清理 = String(路径 ?? "").split(/[\\/]/).pop() || "";
  return 清理;
}

export function 本地保存路径(书名, 卷名 = "") {
  const 目录 = 清理文件名(书名);
  const 文件 = 卷名 ? 清理文件名(卷名) : 目录;
  return isAbsolute(文件名) ? 文件名 : join(下载目录, 目录, `${文件}.txt`);
}
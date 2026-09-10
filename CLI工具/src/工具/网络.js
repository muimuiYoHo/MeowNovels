/**
 * HTTP 客户端 + Cookie 隔离
 */
import fetch from "node-fetch";
import iconv from "iconv-lite";

export const cookie库 = {};
function 获取域名key(url) {
  try { return new URL(url).hostname; } catch { return "default"; }
}

export async function 发送请求(url, 选项 = {}) {
  const { method = "GET", data, followRedirects = true, 编码 = null, headers: 额外头 = {}, 流式 = false, 超时 = 30000 } = 选项;
  const key = 获取域名key(url);
  const cookie串 = cookie库[key] || "";
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ...额外头,
    Cookie: cookie串,
  };
  if (data) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }
  const 响应 = await fetch(url, {
    method,
    headers,
    body: data ? new URLSearchParams(data).toString() : undefined,
    redirect: followRedirects ? "follow" : "manual",
    timeout: 超时,
  });
  const setCookie = 响应.headers.get("set-cookie");
  if (setCookie) {
    const 新cookie = setCookie.split(",").map((c) => c.split(";")[0]).join("; ");
    if (新cookie) cookie库[key] = 新cookie;
  }
  if (流式) {
    return {
      status: 响应.status,
      headers: Object.fromEntries(响应.headers.entries()),
      响应流: 响应.body,
    };
  }
  const buf = await 响应.arrayBuffer();
  const 原始内容 = Buffer.from(buf);
  return {
    status: 响应.status,
    url: 响应.url,
    headers: Object.fromEntries(响应.headers.entries()),
    body: 编码 ? iconv.decode(原始内容, 编码) : iconv.decode(原始内容, "utf-8"),
    raw: 原始内容,
  };
}

export async function 测试连通性(url) {
  const 开始 = Date.now();
  try {
    await fetch(url, { method: "HEAD", timeout: 5000, redirect: "follow" });
    return { 连通: true, 延迟: Date.now() - 开始 };
  } catch (e) {
    return { 连通: false, 延迟: Date.now() - 开始, 错误: e.message };
  }
}

export { iconv };

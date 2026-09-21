import http from "node:http";
import { 端口, 监听地址, 确保目录, 最大JSON请求体 } from "./配置.js";
import { 处理报告, 处理上传, 发JSON } from "./收集.js";
import { 查询结果 } from "./查询.js";
import { 准备下载 } from "./分销.js";
import { 本地时间文本, 本地时刻文本 } from "./工具.js";

确保目录();

function 读JSON请求体(请求) {
  return new Promise((完成, 拒绝) => {
    const 块们 = [];
    let 大小 = 0;
    请求.on("data", (块) => {
      大小 += 块.length;
      if (大小 > 最大JSON请求体) {
        请求.destroy();
        拒绝(new Error("请求体过大"));
        return;
      }
      块们.push(块);
    });
    请求.on("end", () => {
      try {
        完成(JSON.parse(Buffer.concat(块们).toString("utf8")));
      } catch {
        拒绝(new Error("无效的JSON请求体"));
      }
    });
    请求.on("error", 拒绝);
  });
}

async function 处理任务(请求, 响应) {
  const 参数 = await 读JSON请求体(请求);
   const 行为 = String(参数.行为 ?? "");

  if (行为 === "查询") {
    return 发JSON(响应, 200, 查询结果(参数));
  }

  if (行为 === "新增" || 行为 === "更新" || 行为 === "异常") {
    return 发JSON(响应, 200, 处理报告(参数));
  }

  return 发JSON(响应, 400, { 成功: false, 错误: `未知行为: ${行为}` });
}

function 处理下载(参数) {
  return 准备下载(参数);
}

function 响应下载(响应, 结果) {
  if (!结果.成功) {
    return 发JSON(响应, 结果.状态码 || 404, { 成功: false, 错误: 结果.错误 });
  }
  const 内容类型 =
    结果.编码 === "gbk" ? "text/plain; charset=gbk"
    : 结果.编码 === "big5" ? "text/plain; charset=big5"
    : "text/plain; charset=utf-8";
  响应.statusCode = 200;
  响应.setHeader("Content-Type", 内容类型);
  响应.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(结果.文件名)}`);
  响应.setHeader("Content-Length", 结果.缓冲.length);
  响应.end(结果.缓冲);
}

function 从查询参数取(搜索) {
  const 参数 = {};
  for (const [键, 值] of 搜索) 参数[键] = 值;
  return 参数;
}

const 服务器 = http.createServer(async (请求, 响应) => {
  响应.setHeader("Access-Control-Allow-Origin", "*");
  响应.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  响应.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (请求.method === "OPTIONS") {
    响应.statusCode = 204;
    响应.end();
    return;
  }

  try {
    const 网址 = new URL(请求.url || "/", `http://${请求.headers.host || "localhost"}`);
    const 路径 = decodeURIComponent(网址.pathname);

    if (请求.method === "GET" && 路径 === "/健康") {
      return 发JSON(响应, 200, { 成功: true, 服务: "喵小说服务端", 时间: 本地时间文本() });
    }

    if (请求.method === "POST" && 路径 === "/任务") {
      return await 处理任务(请求, 响应);
    }

    if (请求.method === "POST" && 路径.startsWith("/上传/")) {
      const 令牌 = decodeURIComponent(路径.slice("/上传/".length));
      return await 处理上传(令牌, 请求, 响应, 网址.searchParams.get("文件名"));
    }

    if (请求.method === "GET" && 路径 === "/下载") {
      const 结果 = await 准备下载(从查询参数取(网址.searchParams));
      return 响应下载(响应, 结果);
    }

    return 发JSON(响应, 404, { 成功: false, 错误: "接口不存在" });
  } catch (错误) {
    console.error(`[${本地时刻文本()}] [错误]`, 错误);
    return 发JSON(响应, 500, { 成功: false, 错误: `服务器错误: ${错误}` });
  }
});

服务器.listen(端口, 监听地址, () => {
  console.log(`[${本地时刻文本()}] 喵小说服务端已启动，地址 ${监听地址}，端口 ${端口}`);
});
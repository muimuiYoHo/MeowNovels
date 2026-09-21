/**
 * 文件下载
 * 统一下载入口：流 / 池
 */
import { isAbsolute, join, dirname } from "path";
import { mkdirSync } from "fs";
import { 发送请求 } from "./网络.js";
import { 创建写入流 } from "./文件写入.js";
import { 进度 } from "./下载进度.js";
import { 下载目录 } from "./文件.js";

function 解析路径(路径) {
  const 完整 = isAbsolute(路径) ? 路径 : join(下载目录, 路径);
  mkdirSync(dirname(完整), { recursive: true });
  return 完整;
}

async function 流式写入文件(下载url, 文件路径, 请求头 = {}) {
  const r = await 发送请求(下载url, { 流式: true, headers: 请求头 });
  if (r.status >= 400) throw new Error(`HTTP ${r.status}`);
  const 文件流 = 创建写入流(文件路径);
  let 字节数 = 0;
  for await (const 块 of r.响应流) {
    文件流.写入(块);
    字节数 += 块.length;
  }
  await 文件流.结束();
  return 字节数;
}

/**
 * 下载文件喵
 * 下载url → 流
 * 任务列表 → 池
 */
export async function 下载文件喵(配置) {
  const { 请求头 = {} } = 配置;


  if (配置.下载url) {
    const { 下载url, 下载路径 } = 配置;
    const 完整路径 = 解析路径(下载路径);
    const r = await 发送请求(下载url, { 流式: true, headers: 请求头 });
    if (r.status >= 400) throw new Error(`HTTP ${r.status}`);
    const 总大小 = parseInt(r.headers["content-length"] || "0");
    const 文件流 = 创建写入流(完整路径);
    const 显示 = 总大小 > 0 ? ["百分比", "速度", "剩余"] : ["速度", "已用时"];
    const 进度条 = new 进度({ 显示 });
    if (总大小 > 0) 进度条.设置总量(总大小);
    for await (const 块 of r.响应流) {
      文件流.写入(块);
      进度条.更新(块.length, 0);
    }
    进度条.完成(完整路径);
    await 文件流.结束();
    return 完整路径;
  }


  const { 任务列表, 解析函数, 写入流, 进度条, 转换 = (t) => t, 间隔 = 500, 并发数 = 5 } = 配置;
  const 是文件模式 = !解析函数;

  async function 处理任务(任务) {
    try {
      if (是文件模式) {
        const 字节数 = await 流式写入文件(任务.下载url, 解析路径(任务.下载路径), 请求头);
        进度条.更新(字节数, 1);
      } else {
        const 响应 = await 发送请求(任务.下载url);
        const { 标题, 正文 } = 解析函数(响应.body);
        const 内容 = 转换(正文);
        const 显示标题 = 转换(标题 || 任务.名称);
        写入流.写入(`${显示标题}\n${"-".repeat(30)}\n${内容}\n\n`);
        进度条.更新(Buffer.byteLength(内容, "utf-8"), 1);
      }
    } catch (e) {
      进度条.更新(0, 1);
      if (!是文件模式) 写入流.写入(`${任务.名称}\n[下载失败: ${e.message}]\n\n`);
      process.stderr.write(`\n${任务.名称} 下载失败: ${e.message}\n`);
    }
  }

  if (并发数 <= 1) {
    for (const 任务 of 任务列表) {
      await 处理任务(任务);
      await new Promise(r => setTimeout(r, 间隔));
    }
  } else {
    let 下一个 = 0;
    async function 工作者() {
      while (下一个 < 任务列表.length) {
        const 任务 = 任务列表[下一个++];
        await 处理任务(任务);
        await new Promise(r => setTimeout(r, 间隔));
      }
    }
    const 池 = Array.from({ length: Math.min(并发数, 任务列表.length) }, () => 工作者());
    await Promise.all(池);
  }
}

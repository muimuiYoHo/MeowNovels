/**
 * ESJ Zone 源模块
 */
import { 发送请求 } from "../工具/网络.js";
import { 清理文件名 } from "../工具/文件.js";
import { HTML转文本 } from "../工具/html解析.js";
import { 创建写入流 } from "../工具/文件写入.js";
import { 进度 } from "../工具/下载进度.js";
import { 下载文件喵 } from "../工具/文件下载.js";
import { 获取所有分页 } from "../工具/分页.js";
import { 创建转换函数 } from "../工具/繁简转换.js";

const 源id = "esjzone";
const 源名称 = "ESJ Zone";
const 源版本 = "0.2.0";
const 是否需要登录 = false;
const 基本域名 = "https://www.esjzone.one";
const 下载模式列表 = ["下载"];
const 编码选项 = {
  下载: [
    { label: "原文（繁体）", value: "原" },
    { label: "转换为简体", value: "简" },
    { label: "转换为繁体", value: "繁" },
  ],
};
const 菜单配置 = [
  { label: "搜索", action: "搜索" },
  { label: "使用轻小说id/详情页url直接下载", action: "直接下载" },
  { label: "资源站选择", action: "资源站" },
];
const 地址模式 = /\/detail\/(\d+)\.html/;


function 解析搜索结果(内容) {
  const 结果 = [];
  const 卡片 = 内容.split(/class="card mb-30"/);
  for (let i = 1; i < 卡片.length; i++) {
    const 块 = 卡片[i];
    const 链接匹配 = 块.match(/href="\/detail\/(\d+)\.html"[^>]*>([^<]+)<\/a>/);
    if (!链接匹配) continue;
    const 书id = 链接匹配[1];
    const 书名 = 链接匹配[2].trim();
    const 作者匹配 = 块.match(/icon-pen-tool[^>]*><\/i>\s*<a[^>]*>([^<]+)<\/a>/);
    const 作者 = 作者匹配 ? 作者匹配[1].trim() : "";
    const 字数匹配 = 块.match(/icon-file-text[^>]*><\/i>([^<]+)/);
    const 字数 = 字数匹配 ? 字数匹配[1].trim().replace(/,/g, "") : "0";
    结果.push({ id: 书id, title: 书名, author: 作者, 字数, removed: false });
  }
  return 结果;
}

function 解析章节内容(body) {
  const 标题匹配 = body.match(/<h2>([^<]+)<\/h2>/);
  const 标题 = 标题匹配 ? 标题匹配[1].trim() : "";
  const 内容匹配 = body.match(/<div class="forum-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<div|<\/section)/);
  let 正文 = "";
  if (内容匹配) {
    正文 = HTML转文本(内容匹配[1]);
  }
  return { 标题, 正文 };
}


export const 源 = {
  id: 源id,
  名称: 源名称,
  版本: 源版本,
  需要登录: 是否需要登录,
  域名: 基本域名,
  下载模式: 下载模式列表,
  编码映射: 编码选项,
  菜单: 菜单配置,
  urlPattern: 地址模式,

  async 搜索(关键词, 选项 = {}) {
    let 总页数 = 1;
    const 结果 = await 获取所有分页(
      `${基本域名}/tags/${关键词}/1.html`,
      (body) => {
        const m = body.match(/total:\s*(\d+)/);
        总页数 = m ? parseInt(m[1]) : 1;
        return { 结果: 解析搜索结果(body), 总页数 };
      },
      { 间隔: 2000 }
    );
    return { 结果, 总页数 };
  },

  async 获取章节列表(书id) {
    const r = await 发送请求(`${基本域名}/detail/${书id}.html`);
    const 内容 = r.body;
    const 结果 = [];
    const chapterList匹配 = 内容.match(/id="chapterList"([\s\S]*?)<\/div>/);
    const chapterList区域 = chapterList匹配 ? chapterList匹配[1] : "";
    const 章节匹配 = chapterList区域.matchAll(/href="(?:https?:\/\/[^"]+)?\/forum\/(\d+)\/(\d+)\.html"[^>]*data-title="([^"]*)"/g);
    for (const m of 章节匹配) {
      const 章节书id = m[1];
      const 帖子id = m[2];
      const 标题 = m[3].trim();
      if (!标题 || 章节书id !== 书id) continue;
      结果.push({ 名称: 标题, id: `/forum/${章节书id}/${帖子id}.html` });
    }
    return 结果;
  },

  async 下载(书id, 书名, 模式, 选项 = {}) {
    const 繁简 = 选项.编码 || "原";
    console.log(`正在获取章节列表...`);
    const 章节列表 = await this.获取章节列表(书id);
    if (章节列表.length === 0) throw new Error("未找到章节");
    console.log(`共 ${章节列表.length} 章\n`);
    const 文件路径 = `${清理文件名(书名)}/${清理文件名(书名)}.txt`;
    const 写入流 = 创建写入流(文件路径);
    const 转换 = 创建转换函数(繁简);
    写入流.写入(`${转换(书名)}\n${"=".repeat(40)}\n\n`);
    const 进度条 = new 进度({ 显示: ["百分比", "章进度", "章速", "体积", "速度", "剩余"] });
    进度条.设置总量(章节列表.length);
    const 任务列表 = 章节列表.map(章节 => ({
      下载url: 章节.id.startsWith("http") ? 章节.id : `${基本域名}${章节.id}`,
      名称: 章节.名称,
    }));
    await 下载文件喵({ 任务列表, 解析函数: 解析章节内容, 写入流, 进度条, 转换 });
    进度条.完成(文件路径);
    await 写入流.结束();
    return 文件路径;
  },
};

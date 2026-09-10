/**
 * Wenku8 源模块
 */
import { 发送请求, cookie库, iconv } from "../工具/网络.js";
import { 清理文件名 } from "../工具/文件.js";
import { 剥离标签 } from "../工具/html解析.js";
import { 进度 } from "../工具/下载进度.js";
import { 下载文件喵 } from "../工具/文件下载.js";
import { 解析注册结果 } from "../注册.js";

const 基本域名 = "https://www.wenku8.net";
const 下载域名 = "https://dl.wenku8.com";
const 源id = "wenku8";
const 源名称 = "文库8";
const 源版本 = "0.2.0";
const 是否需要登录 = true;
const 下载模式 = ["全文", "分卷"];
const 编码选项 = {
  全文: [
    { label: "UTF-8", value: "utf8" },
    { label: "ANSI/GBK", value: "ansi" },
    { label: "Big5 繁体", value: "big5" },
  ],
  分卷: [
    { label: "UTF-8", value: "utf-8" },
    { label: "GBK", value: "gbk" },
    { label: "Big5 繁体", value: "big5" },
  ],
};
const 菜单配置 = [
  { label: "按书名搜索", action: "搜索书名" },
  { label: "按作者搜索", action: "搜索作者" },
  { label: "使用轻小说id/详情页url直接下载", action: "直接下载" },
  { label: "设置/修改登录信息", action: "登录" },
  { label: "资源站选择", action: "资源站" },
];
const 地址模式 = /\/book\/(\d+)\.htm/;
const 编码类型 = { utf8: "utf8", ansi: "txt" };
const 载点 = [1, 2];


function 构建url(书id, 编码 = "utf8", 载点编号 = 1) {
  return `${下载域名}/down.php?type=${编码类型[编码] || 编码类型.utf8}&node=${载点编号}&id=${书id}`;
}

function 构建分卷url(书id, vid, 编码 = "utf-8") {
  return `${下载域名}/packtxt.php?aid=${书id}&vid=${vid}&charset=${编码}`;
}

function 处理关键词的编码(文本) {
  const gbk = iconv.encode(文本, "gbk");
  return [...gbk].map((b) => `%${b.toString(16).toUpperCase().padStart(2, "0")}`).join("");
}

function 解析搜索结果(内容) {
  const 结果 = [];
  const 已处理 = new Set();
  for (const m of 内容.matchAll(/\/book\/(\d+)\.htm/g)) {
    const 书id = m[1];
    if (已处理.has(书id)) continue;
    已处理.add(书id);
    const idx = 内容.indexOf(`/book/${书id}.htm`);
    if (idx < 0) continue;
    const start = Math.max(0, idx - 500);
    const 前文 = 内容.substring(start, idx);
    const divStart = 前文.lastIndexOf('<div style="width:373px');
    if (divStart < 0) continue;
    const 块 = 内容.substring(start + divStart, start + divStart + 1500);
    let 书名 = ""; const 名 = 块.match(/title="([^"]*)"/); if (名) 书名 = 名[1];
    let 作者 = ""; const 作 = 块.match(/作者:([^/]+)\//); if (作) 作者 = 作[1].trim();
    let 分类 = ""; const 类 = 块.match(/\/分类:([^<]+)/); if (类) 分类 = 类[1].trim();
    let 状态 = ""; if (块.includes("已完结")) 状态 = "已完结"; else if (块.includes("连载中")) 状态 = "连载中";
    let 简介 = ""; const 简 = 块.match(/简介:([^<]+)/); if (简) 简介 = 简[1].trim();
    let tags = []; const t = 块.match(/Tags:.*?<span[^>]*>([^<]+)<\/span>/); if (t) tags = t[1].trim().split(/\s+/);
    let 封面 = ""; const 封 = 块.match(/src="([^"]*\.jpg)"/); if (封) 封面 = 封[1];
    结果.push({ id: 书id, title: 书名, author: 作者, category: 分类, status: 状态, summary: 简介, cover: 封面, tags, removed: 块.includes("下架") });
  }
  return 结果;
}
function 获取总页数(内容) {
  const m = 内容.match(/<em id="pagestats">(\d+)\/(\d+)<\/em>/);
  return m ? parseInt(m[2]) : 1;
}

export const 源 = {
  id: 源id,
  名称: 源名称,
  版本: 源版本,
  需要登录: 是否需要登录,
  域名: 基本域名,
  下载模式: 下载模式,
  编码映射: 编码选项,
  菜单: 菜单配置,
  urlPattern: 地址模式,

  async 注册(用户名, 密码) {
    const 邮箱 = `${用户名}@muimui.com`;
    try {
      const r = await 发送请求(`${基本域名}/register.php?do=submit`, {
        method: "POST",
        data: { username: 用户名, password: 密码, repassword: 密码, email: 邮箱, viewemail: "0", sex: "0", qq: "", url: "", action: "newuser" },
        编码: "gbk",
        followRedirects: false,
      });
      return 解析注册结果(r);
    } catch (e) {
      return { 成功: false, 错误: `错误: ${e.message}` };
    }
  },

  async 登录(用户名, 密码) {
    await 发送请求(`${基本域名}/`);
    await 发送请求(`${基本域名}/login.php?do=submit&jumpurl=${基本域名}/index.php`, {
      method: "POST",
      data: { username: 用户名, password: 密码, usecookie: "315360000", action: "login" },
      followRedirects: false,
    });
    if (!(cookie库["www.wenku8.net"] || "").includes("jieqiUserInfo")) return { 成功: false, 错误: "登录失败喵，请检查用户名和密码" };
    return { 成功: true };
  },

  async 搜索(关键词, 选项 = {}) {
    const 搜索类型 = 选项.搜索类型 || "articlename";
    const 搜索内容 = 处理关键词的编码(关键词);
    const 基础url = `${基本域名}/modules/article/search.php?searchtype=${搜索类型}&searchkey=${搜索内容}`;
    let 响应 = await 发送请求(`${基础url}&page=1`, {
      followRedirects: false,
      headers: { Referer: `${基本域名}/` },
    });
    if (响应.status >= 300 && 响应.status < 400) {
      const 重定向 = 响应.headers.location || "";
      if (重定向.includes("login.php")) throw new Error("搜索需要登录，请先登录");
      const m = 重定向.match(/\/book\/(\d+)\.htm/);
      if (m) {
        const 详情 = await this.获取详情(m[1]);
        详情.精确匹配 = true;
        return { 结果: [详情], 总页数: 1 };
      }
      const 跳转 = 重定向.startsWith("http") ? 重定向 : `${基本域名}` + 重定向;
      响应 = await 发送请求(跳转, { 编码: "gbk" });
    } else {
      响应.body = iconv.decode(响应.raw, "gbk");
    }
    const 内容 = 响应.body;
    const 总页数 = 获取总页数(内容);
    const 所有结果 = 解析搜索结果(内容);
    for (let 页 = 2; 页 <= 总页数; 页++) {
      process.stderr.write(`正在获取第 ${页}/${总页数} 页...\n`);
      await new Promise((r) => setTimeout(r, 5000));
      for (let n = 0; n < 2; n++) {
        const r2 = await 发送请求(`${基础url}&page=${页}`, {
          followRedirects: false,
          headers: { Referer: `${基本域名}/` },
        });
        if (r2.status >= 300) break;
        const c = iconv.decode(r2.raw, "gbk");
        const p = 解析搜索结果(c);
        if (p.length) { 所有结果.push(...p); break; }
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    return { 结果: 所有结果, 总页数 };
  },

  async 获取详情(书id) {
    const r = await 发送请求(`${基本域名}/book/${书id}.htm`, { 编码: "gbk" });
    const 内容 = r.body;
    const 取 = (re, g = 1) => { const m = 内容.match(re); return m ? m[g].trim() : ""; };
    return {
      id: 书id,
      title: 取(/<b>([^<]+)<\/b>/) || "未知",
      author: 取(/小说作者[：:]([^<]+)/),
      category: 取(/文库分类[：:]([^<]+)/),
      status: 取(/文章状态[：:]([^<]+)/),
      更新日期: 取(/最后更新[：:]([^<]+)/),
      字数: 取(/全文长度[：:]([^<]+)/),
      summary: 剥离标签(取(/内容简介[：:](.*?)<\/td>/).slice(0, 200)),
      cover: 取(/src="(http:\/\/img\.wenku8\.com\/[^"]+)"/),
      tags: [],
      removed: false,
    };
  },

  async 获取章节列表(书id) {
    const r = await 发送请求(`${基本域名}/modules/article/packshow.php?id=${书id}&type=txt`, { 编码: "gbk" });
    const 内容 = r.body;
    const 结果 = [];
    const 行 = 内容.split(/<tr[\s>]/);
    for (const 块 of 行) {
      const 卷名匹配 = 块.match(/<td class="odd">([^<]+)<\/td>/);
      const vid匹配 = 块.match(/vid=(\d+)/);
      if (卷名匹配 && vid匹配) {
        结果.push({ 名称: 卷名匹配[1].trim(), id: vid匹配[1] });
      }
    }
    return 结果;
  },

  async 下载(书id, 书名, 模式, 选项 = {}) {
    const 请求头 = { Referer: `${基本域名}/` };
    if (模式 === "全文") {
      const 编码 = 选项.编码 || "utf8";
      const 下载路径 = `${清理文件名(书名)}/${清理文件名(书名)}.txt`;
      console.log(`正在下载: ${书名}...`);
      const 指定载点 = 选项.载点 || 0;
      const 载点顺序 = 指定载点 ? [指定载点] : 载点;
      for (const 载点编号 of 载点顺序) {
        const 下载url = 构建url(书id, 编码, 载点编号);
        console.log(`载点${载点编号}: ${下载url}`);
        try {
          return await 下载文件喵({ 下载url, 下载路径, 请求头 });
          // return await 下载文件喵({ 下载url: url, 下载路径: 文件路径, 请求头 });
        } catch (错误) {
          console.log(`载点${载点编号}失败: ${错误.message}`);
        }
      }
      throw new Error("所有载点均失败");
    }
    if (模式 === "分卷") {
      const 编码 = 选项.编码 || "utf-8";
      const 分卷列表 = 选项.分卷;
      if (!分卷列表 || 分卷列表.length === 0) throw new Error("未指定分卷");
      const 进度条 = new 进度({ 显示: ["百分比", "卷进度", "速度", "剩余"] });
      进度条.设置总量(分卷列表.length);
      const 书名目录 = 清理文件名(书名);
      const 任务列表 = 分卷列表.map(卷 => ({
        下载url: 构建分卷url(书id, 卷.id, 编码),
        下载路径: `${书名目录}/${清理文件名(卷.名称)}.txt`,
        名称: 卷.名称,
      }));
      await 下载文件喵({ 任务列表, 请求头, 进度条, 并发数: 1, 间隔: 0 });
      进度条.完成();
      return;
    }
    throw new Error(`未知下载模式: ${模式}`);
  },
};

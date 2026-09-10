#!/usr/bin/env node
/**
 * 轻小说下载工具 — 主界面
 * 通过源模块接口调度各资源站
 */
import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, dirname, isAbsolute } from "path";
import { fileURLToPath } from "url";
import * as readline from "readline";
import { 生成用户名 } from "./注册.js";
import { 测试连通性 } from "./工具/网络.js";
import { 服务端地址, 查询资源, 下载文件, 上报上传, 归一化编码客户端, 推导语言, 计算sha256 } from "./工具/后端.js";
import { 下载目录, 清理文件名 } from "./工具/文件.js";
import { 源注册表 } from "./源注册.js";

// ===== 运行目录 =====
const 运行目录 = (() => {
  if (process.execPath.endsWith(".exe") && !process.execPath.includes("node.exe")) {
    return dirname(process.execPath);
  }
  try { return join(dirname(fileURLToPath(import.meta.url)), ".."); } catch {}
  return process.cwd();
})();

function 获取源注册表() { return 源注册表; }

let 当前源 = null;

if (process.platform === "win32") try { execSync("chcp 65001", { stdio: "ignore" }); } catch {}// 设置UTF8

const 账号文件路径 = join(运行目录, "账号.json");
const 设置文件路径 = join(运行目录, "设置.json");

// 加载 UI 外部>内嵌
const 默认UI = {"标题":"轻小说下载工具","分隔线":"------------------------------------------------","返回提示":"直接回车返回主菜单。","按回车返回":"回车返回...","正在搜索":"正在搜索: {关键词}...","搜索结果标题":"找到 {数量} 个结果 (共 {页数} 页):","输入序号提示":"输入序号下载（直接回车返回）: ","确认下载":"确认下载? (Y/n): ","下载全文":"下载全文","分卷下载":"分卷下载","选择编码":"选择编码:","下载完成等待":"{秒数} 秒后返回主菜单...","再见":"再见！","当前账号":"当前账号: {账号}","未登录":"当前账号: 未登录（搜索时自动注册）","当前源":"当前源: {源}","主菜单提示":"请选择操作:","主菜单选项":["按书名搜索","按作者搜索","使用轻小说id/详情页url直接下载","设置/修改登录信息","资源站选择","退出"],"源列表":["wenku8","esjzone"],"源已切换":"已切换到: {源}","设置登录标题":"设置登录信息","设置登录说明":"登录信息用于搜索功能，下载无需登录","设置登录保存位置":"信息保存在本地 wenku8配置.json 中。","用户名提示":"用户名/邮箱: ","密码提示":"密码: ","登录保存成功":"[OK] 登录信息已保存！","用户名密码不能为空":"[错误] 用户名和密码不能为空","直接下载标题":"直接下载","输入ID提示":"请输入小说 ID 或详情页 URL: ","无效ID":"[错误] 请输入有效的数字 ID","搜索需要登录":"[提示] 搜索需要登录，请先设置登录信息。","搜索书名关键词":"请输入书名关键词: ","搜索作者关键词":"请输入作者关键词: ","搜索失败":"[错误] 搜索失败: {错误}","需要重新登录":"请重新设置登录信息。","未找到结果":"没找到结果喵...","无效选择":"[错误] 无效的选择","书名标签":"书名: ","作者标签":"作者: ","状态标签":"状态: ","未知":"未知","已下架警告":"[警告] 该书已标记为下架","下载失败":"[错误] 下载失败: {错误}","程序错误":"程序错误: {错误}","搜索间隔提示":"等搜索的时候不要急，心急喝不了冰阔乐，又不是我要你等5s","精确匹配到":"精确匹配到: {书名} (id:{id})","按类型搜索":"按{类型}搜索","更新日期":"更新: {日期}","字数":"字数: {字数}","连载中":"连载中","已完结":"已完结","已下架标记":"[已下架]","返回":"返回"};
const UI = (() => {
  try {
    const 外部路径 = existsSync(join(运行目录, "ui.json"))
      ? join(运行目录, "ui.json")
      : join(运行目录, "src", "ui.json");
    return { ...默认UI, ...JSON.parse(readFileSync(外部路径, "utf-8")) };
  } catch {
    return 默认UI;
  }
})();

// ANSI 颜色
const UI文本颜色 = {
  重置: "\x1b[0m",
  亮: "\x1b[1m",
  红: "\x1b[31m",
  绿: "\x1b[32m",
  黄: "\x1b[33m",
  蓝: "\x1b[38;5;117m",
  紫: "\x1b[35m",
  青: "\x1b[36m",
  灰: "\x1b[90m",
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
function 询问(提示) {
  return new Promise((resolve) => {
    rl.question(提示, (答案) => resolve(答案));
  });
}
function 选择菜单(提示, 选项) {
  return new Promise((resolve) => {
    console.log(提示);
    选项.forEach((opt, i) => {
      console.log(`  ${UI文本颜色.青}${i + 1}${UI文本颜色.重置}. ${opt}`);
    });
    console.log(`  ${UI文本颜色.灰}0. ${UI.返回}${UI文本颜色.重置}`);
    console.log("");
    rl.question(`${UI文本颜色.亮}> ${UI文本颜色.重置}`, (答案) => {
      const 数字 = parseInt(答案);
      if (数字 === 0) {
        resolve(-2);
      } else if (数字 >= 1 && 数字 <= 选项.length) {
        resolve(数字 - 1);
      } else {
        resolve(-1);
      }
    });
  });
}

function 加载JSON(路径) {
  if (existsSync(路径)) {
    try { return JSON.parse(readFileSync(路径, "utf-8")); } catch {}
  }
  return {};
}

function 保存JSON(路径, 数据) {
  writeFileSync(路径, JSON.stringify(数据, null, 2), "utf-8");
}

function 加载账号(平台) {
  if (!existsSync(账号文件路径)) {
    保存JSON(账号文件路径, {});
  }
  const 全部 = 加载JSON(账号文件路径);
  return 全部[平台] || {};
}

function 保存账号(平台, 账号) {
  const 全部 = 加载JSON(账号文件路径);
  全部[平台] = 账号;
  保存JSON(账号文件路径, 全部);
}

const 默认设置 = { 连通测试: true, 服务端地址: "", 允许上传: true };

function 加载设置() {
  if (!existsSync(设置文件路径)) {
    保存JSON(设置文件路径, 默认设置);
    return { ...默认设置 };
  }
  return { ...默认设置, ...加载JSON(设置文件路径) };
}

function 保存设置(设置) {
  const 当前 = 加载设置();
  Object.assign(当前, 设置);
  保存JSON(设置文件路径, 当前);
}
function 清屏() {
  process.stdout.write("\x1B[2J\x1B[0f");
}

function 打印标题() {
  console.log(`${UI文本颜色.蓝}================================================${UI文本颜色.重置}`);
  console.log(`${UI文本颜色.亮}          ${UI.标题}${UI文本颜色.重置}`);
  console.log(`${UI文本颜色.蓝}================================================${UI文本颜色.重置}`);
  console.log("");
}

function 打印分隔线() {
  console.log(`\x1b[38;5;117m${UI.分隔线}${UI文本颜色.重置}`);
}

async function 等待返回(秒数 = 10) {
  const 提示 = 模板替换(UI.下载完成等待, { 秒数: String(秒数) });
  process.stdout.write(`\n${UI文本颜色.绿}${提示}${UI文本颜色.重置}`);
  for (let i = 秒数; i > 0; i--) {
    process.stdout.write(`\r${UI文本颜色.绿}${模板替换(UI.下载完成等待, { 秒数: String(i) })}${UI文本颜色.重置}`);
    await new Promise((r) => setTimeout(r, 1000));
  }
  process.stdout.write("\r" + " ".repeat(60) + "\r");
}

function 模板替换(模板, 变量) {
  let 结果 = 模板;
  for (const [键, 值] of Object.entries(变量)) {
    结果 = 结果.replace(`{${键}}`, 值);
  }
  return 结果;
}

// ===== 搜索结果格式化 =====
function 格式化搜索结果(结果列表) {
  if (!结果列表 || 结果列表.length === 0) return "未找到结果";
  return 结果列表
    .map((item, index) => {
      const 序号 = `${UI文本颜色.青}${index + 1}${UI文本颜色.重置}`;
      const 书名 = `${UI文本颜色.亮}${item.title}${UI文本颜色.重置}`;
      const 下架 = item.removed ? ` ${UI文本颜色.红}${UI.已下架标记}${UI文本颜色.重置}` : "";
      const 状态 = item.status === "已完结" ? ` ${UI文本颜色.绿}${item.status}${UI文本颜色.重置}`
        : item.status === "连载中" ? ` ${UI文本颜色.黄}${item.status}${UI文本颜色.重置}` : "";
      const 作者 = item.author ? ` - ${UI文本颜色.紫}${item.author}${UI文本颜色.重置}` : "";
      const 分类 = item.category ? ` ${UI文本颜色.灰}[${item.category}]${UI文本颜色.重置}` : "";
      const 字数 = item.字数 ? ` ${UI文本颜色.灰}| ${item.字数}字${UI文本颜色.重置}` : "";
      return `${序号}. ${书名}${下架}${状态} ${UI文本颜色.灰}(id:${item.id})${UI文本颜色.重置}${作者}${分类}${字数}`;
    })
    .join("\n");
}

// ===== 自动注册 =====
async function 自动注册(最大重试 = 3) {
  console.log(`${UI文本颜色.灰}未检测到账号，正在自动注册...${UI文本颜色.重置}`);
  const 密码 = "123456";

  for (let 尝试 = 0; 尝试 < 最大重试; 尝试++) {
    const 用户名 = 生成用户名();
    try {
      const 结果 = await 当前源.注册(用户名, 密码);
      if (结果.成功) {
        保存账号(当前源.id, { 用户名, 密码 });
        const 登录结果 = await 当前源.登录(用户名, 密码);
        if (登录结果.成功) {
          console.log(`${UI文本颜色.绿}已自动注册并登录: ${用户名}${UI文本颜色.重置}`);
        } else {
          console.log(`${UI文本颜色.绿}已注册: ${用户名}${UI文本颜色.重置}`);
        }
        await new Promise((r) => setTimeout(r, 1000));
        return true;
      }
      // 名称/邮箱重复，重试
      if (结果.错误 && (结果.错误.includes("已存在") || 结果.错误.includes("已注册"))) {
        console.log(`${UI文本颜色.灰}${用户名} 已被占用，重试中...${UI文本颜色.重置}`);
        continue;
      }
      // 其他错误，不重试
      console.log(`${UI文本颜色.黄}自动注册失败: ${结果.错误}${UI文本颜色.重置}`);
      break;
    } catch (e) {
      console.log(`${UI文本颜色.红}注册过程出错: ${e.message}${UI文本颜色.重置}`);
      break;
    }
  }
  console.log(`${UI文本颜色.灰}请手动设置账号${UI文本颜色.重置}`);
  await new Promise((r) => setTimeout(r, 2000));
  return false;
}

function 解析多选(输入, 总数) {
  const 选择集 = new Set();
  for (const 片段 of 输入.split(",")) {
    const 范围 = 片段.trim().match(/^(\d+)-(\d+)$/);
    if (范围) {
      const 起 = parseInt(范围[1]);
      const 止 = parseInt(范围[2]);
      for (let i = 起; i <= 止 && i <= 总数; i++) {
        if (i >= 1) 选择集.add(i);
      }
    } else if (/^\d+$/.test(片段.trim())) {
      const 数字 = parseInt(片段.trim());
      if (数字 >= 1 && 数字 <= 总数) 选择集.add(数字);
    }
  }
  return [...选择集].sort((a, b) => a - b);
}

// ===== 后端同步 =====
function 后端元数据(源, 书id, 书名, 卷, 全文, 编码, 目标小说 = null) {
  const 标准化 = 归一化编码客户端(编码);
  let 更新时间 = 目标小说?.更新日期 || "";
  let 长度 = "";
  const 字数原文 = String(目标小说?.字数 ?? "").replace(/,/g, "");
  const 万字匹配 = 字数原文.match(/^([\d.]+)万/);
  if (万字匹配) 长度 = String(Math.round(parseFloat(万字匹配[1]) * 10000));
  else if (/^\d+$/.test(字数原文)) 长度 = 字数原文;
  return {
    来源: 源.id,
    外部id: String(书id),
    名称: 书名,
    编码: 标准化,
    全文,
    卷: 全文 ? "0" : String(卷),
    语言: 推导语言(源.id, 标准化),
    外部更新时间: 更新时间,
    全文长度: 长度,
  };
}

function 上传提示(结果, 元数据) {
  const 耗时 = 结果.耗时ms != null ? ` ${结果.耗时ms}ms` : "";
  if (结果.成功) {
    console.log(`${UI文本颜色.绿}[后端] 已同步上传${耗时}: ${元数据.名称}${元数据.全文 ? "" : ` 卷${元数据.卷}`} (${结果.处理行为 || 元数据.行为}) sha256=${(结果.sha256 || "").slice(0, 12)}${UI文本颜色.重置}`);
  } else {
    console.log(`${UI文本颜色.黄}[后端] 上传失败${耗时}: ${结果.错误}${UI文本颜色.重置}`);
  }
}

async function 询问后端决策(元数据) {
  const 地址 = 服务端地址();
  if (!地址) return { 模式: "官方" };
  console.log(`${UI文本颜色.灰}[后端] 查询: ${元数据.来源}/${元数据.外部id} 卷${元数据.卷}${UI文本颜色.重置}`);
  const 查询 = await 查询资源(元数据);
  if (!查询.成功) {
    console.log(`${UI文本颜色.灰}[后端] 查询失败${查询.耗时ms != null ? `（${查询.耗时ms}ms）` : ""}: ${查询.错误}${UI文本颜色.重置}`);
    return { 模式: "官方" };
  }
  console.log(`${UI文本颜色.灰}[后端] 状态: ${查询.状态}${查询.耗时ms != null ? `（${查询.耗时ms}ms）` : ""} — ${查询.消息}${UI文本颜色.重置}`);
  if (查询.状态 === "需人工") {
    console.log(`${UI文本颜色.黄}[后端] 该资源需人工处理，本次仅官方下载不上传${UI文本颜色.重置}`);
    return { 模式: "官方", 不上传: true };
  }
  if (查询.状态 !== "最新") return { 模式: "官方" };
  if (查询.资源?.库?.sha256) {
    console.log(`${UI文本颜色.灰}[后端] 服务器 sha256: ${查询.资源.库.sha256.slice(0, 16)}…${UI文本颜色.重置}`);
  }
  const 选择 = await 选择菜单(`已收录: ${元数据.名称}，请选择:`, ["从服务器直接下载", "仍从官方下载并同步", "跳过"]);
  if (选择 === 0) return { 模式: "后端" };
  if (选择 === 1) return { 模式: "官方" };
  return { 模式: "跳过" };
}

async function 后端下载(元数据, 保存路径) {
  console.log(`${UI文本颜色.灰}[后端] 开始下载: ${元数据.名称}${元数据.全文 ? " 全文" : ` 卷${元数据.卷}`}${UI文本颜色.重置}`);
  const 结果 = await 下载文件(元数据, 保存路径);
  if (结果.成功) {
    console.log(`${UI文本颜色.绿}[后端] 已从服务器下载${结果.耗时ms != null ? `（${结果.耗时ms}ms` : ""}${结果.字节数 != null ? `，${结果.字节数} 字节` : ""}${结果.耗时ms != null ? "）" : ""}: ${结果.保存路径}${UI文本颜色.重置}`);
  } else {
    console.log(`${UI文本颜色.黄}[后端] 下载失败${结果.耗时ms != null ? `（${结果.耗时ms}ms）` : ""}: ${结果.错误}${UI文本颜色.重置}`);
  }
  return 结果;
}

async function 上传到后端(元数据, 文件路径) {
  const 绝对路径 = isAbsolute(文件路径) ? 文件路径 : join(process.cwd(), 文件路径);
  const 设置 = 加载设置();
  if (设置.允许上传 === false) {
    console.log(`${UI文本颜色.灰}[后端] 上传许可已关闭（设置 允许上传=false），本次不上传: ${元数据.名称}${元数据.全文 ? "" : ` 卷${元数据.卷}`}${UI文本颜色.重置}`);
    return { 成功: true, 跳过: true, 原因: "上传许可关闭" };
  }
  // 内容相同时跳过上传：查询服务器 sha256，与本地文件一致则不上传
  console.log(`${UI文本颜色.灰}[后端] 上传前比对 sha256: ${元数据.来源}/${元数据.外部id} 卷${元数据.卷}${UI文本颜色.重置}`);
  const 查询 = await 查询资源(元数据);
  const 服务器哈希 = 查询.资源?.库?.sha256;
  if (服务器哈希) {
    try {
      const 本地哈希 = 计算sha256(readFileSync(绝对路径));
      console.log(`${UI文本颜色.灰}[后端] 比对: 本地 ${本地哈希.slice(0, 16)}… vs 服务器 ${服务器哈希.slice(0, 16)}…${UI文本颜色.重置}`);
      if (本地哈希 === 服务器哈希) {
        console.log(`${UI文本颜色.灰}[后端] 内容与服务器一致（sha256 相同），跳过上传: ${元数据.名称}${元数据.全文 ? "" : ` 卷${元数据.卷}`}${UI文本颜色.重置}`);
        return { 成功: true, 跳过: true, 原因: "sha256 一致" };
      }
    } catch {}
  }
  const 结果 = await 上报上传({ ...元数据, 行为: "更新" }, 绝对路径);
  上传提示(结果, 元数据);
  return 结果;
}

function 分卷文件路径(书名, 卷名) {
  return join(下载目录, 清理文件名(书名), 清理文件名(卷名) + ".txt");
}

// ===== 分卷下载流程 =====
async function 分卷下载流程(书id, 书名, 编码 = "utf-8", 目标小说 = null) {
  console.log(`${UI文本颜色.灰}正在获取分卷列表...${UI文本颜色.重置}`);
  let 分卷列表;
  try {
    分卷列表 = await 当前源.获取章节列表(书id);
  } catch (错误) {
    console.log(`${UI文本颜色.红}获取分卷列表失败: ${错误.message}${UI文本颜色.重置}`);
    return;
  }
  if (!分卷列表 || 分卷列表.length === 0) {
    console.log(`${UI文本颜色.黄}未找到分卷信息${UI文本颜色.重置}`);
    return;
  }

  while (true) {
    console.log("");
    打印分隔线();
    console.log(`${UI文本颜色.亮}共 ${分卷列表.length} 卷:${UI文本颜色.重置}`);
    打印分隔线();
    分卷列表.forEach((卷, i) => {
      console.log(`  ${UI文本颜色.青}${i + 1}${UI文本颜色.重置}. ${卷.名称}`);
    });
    打印分隔线();
    console.log(`  ${UI文本颜色.青}all${UI文本颜色.重置}. 下载全部`);
    console.log(`  ${UI文本颜色.灰}0. 返回${UI文本颜色.重置}`);
    console.log("");

    const 输入 = await 询问(`${UI文本颜色.亮}> ${UI文本颜色.重置}`);
    if (!输入.trim() || 输入.trim() === "0") break;

    let 待下载序号 = [];
    if (输入.trim().toLowerCase() === "all") {
      待下载序号 = 分卷列表.map((_, i) => i + 1);
    } else {
      待下载序号 = 解析多选(输入.trim(), 分卷列表.length);
    }
    if (待下载序号.length === 0) {
      console.log(`\n${UI文本颜色.红}${UI.无效选择}${UI文本颜色.重置}`);
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }

    console.log("");
    const 选择的分卷 = 待下载序号.map(i => 分卷列表[i - 1]);
    try {
      await 当前源.下载(书id, 书名, "分卷", { 编码, 分卷: 选择的分卷 });
    } catch (错误) {
      console.log(`${UI文本颜色.红}下载失败: ${错误.message}${UI文本颜色.重置}`);
      continue;
    }
    if (服务端地址()) {
      const 卷元数据 = 选择的分卷.map(卷 => ({
        ...后端元数据(当前源, 书id, 书名, 卷.id, false, 编码, 目标小说),
        卷: String(卷.id),
      }));
      for (const 元 of 卷元数据) {
        const 卷名称 = 选择的分卷.find(卷 => String(卷.id) === 元.卷)?.名称 || 元.卷;
        const 文件 = 分卷文件路径(书名, 卷名称);
        if (existsSync(文件)) await 上传到后端(元, 文件);
        else console.log(`${UI文本颜色.黄}[后端] 找不到文件: ${文件}${UI文本颜色.重置}`);
      }
    }
  }
}

async function 需要登录() {
  const 账号 = 加载账号(当前源.id);
  if (账号.用户名 && 账号.密码) return true;

  const 选择 = await 选择菜单("需要账号才能使用:", ["帮我注册临时账号", "现在注册账号"]);
  if (选择 === -2 || 选择 === -1) return false;

  if (选择 === 0) {
    return await 自动注册();
  } else {
    await 设置登录();
    const 新账号 = 加载账号(当前源.id);
    return !!(新账号.用户名 && 新账号.密码);
  }
}

// ===== 资源站选择 =====
async function 资源站选择() {
  const 注册表 = 获取源注册表();
  const 选项 = 注册表.map(源 => `${源.名称} ${UI文本颜色.灰}v${源.版本}${UI文本颜色.重置}${源 === 当前源 ? " (当前)" : ""}`);
  const 选择 = await 选择菜单("选择资源站:", 选项);
  if (选择 === -2 || 选择 === -1) return;
  当前源 = 注册表[选择];
  console.log(`\n${UI文本颜色.绿}${模板替换(UI.源已切换, { 源: 当前源.名称 })}${UI文本颜色.重置}`);
  await new Promise((r) => setTimeout(r, 1000));
}

// ===== 主菜单 =====
async function 主菜单() {
  let 连通结果 = null;
  while (true) {
    const 设置预读 = 加载设置();
    const 连通Promise = 设置预读.连通测试 !== false && 当前源.域名 ? 测试连通性(当前源.域名) : null;
    清屏();
    打印标题();

    const 设置 = 加载设置();
    // 登录状态（仅需要登录的源显示）
    if (当前源.需要登录) {
      const 账号 = 加载账号(当前源.id);
      if (账号.用户名) {
        console.log(`${UI文本颜色.灰}${模板替换(UI.当前账号, { 账号: 账号.用户名 })}${UI文本颜色.重置}`);
      } else {
        console.log(`${UI文本颜色.灰}${UI.未登录}${UI文本颜色.重置}`);
      }
    }
    连通结果 = 连通Promise ? await 连通Promise : null;
    const 状态 = 设置.连通测试 !== false && 连通结果 ? (连通结果.连通 ? `${UI文本颜色.绿}${连通结果.延迟}ms${UI文本颜色.重置}` : `${UI文本颜色.红}断开${UI文本颜色.重置}`) : "";
    console.log(`${UI文本颜色.灰}${模板替换(UI.当前源, { 源: 当前源.名称 })}${UI文本颜色.重置}  ${状态}`);
    console.log("");

    // 按源声明的菜单渲染
    const 菜单项 = 当前源.菜单;
    const 选择 = await 选择菜单(UI.主菜单提示, 菜单项.map(m => m.label));
    if (选择 === -2) {
      console.log(`\n${UI文本颜色.绿}${UI.再见}${UI文本颜色.重置}`);
      rl.close();
      process.exit(0);
    }
    if (选择 === -1) {
      console.log(`\n${UI文本颜色.红}${UI.无效选择}${UI文本颜色.重置}`);
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }
    const 动作 = 动作表[菜单项[选择].action];
    if (动作) await 动作();
  }
}

async function 设置登录() {
  清屏();
  打印标题();
  console.log(`  ${UI文本颜色.亮}${UI.设置登录标题}${UI文本颜色.重置}`);
  打印分隔线();
  console.log(UI.设置登录说明);
  console.log(`${UI文本颜色.灰}${UI.返回提示}${UI文本颜色.重置}\n`);
  const 用户名 = await 询问(`${UI文本颜色.青}${UI.用户名提示}${UI文本颜色.重置}`);
  if (!用户名.trim()) return;
  const 密码 = await 询问(`${UI文本颜色.青}${UI.密码提示}${UI文本颜色.重置}`);
  if (!密码.trim()) return;
  保存账号(当前源.id, { 用户名: 用户名.trim(), 密码: 密码.trim() });
  console.log(`\n${UI文本颜色.绿}${UI.登录保存成功}${UI文本颜色.重置}`);
  await new Promise((r) => setTimeout(r, 1500));
}

// ===== 输入ID下载 =====
async function 输入ID下载() {
  清屏();
  打印标题();
  console.log(`  ${UI文本颜色.亮}${UI.直接下载标题}${UI文本颜色.重置}`);
  打印分隔线();
  console.log(`${UI文本颜色.灰}${UI.返回提示}${UI文本颜色.重置}\n`);
  const 书id输入 = await 询问(`${UI文本颜色.青}${UI.输入ID提示}${UI文本颜色.重置}`);
  if (!书id输入.trim()) return;
  let 书id = 书id输入.trim();
  // 根据各源的 urlPattern 自动识别并切换
  for (const s of 获取源注册表()) {
    if (s.urlPattern) {
      const m = 书id输入.match(s.urlPattern);
      if (m) { 书id = m[1]; 当前源 = s; break; }
    }
  }
  if (!/^\d+$/.test(书id)) {
    console.log(`\n${UI文本颜色.红}${UI.无效ID}${UI文本颜色.重置}`);
    await new Promise((r) => setTimeout(r, 1500));
    return;
  }

  const 源 = 当前源;

  // 选择下载模式（仅一个模式时跳过）
  let 模式;
  if (源.下载模式.length === 1) {
    模式 = 源.下载模式[0];
  } else {
    const 模式索引 = await 选择菜单("\n选择下载方式:", 源.下载模式);
    if (模式索引 === -2) return;
    模式 = 源.下载模式[模式索引];
  }

  // 选择编码
  const 编码选项 = 源.编码映射[模式];
  const 编码索引 = await 选择菜单("\n选择编码:", 编码选项.map(o => o.label));
  if (编码索引 === -2) return;
  const 编码 = 编码选项[编码索引].value;

  console.log("");
  try {
    if (模式 === "分卷") {
      await 分卷下载流程(书id, `小说_${书id}`, 编码);
      await 等待返回();
    } else {
      const 元数据 = 后端元数据(源, 书id, `小说_${书id}`, 0, true, 编码);
      const 决策 = await 询问后端决策(元数据);
      if (决策.模式 === "跳过") { await 等待返回(); return; }
      const 保存路径 = join(下载目录, 清理文件名(`小说_${书id}`), `小说_${书id}.txt`);
      if (决策.模式 === "后端") {
        await 后端下载(元数据, 保存路径);
        await 等待返回();
        return;
      }
      const 结果路径 = await 源.下载(书id, `小说_${书id}`, 模式, { 编码 });
      if (决策.不上传 || !服务端地址()) { await 等待返回(); return; }
      await 上传到后端(元数据, 结果路径 || 保存路径);
      await 等待返回();
    }
  } catch (错误) {
    console.log(`\n${UI文本颜色.红}${模板替换(UI.下载失败, { 错误: 错误.message })}${UI文本颜色.重置}`);
    await new Promise((r) => setTimeout(r, 3000));
  }
}

// ===== 搜索 =====
async function 搜索流程(类型) {
  清屏();
  打印标题();

  const 源 = 当前源;
  if (源.需要登录) if (!await 需要登录()) return;  // 需要登录的源先处理登录
  
  const 类型名 = 类型 === "书名" ? "书名" : "作者";
  console.log(`  ${UI文本颜色.亮}${模板替换(UI.按类型搜索, { 类型: 类型名 })}${UI文本颜色.重置}`);
  打印分隔线();
  console.log(`${UI文本颜色.灰}${UI.返回提示}${UI文本颜色.重置}`);
  if (源.需要登录) console.log(`${UI文本颜色.黄}${UI.搜索间隔提示}${UI文本颜色.重置}`);
  
  console.log("");
  const 关键词提示 = 类型 === "书名" ? UI.搜索书名关键词 : UI.搜索作者关键词;
  const 关键词 = await 询问(`${UI文本颜色.青}${关键词提示}${UI文本颜色.重置}`);
  if (!关键词.trim()) return;

  // 登录
  if (源.需要登录) {
    const 账号 = 加载账号(源.id);
    const 登录结果 = await 源.登录(账号.用户名, 账号.密码);
    if (!登录结果.成功) {
      console.log(`\n${UI文本颜色.红}${模板替换(UI.搜索失败, { 错误: 登录结果.错误 })}${UI文本颜色.重置}`);
      await new Promise((r) => setTimeout(r, 3000));
      return;
    }
  }

  const 搜索类型 = 类型 === "作者" ? "author" : "articlename";
  console.log(`\n${UI文本颜色.灰}${模板替换(UI.正在搜索, { 关键词: 关键词.trim() })}${UI文本颜色.重置}`);

  let 搜索结果;
  try {
    搜索结果 = await 源.搜索(关键词.trim(), { 搜索类型 });
  } catch (错误) {
    console.log(`\n${UI文本颜色.红}${模板替换(UI.搜索失败, { 错误: 错误.message })}${UI文本颜色.重置}`);
    if (错误.message.includes("登录")) {
      console.log(UI.需要重新登录);
    }
    await new Promise((r) => setTimeout(r, 3000));
    return;
  }

  const 结果列表 = 搜索结果.结果;
  const 总页数 = 搜索结果.总页数;
  if (结果列表.length === 0) {
    console.log(`\n${UI文本颜色.黄}${UI.未找到结果}${UI文本颜色.重置}`);
    await new Promise((r) => setTimeout(r, 2000));
    return;
  }

  // 精确匹配（wenku8 302 重定向到详情页）
  let 目标小说 = null;
  if (结果列表.length === 1 && 结果列表[0].精确匹配) {
    console.log(`\n${UI文本颜色.绿}${模板替换(UI.精确匹配到, { 书名: 结果列表[0].title, id: 结果列表[0].id })}${UI文本颜色.重置}`);
    目标小说 = 结果列表[0];
  }

  if (!目标小说) {
    // 显示搜索结果
    console.log("");
    打印分隔线();
    console.log(`${UI文本颜色.亮}${模板替换(UI.搜索结果标题, { 数量: String(结果列表.length), 页数: String(总页数) })}${UI文本颜色.重置}`);
    打印分隔线();
    console.log(格式化搜索结果(结果列表));
    打印分隔线();
    // 选择
    const 输入 = await 询问(`\n${UI文本颜色.青}${UI.输入序号提示}${UI文本颜色.重置}`);
    if (!输入.trim()) return;
    if (/^\d+$/.test(输入.trim())) {
      const 数字 = parseInt(输入.trim());
      if (数字 >= 1 && 数字 <= 结果列表.length) {
        目标小说 = 结果列表[数字 - 1];
      }
    }

    if (!目标小说) {
      console.log(`\n${UI文本颜色.红}${UI.无效选择}${UI文本颜色.重置}`);
      await new Promise((r) => setTimeout(r, 1500));
      return;
    }
  }

  // 显示书籍信息
  console.log(`\n${UI.书名标签}${UI文本颜色.亮}${目标小说.title}${UI文本颜色.重置}`);
  console.log(`${UI.作者标签}${目标小说.author || UI.未知}`);
  if (目标小说.status) {
    const 状态色 = 目标小说.status === "已完结" ? UI文本颜色.绿 : UI文本颜色.黄;
    console.log(`${UI.状态标签}${状态色}${目标小说.status}${UI文本颜色.重置}`);
  }
  if (目标小说.更新日期) console.log(`${UI文本颜色.灰}${模板替换(UI.更新日期, { 日期: 目标小说.更新日期 })}${UI文本颜色.重置}`);
  if (目标小说.字数) console.log(`${UI文本颜色.灰}${模板替换(UI.字数, { 字数: 目标小说.字数 })}${UI文本颜色.重置}`);
  if (目标小说.removed) {
    console.log(`${UI文本颜色.红}${UI.已下架警告}${UI文本颜色.重置}`);
  }

  // 选择下载模式
  let 模式;
  if (源.下载模式.length === 1) {
    模式 = 源.下载模式[0];
  } else {
    const 模式索引 = await 选择菜单("", 源.下载模式);
    if (模式索引 === -2) return;
    模式 = 源.下载模式[模式索引];
  }

  // 选择编码
  const 编码选项 = 源.编码映射[模式];
  const 编码索引 = await 选择菜单("\n选择编码:", 编码选项.map(o => o.label));
  if (编码索引 === -2) return;
  const 编码 = 编码选项[编码索引].value;

  console.log("");
  try {
    if (模式 === "分卷") {
      await 分卷下载流程(目标小说.id, 目标小说.title, 编码, 目标小说);
      await 等待返回();
    } else {
      const 元数据 = 后端元数据(源, 目标小说.id, 目标小说.title, 0, true, 编码, 目标小说);
      const 决策 = await 询问后端决策(元数据);
      if (决策.模式 === "跳过") { await 等待返回(); return; }
      const 保存路径 = join(下载目录, 清理文件名(目标小说.title), 清理文件名(目标小说.title) + ".txt");
      if (决策.模式 === "后端") {
        await 后端下载(元数据, 保存路径);
        await 等待返回();
        return;
      }
      const 结果路径 = await 源.下载(目标小说.id, 目标小说.title, 模式, { 编码 });
      if (决策.不上传 || !服务端地址()) { await 等待返回(); return; }
      await 上传到后端(元数据, 结果路径 || 保存路径);
      await 等待返回();
    }
  } catch (错误) {
    console.log(`\n${UI文本颜色.红}${模板替换(UI.下载失败, { 错误: 错误.message })}${UI文本颜色.重置}`);
    await new Promise((r) => setTimeout(r, 3000));
  }
}

// ===== 启动 =====
当前源 = 源注册表[0];
主菜单().catch((错误) => {
  console.error(`${UI文本颜色.红}${模板替换(UI.程序错误, { 错误: 错误.message })}${UI文本颜色.重置}`);
  rl.close();
  process.exit(1);
});


const 动作表 = {
  搜索书名: () => 搜索流程("书名"),
  搜索作者: () => 搜索流程("作者"),
  搜索: () => 搜索流程("书名"),
  直接下载: () => 输入ID下载(),
  登录: () => 设置登录(),
  资源站: () => 资源站选择(),
};

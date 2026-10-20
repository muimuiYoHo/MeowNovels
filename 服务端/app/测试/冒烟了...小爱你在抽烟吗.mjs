import { readFileSync, existsSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import iconv from "iconv-lite";

const 测试库 = "D:\\Mui服务喵\\测试库\\轻小说";
rmSync(测试库, { recursive: true, force: true });
for (const 目录 of ["索引", "待处理", "待更新", "人工", "资源\\全文", "资源\\分卷"]) {
  mkdirSync(`${测试库}\\${目录}`, { recursive: true });
}
for (const 文件 of ["库.json", "开放资源.json", "待处理.json", "资源记录.json"]) {
  writeFileSync(`${测试库}\\索引\\${文件}`, "[]");
}

process.env.资源库根路径 = 测试库;
process.env.端口 = "3999";
process.env.监听地址 = "127.0.0.1";
process.env.并发数 = "2";

await import(pathToFileURL("D:\\Mui服务喵\\喵小说\\服务端\\src\\主.js"));
await 等(500);

const 地址 = "http://127.0.0.1:3999";
let 通过数 = 0;
let 失败数 = 0;

function 断言(条件, 名称, 详情) {
  if (条件) { 通过数++; console.log(`  [通过] ${名称}`); }
  else { 失败数++; console.log(`  [失败] ${名称} ${详情 ?? ""}`); }
}

function 等(毫秒) { return new Promise((完成) => setTimeout(完成, 毫秒)); }

async function 等处理(条件, 超时毫秒 = 10000) {
  const 起点 = Date.now();
  while (Date.now() - 起点 < 超时毫秒) {
    if (条件()) return true;
    await 等(200);
  }
  return false;
}

function 读JSON(路径) {
  try { return JSON.parse(readFileSync(路径, "utf8")); } catch { return []; }
}

async function 请求JSON(路径, 体) {
  const 响应 = await fetch(地址 + 路径, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(体),
  });
  return { 状态: 响应.status, 数据: await 响应.json() };
}

async function 报告并上传(行为, 信息, 文件路径) {
  const 报告 = await 请求JSON("/任务", { 行为, ...信息 });
  if (!报告.数据.成功) throw new Error(`报告失败: ${JSON.stringify(报告.数据)}`);
  const 令牌 = 报告.数据.令牌;
  const 缓冲 = readFileSync(文件路径);
  const 上传 = await fetch(地址 + `/上传/${令牌}?文件名=${encodeURIComponent(文件路径.split(/[\\/]/).pop())}`, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: 缓冲,
  });
  return { 报告: 报告.数据, 上传: await 上传.json() };
}

function 计算sha256(缓冲) {
  return createHash("sha256").update(缓冲).digest("hex");
}

const 库 = () => 读JSON("D:\\Mui服务喵\\测试库\\轻小说\\索引\\库.json");
const 开放资源 = () => 读JSON("D:\\Mui服务喵\\测试库\\轻小说\\索引\\开放资源.json");
const 待处理 = () => 读JSON("D:\\Mui服务喵\\测试库\\轻小说\\索引\\待处理.json");
const 资源记录 = () => 读JSON("D:\\Mui服务喵\\测试库\\轻小说\\索引\\资源记录.json");

console.log("== 1. 健康检查 ==");
const 健康 = await fetch(地址 + "/健康").then((r) => r.json());
断言(健康.成功 === true, "健康检查");

console.log("== 2. 查询不存在的资源 ==");
const 查空 = await 请求JSON("/任务", { 行为: "查询", 来源: "mm", 外部id: "99999", 卷: "0" });
断言(查空.数据.状态 === "不存在", "不存在资源返回 不存在", JSON.stringify(查空.数据));

console.log("== 3. 新增入库：书A（utf8 简体 全文） ==");
const 书A = readFileSync("D:\\Mui服务喵\\测试\\书A.txt");
const shaA = await 计算sha256(书A);
const 新增A = await 报告并上传("新增", {
  来源: "mm", 外部id: "1001", 名称: "测试之书", 编码: "utf8", 全文: true, 卷: "0", 语言: "简",
  外部更新时间: "2026/8/7", 全文长度: "3", sha256: shaA,
}, "D:\\Mui服务喵\\测试\\书A.txt");
断言(新增A.上传.成功 === true, "书A 上传成功");
断言(新增A.上传.sha256 === shaA, "书A sha256 一致");
const 等A = await 等处理(() => 库().some((行) => 行.外部id === "1001" && 行.Mui轻小说id === 1));
断言(等A, "书A 处理入库完成");
const 行A = 库().find((行) => 行.外部id === "1001");
断言(行A && 行A.Mui轻小说id === 1, "书A 获得 Muiid=1", JSON.stringify(行A));
断言(行A && existsSync(行A.本地位置), "书A 文件落盘", 行A?.本地位置);
断言(行A && 行A.本地位置.includes("全文") && 行A.本地位置.endsWith("1.txt"), "书A 位置为 全文/测试之书/1.txt", 行A?.本地位置);
const 开放A = 开放资源().find((行) => 行.Mui轻小说id === 1);
断言(开放A && 开放A.开放状态 === 1, "书A 已开放");

console.log("== 4. 查询最新 ==");
const 查A = await 请求JSON("/任务", { 行为: "查询", 来源: "mm", 外部id: "1001", 卷: "0", 编码: "utf8", 语言: "简", 外部更新时间: "2026/8/7", 全文长度: "3" });
断言(查A.数据.状态 === "最新", "书A 查询=最新", JSON.stringify(查A.数据));
断言(查A.数据.下载 && 查A.数据.下载.url, "书A 返回下载url");

console.log("== 5. 下载验证 ==");
const 下载简 = await fetch(地址 + "/下载?行为=下载&来源=mm&外部id=1001&卷=0&编码=utf8&语言=简");
const 下载文本 = await 下载简.text();
断言(下载简.status === 200 && 下载文本.includes("今天是2026年8月7日"), "下载 utf8 简体内容正确");
const 下载GBK = await fetch(地址 + "/下载?行为=下载&来源=mm&外部id=1001&卷=0&编码=gbk&语言=简");
const gbk缓冲 = Buffer.from(await 下载GBK.arrayBuffer());
const gbk文本 = iconv.decode(gbk缓冲, "gbk");
断言(下载GBK.status === 200 && gbk文本.includes("今天是2026年8月7日"), "下载 gbk 转换正确", gbk文本.slice(0, 30));
const 下载繁 = await fetch(地址 + "/下载?行为=下载&来源=mm&外部id=1001&卷=0&编码=utf8&语言=繁");
const 繁文本 = await 下载繁.text();
断言(下载繁.status === 200 && 繁文本.includes("今天是2026年8月7日") && 繁文本.includes("測試"), "下载 繁体 转换正确", 繁文本.slice(0, 40));

console.log("== 6. 新增分卷 ==");
const 书卷 = readFileSync("D:\\Mui服务喵\\测试\\书A.txt");
const sha卷 = await 计算sha256(书卷);
const 新增卷 = await 报告并上传("新增", {
  来源: "mm", 外部id: "1001", 名称: "测试之书", 编码: "utf8", 全文: false, 卷: "1", 语言: "简",
  外部更新时间: "2026/8/7", 全文长度: "3", sha256: sha卷,
}, "D:\\Mui服务喵\\测试\\书A.txt");
await 等处理(() => 库().some((行) => 行.外部id === "1001" && String(行.卷) === "1"));
const 行卷 = 库().find((行) => 行.外部id === "1001" && String(行.卷) === "1");
断言(行卷 && 行卷.Mui轻小说id === 2, "分卷 获得 Muiid=2", JSON.stringify(行卷));
断言(行卷 && 行卷.本地位置.endsWith("2-1.txt"), "分卷文件名为 id-卷.txt", 行卷?.本地位置);
断言(行卷 && 行卷.本地位置.includes("分卷"), "分卷在 分卷 目录");

console.log("== 7. GBK繁体转UTF8简体入库 ==");
const 书B = readFileSync("D:\\Mui服务喵\\测试\\书B.txt");
const shaB = await 计算sha256(书B);
const 新增B = await 报告并上传("新增", {
  来源: "esj", 外部id: "2001", 名称: "繁体之书", 编码: "gbk", 全文: true, 卷: "0", 语言: "繁",
  外部更新时间: "2026/8/7", 全文长度: "3", sha256: shaB,
}, "D:\\Mui服务喵\\测试\\书B.txt");
await 等处理(() => 库().some((行) => 行.外部id === "2001"));
const 行B = 库().find((行) => 行.外部id === "2001");
断言(行B && 行B.Mui轻小说id === 3, "书B Muiid=3");
const 存储B = 行B ? readFileSync(行B.本地位置, "utf8") : "";
断言(存储B.includes("这是一个繁体中文测试内容") && !存储B.includes("這是"), "书B 已转 UTF8 简体", 存储B.slice(0, 40));
const 下载B = await fetch(地址 + "/下载?行为=下载&来源=esj&外部id=2001&卷=0&编码=utf8&语言=简");
断言((await 下载B.text()).includes("这是一个繁体中文测试内容"), "书B 下载为简体");

console.log("== 8. 并发新增 id 不冲突 ==");
const 并发任务 = [];
for (let i = 0; i < 4; i++) {
  const 内容 = `并发书${i}`;
  const 缓冲 = Buffer.from(内容, "utf8");
  const sha = await 计算sha256(缓冲);
  const 临时 = `D:\\Mui服务喵\\测试\\并发${i}.txt`;
  writeFileSync(临时, 缓冲);
  并发任务.push(报告并上传("新增", {
    来源: "mm", 外部id: `3${i}`, 名称: "并发之书", 编码: "utf8", 全文: true, 卷: "0", 语言: "简",
    外部更新时间: "2026/8/7", 全文长度: "3", sha256: sha,
  }, 临时));
}
const 并发结果 = await Promise.all(并发任务);
断言(并发结果.every((r) => r.上传.成功), "并发上传全部成功");
await 等处理(() => 库().filter((行) => 行.名称 === "并发之书").length === 4);
const 并发行 = 库().filter((行) => 行.名称 === "并发之书");
const id集合 = new Set(并发行.map((行) => 行.Mui轻小说id));
断言(id集合.size === 4, "并发 id 无冲突", [...id集合].join(","));

console.log("== 9. 更新资源 ==");
const 书C = readFileSync("D:\\Mui服务喵\\测试\\书C.txt");
const shaC = await 计算sha256(书C);
const 更新C = await 报告并上传("更新", {
  来源: "mm", 外部id: "1001", 名称: "测试之书", 编码: "utf8", 全文: true, 卷: "0", 语言: "简",
  外部更新时间: "2026/8/8", 全文长度: "180", sha256: shaC,
}, "D:\\Mui服务喵\\测试\\书C.txt");
await 等处理(() => 库().find((行) => 行.Mui轻小说id === 1 && 行.全文长度 === String(书C.length)));
const 行A2 = 库().find((行) => 行.Mui轻小说id === 1);
断言(行A2 && 行A2.全文长度 === String(书C.length), "书A 已更新长度（按实际字节数）", JSON.stringify(行A2));
断言(行A2 && 行A2.sha256 === shaC, "书A 已更新 sha256");
const 资源记录1 = 资源记录().find((行) => 行.Mui轻小说id === 1);
断言(资源记录1 && 资源记录1.更新次数 === 1, "更新次数=1");
断言(资源记录1 && 资源记录1.下载次数 === 3, "下载次数=3", JSON.stringify(资源记录1));

console.log("== 10. 更新为旧版本被跳过 ==");
const 跳过 = await 报告并上传("更新", {
  来源: "mm", 外部id: "1001", 名称: "测试之书", 编码: "utf8", 全文: true, 卷: "0", 语言: "简",
  外部更新时间: "2026/8/6", 全文长度: "3", sha256: shaA,
}, "D:\\Mui服务喵\\测试\\书A.txt");
await 等(1500);
const 行A3 = 库().find((行) => 行.Mui轻小说id === 1);
断言(行A3 && 行A3.sha256 === shaC, "旧版本未被替换");
断言(!待处理().some((行) => 行.sha256 === shaA), "跳过的旧版本已清理");

console.log("== 11. 查询过时与需人工 ==");
const 查过时 = await 请求JSON("/任务", { 行为: "查询", 来源: "mm", 外部id: "1001", 卷: "0", 外部更新时间: "2026/9/1", 全文长度: "99999" });
断言(查过时.数据.状态 === "过时", "双维度落后=过时", JSON.stringify(查过时.数据));
const 查人工 = await 请求JSON("/任务", { 行为: "查询", 来源: "mm", 外部id: "1001", 卷: "0", 外部更新时间: "2026/9/1", 全文长度: "3" });
断言(查人工.数据.状态 === "需人工", "单维度落后=需人工", JSON.stringify(查人工.数据));

console.log("== 12. 异常行为（.mui 上传人工目录） ==");
const 异常 = await 报告并上传("异常", { 名称: "记录" }, "D:\\Mui服务喵\\测试\\记录.mui");
断言(异常.上传.成功 === true, "mui 上传成功", JSON.stringify(异常.上传));
const 待处理人工 = 待处理().filter((行) => 行.处理行为 === "异常");
断言(待处理人工.length === 1, "待处理.json 记录异常", JSON.stringify(待处理人工));
const 人工文件 = 待处理人工[0]?.临时文件 || "";
断言(人工文件.includes("人工"), "mui 落在 人工 目录", 人工文件);
await 等(1000);
断言(待处理().filter((行) => 行.处理行为 === "异常").length === 1, "异常文件不被自动处理");

console.log("== 13. 下载未开放资源 ==");
const 未开放 = await fetch(地址 + "/下载?行为=下载&来源=mm&外部id=404&卷=0");
断言(未开放.status === 404, "未开放资源下载返回 404");

console.log("== 14. 报告与格式校验 ==");
const 坏行为 = await 请求JSON("/任务", { 行为: "乱来" });
断言(坏行为.状态 === 400, "未知行为返回 400");
const 报告坏格式 = await 请求JSON("/任务", { 行为: "新增", 来源: "mm", 外部id: "5", 名称: "x", 编码: "utf8", 全文: true, 语言: "简" });
断言(报告坏格式.数据.成功 === true, "无 sha256 也可报告（服务器端计算）");
const 坏格式上传 = await fetch(地址 + `/上传/${报告坏格式.数据.令牌}?文件名=${encodeURIComponent("恶意.html")}`, {
  method: "POST",
  headers: { "Content-Type": "application/octet-stream" },
  body: readFileSync("D:\\Mui服务喵\\测试\\书A.txt"),
});
const 坏格式数据 = await 坏格式上传.json();
断言(坏格式上传.status === 415 && !坏格式数据.成功, "非 txt/mui 格式返回 415", JSON.stringify(坏格式数据));

console.log("");
console.log(`结果: 通过 ${通过数}，失败 ${失败数}`);
process.exit(失败数 > 0 ? 1 : 0);
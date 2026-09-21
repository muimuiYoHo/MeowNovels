import { readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import iconv from "iconv-lite";
import { Converter } from "opencc-js";
import { 读开放资源, 读库, 改资源记录 } from "./索引.js";
import { 资源库根路径 } from "./配置.js";
import { 清洗名称, 归一化编码 } from "./工具.js";

let 转繁转换器 = null;
function 繁体转换器() {
  if (!转繁转换器) 转繁转换器 = Converter({ from: "cn", to: "tw" });
  return 转繁转换器;
}

export async function 准备下载(参数) {
  const 来源 = String(参数.来源 ?? "").trim();
  const 外部id = String(参数.外部id ?? "").trim();
  const 卷 = 参数.全文 ? "0" : String(参数.卷 ?? "0");
  const 编码 = 归一化编码(参数.编码);
  const 语言 = 参数.语言 === "繁" ? "繁" : "简";

  // 仅 muiid 定位：优先按库记录取资源（无需来源/卷）
  const muiid = String(参数.muiid ?? "").trim();
  let 行;
  if (muiid) {
    行 = 读库().find((记录) => String(记录.Mui轻小说id) === muiid);
    if (!行) return { 成功: false, 状态码: 404, 错误: "没找到该 muiid 的资源喵～" };
    const 开放 = 读开放资源().find((记录) => Number(记录.Mui轻小说id) === Number(muiid) && Number(记录.开放状态) === 1);
    if (!开放) return { 成功: false, 状态码: 404, 错误: "该资源未开放喵（；´д｀）ゞ" };
  } else {
    if (!来源 || !外部id) return { 成功: false, 状态码: 400, 错误: "缺少来源/外部id或muiid...你是不是直接浏览器-http.../下载-了喵(￣_￣|||)" };
    const 开放 = 读开放资源().find((记录) => 记录.来源 === 来源 && String(记录.外部id) === String(外部id) && String(记录.卷) === 卷 && Number(记录.开放状态) === 1);
    if (!开放) return { 成功: false, 状态码: 404, 错误: "没找到资源喵~可能是资源未开放喵（；´д`）ゞ" };
    行 = 读库().find((记录) => Number(记录.Mui轻小说id) === Number(开放.Mui轻小说id));
    if (!行) return { 成功: false, 状态码: 500, 错误: "索引异常->开放资源缺少库记录喵 ;)" };
  }

  let 缓冲;
  try {
    const 位置 = isAbsolute(行.本地位置) ? 行.本地位置 : join(资源库根路径, 行.本地位置);
    缓冲 = readFileSync(位置);
  } catch {
    return { 成功: false, 状态码: 404, 错误: "文件缺失/不可读" };
  }

  let 文本 = 缓冲.toString("utf8");
  if (语言 === "繁") 文本 = 繁体转换器()(文本);

  let 输出 = Buffer.from(文本, "utf8");
  if (编码 !== "utf8") 输出 = iconv.encode(文本, 编码);

  const 文件名 = `${清洗名称(行.名称 || "未命名")}${卷 === "0" ? "" : `-第${卷}卷`}.txt`;

  await 改资源记录((数组) => {
    const 目标 = 数组.find((项) => Number(项.Mui轻小说id) === Number(行.Mui轻小说id));
    if (目标) {
      目标.下载次数 = (目标.下载次数 || 0) + 1;
      目标.累计流量 = (目标.累计流量 || 0) + 输出.length;
    } else {
      数组.push({ Mui轻小说id: 行.Mui轻小说id, 下载次数: 1, 更新次数: 0, 累计流量: 输出.length });
    }
  });

  return { 成功: true, 缓冲: 输出, 文件名, 编码, 语言 };
}
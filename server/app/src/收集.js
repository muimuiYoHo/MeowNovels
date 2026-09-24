import { createWriteStream, existsSync, unlinkSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { extname, join, basename } from "node:path";
import { 行为表, 行为对应目录 } from "./配置.js";
import { 改待处理 } from "./索引.js";
import { 今日8位, 清洗名称, 本地时间文本, 随机令牌, 归一化编码 } from "./工具.js";
import { 排队 } from "./处理.js";

const 暂存报告表 = new Map();
const 暂存有效期 = 3600_000;

function 存放暂存(令牌, 报告) {
  暂存报告表.set(令牌, 报告);
  setTimeout(() => { 暂存报告表.delete(令牌); }, 暂存有效期);
}

function 唯一路径(目录, 文件名) {
  let 候选 = join(目录, 文件名);
  let 序号 = 1;
  while (existsSync(候选)) {
    const 扩展名 = extname(文件名);
    const 主体 = 扩展名 ? 文件名.slice(0, -扩展名.length) : 文件名;
    候选 = join(目录, `${主体}_${序号}${扩展名}`);
    序号++;
  }
  return 候选;
}

export function 处理报告(参数) {
  const 行为 = String(参数.行为 ?? "");
  if (!行为表.includes(行为)) return { 成功: false, 错误: `未知行为: ${行为}` };

  const 全文 = 参数.全文 ? true : false;
  const 报告 = {
    行为,
    来源: String(参数.来源 ?? ""),
    外部id: String(参数.外部id ?? ""),
    名称: String(参数.名称 ?? ""),
    编码: 归一化编码(参数.编码),
    卷: 全文 ? "0" : String(参数.卷 ?? "0"),
    全文,
    语言: 参数.语言 === "繁" ? "繁" : "简",
    外部更新时间: String(参数.外部更新时间 ?? ""),
    全文长度: String(参数.全文长度 ?? ""),
    期望sha256: 参数.sha256 ? String(参数.sha256).toLowerCase() : null,
  };
  const 令牌 = 报告.期望sha256 || 随机令牌();
  存放暂存(令牌, 报告);
  return { 成功: true, 令牌, 上传地址: `/上传/${令牌}` };
}

export async function 处理上传(令牌, 请求, 响应, 文件名参数) {
  const 报告 = 暂存报告表.get(令牌);
  if (!报告) return 发JSON(响应, 404, { 成功: false, 错误: "报告不存在/已过期，请先报告再上传" });

  const 原始名称 = 清洗名称(文件名参数 || (报告.名称 || "未命名") + ".txt");
  const 扩展名 = extname(原始名称).toLowerCase();
  if (扩展名 !== ".txt" && 扩展名 !== ".mui") {
    return 发JSON(响应, 415, { 成功: false, 错误: "仅接受 txt / mui 格式" });
  }

  const 目录 = 行为对应目录(报告.行为);
  const 目标路径 = 唯一路径(目录, `${今日8位()}_${原始名称}`);

  try {
    const 哈希 = createHash("sha256");
    let 字节数 = 0;
    await new Promise((完成, 拒绝) => {
      const 写入流 = createWriteStream(目标路径);
      写入流.on("error", 拒绝);
      请求.on("data", (块) => {
        哈希.update(块);
        字节数 += 块.length;
        写入流.write(块);
      });
      请求.on("error", 拒绝);
      请求.on("end", () => {
        写入流.end();
        写入流.on("finish", 完成);
      });
    });

    if (字节数 === 0) {
      unlinkSync(目标路径);
      return 发JSON(响应, 400, { 成功: false, 错误: "上传内容为空...空的喵？" });
    }

    const sha256 = 哈希.digest("hex");
    if (报告.期望sha256 && 报告.期望sha256 !== sha256) {
      unlinkSync(目标路径);
      return 发JSON(响应, 400, { 成功: false, 错误: "sha256 与报告不一致" });
    }

    const 记录 = {
      sha256,
      处理行为: 报告.行为,
      来源: 报告.来源,
      外部id: 报告.外部id,
      名称: 报告.名称,
      编码: 报告.编码,
      卷: 报告.卷,
      全文: 报告.全文,
      语言: 报告.语言,
      外部更新时间: 报告.外部更新时间,
      全文长度: 报告.全文长度,
      原始名称,
      临时文件: 目标路径,
      字节数,
      收到时间: 本地时间文本(),
    };

    await 改待处理((数组) => { 数组.push(记录); });
    暂存报告表.delete(令牌);

    if (报告.行为 !== "异常") 排队(记录);

    return 发JSON(响应, 200, {
      成功: true,
      消息: `资源已接收，行为=${报告.行为}`,
      sha256,
      处理行为: 报告.行为,
      临时文件: 目标路径,
      字节数,
    });
  } catch (错误) {
    if (existsSync(目标路径)) { try { unlinkSync(目标路径); } catch {} }
    return 发JSON(响应, 500, { 成功: false, 错误: `上传失败: ${错误}` });
  }
}

export function 发JSON(响应, 状态码, 数据) {
  if (响应.headersSent) return;
  响应.statusCode = 状态码;
  响应.setHeader("Content-Type", "application/json; charset=utf-8");
  响应.end(JSON.stringify(数据));
}
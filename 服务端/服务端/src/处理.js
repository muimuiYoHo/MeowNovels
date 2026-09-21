import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { 并发数, 资源库根路径, 全文目录, 分卷目录 } from "./配置.js";
import { 改库, 改开放资源, 改待处理, 改资源记录 } from "./索引.js";
import { 处理入库文本 } from "./格式处理.js";
import { 清洗名称, 计算sha256, 本地时间文本, 本地时刻文本, 解析时间, 解析长度 } from "./工具.js";

const 等待队列 = [];
let 运行中 = 0;

export function 排队(记录) {
  等待队列.push(记录);
  调度();
}

function 调度() {
  while (运行中 < 并发数 && 等待队列.length > 0) {
    运行中++;
    const 记录 = 等待队列.shift();
    执行任务(记录).finally(() => { 运行中--; 调度(); });
  }
}

function 全文还是分卷目录(全文) {
  return 全文 ? "全文" : "分卷";
}

function 目标位置(id, 名称, 卷, 全文) {
  const 父目录 = 全文还是分卷目录(全文);
  const 文件名 = 全文 ? `${id}.txt` : `${id}-${卷}.txt`;
  return join("资源", 父目录, 名称, 文件名);
}

function 绝对位置(相对位置) {
  return join(资源库根路径, 相对位置);
}

async function 执行任务(记录) {
  try {
    if (!existsSync(记录.临时文件)) {
      await 移除记录(记录.sha256);
      return;
    }
    const 原始 = readFileSync(记录.临时文件);
    const 转换后 = 处理入库文本(原始, 记录.编码, 记录.语言);

    if (记录.处理行为 === "新增") await 入库(记录, 转换后);
    else if (记录.处理行为 === "更新") await 更新资源(记录, 转换后);

    清理(记录);
  } catch (错误) {
    console.error(`[${本地时刻文本()}] [处理失败]`, 记录.临时文件, 错误);
    await 标记失败(记录, `处理失败: ${错误}`);
  }
}

function 清理(记录) {
  if (existsSync(记录.临时文件)) unlinkSync(记录.临时文件);
  void 移除记录(记录.sha256);
}

async function 移除记录(sha256) {
  await 改待处理((数组) => {
    const 序号 = 数组.findIndex((项) => 项.sha256 === sha256);
    if (序号 >= 0) 数组.splice(序号, 1);
  });
}

async function 标记失败(记录, 消息) {
  await 改待处理((数组) => {
    const 项 = 数组.find((当前) => 当前.sha256 === 记录.sha256);
    if (项) { 项.处理状态 = "失败"; 项.错误 = 消息; }
  });
}

async function 确保资源存在(id) {
  await 改资源记录((数组) => {
    if (!数组.some((项) => Number(项.Mui轻小说id) === Number(id))) {
      数组.push({ Mui轻小说id: id, 下载次数: 0, 更新次数: 0, 累计流量: 0 });
    }
  });
}

async function 入库(记录, 缓冲) {
  const 名称 = 清洗名称(记录.名称 || basename(记录.原始名称 || "未命名").replace(/\.(txt|mui)$/i, ""));
  const 卷 = 记录.卷;
  const 全文 = 记录.全文;
  const 哈希 = 计算sha256(缓冲);
  const 今天 = 本地时间文本();
  let 行;

  await 改库((库) => {
    行 = 库.find((项) =>
      项.来源 === 记录.来源
      && String(项.外部id) === String(记录.外部id)
      && String(项.卷) === 卷);

    if (行) {
      行.名称 = 名称;
      行.全文长度 = String(缓冲.length);
      行.外部更新时间 = 记录.外部更新时间 || 行.外部更新时间;
      行.本地更新时间 = 今天;
      行.sha256 = 哈希;
      行.本地位置 = 目标位置(行.Mui轻小说id, 名称, 卷, 全文);
      行.开放状态 = Number(行.开放状态) === 1 ? 1 : 0;
    } else {
      const 新id = Math.max(0, ...库.map((项) => Number(项.Mui轻小说id) || 0)) + 1;
      行 = {
        Mui轻小说id: 新id,
        名称,
        来源: 记录.来源,
        外部id: String(记录.外部id),
        卷,
        全文长度: String(缓冲.length),
        外部更新时间: 记录.外部更新时间 || 今天,
        本地更新时间: 今天,
        开放状态: 1,
        本地位置: 目标位置(新id, 名称, 卷, 全文),
        sha256: 哈希,
      };
      库.push(行);
    }
  });

  mkdirSync(dirname(绝对位置(行.本地位置)), { recursive: true });
  writeFileSync(绝对位置(行.本地位置), 缓冲);

  await 改开放资源((开放) => {
    const 已有 = 开放.find((项) => Number(项.Mui轻小说id) === Number(行.Mui轻小说id));
    if (Number(行.开放状态) === 1) {
      const 开放行 = { Mui轻小说id: 行.Mui轻小说id, 名称, 来源: 行.来源, 外部id: 行.外部id, 卷, 开放状态: 1 };
      if (已有) Object.assign(已有, 开放行);
      else 开放.push(开放行);
    } else {
      const 序号 = 开放.findIndex((项) => Number(项.Mui轻小说id) === Number(行.Mui轻小说id));
      if (序号 >= 0) 开放.splice(序号, 1);
    }
  });

  await 确保资源存在(行.Mui轻小说id);
  console.log(`[${本地时刻文本()}] [入库] id=${行.Mui轻小说id} 名称=${名称} 卷=${卷} 位置=${行.本地位置}`);
}

async function 更新资源(记录, 缓冲) {
  const 名称 = 清洗名称(记录.名称 || basename(记录.原始名称 || "未命名").replace(/\.(txt|mui)$/i, ""));
  const 卷 = 记录.卷;
  const 哈希 = 计算sha256(缓冲);
  const 今天 = 本地时间文本();

  const 行 = await 改库((库) => 库.find((项) =>
    项.来源 === 记录.来源
    && String(项.外部id) === String(记录.外部id)
    && String(项.卷) === 卷));

  if (!行) {
    console.warn(`[${本地时刻文本()}] [更新] 未找到对应记录，按新增处理`, 记录.来源, 记录.外部id, 卷);
    return 入库(记录, 缓冲);
  }

  const 请求时间 = 解析时间(记录.外部更新时间);
  const 请求长度 = 解析长度(记录.全文长度);
  const 本地时间 = 解析时间(行.外部更新时间);
  const 本地长度 = 解析长度(行.全文长度);
  const 值得更新 =
    (请求时间 && (!本地时间 || 请求时间.getTime() > 本地时间.getTime()))
    || (请求长度 !== null && (本地长度 === null || 请求长度 > 本地长度));

  if (!值得更新) {
    清理(记录);
    console.log(`[${本地时刻文本()}] [更新] 资源不比本地新，跳过替换`, 行.本地位置);
    return;
  }

  await 改库((库) => {
    const 目标 = 库.find((item) => String(item.Mui轻小说id) === String(行.Mui轻小说id));
    if (目标) {
      目标.名称 = 名称;
      目标.全文长度 = String(缓冲.length);
      目标.外部更新时间 = 记录.外部更新时间 || 记录.外部更新时间;
      目标.本地更新时间 = 今天;
      目标.sha256 = 哈希;
      if (!目标.本地位置) 目标.本地位置 = 目标位置(目标.Mui轻小说id, 名称, 卷, 记录.全文);
    }
  });

  mkdirSync(dirname(绝对位置(行.本地位置)), { recursive: true });
  if (行.本地位置) writeFileSync(绝对位置(行.本地位置), 缓冲);

  await 改开放资源((开放) => {
    const 已有 = 开放.find((项) => Number(项.Mui轻小说id) === Number(行.Mui轻小说id));
    if (Number(行.开放状态) === 1) {
      const 开放行 = { Mui轻小说id: 行.Mui轻小说id, 名称, 来源: 行.来源, 外部id: 行.外部id, 卷, 开放状态: 1 };
      if (已有) Object.assign(已有, 开放行);
      else 开放.push(开放行);
    } else {
      const 序号 = 开放.findIndex((项) => Number(项.Mui轻小说id) === Number(行.Mui轻小说id));
      if (序号 >= 0) 开放.splice(序号, 1);
    }
  });

  await 改资源记录((数组) => {
    const 目标 = 数组.find((项) => Number(项.Mui轻小说id) === Number(行.Mui轻小说id));
    if (目标) 目标.更新次数 = (目标.更新次数 || 0) + 1;
    else 数组.push({ Mui轻小说id: 行.Mui轻小说id, 下载次数: 0, 更新次数: 1, 累计流量: 0 });
  });

  console.log(`[${本地时刻文本()}] [更新] id=${行.Mui轻小说id} 名称=${名称} 卷=${卷} 位置=${行.本地位置}`);
}
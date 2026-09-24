/**
 * 注册相关
 */
import * as os from "os";
import * as crypto from "crypto";

/**
 * 清洗用户名：仅保留英文数字，截断到12字符
 */
export function 清洗用户名(原始名) {
  return 原始名.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
}

/**
 * 生成用户名：电脑名/user + 随机后缀，保证唯一性
 * @param {string} [电脑名] - 可选，测试用
 */
export function 生成用户名(电脑名) {
  if (电脑名 === undefined) {
    电脑名 = os.userInfo().username || process.env.USERNAME || process.env.USER || "";
  }
  const 候选 = [电脑名, "user"];
  let 基础 = "";
  for (const 名 of 候选) {
    const 清洗 = 清洗用户名(名);
    if (清洗.length >= 3) { 基础 = 清洗; break; }
  }
  if (!基础) 基础 = "wk8";
  // 截断基础名，留空间给随机后缀（6字符hex = 3字节）
  基础 = 基础.slice(0, 6);
  const 随机 = crypto.randomBytes(3).toString("hex");
  return 基础 + 随机;
}

/**
 * 解析注册响应，判断是否成功
 * @param {{status: number, body: string}} 响应
 * @returns {{成功: boolean, 错误?: string}}
 */
export function 解析注册结果(响应) {
  // 302跳转视为成功
  if (响应.status >= 300 && 响应.status < 400) {
    return { 成功: true };
  }
  if (响应.body.includes("注册成功") || 响应.body.includes("注册完成")) {
    return { 成功: true };
  }
  // 无常见错误关键词也视为成功
  if (!响应.body.includes("错误") && !响应.body.includes("失败") && !响应.body.includes("已存在")) {
    return { 成功: true };
  }
  // 提取错误信息
  const 错误匹配 = 响应.body.match(/<li[^>]*>([^<]+)<\/li>/) || 响应.body.match(/alert\("([^"]+)"\)/);
  return { 成功: false, 错误: 错误匹配 ? 错误匹配[1] : "注册失败" };
}

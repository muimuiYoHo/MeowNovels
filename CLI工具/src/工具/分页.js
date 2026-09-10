/**
 * 分页循环
 * 框架负责翻页、间隔、进度提示
 * 源负责提供解析函数
 */
import { 发送请求 } from "./网络.js";

/**
 * @param {string} 首页url
 * @param {function} 解析函数 - (响应body) => { 结果: [], 总页数: number }
 * @param {object} [选项]
 * @param {number} [选项.间隔=2000] - 页面间等待毫秒
 * @param {object} [选项.请求选项] - 传递给发送请求的额外选项
 * @returns {Promise<Array>} 所有页的结果合并
 */
export async function 获取所有分页(首页url, 解析函数, 选项 = {}) {
  const { 间隔 = 2000, 请求选项 = {} } = 选项;

  const 首页响应 = await 发送请求(首页url, 请求选项);
  const { 结果, 总页数 } = 解析函数(首页响应.body);
  const 所有结果 = [...结果];

  for (let 页 = 2; 页 <= 总页数; 页++) {
    process.stderr.write(`正在获取第 ${页}/${总页数} 页...\n`);
    await new Promise(r => setTimeout(r, 间隔));
    try {
      const url = 首页url.replace(/page=\d+/, `page=${页}`).replace(/\/1\.html$/, `/${页}.html`);
      const 响应 = await 发送请求(url, 请求选项);
      const 页结果 = 解析函数(响应.body);
      所有结果.push(...页结果.结果);
    } catch {}
  }

  return 所有结果;
}

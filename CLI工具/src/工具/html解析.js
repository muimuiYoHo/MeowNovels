/**
 * HTML 解析工具
 */

const 实体映射 = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

const 实体正则 = /&(?:nbsp|amp|lt|gt|quot|#39);/g;

export function 解码实体(文本) {
  return 文本.replace(实体正则, (m) => 实体映射[m] || m);
}

export function 剥离标签(html) {
  return html.replace(/<[^>]+>/g, "");
}

export function HTML转文本(html) {
  return 解码实体(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

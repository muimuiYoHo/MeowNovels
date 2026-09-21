import iconv from "iconv-lite";
import { Converter } from "opencc-js";

let 转简转换器 = null;
let 转繁转换器 = null;

function 简体转换器() {
  if (!转简转换器) 转简转换器 = Converter({ from: "tw", to: "cn" });
  return 转简转换器;
}

function 繁体转换器() {
  if (!转繁转换器) 转繁转换器 = Converter({ from: "cn", to: "tw" });
  return 转繁转换器;
}

export function 转换到UTF8(缓冲, 编码) {
  if (编码 === "utf8") return 缓冲;
  const 文本 = iconv.decode(缓冲, 编码);
  return Buffer.from(文本, "utf8");
}

export function 转换到简体(缓冲) {
  return Buffer.from(简体转换器()(缓冲.toString("utf8")), "utf8");
}

export function 转换到繁体(缓冲) {
  return Buffer.from(繁体转换器()(缓冲.toString("utf8")), "utf8");
}

export function 处理入库文本(缓冲, 编码, 语言) {
  const utf8缓冲 = 转换到UTF8(缓冲, 编码);
  if (语言 === "繁") return 转换到简体(utf8缓冲);
  return utf8缓冲;
}
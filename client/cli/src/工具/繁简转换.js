/**
 * 繁简转换
 */
import * as OpenCC from "opencc-js";

export function 创建转换器(模式) {
  if (模式 === "简") return OpenCC.Converter({ from: "tw", to: "cn" });
  if (模式 === "繁") return OpenCC.Converter({ from: "cn", to: "tw" });
  return null;
}

export function 创建转换函数(模式) {
  const 转换器 = 创建转换器(模式);
  return 转换器 ? (文本) => 转换器(文本) : (文本) => 文本;
}

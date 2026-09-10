/**
 * 文件流式写入
 */
import { createWriteStream } from "fs";

export function 创建写入流(文件路径, 编码 = "utf-8") {
  const 流 = createWriteStream(文件路径, { encoding: 编码 });
  return {
    写入(内容) { 流.write(内容); },
    结束() { return new Promise((resolve) => { 流.end(resolve); }); },
  };
}

/**
 * 源注册
 * 静态导入所有源模块，去重后导出
 *
 * 新增源：在 src/源/ 放入文件后运行 更新源.bat
 */
import { 源 as wenku8源 } from "./源/wenku8.js";
import { 源 as esj源 } from "./源/esjzone.js";

function 去重(源列表) {
  const 已见 = new Set();
  return 源列表.filter(源 => {
    const key = `${源.id}@${源.版本}`;
    if (已见.has(key)) return false;
    已见.add(key);
    return true;
  });
}

export const 源注册表 = 去重([wenku8源, esj源]);

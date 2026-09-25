import YouTube搜索对象 from "./图标/YouTube搜索对象.svg";
import 关闭_小 from "./图标/关闭-小.svg";
import 小工具 from "./图标/小工具.svg";
import 搜索 from "./图标/搜索.svg";
import 添加照片 from "./图标/添加照片.svg";
import 箭头前进iOS from "./图标/箭头前进iOS.svg";
import 背景设定 from "./图标/背景设定.svg";

export {
  YouTube搜索对象,
  关闭_小,
  小工具,
  搜索,
  添加照片,
  箭头前进iOS,
  背景设定,
};

export const 页面图标 = {
  "YouTube搜索对象": YouTube搜索对象,
  "关闭_小": 关闭_小,
  "资源": 小工具,
  "搜索": 搜索,
  "添加照片": 添加照片,
  "箭头前进iOS": 箭头前进iOS,
  "背景设定": 背景设定,
} as const;

export type 页面图标名称 = keyof typeof 页面图标;

export default 页面图标;
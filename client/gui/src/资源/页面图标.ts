import YouTube搜索对象 from "./图标/YouTube搜索对象.svg";
import 关闭_小 from "./图标/关闭-小.svg";
import 小工具 from "./图标/小工具.svg";
import 搜索 from "./图标/搜索.svg";
import 添加照片 from "./图标/添加照片.svg";
import 箭头前进iOS from "./图标/箭头前进iOS.svg";
import 背景设定 from "./图标/背景设定.svg";
import 箭头前进 from "./图标/箭头前进.svg";
import 格式绘图 from "./图标/格式绘图.svg";
import 翻译 from "./图标/翻译.svg";
import 书籍丝带 from "./图标/书籍丝带.svg";
import 文件夹 from "./图标/文件夹.svg";
import 下载 from "./图标/下载.svg";
import 信息 from "./图标/信息.svg";
import 反馈 from "./图标/反馈.svg";
import 账户圈 from "./图标/账户圈.svg";
import 箭矢回击 from "./图标/箭矢回击.svg";
import 枢纽 from "./图标/枢纽.svg";
import 登出 from "./图标/登出.svg";
import 永远删除 from "./图标/永远删除.svg";
import 账户循环 from "./图标/账户循环.svg";
import 添加 from "./图标/添加.svg";
import 无账户 from "./图标/无账户.svg";

export {
  YouTube搜索对象,
  关闭_小,
  小工具,
  搜索,
  添加照片,
  箭头前进iOS,
  背景设定,
  箭头前进,
  格式绘图,
  翻译,
  书籍丝带,
  文件夹,
  下载,
  信息,
  反馈,
  账户圈,
  箭矢回击,
  枢纽,
  登出,
  账户循环,
  添加,
  无账户,
};

export const 页面图标 = {
  "YouTube搜索对象": YouTube搜索对象,
  "关闭_小": 关闭_小,
  "资源": 小工具,
  "搜索": 搜索,
  "添加照片": 添加照片,
  "箭头前进iOS": 箭头前进iOS,
  "进入卡片空间": 箭头前进,
  "背景设定": 背景设定,
  "应用个性化": 格式绘图,
  "语言": 翻译,
  "源管理": 书籍丝带,
  "资源目录": 文件夹,
  "数据与储存": 下载,
  "关于喵小说": 信息,
  "问题反馈": 反馈,
  "账号": 账户圈,
  "账户圈": 账户圈,
  "返回": 箭矢回击,
  "核心": 枢纽,
  "登出": 登出,
  "永远删除": 永远删除,
  "清空账号": 账户循环,
  "添加": 添加,
  "无账户": 无账户,
} as const;

export type 页面图标名称 = keyof typeof 页面图标;

export default 页面图标;
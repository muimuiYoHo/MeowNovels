# wenku8 下载 URL 说明

## ☆ 全文下载

**端点：** `https://dl.wenku8.com/down.php`

```js
https://dl.wenku8.com/down.php?type={编码}&node={载点}&id={轻小说id}
```

| 参数 | 描述 | 值 | 说明 |
|------|-----|-----|------|
| `id`| 轻小说id | `数字` | 唯一对应 |
| `type`| 控制输出编码 | `utf8` | UTF-8 简中 |
| `↑` || `txt` | GBK/ANSI 简中 |
| `↑` || `big5` | UTF-8 繁中 |
| `node` |载点，用于镜像切换| `1` / `2` | 服务器不同? |
| `id` |书 ID | 数字 | 唯一对应 |

**备注：**
- `type` 不控制文件格式，始终输出 `.txt`
- `txt` 可能是早期遗留
- `big5` 实际输出 UTF-8 编码的繁中
- 不同载点内容相同仅服务器不同，推测用于故障切换

---

## ✧ 分卷下载

**端点：** `https://dl.wenku8.com/packtxt.php`

```js
地址1
https://dl.wenku8.com/packtxt.php?aid={轻小说id}&vid={卷id}&charset={编码}

地址2
https://dl.wenku8.com/packtxt.php?aid={轻小说id}&vid={卷id}&aname={分卷名}charset={编码}
```

| 参数 | 描述 | 值 | 说明 |
|------|------|-----|------|
| `aid` | Article ID | 数字 | 唯一对应 |
| `vid` | Volume ID | 数字 | 唯一对应  |
| `charset` | 控制输出编码 | `gbk` | GBK/ANSI 简中 |
| `↑` |  | `utf-8` | UTF-8 简中 |
| `↑` |  | `big5` | UTF-8 繁中 |
| `aname` | 书名 | 二次编码的书名 | 用于自动重命名 |
| `vname` | 分卷 + 分卷名 | 二次编码的卷名 | 用于自动重命名 |


**备注：**
- `aname` / `vname` 仅影响服务器返回的 Content-Disposition 文件名
- 地址1/2的区别只是有没有 `aname`/`vname`
- 每个 `v/aid` 唯一对应
- a/vname 的编码方法 ↓

```js
//引入字符编码转换库
const 字符编码 = require('iconv-lite');

// 原始文本
const 书名 = "小书痴的下克上～为了成为图书管理员不择手段～";

// i: GBK 编码 → 字节序列
const 书名的GBK字节数据 = 字符编码.encode(书名, 'gbk');
// 文本会变成 → <Buffer d0 a1 ca e9 b3 d5 b5 c4 cf c2 bf cb c9 cf a1 ab ce aa c1 cb b3 c9 ce aa cd bc ca e9 b9 dc c0 ed d4 b1 b2 bb d4 f1 ca d6 b6 ce a1 ab>

// ii: URL 编码 → 每个字节转 %XX
const 最终结果 = [...书名的GBK字节数据].map(单个元素 => '%' + 单个元素.toString(16).toUpperCase().padStart(2, '0')).join('');
//展开「书名的GBK字节数据」为数组 → {遍历数组的每个字节值「单个元素」 → [字符串前加 % →（把「单个元素」转为16进制字符串 → 转为大写 → 确保字符串长度为 2 不足两位前面补0）]} → 拼接全部字符串
// Buffer对象会变成 → %D0%A1%CA%E9%B3%D5%B5%C4%CF%C2%BF%CB%C9%CF%A1%AB%CE%AA%C1%CB%B3%C9%CE%AA%CD%BC%CA%E9%B9%DC%C0%ED%D4%B1%B2%BB%D4%F1%CA%D6%B6%CE%A1%AB

同理可得
第一部 → %B5%DA%D2%BB%B2%BF
士兵的女儿I → %CA%BF%B1%F8%B5%C4%C5%AE%B6%F9%49         //网站应该使用的值
士兵的女儿  → %CA%BF%B1%F8%B5%C4%C5%AE%B6%F9            //网站实际使用的值 I被直接放在后面了没有2次编码

最后自己拼地址2的链接就得到了 → https://dl.wenku8.com/packtxt.php?aid=2428&vid=90209&aname=%D0%A1%CA%E9%B3%D5%B5%C4%CF%C2%BF%CB%C9%CF%A1%AB%CE%AA%C1%CB%B3%C9%CE%AA%CD%BC%CA%E9%B9%DC%C0%ED%D4%B1%B2%BB%D4%F1%CA%D6%B6%CE%A1%AB&vname=%B5%DA%D2%BB%B2%BF+%CA%BF%B1%F8%B5%C4%C5%AE%B6%F9I&charset=gbk
```

- 虽然不知道为什么在处理I II III 这种情况时网站不会连同它一起2次编码而是单独跟在后面（推测是为了方便管理）但是这并不影响下载 实测证明a/vname只影响服务器返回的文件名且无论有没有2次编码I II III服务器都可以返回正确的文件名
- 此外 aname 和 vname 必须一起使用

>by_闲的发慌的卑微大2
---

# ESJ Zone 适配说明

## 原理

直接拿页面提取内容没什么好说的

---

## ☆ 搜索

**端点：** `https://{域名}/tags/{关键词}/{页码}.html`

```js
https://www.esjzone.one/tags/妈妈/1.html
```

| 参数 | 描述 | 说明 |
|------|------|------|
| `关键词` | 搜索内容 |  |
| `页码` | 分页 | 从 1 开始 没有就是1 |

**备注：**

- 分页信息在：`.bootpag({ total: N })`
- 每个结果为 `.card` 块
- `/tags/` 全站搜索，`/tags-21/` 仅原创分类

**返回结构：**

| 关键词 | CSS | 示例 |
|------|--------|------|
| 书名 | `.card-title a` | 败北女角也能收获幸福吗？ |
| ID | `/detail/{id}.html` | 1741918331 |
| 作者 | `.card-author a` | 弹弹肚皮圆滚滚 |
| 字数 | `icon-file-text` | 46,106 |
| 观看 | `icon-eye` | 149438 |
| 收藏 | `icon-heart` | 2407 |

---

## ✧ 详情页（章节列表）

**端点：** `https://{域名}/detail/{书id}.html`

```js
https://www.esjzone.one/detail/1741918331.html
```

| 参数 | 描述 | 说明 |
|------|------|------|
| `书id` | Unix 时间戳 | 唯一对应 推测是上传时间 |

**备注：**

- 章节链接在 `#chapterList a` 中
- `href` 格式：`/forum/{书id}/{帖子id}.html`
- `data-title` 属性是章节标题
- 书名在 `.book-detail h2.text-normal`
- 作者在 `.book-detail ul.book-detail li`
- 封面在 `.product-gallery img`
- 简介在 `#details .description`

---

## ☆ 章节正文

**端点：** `https://{域名}/forum/{书id}/{帖子id}.html`

```js
https://www.esjzone.one/forum/1741918331/294197.html
```

| 参数 | 描述 | 说明 |
|------|------|------|
| `书id` | 同详情页 | ... |
| `帖子id` | 章节 ID | 唯一对应 |

**备注：**

- 正文在 `div.forum-content` 中
- 标题在 `<h2>` 中
- 作者在 `.single-post-meta a` 中
- CSS 禁止选中文字关我看Dom什么事（

---

## ✧ 繁简转换

ESJ 默认**非简中**。网页端简体转换由 `chinese_convert.js` 完成

| 值 | 含义 | 说明 |
|----|------|------|
| `0` | 原 | 繁体 |
| `1` | 繁 | 同原文（意义不明但是存在） |
| `2` | 简 | 浏览器端 JS 转换 |

下载时用 `opencc-js` 转换，不用chinese_convert.js

---

> by 研究了半天反爬结果发现没有反爬（

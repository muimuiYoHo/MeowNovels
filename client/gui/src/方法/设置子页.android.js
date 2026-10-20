// 设置项子页面的自动发现 安卓端
//
// 约定 子页面放在 src/组件/子页面/设置项/ 下 文件名等于设置项标题
// 点开该设置项时会自动挂载对应 vue 不需要在任何地方注册
//
//   设置项/应用个性化.android.vue  点 应用个性化 时打开
//   设置项/语言.share.vue          双端同源
//   设置项/源管理.vue              不带标签 双端都用
//
// 标签优先级 本平台 高于 share 高于 无标签 带其它平台标签的文件会被忽略
// 所以同一个设置项可以让两端各写一份互不干扰
//
// 子页面只管自己的内容 需要返回时 emit 返回 即可

const 发现的子页 = import.meta.glob("../组件/子页面/设置项/*.vue");

// 应用个性化.android.vue 到 { 标题 应用个性化 标签 android }
// 源管理.vue 到 { 标题 源管理 标签 空 }
function 拆出标题与标签(路径) {
    const 文件名 = 路径.slice(路径.lastIndexOf("/") + 1).replace(/\.vue$/, "");
    const 命中 = 文件名.match(/^(.*)\.(win|android|share)$/);
    return 命中 ? { 标题: 命中[1], 标签: 命中[2] } : { 标题: 文件名, 标签: "" };
}

function 算标签优先级(标签) {
    if (标签 === __APP_PLATFORM__) return 3;
    if (标签 === "share") return 2;
    if (标签 === "") return 1;
    return 0;
}

const 子页表 = {};
for (const [路径, 加载器] of Object.entries(发现的子页)) {
    const { 标题, 标签 } = 拆出标题与标签(路径);
    const 优先级 = 算标签优先级(标签);
    if (优先级 === 0) continue;
    if (!子页表[标题] || 优先级 > 子页表[标题].优先级) {
        子页表[标题] = { 优先级, 加载器 };
    }
}

// 取该设置项对应的懒加载函数 找不到返 null 默认懒加载 只有真正点开才下载子页代码
export function 查找子页加载器(标题) {
    const 命中 = 子页表[标题];
    return 命中 ? 命中.加载器 : null;
}

export function 检查子页是否存在(标题) {
    return Object.prototype.hasOwnProperty.call(子页表, 标题);
}

// 调试用 列出当前平台可用的全部子页标题
export function 列出全部子页标题() {
    return Object.keys(子页表);
}

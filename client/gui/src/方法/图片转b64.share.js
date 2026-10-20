// 图片转b64 把本地的 File 或 Blob 原样编码成 base64 的 data URL
//
// 为什么不复用 方法/文件访问.share.js 的 压缩图片
// 那条路是 canvas drawImage 加 toDataURL image/jpeg 必然重编码成 JPEG
// PNG 的透明通道在 JPEG 里没有对应物 透明区会被填成黑或画布底色
// 而站点 logo 头像这类素材 透明本身就是内容的一部分 压掉就废了
//
// 所以这里绕开画布 直接用 FileReader.readAsDataURL 编码原始字节
// 不解码 不重采样 不改格式 输出与输入逐字节等价
// 代价是体积不受控 源图多大转出来就多大 base64 文本约 1.33 倍膨胀
// 需要控体积的场合 账号头像要塞进账号 JSON 那种 请走 压缩图片

// FileReader 只吃 Blob File 是它的子类
// 传进来字符串路径 网址 或 null 都属于调用方的 bug 本方法不代替 fetch
// 早点点名比让 FileReader 在 onerror 里含糊报错好定位
function 是本地文件(值) {
    return 值 instanceof Blob;
}

// 带前缀 true 是默认 返能直接塞进 img src 的完整 data URL
// 带前缀 false 只给逗号后面的裸 base64 有些接口或存储字段只要 base64 本体
//
// 前缀里的 MIME 由浏览器按文件头判定 不是信扩展名 这正是保留原格式的体现
// PNG 进来就是 data:image/png 不会被改写
// 但没有 MIME 的 Blob 会得到 data:;base64 img 认不出来 这种得调用方自己补 type
export function 图片转b64(文件, { 带前缀 = true } = {}) {
    return new Promise((resolve, reject) => {
        if (!是本地文件(文件)) {
            reject(new TypeError("图片转b64 只接受本地 File / Blob；远程地址请先自己 fetch 成 Blob"));
            return;
        }
        const 读 = new FileReader();
        读.onload = () => {
            const 地址 = String(读.result);
            resolve(带前缀 ? 地址 : 地址.slice(地址.indexOf(",") + 1));
        };
        读.onerror = () => reject(读.error ?? new Error("FileReader 读取失败"));
        读.readAsDataURL(文件);
    });
}
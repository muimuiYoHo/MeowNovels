// 文件访问：把「让用户挑一个文件」这件事封起来。
//
// 走 Web 的 `<input type="file">`，**不用** Tauri 的 dialog / fs 插件：
// 实测（2026-09-28 / Android WebView 153）wry 的安卓 WebView **已经实现了
// onShowFileChooser** —— 挂个 input 点一下就会弹系统相册选择器；而 Tauri 的
// dialog 插件在安卓返回的是 content:// URI，fs 插件拿它读不出内容。
// Web 这条路两端行为一致、不依赖插件，`File` 对象还能直接喂给 FileReader。
//
// 安卓那边 Rust 的 `选择文件或文件夹` 是空实现（返回 Err），不用碰它。

// 图片统一压到这个尺寸再转 data URL —— 账号头像的原图动辄好几 MB，
// 直接 base64 塞进账号 JSON 会让那个文件膨胀到没法读。
const 默认最大边 = 512;
const 默认质量 = 0.85;

function 建选择器(接受) {
    const 选择器 = document.createElement("input");
    选择器.type = "file";
    选择器.accept = 接受;
    // 别用 display: none —— 部分 WebView 会因此不触发选择器。
    // 用「移出视口」的绝对定位藏它。
    选择器.style.cssText = "position: fixed; left: -9999px; top: 0; width: 1px; height: 1px; opacity: 0;";
    document.body.appendChild(选择器);
    return 选择器;
}

// 让用户挑一个文件。取消返回 null。
export function 选择文件(接受 = "image/*") {
    return new Promise((resolve) => {
        const 选择器 = 建选择器(接受);
        let 已收尾 = false;
        const 收尾 = (值) => {
            if (已收尾) return;
            已收尾 = true;
            window.removeEventListener("focus", 处理回到页面);
            选择器.remove();
            resolve(值);
        };
        // 点「取消」时 change 不会触发，只能靠「离开选择器后焦点回到页面」来判。
        // 必须延迟：选完文件也会先回到页面、再触发 change，各家 WebView 顺序不一。
        const 处理回到页面 = () => {
            setTimeout(() => {
                if (!已收尾 && !(选择器.files && 选择器.files.length)) 收尾(null);
            }, 600);
        };
        选择器.addEventListener("change", () => {
            const 文件 = 选择器.files && 选择器.files[0];
            收尾(文件 || null);
        });
        window.addEventListener("focus", 处理回到页面);
        选择器.click();
    });
}

function 读成data地址(文件) {
    return new Promise((resolve, reject) => {
        const 读 = new FileReader();
        读.onload = () => resolve(读.result);
        读.onerror = () => reject(读.error ?? new Error("FileReader 读取失败"));
        读.readAsDataURL(文件);
    });
}

// 缩到最大边以内、转成 JPEG 的 data URL。
// 返回的字符串既能直接放进 <img src>，也能直接存进账号 JSON 的头像字段。
//
// `方形: true` 会先按短边取**中心正方形**再缩 —— 头像这类要求 1:1 的场景用它。
// 为什么要算法裁而不是调系统裁剪界面：安卓的 `com.android.camera.action.CROP`
// **不是官方 API**（AOSP 没实现，靠相册 App 自己响应，很多机型已移除），
// 而 `<input type=file>` 本身没有裁剪能力。中心裁切零交互、结果稳定，
// 头像这种「主体一般居中」的图够用；要做用户可以拖动选区的裁剪得另写裁剪层。
export function 压缩图片(原地址, { 最大边 = 默认最大边, 质量 = 默认质量, 方形 = false } = {}) {
    return new Promise((resolve, reject) => {
        const 图 = new Image();
        图.onload = () => {
            let 源宽 = 图.width;
            let 源高 = 图.height;
            let 源x = 0;
            let 源y = 0;
            if (方形) {
                const 边长 = Math.min(源宽, 源高);
                源x = (源宽 - 边长) / 2;
                源y = (源高 - 边长) / 2;
                源宽 = 边长;
                源高 = 边长;
            }
            const 比例 = Math.min(1, 最大边 / Math.max(源宽, 源高));
            const 宽 = Math.max(1, Math.round(源宽 * 比例));
            const 高 = Math.max(1, Math.round(源高 * 比例));
            const 画布 = document.createElement("canvas");
            画布.width = 宽;
            画布.height = 高;
            const 笔 = 画布.getContext("2d");
            if (!笔) {
                reject(new Error("拿不到 canvas 2d 上下文"));
                return;
            }
            // 九参版：源图只取裁剪出的那一块
            笔.drawImage(图, 源x, 源y, 源宽, 源高, 0, 0, 宽, 高);
            try {
                resolve(画布.toDataURL("image/jpeg", 质量));
            } catch (错误) {
                // 理论上只有跨源图片会走到这（本方法输入的都是本地 data URL / blob）
                reject(错误);
            }
        };
        图.onerror = () => reject(new Error("图片解码失败"));
        图.src = 原地址;
    });
}

// 一步到位：选图 → 压缩 → data URL。用户取消时返回 null。
export async function 选择图片({ 最大边 = 默认最大边, 质量 = 默认质量, 方形 = false } = {}) {
    const 文件 = await 选择文件("image/*");
    if (!文件) return null;
    const 原地址 = await 读成data地址(文件);
    return 压缩图片(原地址, { 最大边, 质量, 方形 });
}

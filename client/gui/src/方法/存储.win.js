// 私有存储（PC）—— 逻辑**先空着**（2026-09-26 决定）。
//
// 只保留与安卓端完全一致的签名，方法体一律不实现，但要让调用方拿到**确定**的行为：
//   · 读取类 / 检查存在 / 路径类 → 返回「空」结果，UI 至少能渲染出默认设置
//   · 写入类 → 抛错，让调用方明确感知「PC 端还不能保存」
// 刻意不做成「假装成功」：静默写失败是最难排查的一类问题。
//
// 将来要做时，把 `私有存储.android.js` 那套搬过来，根目录换成：
//   app.path().app_local_data_dir()   →   %LOCALAPPDATA%\com.muimui.meownovels
// ⚠️ 别用 `获取应用目录`（exe 所在目录）：发布版装进 Program Files 后那里不可写；
//    开发时 exe 在 target/debug 下虽能写，但 cargo clean 一跑数据就没了。

// 结构定义与安卓端保持一致，调用方不必关心当前平台是哪个
export const 私有目录 = {
    数据: '数据',
    设置: '设置',
    用户资源: '数据/用户资源',
};

const 未实现说明 = 'PC 端私有存储尚未实现（见 src/方法/存储.win.js）';

export async function 取文件路径() {
    return '';
}

export async function 取子目录路径() {
    return '';
}

export async function 检查文件是否存在() {
    return false;
}

export async function 读取文件(_子目录名, _文件名, 默认值 = null) {
    return 默认值;
}

export async function 写入文件() {
    throw new Error(未实现说明);
}

export async function 读取文本(_子目录名, _文件名, 默认值 = '') {
    return 默认值;
}

export async function 写入文本() {
    throw new Error(未实现说明);
}

export async function 删除文件() {
    throw new Error(未实现说明);
}

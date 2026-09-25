import { invoke } from '@tauri-apps/api/core';

// 预设各类型设置的默认内容
const 默认设置 = {
    基础设置: [
        { id: '1', 内容: '承认本喵是最可爱的！', 值: true },
        { id: '2', 内容: '自动更新', 值: false }
    ],
    外观设置: [
        { id: '1', 内容: '毛玻璃效果', 值: true },
        { id: '2', 内容: '自动全屏', 值: false }
    ]
};

// 获取设置文件路径
async function 获取路径(文件名) {
    const 目录 = await invoke('获取应用目录');
    return 目录 + '\\应用数据\\设置\\' + 文件名 + '.json';
}

// 读取设置（没有则返回默认值）
export async function 读取设置(文件名) {
    try {
        const 路径 = await 获取路径(文件名);
        const 内容 = await invoke('读取文件', { 路径 });
        return JSON.parse(内容);
    } catch {
        return 默认设置[文件名] ? JSON.parse(JSON.stringify(默认设置[文件名])) : [];
    }
}

// 更新单个设置项
export async function 更新设置(文件名, id, 新值) {
    const 列表 = await 读取设置(文件名);
    const 项 = 列表.find(i => i.id === id);
    if (项) {
        项.值 = 新值;
    } else {
        console.warn(`设置项 "${id}" 不存在于 ${文件名}`);
        return;
    }
    const 路径 = await 获取路径(文件名);
    await invoke('写入文件', { 路径, 内容: JSON.stringify(列表) });
    return 列表;
}

// 批量更新
export async function 批量更新设置(文件名, 更新列表) {
    const 列表 = await 读取设置(文件名);
    for (const { id, 值 } of 更新列表) {
        const 项 = 列表.find(i => i.id === id);
        if (项) 项.值 = 值;
    }
    const 路径 = await 获取路径(文件名);
    await invoke('写入文件', { 路径, 内容: JSON.stringify(列表) });
    return 列表;
}

<template>
    <div class="子页">
        <TitleBar 标题="流量使用情况" @返回="$emit('返回')" />
        <div class="内容区">
            <p class="说明">日轻喵会统计每个「源」产生的流量，上传/图片占位之类不计。</p>

            <div class="源管理">
                <div v-for="项 in 列表" :key="项.标识">
                    <div class="平台信息">
                        <div class="源名">{{ 项.显示名称 }}</div>
                        <div class="流量信息">{{ 项.信息文字 }}</div>
                    </div>
                    <div class="流量值">{{ 项.格式化字节 }}<span>{{ 项.单位 }}</span></div>
                </div>
                <p v-if="!列表.length" class="空态">还没有流量记录喵~</p>
            </div>
        </div>
    </div>
</template>

<script>
import { 私有目录, 读取文件, 读取文本 } from '../../../方法/存储';
import { 提取元信息 } from '../../../方法/源/元信息';
import TitleBar from '../../UI/标题栏.android.vue';

const 流量目录 = `${私有目录.数据}/网络`;
const 源目录 = `${私有目录.数据}/源`;
const 注册文件名 = '源注册';

function 拆分字节(n) {
    if (!n || n <= 0) return { 数值: '0', 单位: 'B' };
    const 单位 = ['B', 'KB', 'MB', 'GB', 'TB'];
    let 值 = n;
    let 级 = 0;
    while (值 >= 1024 && 级 < 单位.length - 1) {
        值 /= 1024;
        级 += 1;
    }
    const 数值 = `${值 >= 100 || 级 === 0 ? Math.round(值) : 值.toFixed(1)}`;
    return { 数值, 单位: 单位[级] };
}

function 格式化时间(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const p = (x) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default {
    name: "流量使用情况",
    emits: ["返回"],
    components: { TitleBar },
    data() {
        return {
            列表: [],
        };
    },
    async mounted() {
        await this.刷新();
    },
    methods: {
        async 刷新() {
            const 注册 = (await 读取文件(源目录, 注册文件名, null)) ?? [];
            const 列表 = [];
            for (const 项 of Array.isArray(注册) ? 注册 : []) {
                const 标识 = 项.标识 || '';
                if (!标识) continue;
                let 名称 = 项.自定义名称 || 项.名称 || '';
                if (!名称) {
                    const 文本 = await 读取文本(源目录, 项.文件);
                    const { 对象 } = 提取元信息(文本);
                    名称 = 对象?.名称 || '';
                }
                const 盘上 = (await 读取文件(流量目录, 标识, null)) ?? {};
                const 字节 = 盘上.下载字节 ?? 0;
                const { 数值, 单位 } = 拆分字节(字节);
                列表.push({
                    标识,
                    显示名称: 名称 || 标识,
                    字节,
                    更新时间: 盘上.更新时间 || '',
                    格式化字节: 数值,
                    单位,
                    信息文字: 字节 ? `上次统计 ${格式化时间(盘上.更新时间)}` : '还没有流量记录',
                });
            }
            this.列表 = 列表;
        },
    },
};
</script>

<style scoped>
.子页 {
    position: relative;
    height: 100%;
    width: 100%;
    display: flex;
    overflow: hidden;
    flex-direction: column;
    background-color: var(--页面背景);
    padding: 0 15px;
    .内容区 {
        display: flex;
        flex-direction: column;
        align-items: center;
        overflow: hidden auto;
        min-height: 0;
        width: 100%;
        gap: 15px;
        padding: max(30px, calc(env(safe-area-inset-top, 10px) + 3rem + 15px)) 0 max(15px, calc(env(safe-area-inset-bottom, 10px) + 15px));
    }
    .说明 {
        margin: 0;
        font-size: .85rem;
        line-height: 1.6;
        color: var(--文本次色);
        padding: 0 5px;
    }
    .源管理 {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 15px;
        width: 100%;
        border-radius: 1.5rem;
        background-color: var(--内容卡片);
        > div {
            display: flex;
            align-items: center;
            width: 100%;
            gap: 15px;
            min-height: 3.5rem;
            .平台信息 {
                display: flex;
                flex-grow: 1;
                min-width: 0;
                flex-direction: column;
                gap: 4px;
                justify-content: center;
                .源名 {
                    font-size: 1.05rem;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .流量信息 {
                    font-size: .8rem;
                    color: var(--文本次色);
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
            }
            .流量值 {
                font-size: 1.3rem;
                flex-shrink: 0;
                font-variant-numeric: tabular-nums;
                span {
                    font-size: .8rem;
                }
            }
        }
        .空态 {
            padding: 20px 0;
            font-size: .95rem;
            color: var(--文本次色);
        }
    }
}
</style>


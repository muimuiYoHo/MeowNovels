/* ==========================================================================
   信息登记喵 · 出入库.js
   数据读取 → 渲染 → 筛选分页 → 表单增改 → 删除 → 导出
   ========================================================================== */

(function () {
    'use strict';

    /* ------------------------------ 常量 ------------------------------ */

    var 存储键 = '信息登记喵.记录.v1';
    var 每页条数 = 8;
    var 姓名上限 = 10;
    var 备注销上限 = 60;
    var 电话规则 = /^1[3-9]\d{9}$/;

    var 专业库 = [
        '计算机科学与技术', '软件工程', '人工智能', '数据科学与大数据技术',
        '电子信息工程', '自动化', '通信工程', '数学与应用数学', '统计学',
        '汉语言文学', '英语', '法学', '工商管理', '会计学', '临床医学',
        '视觉传达设计', '环境设计', '音乐学'
    ];

    /* ------------------------------ 状态 ------------------------------ */

    var 状态 = {
        记录: [],
        关键字: '',
        仅备注: false,
        页: 1,
        编辑中: null,
        选中: [],
        待删: []
    };

    var 元素 = {};

    /* ------------------------------ 小工具 ------------------------------ */

    function $(选择器, 范围) {
        return (范围 || document).querySelector(选择器);
    }

    function $$(选择器, 范围) {
        return Array.prototype.slice.call((范围 || document).querySelectorAll(选择器));
    }

    function 造ID() {
        return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }

    function 转义(文本) {
        return String(文本 == null ? '' : 文本)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function 头像色(文本) {
        var 色板 = ['#1A73E8', '#34A853', '#F9AB00', '#D93025', '#9334E6', '#12A4AF', '#E8710A', '#7B61FF'];
        var 累加 = 0;
        var 字 = String(文本 || '喵');
        for (var i = 0; i < 字.length; i++) {
            累加 = (累加 * 31 + 字.charCodeAt(i)) % 9973;
        }
        return 色板[累加 % 色板.length];
    }

    function 补零(数) {
        return 数 < 10 ? '0' + 数 : '' + 数;
    }

    function 时间戳() {
        var d = new Date();
        return d.getFullYear() + '-' + 补零(d.getMonth() + 1) + '-' + 补零(d.getDate()) +
            ' ' + 补零(d.getHours()) + ':' + 补零(d.getMinutes());
    }

    /* ------------------------------ 持久化 ------------------------------ */

    function 读取存档() {
        try {
            var 原文 = localStorage.getItem(存储键);
            if (!原文) return null;
            var 数据 = JSON.parse(原文);
            return Array.isArray(数据) ? 数据 : null;
        } catch (e) {
            return null;
        }
    }

    function 写入存档() {
        try {
            localStorage.setItem(存储键, JSON.stringify(状态.记录));
        } catch (e) {
            /* 无痕模式等情况忽略 */
        }
    }

    function 初始化记录() {
        var 存档 = 读取存档();
        if (存档) {
            状态.记录 = 存档.map(function (条) {
                return {
                    id: 条.id || 造ID(),
                    name: String(条.name || ''),
                    age: Number(条.age) || 0,
                    major: String(条.major || ''),
                    tel: String(条.tel || ''),
                    note: String(条.note || '')
                };
            });
            return;
        }
        var 初始 = (window.初始记录 || []).slice();
        状态.记录 = 初始.map(function (条) {
            return {
                id: 造ID(),
                name: 条.name,
                age: 条.age,
                major: 条.major,
                tel: 条.tel,
                note: 条.note || ''
            };
        });
        写入存档();
    }

    /* ------------------------------ 筛选 ------------------------------ */

    function 筛选后列表() {
        var 关键字 = 状态.关键字.trim().toLowerCase();
        return 状态.记录.filter(function (条) {
            if (状态.仅备注 && !条.note.trim()) return false;
            if (!关键字) return true;
            return [条.name, 条.major, 条.tel, 条.note].some(function (字段) {
                return String(字段).toLowerCase().indexOf(关键字) > -1;
            });
        });
    }

    function 总页数(条数) {
        return Math.max(1, Math.ceil(条数 / 每页条数));
    }

    /* ------------------------------ 渲染 ------------------------------ */

    function 渲染统计() {
        var 全部 = 状态.记录;
        var 专业集 = {};
        全部.forEach(function (条) { 专业集[条.major] = true; });
        var 年龄和 = 全部.reduce(function (和, 条) { return 和 + (Number(条.age) || 0); }, 0);
        var 平均 = 全部.length ? (年龄和 / 全部.length) : 0;

        元素.总数.textContent = 全部.length;
        元素.专业数.textContent = Object.keys(专业集).filter(Boolean).length;
        元素.平均年龄.textContent = 全部.length ? (Math.round(平均 * 10) / 10) : 0;
        元素.最后更新.textContent = 元素.最后更新.dataset.时间 || '—';
    }

    function 渲染表格() {
        var 列表 = 筛选后列表();
        var 页数 = 总页数(列表.length);
        if (状态.页 > 页数) 状态.页 = 页数;
        if (状态.页 < 1) 状态.页 = 1;

        var 起点 = (状态.页 - 1) * 每页条数;
        var 本页 = 列表.slice(起点, 起点 + 每页条数);

        元素.数据量.textContent = (状态.关键字 || 状态.仅备注)
            ? 列表.length + ' / ' + 状态.记录.length + ' 条'
            : 状态.记录.length + ' 条';

        if (!本页.length) {
            元素.tbody.innerHTML = '';
            var 包 = document.createElement('tbody');
            包.innerHTML = '<tr><td colspan="7">' +
                '<div class="空状态">' +
                '<div class="空图">🐾</div>' +
                '<strong>' + (状态.记录.length ? '没有匹配的记录' : '还没有登记任何信息') + '</strong>' +
                '<small>' + (状态.记录.length ? '换个关键词，或点右下角「重置筛选」试试喵' : '点左侧「信息登记」开始录入第一条喵') + '</small>' +
                '</div></td></tr>';
            元素.tbody.innerHTML = 包.innerHTML;
        } else {
            元素.tbody.innerHTML = 本页.map(function (条) {
                var 选中 = 状态.选中.indexOf(条.id) > -1;
                var 首字 = (条.name || '喵').slice(0, 1);
                return '<tr data-id="' + 条.id + '"' + (选中 ? ' class="选中行"' : '') + '>' +
                    '<td><input class="cbox 行选" type="checkbox" aria-label="选择 ' + 转义(条.name) + '"' + (选中 ? ' checked' : '') + '></td>' +
                    '<td>' +
                    '<div class="姓名格">' +
                    '<span class="姓名圆" style="background:' + 头像色(条.name) + '">' + 转义(首字) + '</span>' +
                    '<span class="姓名文" title="' + 转义(条.name) + '">' + 转义(条.name) + '</span>' +
                    '</div>' +
                    '</td>' +
                    '<td>' + (条.age || '—') + '</td>' +
                    '<td><span class="专业标" title="' + 转义(条.major) + '">' + 转义(条.major || '未填') + '</span></td>' +
                    '<td>' + 转义(条.tel) + '</td>' +
                    (条.note
                        ? '<td title="' + 转义(条.note) + '">' + 转义(条.note) + '</td>'
                        : '<td><span class="备注空">—</span></td>') +
                    '<td>' +
                    '<button class="行钮" type="button" data-act="edit">编辑</button>' +
                    '<button class="行钮 危险" type="button" data-act="del">删除</button>' +
                    '</td>' +
                    '</tr>';
            }).join('');
        }

        渲染分页(列表.length);
        同步全选();
        渲染底部(列表.length, 起点, 本页.length);
        渲染统计();
    }

    function 渲染分页(总数) {
        元素.分片.innerHTML = '';
        var 页数 = 总页数(总数);
        if (总数 <= 每页条数) return;

        var 按钮 = [];
        按钮.push('<button type="button" data-page="prev"' + (状态.页 === 1 ? ' disabled' : '') + '>上一页</button>');

        var 页码 = [];
        for (var i = 1; i <= 页数; i++) {
            if (页数 <= 7 || i === 1 || i === 页数 || Math.abs(i - 状态.页) <= 1) {
                页码.push(i);
            } else if (页码[页码.length - 1] !== '…') {
                页码.push('…');
            }
        }
        页码.forEach(function (项) {
            if (项 === '…') {
                按钮.push('<span class="省略">…</span>');
            } else {
                按钮.push('<button type="button" data-page="' + 项 + '"' +
                    (项 === 状态.页 ? ' class="当前页"' : '') + '>' + 项 + '</button>');
            }
        });

        按钮.push('<button type="button" data-page="next"' + (状态.页 === 页数 ? ' disabled' : '') + '>下一页</button>');
        元素.分片.innerHTML = 按钮.join('');
    }

    function 渲染底部(总数, 起点, 本页数) {
        if (!总数) {
            元素.底部范围.textContent = '—';
            return;
        }
        元素.底部范围.textContent = '第 ' + (起点 + 1) + '–' + (起点 + 本页数) + ' 条 / 共 ' + 总数 + ' 条';
    }

    function 同步全选() {
        var 本页框 = $$('.行选', 元素.tbody);
        var 选中数 = 本页框.filter(function (框) { return 框.checked; }).length;
        元素.全选.checked = 本页框.length > 0 && 选中数 === 本页框.length;
        元素.全选.indeterminate = 选中数 > 0 && 选中数 < 本页框.length;
        更新删除按钮();
    }

    function 更新删除按钮() {
        var 数 = 状态.选中.length;
        元素.删所选.textContent = '删除所选' + (数 ? ' (' + 数 + ')' : '');
        元素.删所选.disabled = 数 === 0;
    }

    /* ------------------------------ 轻提示 ------------------------------ */

    var 提示定时器 = null;

    function 提示(文案, 类型) {
        var 盒 = 元素.提示;
        if (!盒) {
            盒 = document.createElement('div');
            盒.className = '轻提示';
            document.body.appendChild(盒);
            元素.提示 = 盒;
        }
        盒.textContent = 文案;
        盒.className = '轻提示 ' + (类型 || 'ok') + ' 出现';
        clearTimeout(提示定时器);
        提示定时器 = setTimeout(function () {
            盒.classList.remove('出现');
        }, 2200);
    }

    /* ------------------------------ 表单 ------------------------------ */

    var 字段表 = ['fName', 'fAge', 'fMajor', 'fTel', 'fNote'];

    var 提示语 = {
        fName: '请填写姓名，最多 ' + 姓名上限 + ' 个字',
        fAge: '1 到 120 之间的数字',
        fMajor: '请选择所属专业',
        fTel: '请填写 11 位手机号',
        fNote: '最多 ' + 备注销上限 + ' 个字'
    };

    function 字段项目(键) {
        return 元素[键] ? 元素[键].closest('.项目') : null;
    }

    function 校验一个(键, 显示) {
        var 值 = String(元素[键].value == null ? '' : 元素[键].value).trim();
        var 错 = '';

        if (键 === 'fName') {
            if (!值) 错 = '请填写姓名';
            else if (值.length > 姓名上限) 错 = '姓名最多 ' + 姓名上限 + ' 个字';
        } else if (键 === 'fAge') {
            var 龄 = Number(值);
            if (!值) 错 = '请填写年龄';
            else if (!isFinite(龄) || Math.floor(龄) !== 龄) 错 = '年龄要填整数喵';
            else if (龄 < 1 || 龄 > 120) 错 = '年龄要在 1 到 120 之间';
        } else if (键 === 'fMajor') {
            if (!值) 错 = '请选择所属专业';
        } else if (键 === 'fTel') {
            if (!值) 错 = '请填写联系电话';
            else if (!电话规则.test(值)) 错 = '手机号格式不对，需要 11 位';
        } else if (键 === 'fNote') {
            if (值.length > 备注销上限) 错 = '备注最多 ' + 备注销上限 + ' 个字';
            else if (!值) 错 = '';
        }

        var 项目 = 字段项目(键);
        if (项目 && 显示) {
            var 说明 = 项目.querySelector(':scope > span');
            项目.classList.toggle('错误', !!错);
            if (说明) 说明.textContent = 错 || 提示语[键] || '';
        }
        return 错;
    }

    function 校验全部(显示) {
        var 错表 = {};
        字段表.forEach(function (键) {
            var 错 = 校验一个(键, 显示);
            if (错) 错表[键] = 错;
        });
        return 错表;
    }

    function 清空表单() {
        字段表.forEach(function (键) {
            if (元素[键]) 元素[键].value = '';
            var 项目 = 字段项目(键);
            if (项目) {
                项目.classList.remove('错误', '通过');
                var 说明 = 项目.querySelector(':scope > span');
                if (说明) 说明.textContent = 提示语[键] || '';
            }
        });
        状态.编辑中 = null;
        元素.formTitle.textContent = '信息表单区';
        元素.formSub.textContent = '填好下面的字段，保存后即可加入名单';
        元素.保存.textContent = '保存登记';
        元素.取消修改.disabled = true;
    }

    function 填充表单(条) {
        元素.fName.value = 条.name;
        元素.fAge.value = 条.age;
        元素.fMajor.value = 条.major;
        元素.fTel.value = 条.tel;
        元素.fNote.value = 条.note;
        状态.编辑中 = 条.id;
        元素.formTitle.textContent = '修改登记信息';
        元素.formSub.textContent = '正在编辑：' + 条.name + '，改完点「保存登记」';
        元素.保存.textContent = '保存修改';
        元素.取消修改.disabled = false;
        字段表.forEach(function (键) {
            var 项目 = 字段项目(键);
            if (项目) {
                项目.classList.remove('错误');
                var 说明 = 项目.querySelector(':scope > span');
                if (说明) 说明.textContent = 提示语[键] || '';
            }
        });
        打开抽屉();
    }

    function 收集表单() {
        return {
            name: 元素.fName.value.trim(),
            age: Number(元素.fAge.value),
            major: 元素.fMajor.value,
            tel: 元素.fTel.value.trim(),
            note: 元素.fNote.value.trim()
        };
    }

    function 保存登记() {
        var 错表 = 校验全部(true);
        var 第一个错 = 字段表.filter(function (键) { return 错表[键]; })[0];
        if (第一个错) {
            元素[第一个错].focus();
            提示(错表[第一个错], 'err');
            return;
        }

        var 新值 = 收集表单();

        if (状态.编辑中) {
            var 目标 = 状态.记录.filter(function (条) { return 条.id === 状态.编辑中; })[0];
            if (目标) {
                目标.name = 新值.name;
                目标.age = 新值.age;
                目标.major = 新值.major;
                目标.tel = 新值.tel;
                目标.note = 新值.note;
            }
            打时间戳();
            写入存档();
            var 记住 = 状态.页;
            清空表单();
            状态.页 = 记住;
            渲染表格();
            提示('已保存修改喵 ✓');
            return;
        }

        var 重复 = 状态.记录.some(function (条) {
            return 条.tel === 新值.tel || (条.name === 新值.name && 条.major === 新值.major);
        });
        if (重复) {
            提示('这个名字或手机号已经登记过啦', 'err');
            return;
        }

        状态.记录.unshift({
            id: 造ID(),
            name: 新值.name,
            age: 新值.age,
            major: 新值.major,
            tel: 新值.tel,
            note: 新值.note
        });
        打时间戳();
        写入存档();
        清空表单();
        状态.页 = 1;
        渲染表格();
        提示('已新增「' + 新值.name + '」喵 ✓');
        元素.fName.focus();
    }

    function 打时间戳() {
        var 时 = 时间戳();
        元素.最后更新.dataset.时间 = 时;
        元素.最后更新.textContent = 时;
        存时间(时);
    }

    /* ------------------------------ 删除 ------------------------------ */

    function 请求删除(编号列表) {
        if (!编号列表.length) return;
        var 名称 = 状态.记录
            .filter(function (条) { return 编号列表.indexOf(条.id) > -1; })
            .map(function (条) { return 条.name; });
        状态.待删 = 编号列表.slice();
        元素.对话框.querySelector('p').textContent = 编号列表.length === 1
            ? '即将删除「' + 名称[0] + '」的记录，删除后无法恢复喵。'
            : '即将删除 ' + 编号列表.length + ' 条记录（' + 名称.slice(0, 3).join('、') +
            (名称.length > 3 ? ' 等' : '') + '），删除后无法恢复喵。';
        元素.对话框.classList.add('出现');
    }

    function 关闭对话框() {
        元素.对话框.classList.remove('出现');
        状态.待删 = [];
    }

    function 确认删除() {
        var 待删 = 状态.待删.slice();
        if (!待删.length) {
            关闭对话框();
            return;
        }
        状态.记录 = 状态.记录.filter(function (条) { return 待删.indexOf(条.id) === -1; });
        状态.选中 = 状态.选中.filter(function (id) { return 待删.indexOf(id) === -1; });
        打时间戳();
        写入存档();
        关闭对话框();
        渲染表格();
        提示('已删除 ' + 待删.length + ' 条记录喵');
    }

    /* ------------------------------ 导出 ------------------------------ */

    function CSV单元(值) {
        var 文 = String(值 == null ? '' : 值);
        if (/^[=+\-@]/.test(文)) 文 = "'" + 文;
        return '"' + 文.replace(/"/g, '""') + '"';
    }

    function 导出CSV() {
        var 列表 = 筛选后列表();
        if (!列表.length) {
            提示('当前没有可导出的记录喵', 'err');
            return;
        }
        var 行 = [['姓名', '年龄', '专业', '联系电话', '备注']];
        列表.forEach(function (条) {
            行.push([条.name, 条.age, 条.major, 条.tel, 条.note]);
        });
        var 文本 = 行.map(function (列) { return 列.map(CSV单元).join(','); }).join('\r\n');
        var 内容 = '\ufeff' + 文本;
        var 地址 = URL.createObjectURL(new Blob([内容], { type: 'text/csv;charset=utf-8' }));
        var a = document.createElement('a');
        a.href = 地址;
        a.download = '信息登记_' + 时间戳().replace(/[-: ]/g, '') + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(地址); }, 2000);
        提示('已导出 ' + 列表.length + ' 条记录喵 ✓');
    }

    /* ------------------------------ 抽屉 ------------------------------ */

    function 打开抽屉() {
        元素.抽屉.classList.add('出现');
        元素.表单区.scrollTop = 0;
    }

    function 关闭抽屉() {
        元素.抽屉.classList.remove('出现');
    }

    function 切换导航(项) {
        $$('.电梯 a').forEach(function (a) {
            a.classList.toggle('当前', a === 项);
        });
    }

    /* ------------------------------ 存档时间 ------------------------------ */

    function 读时间() {
        try {
            return localStorage.getItem(存储键 + '.时间') || '';
        } catch (e) {
            return '';
        }
    }

    function 存时间(时) {
        try {
            localStorage.setItem(存储键 + '.时间', 时);
        } catch (e) { /* ignore */ }
    }

    /* ------------------------------ 抓元素 ------------------------------ */

    function 抓元素() {
        元素.tbody = $('#tbody');
        元素.q = $('#q');
        元素.仅备注 = $('#仅备注');
        元素.全选 = $('#pickAll');
        元素.数据量 = $('#数据量');
        元素.总数 = $('#factTotal');
        元素.专业数 = $('#factMajors');
        元素.平均年龄 = $('#factAge');
        元素.最后更新 = $('#factStamp');
        元素.分片 = $('.分片');
        元素.底部范围 = $('.底功能 span:first-child');
        元素.重置 = $('.底功能 button');
        元素.滚动区 = $('.表格');

        元素.formTitle = $('#formTitle');
        元素.formSub = $('#formSub');
        元素.抽屉 = $('.表单页');
        元素.表单区 = $('#表单');
        元素.关闭抽屉钮 = $('.关闭');
        元素.表单 = $('#表单 form');

        字段表.forEach(function (键) {
            元素[键] = $('#' + 键);
        });

        var 操作钮 = $$('.操作 button');
        元素.保存 = 操作钮[0];
        元素.取消修改 = 操作钮[1];
        元素.清空 = 操作钮[2];
        元素.删所选 = 操作钮[3];
        元素.导出 = 操作钮[4];

        元素.对话框 = $('.删除');
        元素.确认删除钮 = $('#dlgOk');
        元素.取消删除钮 = $('#dlgCancel');
        元素.返回上面 = $('.返回上面');
    }

    /* ------------------------------ 初始化下拉 ------------------------------ */

    function 初始化专业下拉() {
        var 下拉 = 元素.fMajor;
        var 全集 = 专业库.slice();
        状态.记录.forEach(function (条) {
            if (条.major && 全集.indexOf(条.major) === -1) 全集.push(条.major);
        });
        var 片段 = '<option value="">请选择专业</option>';
        全集.forEach(function (名) {
            片段 += '<option value="' + 转义(名) + '">' + 转义(名) + '</option>';
        });
        下拉.innerHTML = 片段;
    }

    /* ------------------------------ 事件 ------------------------------ */

    function 绑定事件() {
        var 搜索定时 = null;
        元素.q.addEventListener('input', function () {
            clearTimeout(搜索定时);
            搜索定时 = setTimeout(function () {
                状态.关键字 = 元素.q.value;
                状态.页 = 1;
                渲染表格();
            }, 180);
        });

        元素.仅备注.addEventListener('change', function () {
            状态.仅备注 = 元素.仅备注.checked;
            状态.页 = 1;
            渲染表格();
        });

        元素.全选.addEventListener('change', function () {
            var 开 = 元素.全选.checked;
            $$('.行选', 元素.tbody).forEach(function (框) {
                var tr = 框.closest('tr');
                if (!tr) return;
                var id = tr.dataset.id;
                框.checked = 开;
                tr.classList.toggle('选中行', 开);
                var 位置 = 状态.选中.indexOf(id);
                if (开 && 位置 === -1) 状态.选中.push(id);
                if (!开 && 位置 > -1) 状态.选中.splice(位置, 1);
            });
            同步全选();
        });

        元素.tbody.addEventListener('change', function (e) {
            var 框 = e.target;
            if (!框.classList || !框.classList.contains('行选')) return;
            var tr = 框.closest('tr');
            if (!tr) return;
            var id = tr.dataset.id;
            tr.classList.toggle('选中行', 框.checked);
            var 位置 = 状态.选中.indexOf(id);
            if (框.checked && 位置 === -1) 状态.选中.push(id);
            if (!框.checked && 位置 > -1) 状态.选中.splice(位置, 1);
            同步全选();
        });

        元素.tbody.addEventListener('click', function (e) {
            var 钮 = e.target.closest('.行钮');
            if (!钮) return;
            var tr = 钮.closest('tr');
            if (!tr) return;
            var id = tr.dataset.id;
            var 条 = 状态.记录.filter(function (r) { return r.id === id; })[0];
            if (!条) return;
            if (钮.dataset.act === 'edit') {
                填充表单(条);
            } else {
                请求删除([id]);
            }
        });

        元素.分片.addEventListener('click', function (e) {
            var 钮 = e.target.closest('button[data-page]');
            if (!钮 || 钮.disabled) return;
            var 值 = 钮.dataset.page;
            var 页数 = 总页数(筛选后列表().length);
            if (值 === 'prev') 状态.页 = Math.max(1, 状态.页 - 1);
            else if (值 === 'next') 状态.页 = Math.min(页数, 状态.页 + 1);
            else 状态.页 = Number(值);
            渲染表格();
            元素.滚动区.scrollTo({ top: 0, behavior: 'smooth' });
        });

        元素.重置.addEventListener('click', function () {
            元素.q.value = '';
            元素.仅备注.checked = false;
            状态.关键字 = '';
            状态.仅备注 = false;
            状态.选中 = [];
            状态.页 = 1;
            渲染表格();
            提示('筛选条件已重置喵');
        });

        元素.保存.addEventListener('click', 保存登记);

        元素.取消修改.addEventListener('click', function () {
            清空表单();
            提示('已放弃修改');
        });

        元素.清空.addEventListener('click', function () {
            清空表单();
            提示('表单已清空');
        });

        元素.删所选.addEventListener('click', function () {
            请求删除(状态.选中.slice());
        });

        元素.导出.addEventListener('click', 导出CSV);

        元素.表单.addEventListener('submit', function (e) {
            e.preventDefault();
            保存登记();
        });

        字段表.forEach(function (键) {
            var 输入 = 元素[键];
            if (!输入) return;
            输入.addEventListener('input', function () {
                var 项目 = 字段项目(键);
                if (项目 && 项目.classList.contains('错误')) 校验一个(键, true);
            });
            输入.addEventListener('blur', function () {
                校验一个(键, true);
            });
        });

        元素.确认删除钮.addEventListener('click', 确认删除);
        元素.取消删除钮.addEventListener('click', 关闭对话框);
        元素.对话框.addEventListener('click', function (e) {
            if (e.target === 元素.对话框) 关闭对话框();
        });

        元素.关闭抽屉钮.addEventListener('click', 关闭抽屉);

        $$('.电梯 a').forEach(function (a) {
            a.addEventListener('click', function (e) {
                e.preventDefault();
                切换导航(a);
                var 目标 = a.getAttribute('href') || '';
                if (目标 === '#数据') {
                    关闭抽屉();
                    元素.滚动区.scrollTo({ top: 0, behavior: 'smooth' });
                } else if (目标 === '#表单') {
                    打开抽屉();
                    setTimeout(function () { 元素.fName.focus(); }, 380);
                } else {
                    打开抽屉();
                }
            });
        });

        元素.返回上面.addEventListener('click', function () {
            元素.滚动区.scrollTo({ top: 0, behavior: 'smooth' });
        });

        元素.滚动区.addEventListener('scroll', function () {
            元素.返回上面.classList.toggle('出现', 元素.滚动区.scrollTop > 180);
        }, { passive: true });

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            if (元素.对话框.classList.contains('出现')) {
                关闭对话框();
            } else if (元素.抽屉.classList.contains('出现')) {
                关闭抽屉();
            }
        });

        $$('.顶栏图标 .图标钮, .头像').forEach(function (钮) {
            钮.addEventListener('click', function () {
                提示('这个入口还在装修中喵～');
            });
        });

        $$('.页脚 a').forEach(function (a) {
            a.addEventListener('click', function (e) {
                e.preventDefault();
                提示('『' + a.textContent.trim() + '』页面还没做喵');
            });
        });
    }

    /* ------------------------------ 启动 ------------------------------ */

    function 启动() {
        抓元素();
        初始化记录();
        初始化专业下拉();
        清空表单();

        var 旧时间 = 读时间();
        if (旧时间) {
            元素.最后更新.dataset.时间 = 旧时间;
            元素.最后更新.textContent = 旧时间;
        } else if (状态.记录.length) {
            打时间戳();
        }

        渲染表格();
        绑定事件();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', 启动);
    } else {
        启动();
    }
})();



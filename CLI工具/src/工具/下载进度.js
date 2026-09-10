/**
 * 下载进度条
 * 源通过 配置.显示 声明要展示的字段，框架负责节流、格式化、渲染
 */

const 颜色 = {
  重置: "\x1b[0m",
  亮: "\x1b[1m",
  灰: "\x1b[90m",
};

function 格式化字节(字节数) {
  if (字节数 > 1048576) return `${(字节数 / 1048576).toFixed(1)}MB`;
  if (字节数 > 1024) return `${(字节数 / 1024).toFixed(0)}KB`;
  return `${字节数}B`;
}

function 格式化字节速度(字节每秒) {
  if (字节每秒 > 1048576) return `${(字节每秒 / 1048576).toFixed(1)}MB/s`;
  return `${(字节每秒 / 1024).toFixed(0)}KB/s`;
}

function 进度条(百分比) {
  const 填充 = Math.floor(百分比 / 5);
  return `[${"█".repeat(填充)}${"░".repeat(20 - 填充)}]`;
}

export class 进度 {
  /**
   * @param {object} 配置
   * @param {string[]} 配置.显示 - 要显示的字段列表
   *   可选: "百分比", "速度", "已用时", "剩余", "章进度", "章速", "体积"
   * @param {number} [配置.节流=500] - 最小刷新间隔(ms)
   */
  constructor(配置 = {}) {
    this.显示 = 配置.显示 || ["百分比", "速度", "剩余"];
    this.节流ms = 配置.节流 || 500;
    this.开始时间 = Date.now();
    this.上次刷新 = 0;
    this.总量 = 0;
    this.已完成 = 0;
    this.字节数 = 0;
  }

  设置总量(总量) { this.总量 = 总量; }

  更新(增量字节 = 0, 增量项 = 1) {
    this.已完成 += 增量项;
    this.字节数 += 增量字节;
    const 现在 = Date.now();
    if (现在 - this.上次刷新 < this.节流ms) return;
    this.上次刷新 = 现在;
    this._渲染();
  }

  完成(文件路径) {
    this._渲染();
    const 耗时 = ((Date.now() - this.开始时间) / 1000).toFixed(1);
    process.stderr.write("\n");
    const 大小 = 格式化字节(this.字节数);
    const 显示路径 = 文件路径 ? 文件路径.replace(/^.*?[\\/](?=下载[\\/])/, "").replace(/[^\\/]+$/, "...") : null;
    const 信息 = 显示路径 ? `${显示路径} (${大小})` : 大小;
    process.stderr.write(`下载完成: ${信息} | 耗时 ${耗时}s\n`);
  }

  获取统计() {
    return {
      已完成: this.已完成,
      字节数: this.字节数,
      耗时: ((Date.now() - this.开始时间) / 1000).toFixed(1),
    };
  }

  _渲染() {
    const 耗时 = (Date.now() - this.开始时间) / 1000;
    const 字节速 = 耗时 > 0 ? this.字节数 / 耗时 : 0;
    const 章速 = 耗时 > 0 ? this.已完成 / 耗时 : 0;
    const 百分比 = this.总量 > 0 ? Math.round((this.已完成 / this.总量) * 100) : 0;
    const 剩余 = 章速 > 0 && this.总量 > 0 ? (this.总量 - this.已完成) / 章速 : 0;

    const 段 = [];
    for (const 字段 of this.显示) {
      switch (字段) {
        case "百分比":
          if (this.总量 > 0) 段.push(`${进度条(百分比)} ${百分比}%`);
          break;
        case "速度":
          段.push(格式化字节速度(字节速));
          break;
        case "已用时":
          段.push(`已用时 ${Math.floor(耗时)}s`);
          break;
        case "剩余":
          if (this.总量 > 0) 段.push(`剩余 ${Math.ceil(剩余)}s`);
          break;
        case "章进度":
          if (this.总量 > 0) 段.push(`${this.已完成}/${this.总量} 章`);
          break;
        case "卷进度":
          if (this.总量 > 0) 段.push(`${this.已完成}/${this.总量} 卷`);
          break;
        case "章速":
          段.push(`${章速.toFixed(1)} 章/s`);
          break;
        case "体积":
          段.push(格式化字节(this.字节数));
          break;
      }
    }
    // 已下载大小总是显示
    if (!this.显示.includes("体积") && !this.显示.includes("章进度")) {
      段.unshift(格式化字节(this.字节数));
    }

    process.stderr.write(`\r\x1b[K${段.join(" | ")}`);
  }
}

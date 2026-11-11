'use strict';

/**
 * 依赖自举：首次运行时把依赖装到技能目录，避免污染用户项目。
 * 必需依赖按「实际要用到的格式」决定，只出 SVG 时不会强行安装 pptxgenjs。
 */

const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// 真正 require 一次：sharp 这类原生模块如果二进制加载失败，resolve 成功也没用
function loads(mod) {
  try {
    require(mod);
    return true;
  } catch (e) {
    return false;
  }
}

function sleepSync(ms) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch (e) {
    const end = Date.now() + ms;
    while (Date.now() < end) { /* 兜底忙等 */ }
  }
}

function install(list) {
  const quiet = process.env.PPT_DIAGRAM_QUIET === '1';
  const cmd = `npm install --no-audit --no-fund --prefix "${ROOT}" ${list.join(' ')}`;
  if (!quiet) console.error(`[deps] 首次运行，正在安装：${list.join(' ')}`);
  execSync(cmd, { stdio: quiet ? 'ignore' : 'inherit', cwd: ROOT });
}

// 安装刚结束时文件系统可能还没落盘，短暂重试几次真正的加载
function loadAfterInstall(mod) {
  for (let i = 0; i < 5; i++) {
    if (loads(mod)) return true;
    sleepSync(200);
  }
  return false;
}

/**
 * @param {{ yaml?: boolean, pptx?: boolean, sharp?: boolean }} want 需要哪些能力
 * @returns {{ sharp: boolean }}
 */
function ensureDeps(want) {
  const w = want || {};

  const required = [];
  if (w.yaml !== false) required.push('js-yaml');
  if (w.pptx) required.push('pptxgenjs');

  const missing = required.filter((m) => !loads(m));
  if (missing.length) {
    try {
      install(missing);
    } catch (e) {
      throw new Error(
        `依赖安装失败（${missing.join(', ')}）。请检查网络，或手动执行：cd "${ROOT}" && npm install ${missing.join(' ')}`
      );
    }
    const stillMissing = missing.filter((m) => !loadAfterInstall(m));
    if (stillMissing.length) {
      throw new Error(`依赖安装后仍无法加载：${stillMissing.join(', ')}`);
    }
  }

  // sharp 是原生模块，属于可选能力：装不上就降级为只出 SVG
  if (!w.sharp) return { sharp: false };
  if (!loads('sharp')) {
    try {
      install(['sharp']);
    } catch (e) {
      return { sharp: false };
    }
    return { sharp: loadAfterInstall('sharp') };
  }
  return { sharp: true };
}

module.exports = { ensureDeps, loads, ROOT };

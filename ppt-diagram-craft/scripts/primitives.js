'use strict';

/**
 * 图元与基础渲染能力（四种图型共用）
 * 统一坐标系：英寸，画布 13.333 × 7.5（16:9），输出按 288dpi 栅格化。
 */

const os = require('os');

const S = 288;                     // 每英寸像素数（288dpi）
const W = 13.333;                  // 画布宽（英寸）
const H = 7.5;                     // 画布高（英寸）
const MARGIN = 0.72;               // 页面左右安全边距

const px = (inch) => +(inch * S).toFixed(2);
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ---------- 字体：按平台回退，避免换机器字宽变化导致排版错位 ---------- */

const FONT_SVG =
  "'Microsoft YaHei','PingFang SC','Hiragino Sans GB','Noto Sans CJK SC','Source Han Sans SC',sans-serif";

function pptFont() {
  switch (os.platform()) {
    case 'win32':
      return 'Microsoft YaHei';
    case 'darwin':
      return 'PingFang SC';
    default:
      return 'Noto Sans CJK SC';
  }
}

/* ---------- 字号阶梯：全站只用这几档，保证节奏一致 ---------- */

const T = {
  title: 27,
  nodeTitle: 20,
  body: 12,
  label: 11,
  small: 10.5,
  tiny: 9
};

/* ---------- 主题 ---------- */

// accent 的 key 是「色槽」而非具体颜色：blue=主色槽、teal=辅色槽、amber=强调/警示槽、
// violet=第三方槽、slate=中性槽。换主题时同一个槽位会映射到不同品牌色，spec 不用改。

const SLOTS = ['blue', 'teal', 'amber', 'violet', 'slate'];

// 允许在 palette 里用语义名覆盖槽位
const SLOT_ALIAS = { primary: 'blue', secondary: 'teal', accent: 'amber', tertiary: 'violet', neutral: 'slate' };

/* 各主题的取色依据（详见 references/design-tokens.md） */
const THEME_DEFS = {
  // 现有默认：商务蓝
  'corporate-blue': {
    bg: '#FFFFFF', surface: '#FFFFFF', ink: '#14213D', sub: '#64748B', mute: '#94A3B8',
    nodeText: '#334155', line: '#E2E8F0', track: '#F7F9FC', gradFrom: '#FFFFFF',
    shadow: 0.12, shadowColor: '#0F2A4A',
    accents: { blue: '#2B6CB0', teal: '#0F9D8F', amber: '#C77B22', violet: '#6B5BD2', slate: '#64748B' }
  },
  // 战略咨询风：藏青 + 金（麦肯锡体系）
  'consulting-navy': {
    bg: '#FFFFFF', surface: '#FFFFFF', ink: '#051C2C', sub: '#5A6B7B', mute: '#8A97A6',
    nodeText: '#1F3444', line: '#DDE3E9', track: '#F6F8FA', gradFrom: '#FFFFFF',
    shadow: 0.14, shadowColor: '#051C2C',
    accents: { blue: '#00338D', teal: '#3E6E9E', amber: '#C8A962', violet: '#5B5FA8', slate: '#64748B' }
  },
  // 政务风：中国红 + 金
  'gov-red': {
    bg: '#FFFFFF', surface: '#FFFFFF', ink: '#2B1A16', sub: '#7A6A64', mute: '#A79A94',
    nodeText: '#4A3A34', line: '#EEE4DD', track: '#FBF7F4', gradFrom: '#FFFFFF',
    shadow: 0.12, shadowColor: '#3A0D0D',
    accents: { blue: '#A61B29', teal: '#1F6E5A', amber: '#C9A227', violet: '#7A4A8C', slate: '#6B6259' }
  },
  // 深色科技：slate-900 底 + 青色高亮
  'tech-dark': {
    dark: true,
    bg: '#0F172A', surface: '#1E293B', ink: '#F1F5F9', sub: '#94A3B8', mute: '#7C8CA6',
    nodeText: '#CBD5E1', line: '#243049', track: '#16203A', gradFrom: '#1B2740',
    shadow: 0.42, shadowColor: '#000000',
    accents: { blue: '#38BDF8', teal: '#22D3EE', amber: '#F59E0B', violet: '#A78BFA', slate: '#94A3B8' }
  },
  // 极简墨黑：单色，弱化装饰
  'minimal-ink': {
    bg: '#FFFFFF', surface: '#FFFFFF', ink: '#111827', sub: '#6B7280', mute: '#9CA3AF',
    nodeText: '#374151', line: '#E5E7EB', track: '#FAFAFA', gradFrom: '#FFFFFF',
    shadow: 0.07, shadowColor: '#111827',
    accents: { blue: '#1F2937', teal: '#4B5563', amber: '#B45309', violet: '#6D28D9', slate: '#9CA3AF' }
  },
  // 蚂蚁蓝：Ant Design 品牌色 #1677FF
  'ant-blue': {
    bg: '#FFFFFF', surface: '#FFFFFF', ink: '#0B1B33', sub: '#5C6B7F', mute: '#95A3B6',
    nodeText: '#2C3E55', line: '#E5EDF8', track: '#F7FAFF', gradFrom: '#FFFFFF',
    shadow: 0.11, shadowColor: '#0B1B33',
    accents: { blue: '#1677FF', teal: '#13C2C2', amber: '#FA8C16', violet: '#722ED1', slate: '#64748B' }
  },
  // 金融/医疗稳重：墨绿 + 金
  'finance-green': {
    bg: '#FFFFFF', surface: '#FFFFFF', ink: '#10261F', sub: '#5F6F68', mute: '#93A29B',
    nodeText: '#2F4239', line: '#E3EAE6', track: '#F5F9F7', gradFrom: '#FFFFFF',
    shadow: 0.11, shadowColor: '#0A1F18',
    accents: { blue: '#0E5C4A', teal: '#2A8C7A', amber: '#B79264', violet: '#5B5FA8', slate: '#64748B' }
  },
  // 暖砂：米色底 + 赭石，适合非技术汇报
  'warm-sand': {
    bg: '#FBF8F3', surface: '#FFFFFF', ink: '#2B2620', sub: '#7A6E60', mute: '#A79C8E',
    nodeText: '#4A423A', line: '#EDE4D8', track: '#F6F1E8', gradFrom: '#FFFFFF',
    shadow: 0.10, shadowColor: '#3A2E22',
    accents: { blue: '#A0522D', teal: '#5F7A61', amber: '#C0873F', violet: '#7A5B8C', slate: '#6E655B' }
  }
};

const THEME_NAMES = Object.keys(THEME_DEFS);

/* ---------- 颜色工具 ---------- */

function hexToRgb(hex) {
  const s = String(hex).replace('#', '');
  const full = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r, g, b) {
  const c = [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0'));
  return `#${c.join('')}`;
}

// 把 a 朝 b 混合 t（0..1），用于从品牌色自动推导浅底色与描边色
function mix(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}

function isHex(v) {
  return typeof v === 'string' && /^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(v);
}

/**
 * 构造主题：底色/文字等直接取定义，强调色的浅底与描边由混合算法推导，
 * 这样新增一个主题只需要给 5 个品牌色，不用手调 15 个衍生色。
 * @param {string} name    主题名
 * @param {object} palette 可选覆盖：{ bg, ink, sub, line, surface, primary, secondary, accent, tertiary, neutral, blue... }
 */
function theme(name, palette) {
  const def = THEME_DEFS[name] || THEME_DEFS['corporate-blue'];
  const p = palette || {};

  const bg = isHex(p.bg) ? p.bg : def.bg;
  const accents = {};

  SLOTS.forEach((slot) => {
    const aliasKey = Object.keys(SLOT_ALIAS).find((k) => SLOT_ALIAS[k] === slot);
    const override = [p[slot], p[aliasKey]].find((v) => isHex(v));
    const base = override || def.accents[slot];
    // 浅底：底色向品牌色靠拢得到浅色调；深底：反过来用底色朝品牌色混合，否则整片糊成背景色
    const fill = def.dark ? mix(bg, base, 0.30) : mix(base, bg, 0.88);
    const stroke = def.dark ? mix(bg, base, 0.55) : mix(base, bg, 0.60);
    accents[slot] = {
      base,
      line: base,
      fill,
      stroke,
      grad: [mix(base, '#ffffff', 0.15), base]
    };
  });

  return {
    name: THEME_DEFS[name] ? name : 'corporate-blue',
    bg,
    surface: isHex(p.surface) ? p.surface : def.surface || bg,
    ink: isHex(p.ink) ? p.ink : def.ink,
    sub: isHex(p.sub) ? p.sub : def.sub,
    mute: def.mute,
    nodeText: def.nodeText,
    line: isHex(p.line) ? p.line : def.line,
    track: def.track,
    gradFrom: isHex(p.gradFrom) ? p.gradFrom : def.gradFrom,
    shadow: def.shadow,
    shadowColor: def.shadowColor,
    accents
  };
}

/* ---------- SVG defs：渐变色、柔和投影、箭头 marker ---------- */

function defs(th) {
  const keys = Object.keys(th.accents);

  const grads = keys
    .map(
      (k) => `<linearGradient id="fill-${k}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${th.gradFrom}"/><stop offset="100%" stop-color="${th.accents[k].fill}"/>
    </linearGradient>
    <linearGradient id="bar-${k}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${th.accents[k].grad[0]}"/><stop offset="100%" stop-color="${th.accents[k].grad[1]}"/>
    </linearGradient>`
    )
    .join('\n    ');

  // markerUnits=strokeWidth：箭头大小随线宽缩放；start 版本为反向，refX 取尖端坐标
  const markers = keys
    .map(
      (k) => `<marker id="arw-${k}" markerWidth="5" markerHeight="5" viewBox="0 0 5 5" refX="4.6" refY="2.5" orient="auto">
      <path d="M0.5,0.7 L4.6,2.5 L0.5,4.3" fill="none" stroke="${th.accents[k].line}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
    <marker id="arw-${k}-start" markerWidth="5" markerHeight="5" viewBox="0 0 5 5" refX="0.4" refY="2.5" orient="auto">
      <path d="M4.6,0.7 L0.5,2.5 L4.6,4.3" fill="none" stroke="${th.accents[k].line}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>`
    )
    .join('\n    ');

  return `<defs>
    ${grads}
    ${markers}
    <filter id="soft" x="-30%" y="-30%" width="160%" height="180%">
      <feDropShadow dx="0" dy="5" stdDeviation="9" flood-color="${th.shadowColor}" flood-opacity="${th.shadow}"/>
    </filter>
    <filter id="softSm" x="-40%" y="-40%" width="180%" height="200%">
      <feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="${th.shadowColor}" flood-opacity="${(th.shadow * 0.75).toFixed(2)}"/>
    </filter>
  </defs>`;
}

/* ---------- 形状 ---------- */

// 云形基准路径（117 × 70），缩放到目标框
const CLOUD_PATH = `
  M 26 70 C 10 70 0 60 0 49 C 0 38 9 29 20 28 C 22 14 35 4 51 4
  C 65 4 77 12 81 24 C 85 21 90 20 95 20 C 107 20 117 30 117 44
  C 117 58 108 70 94 70 Z`;

function cloudShape(box, key, th) {
  const sx = px(box.w) / 117;
  const sy = px(box.h) / 70;
  if (!isFinite(sx) || !isFinite(sy) || sx <= 0 || sy <= 0) return '';
  // 投影必须挂在未缩放的 <g> 上，否则 dy / stdDeviation 会被 scale 放大，阴影远重于卡片
  return `<g filter="url(#soft)"><g transform="translate(${px(box.x)},${px(box.y)}) scale(${sx.toFixed(4)},${sy.toFixed(4)})">
    <path d="${CLOUD_PATH}" fill="url(#fill-${key})" stroke="${th.accents[key].stroke}"
          stroke-width="${(1.2 / sx).toFixed(2)}" stroke-linejoin="round"/>
  </g></g>`;
}

function roundBox(box, key, th, radius) {
  const r = radius === undefined ? 0.16 : radius;
  return `<rect x="${px(box.x)}" y="${px(box.y)}" width="${px(box.w)}" height="${px(box.h)}" rx="${px(r)}"
    fill="url(#fill-${key})" stroke="${th.accents[key].stroke}" stroke-width="${px(0.015)}" filter="url(#soft)"/>`;
}

function capsule(box, key, th) {
  return `<rect x="${px(box.x)}" y="${px(box.y)}" width="${px(box.w)}" height="${px(box.h)}" rx="${px(box.h / 2)}"
    fill="url(#fill-${key})" stroke="${th.accents[key].stroke}" stroke-width="${px(0.012)}" filter="url(#softSm)"/>`;
}

function chip(box, key, th) {
  return `<rect x="${px(box.x)}" y="${px(box.y)}" width="${px(box.w)}" height="${px(box.h)}" rx="${px(box.h / 2)}"
    fill="${th.surface}" stroke="${th.accents[key].stroke}" stroke-width="${px(0.010)}"/>`;
}

function accentBar(box, key, th) {
  return `<rect x="${px(box.x)}" y="${px(box.y)}" width="${px(box.w)}" height="${px(box.h)}"
    rx="${px(box.w / 2)}" fill="url(#bar-${key})"/>`;
}

function hRule(x1, x2, y, th) {
  return `<line x1="${px(x1)}" y1="${px(y)}" x2="${px(x2)}" y2="${px(y)}" stroke="${th.line}" stroke-width="${px(0.012)}"/>`;
}

/* ---------- 线：圆弧 / 贝塞尔 / 直线 ---------- */

// 左 → 右，向上拱（sweep=1）；右 → 左时同样用 sweep=1 则向下拱
function arcPath(x1, y1, x2, y2, rx, ry, sweep) {
  return `M ${px(x1)} ${px(y1)} A ${px(rx)} ${px(ry)} 0 0 ${sweep} ${px(x2)} ${px(y2)}`;
}

// 竖向 S 形曲线：起止点同 x、不同 y，先竖直出发再收拢到目标
function sCurve(x1, y1, x2, y2, k1, k2) {
  const a = k1 === undefined ? 0.52 : k1;
  const b = k2 === undefined ? 0.62 : k2;
  return `M ${px(x1)} ${px(y1)} C ${px(x1)} ${px(y1 + a)}, ${px(x2)} ${px(y2 - b)}, ${px(x2)} ${px(y2)}`;
}

function line(x1, y1, x2, y2) {
  return `M ${px(x1)} ${px(y1)} L ${px(x2)} ${px(y2)}`;
}

/**
 * 描边路径
 * @param {string} d      路径
 * @param {string} key    主题强调色名
 * @param {object} th     主题
 * @param {object} opt    { width, end, start, dash }
 */
function stroke(d, key, th, opt) {
  const o = opt || {};
  const width = o.width === undefined ? 0.030 : o.width;
  const end = o.end === false ? '' : ` marker-end="url(#arw-${key})"`;
  const start = o.start ? ` marker-start="url(#arw-${key}-start)"` : '';
  const dash = o.dash ? ` stroke-dasharray="${px(0.06)} ${px(0.05)}"` : '';
  return `<path d="${d}" fill="none" stroke="${th.accents[key].line}" stroke-width="${px(width)}"
    stroke-linecap="round"${dash}${start}${end}/>`;
}

/* ---------- 文字 ---------- */

function lineHeight(l) {
  return (l.size * S) / 72 * 1.30;
}

// 估算单字宽度（em）：ASCII 窄，CJK 近似正方；用于 SVG 侧模拟 PPT 的自动换行
function charWidth(ch) {
  const code = ch.charCodeAt(0);
  if (ch === ' ') return 0.30;
  return code < 128 ? 0.55 : 1.0;
}

function wrapText(text, size, maxWidth) {
  const rows = [];
  // 显式换行优先，避免 SVG 把 \n 折叠成空格、而 PPT 里确实换行造成两边不一致
  String(text).split('\n').forEach((para) => {
    if (!para) return;
    let cur = '';
    let w = 0;
    for (const ch of para) {
      const cw = (charWidth(ch) * size) / 72;
      if (w + cw > maxWidth && cur) {
        rows.push(cur);
        cur = ch;
        w = cw;
      } else {
        cur += ch;
        w += cw;
      }
    }
    if (cur) rows.push(cur);
  });
  return rows;
}

// 估算一段文字在给定字号下的宽度（英寸），用于挑选不溢出的字号
function estimateWidth(text, size) {
  let w = 0;
  for (const ch of String(text)) w += (charWidth(ch) * size) / 72;
  return w;
}

// 从大到小挑一个能放进 maxWidth 的字号，都不行就用最小档（调用方可再截断）
function fitSize(text, maxWidth, sizes) {
  for (const s of sizes) {
    if (estimateWidth(text, s) <= maxWidth) return s;
  }
  return sizes[sizes.length - 1];
}

// 生成 SVG <text>（仅用于预览与 svg 成品；PPT 里走原生文本框）
function textToSvg(item) {
  // SVG 没有自动换行，先按框宽折行，尽量贴近 PPT 里的实际排版
  const raw = item.lines.slice();
  const lines = [];
  raw.forEach((l) => {
    const rows = wrapText(l.t, l.size, Math.max(item.w - 0.04, 0.4));
    rows.forEach((t) => lines.push({ ...l, t }));
  });

  const total = lines.reduce((a, l) => a + lineHeight(l), 0);
  let top = px(item.y) + (px(item.h) - total) / 2;

  return lines
    .map((l) => {
      const fsPx = (l.size * S) / 72;
      const baseline = top + fsPx * 0.94;
      const anchor =
        item.align === 'center' ? 'middle' : item.align === 'right' ? 'end' : 'start';
      const x =
        item.align === 'center'
          ? px(item.x + item.w / 2)
          : item.align === 'right'
          ? px(item.x + item.w)
          : px(item.x);
      top += lineHeight(l);
      return `<text x="${x}" y="${baseline}" font-family="${FONT_SVG}" font-size="${fsPx.toFixed(2)}"
        font-weight="${l.bold ? 700 : 400}" fill="${l.color}" text-anchor="${anchor}">${esc(l.t)}</text>`;
    })
    .join('\n  ');
}

/* ---------- 合成整页 SVG ---------- */

function buildSvg(art, texts, th, opt) {
  const o = opt || {};
  const body = o.withText ? texts.map(textToSvg).join('\n  ') : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${px(W)}" height="${px(H)}" viewBox="0 0 ${px(W)} ${px(H)}">
  ${defs(th)}
  ${o.background === false ? '' : `<rect width="100%" height="100%" fill="${th.bg}"/>`}
  ${art}
  ${body}
</svg>`;
}

module.exports = {
  S, W, H, MARGIN, T, SLOTS, SLOT_ALIAS, THEME_NAMES,
  px, esc, theme, defs, pptFont, FONT_SVG, isHex, mix,
  cloudShape, roundBox, capsule, chip, accentBar, hRule,
  arcPath, sCurve, line, stroke,
  textToSvg, buildSvg, wrapText, estimateWidth, fitSize, lineHeight
};

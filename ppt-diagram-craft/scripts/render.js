#!/usr/bin/env node
'use strict';

/**
 * 渲染入口：spec（YAML/JSON） → SVG / PNG / PPTX
 *
 * 用法：
 *   node scripts/render.js <spec.yaml|spec.json> [--formats svg,png,pptx] [--out <dir>] [--name <文件名>]
 *
 * 降级链：pptx → png → svg。任何一步失败都不应让整个流程中断，
 * 至少要保证产出一张可用的 SVG（PPT 里插入后「转换为形状」同样可编辑）。
 */

const fs = require('fs');
const path = require('path');
const { ensureDeps, ROOT } = require('./bootstrap');

const LAYOUTS = ['system-interaction', 'layered-architecture', 'flow', 'matrix'];
const FORMATS = ['svg', 'png', 'pptx'];
const ACCENTS = ['blue', 'teal', 'amber', 'violet', 'slate'];

// 各布局的规模上限：超过就明确报错，而不是画出一张重叠或负尺寸的图
const LIMITS = {
  'system-interaction': { nodes: 3, fanItems: 12 },
  'layered-architecture': { layers: 7, items: 12 },
  flow: { steps: 6 },
  matrix: { cols: 8, rows: 10 }
};

/* ---------- 参数 ---------- */

function parseArgs(argv) {
  const out = { file: null, formats: ['svg', 'png', 'pptx'], outDir: 'out', name: null };
  const need = (i, key) => {
    if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) {
      throw new Error(`${key} 需要一个值`);
    }
    return argv[++i];
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--formats') {
      const list = need(i, a).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
      i++;
      const bad = list.filter((f) => !FORMATS.includes(f));
      if (bad.length) throw new Error(`未知输出格式 "${bad.join(', ')}"，可选：${FORMATS.join(' / ')}`);
      out.formats = list;
    } else if (a === '--out') {
      out.outDir = need(i, a);
      i++;
    } else if (a === '--name') {
      out.name = need(i, a);
      i++;
    } else if (!a.startsWith('--')) {
      out.file = a;
    }
  }
  return out;
}

/* ---------- spec 读取与校验 ---------- */

function loadSpec(file) {
  const raw = fs.readFileSync(file, 'utf8');
  if (/\.json$/i.test(file)) return JSON.parse(raw);
  const yaml = require('js-yaml');
  return yaml.load(raw);
}

function checkAccent(key, where) {
  if (key && !ACCENTS.includes(key)) {
    throw new Error(`未知强调色 "${key}"（${where}），可选：${ACCENTS.join(' / ')}`);
  }
}

function validate(spec) {
  const P = require('./primitives');

  if (!spec || typeof spec !== 'object') throw new Error('spec 解析结果为空');
  if (!spec.meta || typeof spec.meta !== 'object') throw new Error('缺少 meta');

  const layout = spec.meta.layout;
  if (!layout) throw new Error('缺少 meta.layout');
  if (!LAYOUTS.includes(layout)) {
    throw new Error(`未知布局 "${layout}"，可选：${LAYOUTS.join(' / ')}`);
  }
  checkAccent(spec.meta.accent, 'meta.accent');

  // 主题与色板覆盖：写错名字/色值要立刻报出来，而不是渲染出一张怪色的图
  if (spec.meta.theme && !P.THEME_NAMES.includes(spec.meta.theme)) {
    throw new Error(`未知主题 "${spec.meta.theme}"，可选：${P.THEME_NAMES.join(' / ')}`);
  }
  if (spec.meta.palette) {
    const allowed = ['bg', 'ink', 'sub', 'line', 'surface', 'gradFrom', ...P.SLOTS, ...Object.keys(P.SLOT_ALIAS)];
    Object.keys(spec.meta.palette).forEach((k) => {
      if (!allowed.includes(k)) {
        throw new Error(`meta.palette 不支持字段 "${k}"，可选：${allowed.join(' / ')}`);
      }
      if (!P.isHex(spec.meta.palette[k])) {
        throw new Error(`meta.palette.${k} 必须是十六进制颜色（如 #2B6CB0），当前为 "${spec.meta.palette[k]}"`);
      }
    });
  }

  const lim = LIMITS[layout];

  (spec.nodes || []).forEach((n) => checkAccent(n.accent, `节点 ${n.id}`));

  // 只对当前布局用得到的字段做规模与取值校验
  if (layout === 'system-interaction') {
    const nodes = spec.nodes || [];
    if (nodes.length > lim.nodes) {
      throw new Error(
        `system-interaction 最多支持 ${lim.nodes} 个节点（当前 ${nodes.length}）；` +
          '节点更多时请改用 layered-architecture 或拆成两张图'
      );
    }
    (spec.links || []).forEach((l) => checkAccent(l.accent, `链路 ${l.from}→${l.to}`));
    (spec.groups || []).forEach((g) => {
      if (g.mode && g.mode !== 'fanout') {
        throw new Error(`暂不支持的 group.mode "${g.mode}"，当前仅支持 fanout`);
      }
      checkAccent(g.accent, `分组 ${g.id}`);
      if ((g.items || []).length > lim.fanItems) {
        throw new Error(`分组 ${g.id} 的子项最多 ${lim.fanItems} 个（当前 ${g.items.length}）`);
      }
    });
  }

  if (layout === 'layered-architecture') {
    const layers = spec.layers || [];
    if (layers.length > lim.layers) {
      throw new Error(`layered-architecture 最多 ${lim.layers} 层（当前 ${layers.length}）`);
    }
    layers.forEach((ly) => {
      checkAccent(ly.accent, `层 ${ly.id || ly.label}`);
      checkAccent(ly.itemAccent, `层 ${ly.id || ly.label} 的 itemAccent`);
      if ((ly.items || []).length > lim.items) {
        throw new Error(`层 ${ly.id || ly.label} 的组件最多 ${lim.items} 个（当前 ${ly.items.length}）`);
      }
    });
  }

  if (layout === 'flow') {
    const steps = spec.steps || [];
    if (steps.length > lim.steps) {
      throw new Error(`flow 最多 ${lim.steps} 个步骤（当前 ${steps.length}）`);
    }
    steps.forEach((s) => checkAccent(s.accent, `步骤 ${s.label}`));
  }

  if (layout === 'matrix') {
    const m = spec.matrix || {};
    if ((m.cols || []).length > lim.cols) throw new Error(`matrix 最多 ${lim.cols} 列`);
    if ((m.rows || []).length > lim.rows) throw new Error(`matrix 最多 ${lim.rows} 行`);
    (m.cells || []).forEach((row) => {
      (row || []).forEach((c) => {
        if (c && typeof c === 'object') checkAccent(c.accent, '矩阵单元格');
      });
    });
  }

  const groupIds = new Set((spec.groups || []).map((g) => g.id).filter(Boolean));
  (spec.links || []).forEach((l) => {
    if (groupIds.has(l.from) || groupIds.has(l.to)) {
      throw new Error(`链路端点不能是分组 id（${l.from} → ${l.to}）；分组请用 anchor 表达`);
    }
  });

  // 业务约束：明确「不应直连」的两方，若被画了连线则直接报错，避免模型自作主张
  (spec.constraints || []).forEach((c) => {
    if (!c || c.type !== 'not_direct') return;
    if (!Array.isArray(c.between) || c.between.length < 2) return;
    const [a, b] = c.between;
    const hit = (spec.links || []).find(
      (l) => (l.from === a && l.to === b) || (l.from === b && l.to === a)
    );
    if (hit) {
      throw new Error(
        `与约束冲突：${a} 与 ${b} 被声明为不直连，但 links 中存在该链路。${c.reason || ''}`
      );
    }
  });
}

/* ---------- 渲染 ---------- */

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) {
    console.error('用法：node scripts/render.js <spec.yaml> [--formats svg,png,pptx] [--out dir]');
    process.exit(1);
  }

  const isJson = /\.json$/i.test(args.file);
  const wantPng = args.formats.includes('png');
  const wantPptx = args.formats.includes('pptx');

  const dep = ensureDeps({ yaml: !isJson, pptx: wantPptx, sharp: wantPng || wantPptx });
  const P = require('./primitives');

  const spec = loadSpec(args.file);
  validate(spec);

  const tpl = require(path.join(ROOT, 'templates', `${spec.meta.layout}.js`));
  const th = P.theme(spec.meta.theme);
  const { art, texts } = tpl.render(spec);

  const outDir = path.resolve(process.cwd(), args.outDir);
  fs.mkdirSync(outDir, { recursive: true });
  const base = args.name || path.basename(args.file).replace(/\.(ya?ml|json)$/i, '');
  const target = (ext) => path.join(outDir, `${base}.${ext}`);
  const done = [];

  // 1) SVG：零依赖产物，永远先落盘，保证有兜底
  const svgFull = P.buildSvg(art, texts, th, { withText: true });
  fs.writeFileSync(target('svg'), svgFull, 'utf8');
  done.push(target('svg'));

  // 2) PNG / PPTX 依赖 sharp，加载失败就只留 SVG
  let sharp = null;
  if ((wantPng || wantPptx) && dep.sharp) {
    try {
      sharp = require('sharp');
    } catch (e) {
      console.error('[warn] sharp 加载失败，已跳过 PNG / PPTX：' + e.message);
    }
  } else if (wantPng || wantPptx) {
    console.error('[warn] sharp 不可用，已跳过 PNG / PPTX，仅输出 SVG');
  }

  if (wantPng && sharp) {
    try {
      await sharp(Buffer.from(svgFull)).withMetadata({ density: P.S }).png().toFile(target('png'));
      done.push(target('png'));
    } catch (e) {
      console.error('[warn] PNG 导出失败：', e.message);
    }
  }

  if (wantPptx && sharp) {
    // PPT 用「无文字」的透明图形层，文字由 PPT 原生文本框承载，便于二次编辑
    const artPng = path.join(outDir, `.${base}.art.png`);
    try {
      await sharp(Buffer.from(P.buildSvg(art, [], th, { background: false })))
        .withMetadata({ density: P.S })
        .png()
        .toFile(artPng);
      await writePptx(spec, texts, artPng, target('pptx'));
      done.push(target('pptx'));
    } catch (e) {
      console.error('[warn] PPTX 导出失败：', e.message);
    } finally {
      try { fs.unlinkSync(artPng); } catch (e) { /* 临时文件不存在或无权限，忽略 */ }
    }
  }

  console.log(JSON.stringify({ layout: spec.meta.layout, outputs: done }, null, 2));
}

async function writePptx(spec, texts, artPng, target) {
  const PptxGenJS = require('pptxgenjs');
  const P = require('./primitives');

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'W16x9', width: P.W, height: P.H });
  pptx.layout = 'W16x9';

  const slide = pptx.addSlide();
  slide.background = { color: P.theme(spec.meta.theme, spec.meta.palette).bg.replace('#', '') };
  slide.addImage({ path: artPng, x: 0, y: 0, w: P.W, h: P.H });

  // 字体名会被直接拼进 XML，非法字符会产出打不开的文件
  let font = P.pptFont();
  if (spec.meta.font) {
    if (/^[\w\u4e00-\u9fa5 .-]+$/.test(spec.meta.font)) font = spec.meta.font;
    else console.error(`[warn] meta.font "${spec.meta.font}" 含非法字符，已回退为 ${font}`);
  }

  texts.forEach((t) => {
    const runs = t.lines.map((l, i) => ({
      text: l.t,
      options: {
        fontSize: l.size,
        bold: !!l.bold,
        color: String(l.color).replace('#', ''),
        breakLine: i < t.lines.length - 1
      }
    }));
    slide.addText(runs, {
      x: t.x, y: t.y, w: t.w, h: t.h,
      fontFace: font,
      align: t.align || 'left',
      valign: 'middle',
      margin: 0,
      lineSpacingMultiple: 1.18
    });
  });

  await pptx.writeFile({ fileName: target });
}

main().catch((e) => {
  console.error('[error]', e.message);
  process.exit(1);
});

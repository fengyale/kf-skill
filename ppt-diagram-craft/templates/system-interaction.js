'use strict';

/**
 * 布局：system-interaction（系统交互）
 * 一行并排的系统节点；两节点之间成对的双向链路自动渲染成「椭圆闭环」；
 * fanout 分组把锚点节点展开成一行胶囊，并用 S 形曲线双向连接。
 */

const P = require('../scripts/primitives');
const { pageHeader, pageNotes } = require('../scripts/chrome');

const NODE = { w: 3.30, h: 1.85 };
const PILL = { w: 1.55, h: 0.66 };
const LOOP = { gap: 0.14, ry: 0.52 };
const MIN_GAP = 1.05;   // 相邻节点之间至少留这么多，否则弧线画不开
const CIRCLE = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

function clamp(v, min, max) {
  if (min > max) return min;
  return Math.min(Math.max(v, min), max);
}

// 节点定位：优先取 layout_overrides（可与默认值部分合并），否则按数量自动分布
function placeNodes(nodes, top, overrides) {
  const ov = (overrides && overrides.nodes) || {};
  const n = nodes.length;

  // 节点多了就收窄，保证相邻之间还有画弧的空间
  const w = n <= 2 ? NODE.w : Math.min(NODE.w, (12.10 - 1.20 - (n - 1) * MIN_GAP) / n);

  nodes.forEach((nd, i) => {
    let x;
    if (n === 1) {
      x = (P.W - w) / 2;
    } else if (n === 2) {
      // 两端对齐，中间留出画弧的空间
      x = i === 0 ? 1.20 : P.W - 1.20 - w;
    } else {
      const left = 1.20;
      const right = P.W - 1.20 - w;
      x = left + ((right - left) * i) / (n - 1);
    }

    const box = { x, y: top, w, h: NODE.h };
    const o = ov[nd.id];
    if (o) {
      // 允许只覆盖部分字段，但结果必须是有限数字，否则会写出 NaN 坐标把 pptx 弄坏
      Object.assign(box, o);
      ['x', 'y', 'w', 'h'].forEach((k) => {
        if (!Number.isFinite(box[k])) {
          throw new Error(`layout_overrides.nodes.${nd.id}.${k} 必须是数字`);
        }
        if ((k === 'w' || k === 'h') && box[k] <= 0) {
          throw new Error(`layout_overrides.nodes.${nd.id}.${k} 必须大于 0`);
        }
      });
    }
    nd.box = box;
  });
}

// 自动编号：序号由模板生成，避免写死在文案里
function withNumber(link, spec) {
  const label = link.label || '';
  if (!spec.meta.autoNumberLinks || !label) return label;
  const i = (spec.links || []).indexOf(link);
  return `${CIRCLE[i] || `${i + 1}.`} ${label}`;
}

function render(spec) {
  const th = P.theme(spec.meta.theme, spec.meta.palette);
  const hd = pageHeader(spec, th);
  const art = [hd.art];
  const texts = hd.texts.slice();

  const nodes = (spec.nodes || []).map((n) => ({ ...n }));
  const groups = spec.groups || [];
  const fans = groups.filter((g) => g.mode === 'fanout');

  const top = spec.meta.nodesY || (fans.length ? 3.05 : 3.15);
  placeNodes(nodes, top, spec.layout_overrides);

  // 节点图形与文字
  nodes.forEach((nd) => {
    const key = nd.accent || 'blue';
    const shape = nd.shape || 'cloud';
    art.push(shape === 'card' ? P.roundBox(nd.box, key, th, 0.18) : P.cloudShape(nd.box, key, th));

    const inset = shape === 'card' ? 0.22 : 0;
    const lines = [{ t: nd.label, size: P.T.nodeTitle, bold: true, color: th.ink }];
    if (nd.desc) lines.push({ t: nd.desc, size: P.T.small, color: th.sub });
    texts.push({
      x: nd.box.x + inset,
      y: nd.box.y,
      w: nd.box.w - inset * 2,
      h: nd.box.h,
      align: 'center',
      lines
    });
  });

  // 链路：成对双向 → 椭圆闭环；单向 → 单条微拱曲线
  const links = spec.links || [];
  const find = (a, b) => links.find((l) => l.from === a && l.to === b);

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const forward = find(a.id, b.id);
      const backward = find(b.id, a.id);
      if (!forward && !backward) continue;

      const [L, R] = a.box.x <= b.box.x ? [a, b] : [b, a];
      const fw = find(L.id, R.id);   // 左 → 右
      const bw = find(R.id, L.id);   // 右 → 左

      const lx = L.box.x + L.box.w - 0.12;
      const rx = R.box.x + 0.12;
      const cy = L.box.y + L.box.h / 2;
      // 半径兜底：节点过近时宁可变小也不能出现负半径（负 rx 在 SVG 里是非法路径）
      const rad = Math.max(0.12, (rx - lx) / 2);
      const labelW = Math.min(Math.max(rx - lx, 2.00), 3.80);
      const labelX = (lx + rx) / 2 - labelW / 2;

      if (fw && bw) {
        // 上下两条 180° 弧组成闭环，端点纵向错开，避免两条线粘在一起
        art.push(P.stroke(P.arcPath(lx, cy - LOOP.gap, rx, cy - LOOP.gap, rad, LOOP.ry, 1),
          fw.accent || 'blue', th, { width: 0.030 }));
        art.push(P.stroke(P.arcPath(rx, cy + LOOP.gap, lx, cy + LOOP.gap, rad, LOOP.ry, 1),
          bw.accent || 'teal', th, { width: 0.030 }));

        if (fw.label) {
          texts.push({
            x: labelX, y: cy - LOOP.gap - LOOP.ry - 0.355, w: labelW, h: 0.30, align: 'center',
            lines: [{ t: withNumber(fw, spec), size: P.T.label, bold: true, color: th.accents[fw.accent || 'blue'].line }]
          });
        }
        if (bw.label) {
          texts.push({
            x: labelX, y: cy + LOOP.gap + LOOP.ry + 0.045, w: labelW, h: 0.30, align: 'center',
            lines: [{ t: withNumber(bw, spec), size: P.T.label, color: th.accents[bw.accent || 'teal'].line }]
          });
        }
        if (spec.meta.loopChip) {
          const c = { x: (lx + rx) / 2 - 0.55, y: cy - 0.16, w: 1.10, h: 0.32 };
          art.push(P.chip(c, 'blue', th));
          texts.push({ ...c, align: 'center', lines: [{ t: spec.meta.loopChip, size: P.T.tiny, bold: true, color: th.accents.blue.line }] });
        }
      } else {
        const one = fw || bw;
        const ry = 0.34;
        art.push(P.stroke(P.arcPath(lx, cy, rx, cy, rad, ry, 1), one.accent || 'blue', th, { width: 0.030 }));
        if (one.label) {
          texts.push({
            x: labelX, y: cy - ry - 0.40, w: labelW, h: 0.30, align: 'center',
            lines: [{ t: withNumber(one, spec), size: P.T.label, bold: true, color: th.accents[one.accent || 'blue'].line }]
          });
        }
      }
    }
  }

  // 一对多扇出
  fans.forEach((gr) => {
    const anchor = nodes.find((n) => n.id === gr.anchor) || nodes[0];
    if (!anchor || !anchor.box) return;

    const items = gr.items || [];
    if (!items.length) return;

    const key = gr.accent || 'slate';
    const y = anchor.box.y + anchor.box.h + 1.02;
    const ax = anchor.box.x + anchor.box.w / 2;

    // 子项多时先压窄胶囊和间距，保证整行不越出画布（否则最左/最右会跑到画布外）
    const avail = P.W - 1.60;
    let gapX = 0.20;
    let pw = PILL.w;
    let rowW = items.length * pw + (items.length - 1) * gapX;
    if (rowW > avail) {
      gapX = 0.12;
      pw = Math.max(0.90, (avail - (items.length - 1) * gapX) / items.length);
      rowW = items.length * pw + (items.length - 1) * gapX;
    }
    const left = clamp(ax - rowW / 2, 0.80, P.W - 0.80 - rowW);

    items.forEach((item, i) => {
      const cx = left + pw / 2 + i * (pw + gapX);
      const box = { x: cx - pw / 2, y, w: pw, h: PILL.h };

      art.push(P.capsule(box, key, th));
      texts.push({ ...box, align: 'center', lines: [{ t: String(item), size: P.T.body, color: th.nodeText }] });

      const sx = ax + (i - (items.length - 1) / 2) * 0.50;
      art.push(P.stroke(P.sCurve(sx, anchor.box.y + anchor.box.h, cx, y), key, th,
        { width: 0.022, start: !!gr.bidirectional }));
    });

    if (gr.label) {
      texts.push({
        x: left, y: y + PILL.h + 0.10, w: rowW, h: 0.24, align: 'center',
        lines: [{ t: gr.label, size: P.T.tiny, color: th.mute }]
      });
    }
  });

  pageNotes(spec, th).forEach((t) => texts.push(t));

  return { art: art.join('\n  '), texts };
}

module.exports = { render };

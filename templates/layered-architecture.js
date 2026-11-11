'use strict';

/**
 * 布局：layered-architecture（分层架构）
 * 自上而下若干层，每层左侧是层名色块，右侧是该层的组件卡片；
 * 层与层之间可用 links 声明依赖，渲染为竖向箭头。
 */

const P = require('../scripts/primitives');
const { pageHeader, pageNotes, contentBox } = require('../scripts/chrome');

const LABEL_W = 1.32;
const ROW_GAP = 0.34;
const CARD_GAP = 0.22;
const CARD_H = 0.62;

function render(spec) {
  const th = P.theme(spec.meta.theme, spec.meta.palette);
  const hd = pageHeader(spec, th);
  const art = [hd.art];
  const texts = hd.texts.slice();

  const layers = (spec.layers || []).filter((l) => l && (l.items || []).length);
  if (!layers.length) return { art: art.join('\n'), texts };

  const notes = pageNotes(spec, th);
  const box = contentBox(hd, notes);
  const n = layers.length;
  // 尺寸必须留正下界：层数过多时宁可压扁，也不能产出负高度（SVG 会整块不渲染）
  const rowH = Math.max(0.55, Math.min(1.05, (box.bottom - box.top - (n - 1) * ROW_GAP) / n));
  const cardH = Math.max(0.32, Math.min(CARD_H, rowH - 0.16));
  const itemsLeft = box.left + LABEL_W + 0.33;
  const itemsRight = box.right;
  const top = box.top;

  layers.forEach((ly, ri) => {
    const y = top + ri * (rowH + ROW_GAP);
    const key = ly.accent || 'blue';
    const midY = y + rowH / 2;

    // 整行底板：让「层」读起来是一条带子，而不是一排孤立卡片
    if (spec.meta.rowTrack !== false) {
      art.push(`<rect x="${P.px(box.left)}" y="${P.px(y)}" width="${P.px(box.right - box.left)}" height="${P.px(rowH)}"
        rx="${P.px(0.16)}" fill="${th.track}"/>`);
    }

    // 层名色块
    art.push(P.roundBox({ x: box.left, y: midY - cardH / 2, w: LABEL_W, h: cardH }, key, th, 0.14));
    texts.push({
      x: box.left, y: midY - cardH / 2, w: LABEL_W, h: cardH, align: 'center',
      lines: [{ t: ly.label, size: P.T.body, bold: true, color: th.ink }]
    });

    // 层内组件卡片
    const items = ly.items;
    const avail = itemsRight - itemsLeft;
    const rawW = (avail - (items.length - 1) * CARD_GAP) / items.length;
    const w = Math.max(0.80, Math.min(rawW, 3.20));
    const totalW = items.length * w + (items.length - 1) * CARD_GAP;
    const startX = itemsLeft + (avail - totalW) / 2;

    items.forEach((it, i) => {
      const x = startX + i * (w + CARD_GAP);
      art.push(P.roundBox({ x, y: midY - cardH / 2, w, h: cardH }, ly.itemAccent || key, th, 0.12));
      texts.push({
        x, y: midY - cardH / 2, w, h: cardH, align: 'center',
        lines: [{ t: String(it), size: P.T.small, color: th.nodeText }]
      });
    });
  });

  // 层间依赖箭头
  const idx = {};
  layers.forEach((ly, i) => { if (ly.id) idx[ly.id] = i; });

  (spec.links || []).forEach((lk) => {
    const a = idx[lk.from];
    const b = idx[lk.to];
    if (a === undefined || b === undefined || a === b) return;

    const down = b > a;
    const near = Math.min(a, b); // 箭头画在两行之间的空隙里
    const cy = top + (near + 1) * rowH + near * ROW_GAP;
    const x = lk.x ?? 6.65;

    art.push(P.stroke(P.line(x, cy - 0.02, x, cy + ROW_GAP + 0.02), lk.accent || 'slate', th,
      { width: 0.025, end: down, start: !down }));

    if (lk.label) {
      texts.push({
        x: x + 0.12, y: cy + ROW_GAP / 2 - 0.15, w: 3.6, h: 0.30, align: 'left',
        lines: [{ t: lk.label, size: P.T.tiny, color: th.mute }]
      });
    }
  });

  notes.forEach((t) => texts.push(t));
  return { art: art.join('\n  '), texts };
}

module.exports = { render };

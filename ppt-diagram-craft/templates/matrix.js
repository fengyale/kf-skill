'use strict';

/**
 * 布局：matrix（能力矩阵 / 对比）
 * 顶部列标题 + 左侧行标题 + 网格卡片；每个单元格可单独指定强调色。
 */

const P = require('../scripts/primitives');
const { pageHeader, pageNotes, contentBox } = require('../scripts/chrome');

const ROW_LABEL_W = 1.55;
const GAP = 0.18;
const HEADER_H = 0.50;

function cellOf(c) {
  if (c === null || c === undefined) return null;
  if (typeof c === 'string') return { text: c };
  // 缺 text 的单元格直接跳过，否则会在图上渲染出字面量 undefined
  if (typeof c === 'object' && c.text !== undefined && c.text !== null && c.text !== '') return c;
  return null;
}

function render(spec) {
  const th = P.theme(spec.meta.theme, spec.meta.palette);
  const hd = pageHeader(spec, th);
  const art = [hd.art];
  const texts = hd.texts.slice();

  const m = spec.matrix || {};
  const cols = (m.cols || []).filter((c) => c !== null && c !== undefined && c !== '');
  const rows = (m.rows || []).filter((r) => r !== null && r !== undefined && r !== '');
  const cells = m.cells || [];
  if (!cols.length || !rows.length) return { art: art.join('\n'), texts };

  const notes = pageNotes(spec, th);
  const box = contentBox(hd, notes);
  const gridLeft = box.left + ROW_LABEL_W + GAP;
  const gridRight = box.right;

  // 行列过多时压到下限为止，避免出现负宽高
  const cellW = Math.max(0.60, (gridRight - gridLeft - (cols.length - 1) * GAP) / cols.length);
  const gridTop = box.top + HEADER_H + GAP;
  const cellH = Math.max(0.44, Math.min(1.70, (box.bottom - gridTop - (rows.length - 1) * GAP) / rows.length));
  const top = box.top;

  // 列标题
  cols.forEach((c, ci) => {
    const x = gridLeft + ci * (cellW + GAP);
    texts.push({
      x, y: top, w: cellW, h: HEADER_H, align: 'center',
      lines: [{ t: String(c), size: P.T.body, bold: true, color: th.ink }]
    });
  });
  art.push(P.hRule(gridLeft, gridRight, top + HEADER_H, th));

  // 行标题 + 单元格
  rows.forEach((r, ri) => {
    const row = typeof r === 'string' ? { label: r } : r;
    const y = gridTop + ri * (cellH + GAP);

    art.push(P.roundBox({ x: box.left, y, w: ROW_LABEL_W, h: cellH }, row.accent || 'slate', th, 0.14));
    texts.push({
      x: box.left, y, w: ROW_LABEL_W, h: cellH, align: 'center',
      lines: [{ t: row.label || '', size: P.T.body, bold: true, color: th.ink }]
    });

    cols.forEach((c, ci) => {
      const cell = cellOf((cells[ri] || [])[ci]);
      if (!cell) return;
      const x = gridLeft + ci * (cellW + GAP);
      const key = cell.accent || (row.accent || 'slate');
      const box = { x, y, w: cellW, h: cellH };

      art.push(P.roundBox(box, key, th, 0.12));

      const lines = [{ t: String(cell.text), size: P.T.small, bold: true, color: th.ink }];
      if (cell.desc) lines.push({ t: cell.desc, size: P.T.tiny, color: th.sub });
      texts.push({ ...box, align: 'center', lines });
    });
  });

  notes.forEach((t) => texts.push(t));
  return { art: art.join('\n  '), texts };
}

module.exports = { render };

'use strict';

/**
 * 页面通用装饰：页眉（标签 / 主标题 / 副标题 / 分隔线）与页脚注释
 * 四种图型共用，保证同一份 PPT 里多张图的版式节奏一致。
 */

const P = require('./primitives');

const HEADER = {
  bar: { x: 0.72, y: 0.66, w: 0.10, h: 0.46 },
  eyebrow: { x: 0.98, y: 0.58, w: 7.0, h: 0.28 },
  title: { x: 0.72, y: 0.88, w: 11.4, h: 0.64 },
  subtitle: { x: 0.74, y: 1.53, w: 11.4, h: 0.34 },
  ruleY: 2.04
};

// 内容区（分隔线以下、页脚以上）。四个模板统一从这里取，避免各自硬编码产生分叉。
// notes 传入后可把下边界再抬到注释上方，防止图形压住页脚。
function contentBox(hd, notes) {
  const limit = P.H - 0.80;
  const noteTop = notes && notes.length ? notes[0].y - 0.12 : limit;
  return { top: hd.contentTop + 0.22, bottom: Math.min(limit, noteTop), left: 1.20, right: 12.10 };
}

function pageHeader(spec, th) {
  const meta = spec.meta || {};
  const accent = th.accents[meta.accent] ? meta.accent : 'blue';

  // 没有标题时不做页眉，把版面留给图形
  if (!meta.title) return { art: '', texts: [], contentTop: 1.00 };

  const art = [P.accentBar(HEADER.bar, accent, th)];
  const texts = [];

  if (meta.eyebrow) {
    texts.push({
      ...HEADER.eyebrow, align: 'left',
      lines: [{ t: meta.eyebrow, size: P.T.label, bold: true, color: th.accents[accent].line }]
    });
  }

  // 标题固定单行：放不下就降档字号，绝不允许折行压到副标题
  const titleSize = P.fitSize(meta.title, HEADER.title.w - 0.10, [P.T.title, 24, 21, 18]);
  texts.push({
    ...HEADER.title, align: 'left',
    lines: [{ t: meta.title, size: titleSize, bold: true, color: th.ink }]
  });

  if (meta.subtitle) {
    texts.push({
      ...HEADER.subtitle, align: 'left',
      lines: [{ t: meta.subtitle, size: P.T.body, color: th.sub }]
    });
  }
  art.push(P.hRule(HEADER.bar.x, HEADER.bar.x + 11.90, HEADER.ruleY, th));

  return { art: art.join('\n  '), texts, contentTop: 2.30 };
}

function pageNotes(spec, th) {
  // 允许 notes 直接写成字符串数组
  const list = (spec.notes || [])
    .map((n) => (typeof n === 'string' ? { text: n } : n))
    .filter((n) => n && n.text);
  if (!list.length) return [];

  const lh = P.lineHeight({ size: P.T.tiny }) / P.S; // 英寸
  const gap = 0.06;
  let cursor = P.H - 0.62;
  const out = [];

  // 自下而上排：先确定最后一条的底边，再按实际折行行数往上叠
  for (let i = list.length - 1; i >= 0; i--) {
    const n = list[i];
    const right = n.align === 'right';
    const w = right ? 4.40 : 11.0;
    const rows = P.wrapText(n.text, P.T.tiny, w - 0.04);
    const h = Math.max(0.26, rows.length * lh + 0.04);

    cursor -= h;
    out.unshift({
      x: right ? 8.20 : 0.74,
      y: cursor,
      w,
      h,
      align: n.align || 'left',
      lines: [{ t: n.text, size: P.T.tiny, color: th.mute }]
    });
    cursor -= gap;
  }
  return out;
}

module.exports = { pageHeader, pageNotes, contentBox, HEADER };

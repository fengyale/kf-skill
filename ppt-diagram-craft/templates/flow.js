'use strict';

/**
 * 布局：flow（流程 / 时序）
 * 单行横向步骤，步骤之间用直线箭头衔接；单个步骤可带一句说明。
 */

const P = require('../scripts/primitives');
const { pageHeader, pageNotes, contentBox } = require('../scripts/chrome');

const MAX_STEPS = 6;

function render(spec) {
  const th = P.theme(spec.meta.theme, spec.meta.palette);
  const hd = pageHeader(spec, th);
  const art = [hd.art];
  const texts = hd.texts.slice();

  const steps = spec.steps || [];
  if (!steps.length) return { art: art.join('\n'), texts };
  if (steps.length > MAX_STEPS) {
    throw new Error(`flow 布局最多支持 ${MAX_STEPS} 个步骤，当前 ${steps.length} 个；请拆分或在 spec 中改为分层结构`);
  }

  const n = steps.length;
  const box = contentBox(hd);
  const left = box.left;
  const right = box.right;
  const avail = right - left;

  // 步骤越少，单个越宽；最宽不超过 2.6
  const gap = n > 3 ? 0.62 : 0.90;
  const w = Math.min(2.60, (avail - (n - 1) * gap) / n);
  const totalW = n * w + (n - 1) * gap;
  const startX = left + (avail - totalW) / 2;

  const h = 1.00;
  // 在内容区（分隔线以下、页脚以上）垂直居中，避免整排图形偏上或偏下
  const y = spec.meta.stepsY ?? (box.top + box.bottom) / 2 - h / 2;

  steps.forEach((st, i) => {
    const x = startX + i * (w + gap);
    const key = st.accent || stepAccent(i);
    const box = { x, y, w, h };

    art.push(st.pill === false ? P.roundBox(box, key, th, 0.16) : P.capsule(box, key, th));

    const lines = [{ t: st.label, size: P.T.body, bold: true, color: th.ink }];
    if (st.desc) lines.push({ t: st.desc, size: P.T.tiny, color: th.sub });
    texts.push({ ...box, align: 'center', lines });

    // 序号角标
    if (spec.meta.autoNumberSteps) {
      const badge = { x: x + 0.10, y: y - 0.14, w: 0.34, h: 0.34 };
      art.push(P.chip(badge, key, th));
      texts.push({ ...badge, align: 'center', lines: [{ t: String(i + 1), size: 9, bold: true, color: th.accents[key].line }] });
    }

    // 步骤之间的箭头：贴着卡片边缘起笔，尽量留出箭头长度
    if (i < n - 1) {
      const ax1 = x + w + 0.06;
      const ax2 = x + w + gap - 0.06;
      const ay = y + h / 2;
      art.push(P.stroke(P.line(ax1, ay, ax2, ay), key, th, { width: 0.026 }));
    }
  });

  pageNotes(spec, th).forEach((t) => texts.push(t));
  return { art: art.join('\n  '), texts };
}

// 只用主题里的主副两色交替，避免彩虹感；需要区分时在 spec 里单独指定 accent
function stepAccent(i) {
  return i % 2 === 0 ? 'blue' : 'teal';
}

module.exports = { render };

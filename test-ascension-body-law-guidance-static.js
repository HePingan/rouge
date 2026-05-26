const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

assert(
  main.includes("renderAscensionResourceGuide([{ id: 'immortal_marrow'") || main.includes('renderAscensionBodyPanel'),
  '仙躯页应显示仙髓材料来源与拥有/需求数量，避免移动端升级按钮看起来无反馈'
);
assert(
  main.includes("renderAscensionResourceGuide([{ id: law.materialId") || main.includes('renderAscensionLawPanel'),
  '法则页应为每个法则碎片显示材料来源与拥有/需求数量'
);
assert(
  /data-asc-body[^>]+title="\$\{escapeHtml\([^}]*\)\}"/.test(main) || /data-asc-body[\s\S]{0,220}aria-disabled="true"/.test(main),
  '仙躯升级按钮不可用时应暴露 title/aria-disabled 原因，便于移动端长按与读屏'
);
assert(index.includes('20260526nexthint1'), '本轮不应回退当前缓存戳');

console.log('ascension body/law resource guidance static assertions passed');

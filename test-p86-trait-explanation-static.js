const assert=require('assert');const fs=require('fs');const main=fs.readFileSync('js/main.js','utf8');const css=fs.readFileSync('css/style.css','utf8');const html=fs.readFileSync('test-p86-trait-explanation-browser-smoke.html','utf8');
assert(main.includes('function getTraitExplainHtmlDom'),'main should render trait explanation helper');
for(const phrase of ['来源：','战斗定位：','闭环：背包查看','回合恢复时显示归元回灵','受击时显示铁山减伤']) assert(main.includes(phrase), `main should include ${phrase}`);
assert(css.includes('.trait-meta'),'css should style trait meta');
assert(html.includes('generateEquipment(20,{rarityName')&&html.includes("traitId:'guiyuan'"),'smoke should force a real trait item');
assert(html.includes('[data-equip-action-index]')&&html.includes('[data-confirm-equip-index]'),'smoke should equip through preview and confirm controls');
assert(html.includes('overflowX')&&html.includes('__p86Errors')&&html.includes('characterText'),'smoke should assert geometry/errors/character text');
console.log('p86 trait explanation static passed');

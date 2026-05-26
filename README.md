# 仙途·无尽深渊

这是一个面向**手机端**的修仙 Roguelike **纯前端**小游戏项目。项目不依赖后端服务，核心逻辑、界面渲染、存档与调试入口都在浏览器端完成。

## 目录结构

```text
/www/wwwroot/rouge
├── index.html          # 游戏入口页面；维护 CSS/JS 引用与脚本加载顺序
├── README.md           # 项目说明、开发/调试/验证约定
├── favicon.ico         # 站点图标
├── css/
│   └── style.css       # 全局样式、手机端布局、HUD/面板/控件样式
└── js/
    ├── debug.js        # 调试浮层、错误捕获、ROUGE_DEBUG 工具
    ├── dungeon.js      # 地牢、地图、地形、楼层等基础定义
    ├── stages.js      # 副本章节、关卡、扫荡、章节标题与材料来源
    ├── entities.js     # 玩家、怪物、装备/物品等实体定义
    ├── combat.js       # 战斗、伤害结算、状态处理
    ├── loot.js         # 掉落、奖励、装备生成
    ├── artifacts.js   # 神器解锁、升级、觉醒与神器属性加成
    ├── skills.js       # 技能树与技能效果
    ├── alchemy.js      # 炼丹与材料逻辑
    ├── ascension.js   # 飞升三劫、叩仙门、仙躯、仙职、法则、仙魔战场
    ├── particles.js    # 粒子/特效渲染
    ├── ui.js           # UI 辅助、HUD、面板交互
    ├── save.js         # localStorage 存档读写、备份、坏档隔离、导入导出
    ├── secretRealms.js # 秘境入口、房间事件、难度、奖励与钥匙消耗
    ├── tribulation.js # 天劫配置、词缀、敌人、奖励与失败惩罚
    └── main.js         # 游戏主循环、输入、初始化与整体编排
```

## 当前内容规模

- **35 个副本关卡**：覆盖凡界主线、渡劫、仙门、接引仙域与仙界后续章节。
- **4 类秘境**：草药、铸造、神器、天劫资源秘境。
- **4 档天劫**：小天劫、三九、六九、九九天劫。
- **5 件神器**：含解锁、升级、觉醒、主动神器选择与 HUD 入口。
- **飞升后期线**：飞升三劫、叩仙门、仙躯淬炼、仙职、法则、仙魔战场、仙炼装备与终局 Boss 机制。

## 打开方式

### 本地打开

本项目是纯前端项目，可以直接用浏览器打开：

```bash
cd /www/wwwroot/rouge
xdg-open index.html
```

更推荐使用本地静态服务器，避免浏览器对本地文件协议的限制：

```bash
cd /www/wwwroot/rouge
python3 -m http.server 8000
```

然后在浏览器访问：

```text
http://127.0.0.1:8000/
```

手机真机调试时，确保手机和电脑在同一局域网，并访问电脑局域网 IP，例如：

```text
http://<电脑局域网IP>:8000/
```

### 线上打开

项目目录位于线上站点根目录 `/www/wwwroot/rouge`。部署后通过站点绑定的域名或服务器 IP 访问 `index.html` 所在目录即可，例如：

```text
https://<你的域名>/
# 或
http://<服务器IP>/
```

如果项目部署在子路径，需要确保 Web 服务器根目录/站点路径正确指向 `/www/wwwroot/rouge`，并确认 `css/` 与 `js/` 静态资源可被正常访问。

## 脚本加载顺序

`index.html` 中的脚本加载顺序**非常重要**。当前顺序为：

```html
<script src="js/debug.js"></script>
<script src="js/dungeon.js"></script>
<script src="js/stages.js"></script>
<script src="js/entities.js"></script>
<script src="js/combat.js"></script>
<script src="js/loot.js"></script>
<script src="js/artifacts.js"></script>
<script src="js/skills.js"></script>
<script src="js/alchemy.js"></script>
<script src="js/ascension.js"></script>
<script src="js/particles.js"></script>
<script src="js/ui.js"></script>
<script src="js/save.js"></script>
<script src="js/secretRealms.js"></script>
<script src="js/tribulation.js"></script>
<script src="js/main.js"></script>
```

原因：这些脚本不是模块化打包产物，很多全局常量、类和函数依赖前面文件先加载。例如 `main.js` 会使用地图、实体、战斗、UI、存档等模块暴露的全局能力，因此必须最后加载。

调整脚本顺序前必须确认依赖关系；新增 JS 文件时，也要放在依赖它的文件之前、被它依赖的文件之后。

## 存档说明

游戏存档使用浏览器 `localStorage`，存档 key 为：

```text
xian_save_v1
```

相关逻辑位于：

```text
js/save.js
```

当前存档系统还会维护：

```text
xian_save_v1_backup   # 写入新存档前的旧档备份
xian_save_v1_corrupt  # 解析/校验失败时隔离保存的坏档
```

`js/save.js` 暴露的辅助函数：

```js
exportSaveJson()   // 导出当前存档 JSON
importSaveJson(x)  // 导入存档，导入前会备份现有存档
getSaveSummary()   // 查看主档、备份档、坏档摘要
```

常用控制台操作：

```js
// 查看存档
localStorage.getItem('xian_save_v1')

// 删除存档
localStorage.removeItem('xian_save_v1')

// 导出存档文本
copy(localStorage.getItem('xian_save_v1'))
```

注意：`localStorage` 按域名/协议/端口隔离。本地 `http://127.0.0.1:8000/`、线上域名、服务器 IP 之间的存档互不共享。

## 调试说明

### `?debug=1`

访问页面时可以在 URL 后追加 `?debug=1` 进入调试场景，例如：

```text
http://127.0.0.1:8000/?debug=1
```

用于本地或线上临时排查问题。调试时建议打开浏览器 DevTools，查看 Console、Network、Application/localStorage。

### `ROUGE_DEBUG`

加载 `js/debug.js` 后会暴露全局调试对象：

```js
ROUGE_DEBUG.getState()      // 查看当前游戏、玩家、地图、存档、错误摘要
ROUGE_DEBUG.exportSave()    // 导出当前 localStorage 存档文本，并尝试复制到剪贴板
ROUGE_DEBUG.deleteSave()    // 确认后删除当前存档
ROUGE_DEBUG.toggleOverlay() // 手动显示/隐藏调试浮层
ROUGE_DEBUG.lastErrors      // 最近捕获到的 window error / unhandledrejection
```

访问 `?debug=1` 时会显示移动端调试浮层。普通访问不会自动展开浮层，但错误仍会被记录到 `ROUGE_DEBUG.lastErrors`，便于真机排查。

当前主流程也会暴露部分调试用全局对象（如 `window.player`、`window.TILE`、`window.DUNGEON_WIDTH`、`window.DUNGEON_HEIGHT`），可在控制台辅助排查角色状态、地图尺寸与地形定义。

## 修改后的验证命令

每次修改后至少执行：

```bash
cd /www/wwwroot/rouge
node --check js/*.js
for f in test-*.js; do node "$f" || exit 1; done
git diff --check
```

说明：

- `node --check js/*.js`：检查所有 JS 文件语法是否有效。
- `for f in test-*.js; do node "$f" || exit 1; done`：运行所有轻量静态/行为回归测试，覆盖脚本顺序、cachebuster、移动端面板、飞升/副本/秘境/天劫流程等关键约束。
- `git diff --check`：检查 diff 中是否存在尾随空格、空白错误等问题。

### 移动端冒烟

建议用本地静态服务加载手机框验证页，检查 Console、资源版本、面板开关与地图优先显示：

```bash
cd /www/wwwroot/rouge
python3 -m http.server 8787
# 浏览器访问 http://127.0.0.1:8787/mobile-verify.html
```

`mobile-verify.html` 会在 390×844 手机框中加载 `index.html`，并提供 `inspectGame()` 辅助检查 HUD、底部导航和各 DOM 面板的几何状态。若修改了 `index.html` 中的资源版本号或加载顺序，还需要在浏览器中实际刷新页面，并确认 Console 无报错。

## 并行开发规则

为降低多人并行开发冲突，请遵守以下规则：

1. **避免多人同时修改 `js/main.js` 和 `css/style.css`。** 这两个文件体积大、耦合高、冲突概率最高。
2. 修改前先确认当前分支/工作区状态，避免覆盖他人未提交改动。
3. 新功能优先拆到职责明确的小文件中，再由 `index.html` 按正确顺序引入。
4. 必须修改 `main.js` 或 `style.css` 时，提前沟通修改范围，尽量按功能块分段提交。
5. 提交前运行验证命令，并检查 `git diff` 只包含本次任务相关内容。

## 开发注意事项

- 项目面向手机端，布局、按钮尺寸、触控操作应优先按移动端体验验证。
- 保持纯前端特性，不要引入必须依赖后端的功能作为核心流程。
- 存档结构变更时要兼容旧存档，必要时增加版本迁移逻辑。
- 改动全局变量、类名、DOM id、localStorage key、脚本顺序时要格外谨慎。

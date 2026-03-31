# MyWeb 项目说明

## 项目概述

MyWeb 是一个纯静态的网页游戏与工具合集，通过 Docker + Nginx 部署在服务器上（端口 8080）。

主入口：`index.html`，包含游戏和工具的导航链接。

### 游戏列表
- `2048/` — 2048 滑块拼图
- `wuziqi/` — 五子棋（含 AI 对战）
- `snake/` — 贪吃蛇
- `doushouqi/` — 斗兽棋（含 AI 对战）
- `tetris/` — 俄罗斯方块
- `feiji/` — 飞机大战
- `stickman/` — 火柴人战者遗产

### 工具列表
- `json2lua/` — JSON ↔ Lua Table 转换器
- `timestamp/` — Unix 时间戳转换
- `encrypt/` — 加密/解密工具
- `watermark/` — 图片水印添加

---

## 开发规范

### 文件结构
每个页面（游戏或工具）是一个独立目录，**只包含三类文件**：
```
页面目录/
├── index.html   # 页面结构
├── script.js    # 逻辑代码
└── style.css    # 样式
```
不得在单个页面目录内新增额外文件（图片素材等已有例外除外）。

### 返回主页按钮（必须）
所有子页面在 PC 布局下必须有一个返回主页面的按钮，链接指向 `../index.html`。推荐实现方式：

```html
<a href="../index.html" class="back-link">← 返回</a>
```

```css
.back-link {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 1000;
    color: #4facfe;
    text-decoration: none;
    font-weight: bold;
    font-size: 16px;
    padding: 10px 15px;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 8px;
    border: 2px solid #4facfe;
}
```

移动端全屏布局时（`@media (hover: none) and (pointer: coarse)`）可视情况将其收起或缩小，但 PC 布局下必须可见。

### 移动端适配（必须）
每个页面必须同时支持 PC 和移动端布局，要求：

1. **viewport meta 标签**（所有页面必须有）：
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no">
   ```

2. **CSS 响应式**：
   - 使用 `@media (max-width: 768px)` 和 `@media (max-width: 480px)` 断点
   - 游戏类页面额外使用 `@media (hover: none) and (pointer: coarse)` 检测触摸设备
   - 避免写死固定像素宽度，优先使用 `%`、`vw`、`dvh`、`max-width`

3. **触控支持**：
   - Canvas 游戏需要在 JS 中监听 `touchstart` / `touchend` / `touchmove`
   - DOM 点击类游戏（棋盘等）在 `click` 事件后同步添加 `touchend` 事件消除 300ms 延迟
   - 操作复杂的游戏（需要方向键/跳跃/攻击）需在 HTML 中加入虚拟按键 `div`，并在 `style.css` 中用 `@media (hover: none)` 控制显示

4. **安全区域**（刘海屏/全面屏）：
   ```css
   padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
   ```

### AI 对战能力（有 AI 的游戏必须）
有 AI 对战的游戏（当前：五子棋、斗兽棋）需使用 **Minimax + Alpha-Beta 剪枝**算法，不得使用纯贪心一步评估。

要求：
- 搜索深度：五子棋 depth ≥ 4（配合候选位置剪枝），棋盘类游戏 depth ≥ 3
- 必须在根节点优先处理"立即获胜"和"必须阻止对手获胜"两种情况
- 评估函数需覆盖：棋子/连子价值、进攻威胁（活四/活三）、防守需求、位置价值
- AI 落子通过 `setTimeout` 异步执行，避免阻塞 UI

---

## 技术栈
- 纯 HTML5 + CSS3 + 原生 JavaScript（无框架）
- Canvas API（贪吃蛇、俄罗斯方块、飞机大战、火柴人）
- DOM 渲染（2048、五子棋、斗兽棋）
- LocalStorage（保存高分/游戏进度）
- CryptoJS（加密工具）
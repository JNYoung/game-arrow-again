# Arrow Again 箭了又箭 · 技术设计文档

> 最后更新：2026-05-10  
> 本文档面向所有参与开发的 AI 模型和开发者，完整描述项目的架构、数据结构、核心逻辑和渲染体系。

---

## 1. 项目概览

**Arrow Again（箭了又箭）** 是一款移动端休闲解谜游戏。

**核心玩法一句话**：棋盘上摆放若干有方向的箭头棋子，玩家点击箭头 → 若该方向到棋盘边缘的路径无阻挡 → 箭头飞出并消除；目标是以正确顺序清除所有棋子。

| 项目 | 内容 |
|------|------|
| 产品名称 | Arrow Again（箭了又箭） |
| 类型 | 移动端休闲解谜 |
| 目标平台 | iOS / Android（H5 备选） |
| 单局时长 | 1–5 分钟 |
| 当前阶段 | MVP 验证（Web Canvas 原型） |

---

## 2. 技术栈与架构

### 2.1 技术选型

| 层 | 技术 | 说明 |
|----|------|------|
| 规则核心 | TypeScript（严格模式） | 纯函数、不可变状态、不依赖 DOM |
| 渲染层 | Canvas 2D（原生） | 不用 PixiJS，MVP 阶段 Canvas 足够 |
| 构建工具 | Vite 5.4 | 零配置，HMR 极快 |
| 平台壳 | Android (Kotlin/Compose) / iOS (SwiftUI) | 占位目录，尚未集成 |

**零运行时依赖**——`package.json` 中只有 `typescript` 和 `vite` 两个 devDependency。

### 2.2 三层架构

```
┌─────────────────────────────────────────────┐
│  平台壳层 (android/ · ios/)                  │
│  App 生命周期 · 广告 · 内购 · 存档 · 音频     │
├─────────────────────────────────────────────┤
│  渲染层 (src/prototype/app.ts)               │
│  Canvas 绘制 · 动画 · 粒子 · 输入检测 · HUD  │
├─────────────────────────────────────────────┤
│  规则核心 (src/core/)                        │
│  棋盘状态 · 射出判定 · 消除结算 · 关卡数据    │
└─────────────────────────────────────────────┘
```

**设计原则**：规则核心不依赖任何平台 API，可被 Web / Android / iOS 共用。

---

## 3. 目录结构

```
game-arrow-again/
├── index.html                 # HTML 入口
├── package.json               # 项目配置（Vite + TypeScript）
├── tsconfig.json              # TypeScript 编译配置（strict: true）
│
├── src/
│   ├── main.ts                # Web 入口：加载样式，挂载 createPrototypeApp()
│   ├── styles.css             # 全局样式（浅绿色主题）
│   │
│   ├── core/                  # ★ 规则核心（纯逻辑，零 DOM 依赖）
│   │   ├── types.ts           #   类型定义
│   │   ├── game.ts            #   游戏状态机 + 射出判定
│   │   └── level.ts           #   5 个关卡数据
│   │
│   └── prototype/             # ★ Canvas 渲染层
│       ├── app.ts             #   游戏渲染、动画、粒子、交互（~730 行）
│       └── prototype.css      #   游戏 UI 样式
│
├── docs/                      # 设计文档
├── android/                   # Android 壳（占位）
└── ios/                       # iOS 壳（占位）
```

---

## 4. 核心数据结构（src/core/types.ts）

```typescript
// 四个方向
type Direction = 'up' | 'right' | 'down' | 'left';

// 网格坐标
interface Cell { row: number; col: number; }

// 箭头棋子配置（关卡定义用）
interface ArrowPieceConfig {
  id: string;          // 唯一标识，如 'a', 'b'
  row: number;         // 行坐标（从 0 开始）
  col: number;         // 列坐标（从 0 开始）
  direction: Direction; // 箭头指向
  color: string;       // 颜色（CSS hex，如 '#22c55e'）
}

// 运行时棋子状态（多一个 removed 标志）
interface ArrowPieceState extends ArrowPieceConfig {
  removed: boolean;
}

// 关卡配置
interface LevelConfig {
  id: string;          // 关卡 ID
  rows: number;        // 棋盘行数
  cols: number;        // 棋盘列数
  lives: number;       // 初始生命值（错误点击扣减）
  pieces: ArrowPieceConfig[];
}

// 射出结果
interface ShotResult {
  ok: boolean;                  // true=成功飞出, false=被阻挡
  removedPieceId?: string;      // 成功时：被消除的棋子 ID
  blockedByPieceId?: string;    // 失败时：阻挡者的 ID
  escapedCells: Cell[];         // 射出路径经过的格子
}

// 完整游戏状态（不可变，每次操作返回新对象）
interface GameState {
  level: LevelConfig;
  pieces: ArrowPieceState[];
  moveCount: number;            // 累计点击次数
  remainingLives: number;       // 剩余生命
  completed: boolean;           // 所有棋子已清除
  failed: boolean;              // 生命耗尽
  lastShot: ShotResult | null;  // 上次射出结果
}
```

---

## 5. 核心游戏逻辑（src/core/game.ts）

### 5.1 状态管理

采用**纯函数 + 不可变状态**模式，每次操作返回全新 `GameState`，不修改原对象。

```
createInitialState(level) → GameState     // 从关卡配置初始化
shootPiece(state, pieceId) → GameState    // 执行一次点击，返回新状态
```

### 5.2 核心函数一览

| 函数 | 输入 | 输出 | 说明 |
|------|------|------|------|
| `createInitialState(level)` | `LevelConfig` | `GameState` | 初始化游戏 |
| `getPieceById(state, id)` | `GameState, string` | `ArrowPieceState \| undefined` | 按 ID 查找棋子 |
| `getActivePieces(state)` | `GameState` | `ArrowPieceState[]` | 获取未消除的棋子 |
| `getShotPath(state, id)` | `GameState, string` | `ShotResult` | 计算射出路径和结果 |
| `getShootablePieceIds(state)` | `GameState` | `string[]` | 获取当前可射出的棋子 ID 列表 |
| `shootPiece(state, id)` | `GameState, string` | `GameState` | 执行射出操作 |

### 5.3 射出判定算法（getShotPath）

```
输入：GameState + 目标棋子 ID
输出：ShotResult

1. 获取棋子的方向向量 (row_delta, col_delta)
2. 从棋子位置沿方向逐格前进
3. 每到一格：
   a. 检查是否还在棋盘范围内
   b. 检查该格是否有其他未消除的棋子
4. 如果到达边界且未被阻挡 → ok: true，记录 removedPieceId
5. 如果碰到其他棋子 → ok: false，记录 blockedByPieceId
```

方向向量映射：

| Direction | row delta | col delta |
|-----------|-----------|-----------|
| up | -1 | 0 |
| down | +1 | 0 |
| left | 0 | -1 |
| right | 0 | +1 |

### 5.4 胜负判定

- **过关**：`pieces.every(p => p.removed)` → `completed = true`
- **失败**：`remainingLives === 0` → `failed = true`
- **评分**：剩余生命 ≥ 2 → 3 星，≥ 1 → 2 星，= 0 → 1 星

### 5.5 示例：推理链

```
棋盘状态：
  A(→) 在 (2,1)
  B(→) 在 (2,3)

A 向右射出 → 路径经过 (2,2) 到 (2,3) 碰到 B → 被阻挡
B 向右射出 → 路径经过 (2,4) 到边界 → 成功飞出

正确顺序：先射 B，再射 A
```

---

## 6. 关卡数据格式（src/core/level.ts）

关卡以 `LevelConfig` 数组形式硬编码。每个关卡定义棋盘尺寸、生命值和棋子列表。

### 当前 5 个关卡

| 关卡 | 棋盘 | 棋子数 | 生命 | 难度要素 |
|------|------|--------|------|---------|
| 1 | 5×5 | 3 | 3 | 全部自由箭头，无阻挡（教学） |
| 2 | 5×5 | 4 | 3 | 简单阻挡（a 被 b 挡，需先射 b） |
| 3 | 6×6 | 5 | 2 | 链式依赖 A→B→C |
| 4 | 7×7 | 8 | 3 | 横纵交叉阻挡 |
| 5 | 8×8 | 12 | 3 | 高密度，多条依赖链并行 |

### 关卡 JSON 示例

```typescript
{
  id: 'level-1',
  rows: 5,
  cols: 5,
  lives: 3,
  pieces: [
    { id: 'a', row: 2, col: 1, direction: 'left',  color: '#22c55e' },
    { id: 'b', row: 1, col: 3, direction: 'up',    color: '#f59e0b' },
    { id: 'c', row: 3, col: 3, direction: 'down',  color: '#38bdf8' },
  ],
}
```

### 如何新增关卡

1. 在 `tutorialLevels` 数组末尾添加新的 `LevelConfig` 对象
2. 指定 `rows`/`cols`（棋盘大小）、`lives`（生命值）
3. 添加 `pieces` 数组，每个棋子需要唯一 `id`、位置 `(row, col)`、方向和颜色
4. UI 会自动生成对应的 Level 按钮

---

## 7. 渲染系统（src/prototype/app.ts）

### 7.1 渲染架构

```
requestAnimationFrame 循环
  │
  ├── updateParticles(dt)          // 更新粒子位置和生命周期
  ├── updateScreenShake()          // 更新屏幕震动
  │
  ├── drawBoard()                  // 清屏 + 绘制棋盘背景和网格
  │
  ├── for each activePiece:        // 绘制每个未消除的棋子
  │   └── drawPiece()              //   渐变填充 + 几何箭头 + 高光 + 发光
  │
  ├── drawErrorOverlay()           // 错误点击：红色闪烁 + 阻挡者高亮
  ├── drawUnlockPulse()            // 解锁脉冲：金色扩展环
  ├── drawShotAnim()               // 射出动画：残影 + 粒子 + 出界闪光
  │
  └── drawParticles()              // 绘制所有活跃粒子
```

### 7.2 常量配置

| 常量 | 值 | 说明 |
|------|----|------|
| `CELL_SIZE` | 64px | 每个网格单元的像素尺寸 |
| `BOARD_PADDING` | 16px | 棋盘内边距 |
| `SHOT_DURATION_MS` | 420ms | 射出动画总时长 |
| `ERROR_SHAKE_MS` | 320ms | 错误摇晃时长 |
| `ERROR_FLASH_MS` | 280ms | 错误红色闪烁时长 |
| `UNLOCK_PULSE_MS` | 500ms | 解锁脉冲时长 |
| `PIECE_RADIUS` | 12px | 棋子圆角半径 |
| `ARROW_SCALE` | 0.36 | 箭头图形占棋子面积的比例 |

### 7.3 棋子渲染（drawPiece）

每个箭头棋子的绘制分为 6 层：

```
┌─────────────────────────┐
│ 6. 发光环（仅可射出状态） │  ← 呼吸脉冲动画
├─────────────────────────┤
│ 5. 几何箭头（白色）      │  ← 三角形头部 + 矩形尾部，按方向旋转
├─────────────────────────┤
│ 4. 顶部高光              │  ← 半透明白色，模拟光泽
├─────────────────────────┤
│ 3. 边框                  │  ← 比填充色深 25% 的描边
├─────────────────────────┤
│ 2. 渐变填充              │  ← 顶部亮 → 中间原色 → 底部暗
├─────────────────────────┤
│ 1. 阴影层                │  ← 8px 模糊，3px 偏移，黑色 15% 透明度
└─────────────────────────┘
```

**状态视觉反馈**：

| 状态 | 视觉表现 |
|------|---------|
| 可射出 | 呼吸发光环（1.5s 周期）+ 微弱缩放脉冲（±2.5%） |
| 鼠标悬停（可射出）| 放大至 108%，指针光标 |
| 鼠标悬停（不可射出）| 禁止光标 |
| 错误点击 | 水平摇晃（±4px，3 次振荡）+ 红色闪烁叠加 |
| 被阻挡者 | 红色发光描边 |
| 新解锁 | 金色扩展脉冲环（easeOutBack 弹性） |

### 7.4 箭头形状绘制（drawArrowShape）

几何箭头由 Canvas Path 绘制，而非文字字符：

```
方向：→（右）的坐标（未旋转时）

     headLen
    ├───────┤
    ·───────▶  ← headW (半高)
    │       │
    ╞═══════╡  ← tailW (半高)
    tailLen
```

通过 `ctx.rotate(angle)` 旋转实现四个方向：
- up: -90°
- right: 0°
- down: 90°
- left: 180°

### 7.5 动画系统

#### 射出动画（420ms）

```
时间轴:
0ms ──────── 350ms ──── 390ms ── 420ms
│  残影轨迹    │  主体飞出  │ 出界爆发 │

阶段 1（0-85% 进度）：5 个残影跟随主体，每个比前一个更小更透明
阶段 2（全程）：主体棋子沿方向加速飞出（easeInQuad）
阶段 3（>80%）：随机生成飞行粒子
阶段 4（>92%）：出界粒子爆发（14 颗）+ 屏幕震动（±3px，60ms）
```

#### 粒子系统

```typescript
interface Particle {
  x, y: number;       // 位置
  vx, vy: number;     // 速度（每帧衰减 ×0.96）
  life: number;        // 0→死亡, 1→满生命
  maxLife: number;     // 粒子寿命（0.4-0.7 秒）
  color: string;       // 颜色
  size: number;        // 半径（2-5px）
}
```

- 每帧更新位置和生命值
- 绘制为带发光（shadowBlur）的圆形
- 死亡后从数组移除
- 最大同时存在约 30 个粒子

#### 错误反馈动画

- **摇晃公式**：`offset = sin(t × π × 6) × 4 × (1 - t)`
  - 6 次半周期振荡，振幅从 4px 线性衰减至 0
- **红色闪烁**：覆盖一层 50% 透明度的红色圆角矩形，280ms 内淡出
- **阻挡者高亮**：红色发光描边，同步淡出

#### 链式解锁脉冲

当消除一个棋子后，如果新的棋子变为可射出：
- 在新解锁的棋子上绘制金色扩展环
- 使用 `easeOutBack` 缓动产生弹性超调效果
- 500ms 内完成并淡出

### 7.6 颜色工具函数

| 函数 | 用途 | 示例 |
|------|------|------|
| `hexToRgb(hex)` | 解析 hex 为 [r,g,b] | `'#22c55e' → [34,197,94]` |
| `lighten(hex, amount)` | 向白色混合 | `lighten('#22c55e', 0.22)` → 变亮 22% |
| `darken(hex, amount)` | 向黑色混合 | `darken('#22c55e', 0.15)` → 变暗 15% |
| `withAlpha(hex, alpha)` | 添加透明度 | `withAlpha('#22c55e', 0.6)` → `rgba(34,197,94,0.6)` |

### 7.7 缓动函数

| 函数 | 公式 | 用途 |
|------|------|------|
| `easeOutQuad(t)` | `t(2-t)` | 飞出淡出 |
| `easeInQuad(t)` | `t²` | 飞出加速 |
| `easeOutBack(t)` | 含超调的弹性缓出 | 解锁脉冲 |

---

## 8. 交互模型

### 8.1 输入处理

```
Canvas 事件监听：

mousemove → 碰撞检测(pieceBounds) → 更新 hoveredPieceId → 更新光标样式
mouseleave → 清除 hoveredPieceId
click → 碰撞检测 → getPieceById → shootPiece →
  ├── 成功：启动射出动画，设置 pendingNextState
  └── 失败：设置错误动画，立即更新状态
```

### 8.2 碰撞检测

每帧渲染后记录所有棋子的屏幕坐标到 `pieceBounds: PieceBounds[]`：

```typescript
interface PieceBounds {
  pieceId: string;
  x: number;    // 像素坐标
  y: number;
  size: number; // 棋子边长（CELL_SIZE - 6）
}
```

点击/悬停时遍历 `pieceBounds` 做矩形碰撞检测。

### 8.3 动画期间的状态管理

射出动画期间需要延迟状态更新，避免棋子闪烁：

```
点击棋子 A（成功射出）：
  1. 记录 preShootableIds（当前可射出集合，排除 A）
  2. 立即更新 state.pieces（A 标记 removed）
  3. 保存完整的 nextState 到 pendingNextState
  4. 启动 shotAnim
  
动画播放中：
  - 渲染循环跳过已 removed 的 A
  - shotAnim 独立绘制飞行中的 A

动画结束（finishShot）：
  5. state = pendingNextState（含 completed/failed 判定）
  6. 对比 preShootableIds 和新的 shootableIds
  7. 差集即为"新解锁"的棋子，触发 unlockAnim
  8. 更新 HUD
```

---

## 9. UI 层

### 9.1 DOM 结构

```
main.shell
├── h1                    "Arrow Again"
├── p                     游戏说明文字
├── div.controls          Level 1-5 按钮 + Restart 按钮
├── div.hud               ❤️❤️❤️ Taps: 0
├── div.status            "Level 1"
├── div.hint              "3 arrows can be shot"
└── div.board-wrap
    └── canvas.board-canvas
```

### 9.2 视觉主题

| 元素 | 颜色 |
|------|------|
| 页面背景 | #E8F5F0（浅薄荷绿） |
| 棋盘背景 | #f0f9f4（极浅绿） |
| 棋盘容器 | 白色，圆角 20px，阴影 |
| 文字主色 | #1a3c34（深绿灰） |
| 按钮 | #2d8a6e（绿色，hover 变深） |
| 网格线 | rgba(45,90,74,0.05)（极淡） |
| 网格点 | rgba(45,90,74,0.08) |

### 9.3 HUD 显示

- **生命值**：❤️ 表示剩余，🖤 表示已失去
- **点击次数**：`Taps: N`
- **过关评语**：3 星 = "Perfect!"，2 星 = "Great job!"
- **过关评分**：剩余生命 ≥ 2 → ⭐⭐⭐，≥ 1 → ⭐⭐，0 → ⭐

---

## 10. 开发命令

```bash
# 进入项目目录
cd ~/.openclaw/workspace/projects/game-arrow-again

# 安装依赖
npm install

# 启动开发服务器（HMR）
npm run dev
# → http://localhost:5173/

# TypeScript 类型检查
npx tsc --noEmit

# 生产构建
npm run build
# → dist/

# 预览生产构建
npm run preview
```

---

## 11. 扩展指南

### 11.1 添加新的棋子类型

1. 在 `types.ts` 中扩展 `ArrowPieceConfig`（如添加 `weight`、`special` 等字段）
2. 在 `game.ts` 的 `getShotPath` 中处理新类型的阻挡/射出逻辑
3. 在 `app.ts` 的 `drawPiece` 中添加新类型的渲染样式

### 11.2 添加新的动画效果

1. 定义新的动画状态接口（参考 `ShotAnim`、`ErrorAnim`）
2. 在 `render()` 函数中添加绘制逻辑
3. 在对应的事件触发点设置动画起始时间

### 11.3 接入移动端

当前推荐路线（路线 A）：
1. 将 `src/core/` 打包为独立模块
2. Android/iOS 通过 WebView 加载 Canvas 游戏
3. 原生层通过 JS Bridge 提供：广告、内购、存档、音频、震动

### 11.4 模块拆分建议

当 `app.ts` 超过 1000 行时，建议拆分为：

```
src/canvas/
├── renderer.ts        # drawBoard, drawPiece, drawArrowShape
├── animator.ts        # 动画状态管理、射出/错误/解锁动画
├── particles.ts       # 粒子系统
├── input.ts           # 鼠标/触摸事件处理
├── hud.ts             # DOM HUD 管理
└── colors.ts          # 颜色工具函数
```

---

## 12. 当前状态与后续计划

### 已完成

- [x] TypeScript 规则核心（纯函数、不可变状态）
- [x] Canvas 2D 渲染层（渐变棋子、几何箭头、发光动画）
- [x] 5 个渐进难度关卡
- [x] 射出动画（残影 + 粒子 + 出界闪光 + 屏幕震动）
- [x] 错误反馈（摇晃 + 红闪 + 阻挡者高亮）
- [x] 链式解锁脉冲
- [x] 悬停交互反馈
- [x] 生命值 / 评分 / 过关判定
- [x] 关卡切换 UI
- [x] 浅绿色主题（对标产品方案 PDF）

### 未完成

- [ ] 关卡进度持久化（localStorage / 云存档）
- [ ] 关卡选择界面（替代当前的按钮列表）
- [ ] 提示系统（高亮建议射出的棋子）
- [ ] 死局检测（所有棋子互相阻挡时提示重开）
- [ ] 音效 / 触觉反馈
- [ ] 更多关卡（目标 10 关 MVP）
- [ ] 分析埋点（事件定义与上报）
- [ ] Android / iOS 原生壳集成
- [ ] 每日挑战模式

# game-arrow-again 项目记录

## 当前状态

- 项目名：`game-arrow-again`
- 当前阶段：开发推进中
- 当前默认平台：独立 app（Android / iOS）
- 当前默认路线：非 Unity 优先
- 当前代码目录：`/Users/zhengjinyang/.openclaw/workspace/projects/game-arrow-again/`

## 已有基础资料

- Obsidian：`Parking Jam 非 Unity 技术方案`
- Obsidian：`Parking Jam 独立 App 详细技术方案`
- Obsidian：`Arrow Again 独立 App 详细技术方案`
- 可调用任务：`game-arrow-again`
- 长期任务名：`game-arrow-again`

## 当前工程进展

- 已搭建 `Vite + TypeScript` 首版原型骨架
- 已完成从旧 `Parking Jam` 拖拽原型到 `Arrow Again` 点击消除原型的第一次收口
- 已实现共享规则核第一版：箭头方向、路径阻挡、点击消除、错误点击扣命
- 已实现 3 个引导关 demo
- 已补 Android / iOS 双端启动架构文档：`docs/mobile-architecture.md`
- 下一步应补原生壳、关卡流转、星级和埋点模型

## 外部输入分析更新

已拿到等价本地文档输入：

- `/Users/zhengjinyang/Downloads/Arrow Again 箭了又箭 · MVP 产品方案 v1.0.pdf`

并已完成首轮结构化分析：

- `docs/arrow-again-analysis.md`

### 当前最新判断

这份方案描述的并不是经典 `Parking Jam` 拖拽出库玩法。

它实际定义的是：

- 箭头棋子
- 沿朝向飞出
- 路径无遮挡才能消除
- 全清即通关
- 错误点击扣生命值

也就是说：

**当前真正要落地的核心玩法，更接近 `Arrow Again / 箭了又箭` 的点击消除式棋盘解谜。**

### 对当前工程的影响

当前工程已经开始做方向收口：

- 保留旧拖拽原型思路仅作为历史探索结论
- 当前主开发方向转向：
  - 箭头棋子点击消除
  - 可射出条件判断
  - 扣血/星级/重开
  - 引导关与 Hard 关节奏
  - Android / iOS 双端同步启动

### 下一步标准动作

1. 继续增强共享规则核
2. 补 Android / iOS 原生壳与页面流
3. 加生命值 / 星级 / 重开 / 关卡流转
4. 以 3~5 个引导关验证核心体验
5. 细化 `GA / GA4` 数据分析方案与难度递增设计，并同步回 Obsidian 详细文档

# game-arrow-again 移动端启动架构

## 目标

当前项目按 **Android / iOS 双端同步启动**，但保持一套共享规则核，避免首版 MVP 分叉。

## 分层

### 1. `shared/core`
- Arrow Again 规则核
- 关卡 JSON
- 可点击判定
- 生命值 / 失败 / 通关状态
- 埋点事件模型

### 2. `app/web`
- 用于快速验证规则与引导关
- 先跑点击消除 demo
- 用最小成本验证关卡可读性与节奏

### 3. `app/android`
- Android 原生壳
- 首页 / 选关 / 对局 / 结算
- 广告、内购、震动、音频适配

### 4. `app/ios`
- iOS 原生壳
- 页面结构与 Android 对齐
- StoreKit / 音频 / 触感反馈适配

## 当前启动口径

- Web 原型继续承担规则与关卡验证
- Android / iOS 本轮先建立目录、页面流和接入占位
- 下一轮再补共享数据协议、埋点模型、关卡加载器和平台适配接口

## 推荐下一步

1. 把 `shared/core` 进一步抽成可直接复用模块
2. 起 Android `Jetpack Compose` 壳
3. 起 iOS `SwiftUI` 壳
4. 对齐 4 个基础页面：Home / Level Map / Game / Result
5. 补统一事件模型和本地存档接口

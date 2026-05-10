# Android Shell

当前目录已经升级为可继续扩写的 Android 工程骨架。

## 当前状态

- 已补 `Gradle Kotlin DSL` 基础结构
- 已补 `app` module
- 已补 `MainActivity + Jetpack Compose`
- 已补第一关 Android demo 承载页

## 运行方式

优先用 Android Studio 打开 `android/` 目录。

如本机已安装 Gradle wrapper，可运行：

- `./gradlew assembleDebug`

## 当前限制

- 还没正式接入 TypeScript 规则核共享
- 当前 Android demo 先用 Kotlin 本地镜像了一版第一关规则
- 下一步要把共享规则、关卡 JSON、埋点和 UI 流程接起来

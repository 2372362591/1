# 微信单机版 · iOS 16.1 / TrollStore

一个完全在本机运行的高保真微信风格单机应用。使用 Swift + WKWebView 原生壳，聊天、联系人、朋友圈、状态、收藏和设置保存在本机 IndexedDB；不登录微信、不连接腾讯服务器，也不能代替真实微信进行联网通讯。

> 本项目不是微信官方客户端，与腾讯无关。不同微信版本的视觉细节可能不同，本项目不宣称逐像素等同官方应用。当前已按 iPhone 14 Pro 的 393×852 逻辑分辨率完成 Chromium 自动化交互测试，但尚未在 macOS/Xcode、GitHub Actions 或真实 iOS 16.1 设备上验证。

## 已实现的本机功能

- 微信、通讯录、发现、我四个主栏目，深色模式。
- 单聊与群聊：文字、图片、视频、语音、文件、文本位置、名片、草稿、置顶、免打扰、未读、清空记录。
- 消息长按：复制、转发、收藏、两分钟内撤回、删除；模拟联系人回复。
- 联系人：添加本机联系人、备注、标签、星标、黑名单、群聊与成员管理、自定义头像。
- 朋友圈：文字、最多九图或单视频；点击“＋”后从底部菜单选择“拍摄”或“从手机相册选择”；支持位置、公开/私密/部分可见/不给谁看、点赞、评论、回复、转发、删除、自定义封面。
- 朋友状态：文字状态、颜色、可选视频背景、24 小时有效期、点赞与历史记录。
- 收藏、全局搜索、本机文件管理、媒体清理、个人资料、完整 JSON 备份与恢复。
- AI 服务与人设统一设置，支持自定义 AI 头像、延迟、主动程度、免打扰时段、主动消息、朋友圈点赞与评论。

## 仅保留界面的入口

红包、转账、音视频通话、服务与支付、卡包、表情商店、视频号、直播、扫一扫、摇一摇、看一看、附近、购物、游戏和小程序等需要真实微信或第三方服务的能力，只显示入口并明确提示不可用，不伪造支付、通话或联网结果。

## GitHub 构建未签名 IPA

1. 解压完整源码，新建一个 GitHub 仓库并上传全部文件，包含隐藏的 `.github/workflows/build-trollstore-ipa.yml`。
2. 在仓库打开 **Actions → Build TrollStore IPA → Run workflow**。
3. 等待 macOS 构建结束，在 workflow 页面下载 Artifact：`LocalWeChat-iOS16.1-TrollStore`。
4. 解压 Artifact，取得 `LocalWeChat-iOS16.1-TrollStore.ipa`，传到已安装 TrollStore 的 iPhone 14 Pro。
5. 在 TrollStore 中选择该 IPA 并安装。无需付费开发者证书；IPA 不包含签名，不能按普通签名 IPA 的方式安装。

也可在 macOS 本机构建：安装 XcodeGen 后运行 `xcodegen generate`，再用 `LocalWeChat.xcodeproj` 构建。GitHub workflow 已包含关闭签名、建立 `Payload` 目录和打包 IPA 的完整命令。

## DeepSeek 与 AI 人设

进入 **我 → 设置 → AI 服务与人设**：

- 默认接口：`https://api.deepseek.com/chat/completions`
- 默认模型：`deepseek-chat`，也可按账号能力填写 `deepseek-reasoner`。
- 可配置系统提示词、AI 名字、性格、说话方式、关系、补充要求、Temperature、Token、上下文条数、回复速度和主动程度。
- 保存后先使用“测试接口连接”。API Key 保存于 iOS Keychain，不进入 IndexedDB，也不包含在备份中。
- AI 回复有自然延迟与“正在输入”；朋友圈点赞无需接口，评论可调用 AI。失败时按设置使用本地文案或跳过，评论区会标注“（AI）”。
- AI 主动消息和朋友圈互动依赖应用处于打开状态；iOS 挂起或关闭应用后不会持续后台运行，也没有远程推送。

### 向 AI 发送照片与视频

文本 DeepSeek 不等于视觉模型，因此提供两个可选项：

- **多模态接口**：OpenAI Chat Completions 兼容的 HTTPS 地址；留空则沿用上方接口和同一个 Key。
- **视觉模型**：填写实际支持图像输入的模型名称。

配置后，当前连续发送的图片会作为多模态内容上传；视频在本机默认抽取 3 帧，批量媒体减少抽帧数，总图片数最多 6 帧。未配置视觉模型时，仅向文本模型发送“无法查看媒体”的提示，不假装理解图片或视频。视频分析不包含完整视频上传、音轨理解或语音转文字。

## 隐私与数据

- 除你配置的 AI 请求外，应用不访问业务服务器。
- AI 聊天发送当前 AI 会话的最近消息；AI 评论发送新朋友圈文字与媒体数量；配置视觉模型后，你主动发给 AI 的图片或视频抽帧也会发送给该接口。
- 不读取或上传其他联系人聊天、完整朋友圈或未经选择的媒体。
- AI 接口只接受 HTTPS，原生网络层禁止自动重定向，降低 Key 被转发的风险。
- 备份包含聊天、联系人、朋友圈、状态、收藏、设置及媒体，不包含 API Key。大型视频会显著增大备份并受设备可用存储限制。
- 建议定期通过 **设置 → 备份与恢复 → 导出完整备份** 保存 JSON；卸载应用可能删除全部本机数据。

## 验证状态

已通过：JavaScript 语法检查、全部页面与按钮动作巡检、iPhone 14 Pro 逻辑尺寸下的 Chromium 冒烟测试。覆盖初始化、AI 设置、AI 头像、朋友圈封面、发布/点赞/评论、聊天与本地回复、收藏、深色模式、向 AI 发图及备份导出；另已验证朋友圈两入口菜单、多图与视频发布、图片多模态请求、视频三帧抽取，以及本地模拟接口下的 AI 点赞和评论。

尚未验证：macOS/Xcode 编译、GitHub Actions 实际运行、真实 IPA 安装、TrollStore、Keychain、系统分享、麦克风、WKWebView 特有行为，以及真实 DeepSeek/视觉接口。

## 工程结构

- `LocalWeChat/Resources/local_wechat.html`：单文件界面与业务逻辑。
- `LocalWeChat/WebViewController.swift`：原生桥接、主题、返回、权限与文件导出。
- `LocalWeChat/AIClient.swift`：HTTPS AI 请求。
- `LocalWeChat/KeychainHelper.swift`：API Key 安全保存。
- `LocalWeChat/Assets.xcassets`：应用图标。
- `project.yml`：XcodeGen 工程定义。
- `.github/workflows/build-trollstore-ipa.yml`：GitHub IPA 构建。
- `tests/`：Chromium 自动化测试，不进入应用安装包。

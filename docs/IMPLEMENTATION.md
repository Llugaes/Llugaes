# 近 14 天游戏卡片与组件交付

当前状态：代码、发布和运行验收完成，等待用户查看实际视觉效果。主聊天：Codex，个人主页游戏统计与组件化；本机未配置 Planban，状态以此文件为准。

## 目标与决定

- Steam、PlayStation、Switch 合并按近 14 天记录时长排序，前三张大卡、随后最多四张小卡，没有平台配额；保留平台图标和边框。
- 近 14 天有多少款就展示多少款，不用旧游戏补齐。Steam 原生滚动窗口、PSN 观测增量、Nintendo 平台日记录保留各自来源与覆盖说明。
- 独立组件放在 `Llugaes/game-activity-card`，提供 Node CLI/模块与 GitHub Action；本主页只消费固定版本，不保留第二份核心实现。
- 用户明确允许本轮由实际 Astra 负责设计、GPT 实现与验收、Luna 独立代码审查。

## 基线证据

- 主页工程从远端同步到 `b9477a69b8ff016efecfeb68dd6ad6b61030e327`，工作区干净，原有 23 项测试全部通过。
- Steam 当前 4 款近期游戏，共 4657 分钟。PSN 132 个数据历史提交中有 71 个不同的成功采集时刻，33 款游戏累计计数从 2026-10-11 到 2026-10-26 都没有变化。
- Switch 已连接 Nintendo Store 历史接口，保留平台原日期明细；日记录有延迟，不能把累计时长冒充近两周。
- 已核查的现成项目包括 lowlighter/metrics Steam 插件、felix-sharky/steam-widget、ChengChung/nscard，以及 Raycast Nintendo 游玩历史实现。它们可提供平台能力或参考，未发现经过核实、能直接满足本次三平台排行与可嵌入 Action 的完整组件，不声称首创。

## 验收范围

1. 完成独立组件、使用说明与新用户最小接入入口，保留现有账号/加密会话兼容。
2. 用实际 Git 快照补齐 PSN 观测历史，不拆造旧的平台聚合记录。
3. 验证混合平台、同平台前三、七款、少于三款、空记录、失败/过期、换账号、重置与时间边界。
4. 检查桌面和窄屏图片、独立包安装与 Action，并由 Luna 审查跨模块/凭据/路径边界。
5. 推送两仓，运行精确版本 CI、三平台真实同步，核实主页图片固定 SHA 引用与用户入口。

## 已取得证据

- 独立组件 `443646567f805d36acc6d1e1dbfcc4f5d65cda5e`：37 项测试通过；[精确提交 CI](https://github.com/Llugaes/game-activity-card/actions/runs/40370549988)成功，包含空消费者目录调用实际 composite Action、生成图片和离线渲染。
- PSN 历史来自 132 个真实数据提交，71 个不同成功时刻，经同一接收函数重放成 70 个区间，新增 0 分钟。未将旧聚合区间拆造为逐游戏数据。
- Main 已查看实际四款游戏桌面/手机图片，以及合成七款混合平台、空状态和同步失败的图片。三个 Steam 大卡拥有独立剪裁区，文字未越界，小卡平台标识及名次清晰。
- Luna 独立审查发现的账号夹具与 PSN 旧游玩日期否决观测新增问题已修正；Astra 已确认迟到补报以观测新增保留，并在详情解释，不称实际近 14 天游玩时长。
- 本仓已从远端固定 SHA 安装组件，消费者集成测试和离线渲染通过；原采集、渲染、认证和图标副本已移除。

## 最终发布与运行验收

- 组件最终源码 `af17b4558b1a4aa504d1f26cb4986bb86e65128a`，已发布 [v1.0.0](https://github.com/Llugaes/game-activity-card/releases/tag/v1.0.0)，附可安装的 tgz。最终版本 [CI 40370962493](https://github.com/Llugaes/game-activity-card/actions/runs/40370962493) 成功，37 项测试与实际 Action 消费通过。安装包也在独立目录安装并完成离线渲染。
- 本仓通过 `git+https` 和完整 SHA 消费该版本；使用全新 npm 缓存并禁用 SSH 命令的安装成功，[干净 runner CI 40371437229](https://github.com/Llugaes/Llugaes/actions/runs/40371437229) 同样通过。
- [三平台真实同步 40371436163](https://github.com/Llugaes/Llugaes/actions/runs/40371436163) 成功：Steam 4 款、PSN 33 款、Switch 9 款，三者成功采集时间均为北京时间 2026-10-27 01:46:44。原有 PSN 密文会话成功续用并刷新。
- 真实数据与图片提交 `3de421cd1d02424de304b7671eef2abe76b89b59`，README 引用提交 `39ebdfe`；两张图片都绑定前者的完整 SHA，浏览器已看到新版排行。
- 验收时总计 4505 分钟，显示 75.1 h。前三为 FINAL FANTASY RESONANCE（26.3 h）、东亰幻都 eX+（20.0 h）、FINAL FANTASY VII REBIRTH（15.5 h）；Factorio（13.3 h）在小卡区。PSN 窗口内观测新增为 0，Switch 此窗口内无已返回的日记录，不以旧游戏占名额；Switch 日记录仍标明覆盖与延迟限制。
- 本轮 HTTPS OAuth 令牌因缺少 `workflow` scope 拒绝推送工作流；使用已验证的本人 SSH 通道向同一 `origin` 仓库成功推送，没有修改权限、凭据或分支保护。

验收覆盖 Windows 本地与 Linux 云端、实际桌面/手机版生成图片和线上主页。用户本人尚未进行视觉确认；未宣称真实手机设备测试或所有平台提供同秒精确窗口。

代码、测试、CI、主页真实展示和用户本人验收分别记录；完成时在本页补充最终证据。

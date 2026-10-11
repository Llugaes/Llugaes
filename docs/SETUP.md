# 游戏记录同步

主页使用自己的 SVG 卡片。Steam 走官方 Web API，PlayStation 使用开源 [psn-api](https://github.com/achievements-app/psn-api)，Switch 使用 Nintendo Store 游玩历史接口，参考 [Raycast 的开源实现](https://github.com/raycast/extensions/tree/main/extensions/switch-game-play-history)。

## 当前接入

- Steam 已接通官方 Web API。2026-10-11 完成真实采集 → 机器人提交 → 主页卡片更新验证；[首次成功运行](https://github.com/Llugaes/Llugaes/actions/runs/38125198483)。
- PlayStation 已实现账号校验、游戏分页与奖杯采集；等待本人授权，未做真实账号验收。
- Switch 使用真实游玩历史，等待本人一次性授权。好友码不能直接查完整游戏历史。
- Xbox 没有账号，本次不接入。

## 连接 Steam

1. 用自己的浏览器打开 [Steam API key 页面](https://steamcommunity.com/dev/apikey)，登录 Llugaes。已有 key 可直接使用；需要登记域名时可填 `llugaes.github.io`。
2. 打开 [本仓库的新建 Secret 页面](https://github.com/Llugaes/Llugaes/settings/secrets/actions/new)，Name 填 `STEAM_API_KEY`，Secret 填 key，保存。不要粘贴到聊天、代码或 Issue。
3. 在 [游戏记录同步](https://github.com/Llugaes/Llugaes/actions/workflows/player-log.yml) 点击 **Run workflow**，选择 `steam` 或 `all`。

如果返回不可见或缺失数据，先检查 Steam「游戏详情」隐私设置。脚本保留上次记录并报告失败，不把无法读取记为 0 小时。

## 连接 PlayStation

使用 [psn-api 官方项目的登录指引](https://psn-api.achievements.app/authentication/authenticating-manually) 在自己的浏览器登录 Sony，取得本人的 NPSSO。将其直接保存到同一仓库的 Actions Secret `PSN_NPSSO`。这是账号凭据，不放进聊天或仓库文件。

只接受 `theVoiden`：先核对 Online ID，再读取游戏、时长和奖杯。正常使用 refresh token 自动续期；会话以 AES-256-GCM 密文保存到 `state/psn-session.enc.json`，加密密钥从 GitHub Secret 派生，账号作为认证上下文。明文令牌不会写入仓库或日志。Secret 更新会使旧缓存失效，自动重新建立会话；授权被撤销或无法续期时才需重新登录。

## 连接 Nintendo Switch

采用 Nintendo Store / My Nintendo 的游玩历史，不再使用定时抓在线状态的方案。Nintendo Switch App 的登录状态不会自动共享给本项目，需要本人授权一次。

1. 本机执行 `node scripts/connect-nintendo.mjs`，打开它显示的本机网址。
2. 点击 Nintendo 官方登录链接，登录后右键复制“选择此账号”按钮的链接，粘贴回本机页面。
3. 点击“连接并保存到 GitHub Secret”。本机只向 Nintendo 交换令牌，再通过已登录的 `gh` 保存 `NINTENDO_SESSION_TOKEN`，不显示或保存明文。
4. 运行同步工作流，选择 `switch`。首次真实返回后核实游戏归属与数据覆盖。

Nintendo Store 能返回各游戏累计时长和近期逐日记录。脚本保留返回的真实日期、接收迟到修正，并排除平台标记隐藏的游戏；好友码、账号邮箱和头像不会公开。数据可能延迟至第二天，主机睡眠联网后才上传，详见 [任天堂说明](https://en-americas-support.nintendo.com/app/answers/detail/a_id/68647/p/1128)。此接口是社区接入方案，Nintendo 改接口时可能需要维护。

## 同步频率与运行方式

| 平台 | 采集频率 | 采集内容 | 授权维护 |
| :--- | :--- | :--- | :--- |
| Steam | 每 2 小时，北京时间偶数小时 17 分 | 近两周游戏、累计与近期时长 | API key 被撤销时才需更新 |
| PlayStation | 同 Steam | 已玩游戏、累计时长、奖杯 | 自动 refresh；撤销/失效时需本人重新授权 |
| Switch | 每 6 小时，北京时间 02:47 / 08:47 / 14:47 / 20:47 | Nintendo Store 累计与近期逐日记录 | 每次用 session token 换短期 token，失效时重新授权 |

GitHub Actions 云端运行，本机不必开机。流程为：指定平台采集 → 字段校验 → 保存快照与历史 → 生成卡片 → 机器人提交 → GitHub 主页展示。未配置的平台跳过；失败时保留最后成功的数据和时间，工作流报告失败。手动 Run workflow 可立即同步一个平台或全部平台。

计划任务不是实时服务，GitHub 可能延迟或跳过拥堵时段。最后成功时间才是数据新鲜度依据；GitHub 图片缓存也可能造成短暂显示延迟。

## 数据口径

- 公开文件只有白名单字段：游戏名称与 ID、平台记录的游玩时长、最近游玩/采集时间、奖杯计数与同步状态。
- Steam 的近两周时长独立展示；不把软件运行时间、各平台时长直接相加成个人在线时间。工具排除表在 `activity.config.json`。
- 累计时长只对同账号、同来源、同游戏的两次采集求差。初次采集、来源切换、新游戏和计数回退都建立新基线。
- 保留采集区间，不把跨日或补报时长拆成虚构的每日热力图。不使用机器人采集提交冒充本人的 coding 活跃度。
- 同步失败不覆盖最后有效结果及其时间。已配置平台失败时 Actions 标红；尚未设置 Secret 的平台显示待连接。
- GitHub 公开仓库的 scheduled workflows 长期无仓库活动时可能自动停用；在 Actions 中按提示重新启用。

## 本地维护

Node.js 22+，`npm ci --ignore-scripts` 后执行：

```powershell
npm test
npm run render
npm run import:steam -- 'C:\Program Files (x86)\Steam'
```

本机导入只读取配置指定账号的游戏记录，不保存整份 Steam 配置。云端已经连接后，本机导入会拒绝覆盖。`npm run sync` 从环境变量读取与 GitHub Secrets 同名的凭据。

### 参考

- [Steam IPlayerService](https://partner.steamgames.com/doc/webapi/iplayerservice?language=english)
- [psn-api 认证接口](https://psn-api.achievements.app/api-docs/authentication)
- [nxapi](https://github.com/samuelthomas2774/nxapi)
- [lowlighter/metrics Steam 插件](https://github.com/lowlighter/metrics/blob/master/source/plugins/steam/README.md)：另一种现成的 Steam 主页卡片方案。

# 游戏记录同步

主页使用独立的 [game-activity-card](https://github.com/Llugaes/game-activity-card) 组件，通过 `package.json` 与锁文件固定完整 Git SHA。此仓只保存自己的配置、真实记录、卡片、加密状态和消费工作流；采集、排序、渲染与平台认证只有组件仓的一份实现。别人可使用该组件的 GitHub Action 或 Node CLI，详见[接入说明](https://github.com/Llugaes/game-activity-card#readme)。

最近 14 天的平台记录统一按时长排行，前三款大卡、随后最多四款小卡，没有平台名额；不拿窗口外的旧游戏补位。Steam 使用原生两周时长，PlayStation 使用观测新增，Switch 使用平台逐日记录。口径与覆盖会随每次生成显示在[全部记录](./ACTIVITY.md)。

## 当前接入

- Steam 已接通官方 Web API。2026-10-11 完成真实采集 → 机器人提交 → 主页卡片更新验证；[首次成功运行](https://github.com/Llugaes/Llugaes/actions/runs/38125198483)。
- PlayStation 已接通 `theVoiden`。2026-10-11 首次读到 33 个游戏、9 个白金奖杯，账号校验和加密会话保存已通过；[首次成功运行](https://github.com/Llugaes/Llugaes/actions/runs/38126118301)。
- Switch 已接通 Nintendo 游玩历史。2026-10-11 首次返回 9 个游戏、1 个游玩日的明细；[首次成功运行](https://github.com/Llugaes/Llugaes/actions/runs/38126419547)。这是上游本次返回的范围，不代表完整历史逐日记录。
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

采用 Nintendo Store / My Nintendo 的游玩历史。Nintendo Switch App 的登录状态不会自动共享给本项目，需要本人授权一次。

1. 本机执行 `npm run connect:nintendo`，打开它显示的本机网址。
2. 点击 Nintendo 官方登录链接，登录后右键复制“选择此账号”按钮的链接，粘贴回本机页面。
3. 点击“连接并保存到 GitHub Secret”。本机只向 Nintendo 交换令牌，再通过已登录的 `gh` 保存 `NINTENDO_SESSION_TOKEN`，不显示或保存明文。
4. 运行同步工作流，选择 `switch`。首次真实返回后核实游戏归属与数据覆盖。

Nintendo Store 能返回各游戏累计时长和近期逐日记录。脚本保留返回的真实日期、接收迟到修正，并排除平台标记隐藏的游戏；好友码、账号邮箱和头像不会公开。数据可能延迟至第二天，主机睡眠联网后才上传，详见 [任天堂说明](https://en-americas-support.nintendo.com/app/answers/detail/a_id/68647/p/1128)。此接口是社区接入方案，Nintendo 改接口时可能需要维护。

历史按账号的不可逆摘要隔离；换账号不合并旧记录。上游没有提供账号标识时按本次授权隔离，重新授权后建立新基线。平台新标记隐藏的游戏也会从当前保留的日记录移除，但这不会删除已发布的 Git 历史。

## 同步频率与运行方式

| 平台 | 采集频率 | 采集内容 | 授权维护 |
| :--- | :--- | :--- | :--- |
| Steam | 每 2 小时，北京时间偶数小时 17 分 | 近两周游戏、累计与近期时长 | API key 被撤销时才需更新 |
| PlayStation | 同 Steam | 已玩游戏、累计时长、奖杯 | 自动 refresh；撤销/失效时需本人重新授权 |
| Switch | 每 6 小时，北京时间 02:47 / 08:47 / 14:47 / 20:47 | Nintendo Store 累计与近期逐日记录 | 每次用 session token 换短期 token，失效时重新授权 |

GitHub Actions 云端运行，本机不必开机。流程为：指定平台采集 → 字段校验 → 保存快照与历史 → 生成卡片 → 机器人提交 → GitHub 主页展示。未配置的平台跳过；失败时保留最后成功的数据和时间，工作流报告失败。手动 Run workflow 可立即同步一个平台或全部平台。

计划任务不是实时服务，GitHub 可能延迟或跳过拥堵时段。最后成功时间才是数据新鲜度依据。同步先提交数据与图片，再把主页图片链接指向该提交的固定地址；参数会被 GitHub 图片跳转丢弃，因此不用查询参数刷新缓存。

## 数据口径

- 公开文件只有白名单字段：游戏名称与 ID、平台记录的游玩时长、最近游玩/采集时间、奖杯计数与同步状态。
- 总计汇总所有可计入的近期游戏，不限图片中的七款，是平台已记录时长之和；并行运行、挂起和迟到补报可能影响它，不能当作个人实际在线时间。工具排除表在 `activity.config.json`。
- Steam 原生窗口以采集时刻为终点；本机缓存、采集失败或超过 24 小时的冻结结果从当前排行与总计排除，详情保留上次值。
- PSN 按每款游戏的完整采集区间计算观测新增；跨近 14 天起点的区间不摊分，可能存在历史游玩的迟到补报，最后游玩日期只用于展示及同分排序。2026-10-27 从本仓真实 Git 快照重放 71 次有效采集，补齐 70 个区间，没有拆造旧的聚合记录。
- 累计时长只对同账号、同来源、同游戏的两次采集求差。初次采集、来源切换、新游戏和计数回退都建立新基线。
- 保留采集区间，不把跨日或补报时长拆成虚构的每日热力图。不使用机器人采集提交冒充本人的 coding 活跃度。
- Nintendo 使用配置时区对应的最近 14 个原平台日期；缺失日期不补造每日零记录。日记录与 PSN 观测区间保留 366 天；未连接、新游戏或建立基线中的未知数不冒充零时长。
- 同步失败不覆盖最后有效结果及其时间。已配置平台失败时 Actions 标红；尚未设置 Secret 的平台显示待连接。
- GitHub 公开仓库的 scheduled workflows 长期无仓库活动时可能自动停用；在 Actions 中按提示重新启用。

## 本地维护

Node.js 22+，`npm ci --ignore-scripts` 后执行：

```powershell
npm test
npm run render
npm run import:steam -- 'C:\Program Files (x86)\Steam'
npm run connect:nintendo
```

本机导入只读取配置指定账号的游戏记录，不保存整份 Steam 配置。云端已经连接后，本机导入会拒绝覆盖。`npm run sync` 从环境变量读取与 GitHub Secrets 同名的凭据。`npm run render` 离线渲染；`npm run link:card` 在图片提交之后，将 README 的两张图绑定到该提交。

模型、认证、排行、日期和路径隔离回归在[组件仓 CI](https://github.com/Llugaes/game-activity-card/actions/workflows/check.yml)运行；本仓保留实际依赖安装和真实数据渲染的消费者集成测试。换组件版本时更新固定 SHA 与锁文件，再执行本仓测试和真实同步。

### 参考

- 主页动效参考：[Platane/snk](https://github.com/Platane/snk) 的自包含 SVG、[lowlighter](https://github.com/lowlighter/lowlighter) 的数据生成方式。这里使用自行绘制的存档卡与 CSS 动效，无需外部卡片服务；系统开启减少动态效果时自动静止。
- 平台图标来自 [Simple Icons](https://github.com/simple-icons/simple-icons)，[CC0](https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md)。Nintendo Switch 图标取自 11.15.0。

- [Steam IPlayerService](https://partner.steamgames.com/doc/webapi/iplayerservice?language=english)
- [psn-api 认证接口](https://psn-api.achievements.app/api-docs/authentication)
- [Nintendo 游玩历史社区实现](https://github.com/ChengChung/nscard/blob/main/client/nintendo/user/playhistory.go)
- [lowlighter/metrics Steam 插件](https://github.com/lowlighter/metrics/blob/master/source/plugins/steam/README.md)：另一种现成的 Steam 主页卡片方案。

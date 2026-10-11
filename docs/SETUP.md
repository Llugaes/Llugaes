# 游戏记录同步

主页使用自己的 SVG 卡片。Steam 走官方 Web API，PlayStation 使用开源 [psn-api](https://github.com/achievements-app/psn-api)，Switch 预留 [nxapi](https://github.com/samuelthomas2774/nxapi) presence 接口。

## 当前接入

- Steam 已导入本机真实近期记录，云端自动采集等待 API key。
- PlayStation 已实现账号校验、游戏分页与奖杯采集；等待本人授权，未做真实账号验收。
- Switch 已实现 presence 读取与账号校验；等待本人授权的服务地址，未做真实账号验收。好友码不能直接查完整游戏历史。
- Xbox 没有账号，本次不接入。

## 连接 Steam

1. 用自己的浏览器打开 [Steam API key 页面](https://steamcommunity.com/dev/apikey)，登录 Llugaes。已有 key 可直接使用；需要登记域名时可填 `llugaes.github.io`。
2. 打开 [本仓库的新建 Secret 页面](https://github.com/Llugaes/Llugaes/settings/secrets/actions/new)，Name 填 `STEAM_API_KEY`，Secret 填 key，保存。不要粘贴到聊天、代码或 Issue。
3. 在 [游戏记录同步](https://github.com/Llugaes/Llugaes/actions/workflows/player-log.yml) 点击 **Run workflow**。正常后每 6 小时自动采集并更新主页；GitHub 计划任务可能延迟。

如果返回不可见或缺失数据，先检查 Steam「游戏详情」隐私设置。脚本保留上次记录并报告失败，不把无法读取记为 0 小时。

## 连接 PlayStation

使用 [psn-api 官方项目的登录指引](https://psn-api.achievements.app/authentication/authenticating-manually) 在自己的浏览器登录 Sony，取得本人的 NPSSO。将其直接保存到同一仓库的 Actions Secret `PSN_NPSSO`。这是账号凭据，不放进聊天或仓库文件。

只接受 `theVoiden`：脚本先读取登录账号并核对 Online ID，再读取已玩游戏、累计时长和奖杯数量。令牌仅在进程内使用，不持久化或打印。NPSSO 失效后需要本人更新 Secret；目前没有托管自动续期服务。

## 连接 Nintendo Switch

Switch 需要独立的 Nintendo / NSO 授权，不能凭好友码接入。先参考 [nxapi 文档](https://github.com/samuelthomas2774/nxapi/blob/main/docs/cli.md) 建立本人授权的 presence 服务，再设置：

- `NXAPI_PRESENCE_URL`：返回 `friend.presence` JSON 的 HTTPS 地址。
- `NXAPI_NSA_ID`：该响应里本人的 `friend.nsaId`，用来防止同步错账号。

本项目不会自动加入第三方公开 presence 服务或发送好友请求。使用第三方托管服务前，需本人确认它的公开范围与授权内容。

仅能记录采集时观测到的游戏；每 6 小时轮询可能错过短会话，平台时长也可能是近似值，因此不统计完整 Switch 历史或精确每日时长。服务地址、NSA ID 和好友码不会写入公开快照。

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

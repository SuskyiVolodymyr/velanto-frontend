# 17屏幕清单 (Screen Inventory)

> 每个 `.dc.html` 参考文件对应一个屏幕(设计handoff中的高保真参考,非生产代码)。品牌名占位符是"Vilante",实现时用"Velanto"。

1. **Home** — 发现流/落地页。导航含搜索、Create CTA、通知铃铛(抽屉+未读红点)、用户菜单(角色感知:moderator显示Support链接,admin/manager显示Admin链接)。格式筛选chip(All/Save One/Sacrifice One/Rank Blind/NxN/1v1)+ **Tags多选下拉**(复选框式,"至少匹配一个tag"逻辑,显示已选数量,含Clear操作)。响应式pack卡片网格(封面渐变占位、格式徽章、轮次数、play/player/agree-%统计)。

2. **Create** — Pack构建器。Step1基础信息(标题、描述、封面色调选择器、**Tags选择器**:点击切换,最多10个,实时"N/10"计数,达到上限后未选中的变暗且不可交互)。Step2淘汰格式选择(5张格式卡)。Step3构建器**根据格式自适应**:Groups&Rounds(Save One/Sacrifice——每组=一轮,Random-N或Manual-all选择模式)、Categories(NxN/versus——2+具名分组并排比较)、Pool(Rank Blind/1v1——扁平列表)。每个元素添加行支持三种输入类型:**Text**、**Link(YouTube)**(标题+URL)、**Image**(标题+设备上传或剪贴板粘贴)。实时摘要卡+Publish按钮(受有效性门控)。

3. **Pack** — 公开pack详情页。封面、统计、"玩法说明"(刻意用格式通用文案,不做虚假AI主题分析)、Play CTA、评论区。

4. **Play**(Save One/Sacrifice One)— 逐个揭示item("Show next"/"Show all"控制,避免轮次顺序一次性剧透);卡片尺寸固定(揭示更多item时不重排/拉伸);视频item用`<video>`,hover时播放,完整播放控制留待后续版本。"Next round"在本轮所有item揭示完之前保持禁用。

5. **Play NxN** — 2个(或更多)具名分组显示为列,中间"VS"分隔线。玩家选择整个**分组/边**,而非单个item。逐边逐个揭示(同样的show-next/show-all模式)。

6. **Play Rank**(Rank Blind)— item逐个放入不断增长的有序列表;支持多轮(每轮=自己的item集合+槽位数,镜像Save One的group模型)。

7. **Play 1v1** — 头对头对决格式;简单的两两pick。

8. **Result** — 游戏后统计屏幕(你的picks vs 社区聚合一致率)。

9. **Auth** — 登录/注册。

10. **Profile / Profile Edit** — 自己的资料页(创建的packs、统计、粉丝数)和编辑表单。

11. **Author** — 公开创作者资料页:Follow按钮+粉丝数,封禁历史(moderator可见),举报操作。

12. **Settings** — 账户设置;包含**仅用于演示的角色切换器**(moderator/admin/manager),用于预览门控功能——**不是真实权限UI**,真实实现中角色必须由后端session驱动(见 `.claude/docs/security-checklist.md`)。

13. **Support / Support Report** — Moderator举报队列:可搜索/筛选/分页的举报列表+状态徽章 → 举报详情(review/close操作)、链接到被举报目标、删除pack和封禁用户操作、封禁时长弹窗(周/月/年/永久)。

14. **Admin** — Admin/manager控制台:Overview(在线用户、注册用户、packs、plays、待处理举报数)、Staff tab(添加/移除员工、编辑角色)、Users tab(搜索+封禁/解封快捷操作)、Logs tab(操作审计轨迹:actor、action、target、timestamp、筛选)。

15. **Docs** — 配套文档/帮助内容页。

## 交互模式(跨屏幕通用,详见README原文)
- **逐个揭示模式**(Play/Play NxN/Play Rank):items/groups初始隐藏,"Show next"揭示下一个,"Show all"揭示剩余,轮次完成操作(Next round/Save pick等)在当前轮所有item可见前保持禁用。卡片尺寸预先固定,后续揭示不会导致早期卡片重排。
- **视频hover预览**:视频元素在`mouseenter`时静音自动播放,`mouseleave`时暂停。首帧作为poster(不需要单独缩略图素材)。
- **Tag筛选**(Home):点击tag chip在`selectedTags`数组中切换;pack匹配条件是`pack.tags`与`selectedTags`有交集(OR逻辑,不是AND)。空选择=不筛选。
- **Tag选择**(Create):同样的切换模型,上限10个;达到上限后未选中的chip视觉变暗且不可交互。
- **角色门控导航**:Support链接仅对`session.isModerator`渲染;Admin链接仅对`role === 'admin' || role === 'manager'`渲染。

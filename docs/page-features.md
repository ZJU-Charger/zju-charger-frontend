# Page Features

1. **头部区域**：显示最新更新时间、主题切换、GitHub 链接与中英切换，并在首次访问时弹出引导说明。
2. **汇总面板（SummaryGrid）**：按校区汇总充电桩总数、空闲、占用、故障数量，可点击卡片快速筛选。
3. **站点面板（StationPanel + StationList）**：
   - 服务商筛选与排序（空闲优先/距离优先）。
   - Watchlist 收藏置顶，并与地图聚焦同步。
   - 卡片展示 Free / In use / Fault / Total 指标。
4. **地图视图（MapView）**：结合 ECharts + AMap 渲染站点、用户实时位置，支持导航、主题同步与跟踪高亮提醒。
5. **自动刷新与限流提示**：根据配置间隔刷新站点数据，命中限流时通过 `RateLimitToast` 提示。

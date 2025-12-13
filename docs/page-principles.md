# Page Principles

## 页面原理介绍

- **数据流**：`useStations` 并行请求 `/api/status` 与 `/api/stations`，经 `mergeStations` 统一结构与“已抓取”标记；`useProviders` 获取服务商列表，两者均由 TanStack Query 管理缓存、加载和错误状态。
- **状态流**：`store/ui.store.ts` 的 `useUIStore` 收敛跨组件 UI 状态（语言、校区/服务商选项、引导弹窗、聚焦站点、跟踪高亮等），避免多层 props 传递。
- **自动刷新**：`useAutoRefresh` 根据配置定时调用 TanStack Query 的 `refetch`；手动刷新也共享同一 QueryClient，防止重复实例。
- **渲染优化**：`useMemo`/`useCallback` 仅在依赖变化时重算排序或统计；MapView 通过 diff 更新图层，列表滚动与高度计算使用 `ResizeObserver`。

## 数据流与 API

> 旧版 `/api/web` 接口已移除，前端统一通过 `/api/status`、`/api/stations`、`/api/providers` 获取数据。

1. **服务商清单**：`useProviders()` 请求 `/api/providers`，结果传入 Header 组件以渲染筛选下拉框。
2. **站点状态**：`useStations()` 并行请求 `/api/status`（支持 `?provider=` 筛选）与 `/api/stations`，通过 `mergeStations()` 合并实时数据与元数据，保证未抓取站点也能显示在地图/列表，并标记 `isFetched=false`。
3. **关注列表**：`useWatchlist()` 负责从 `localStorage` 解析/持久化 `{devids, devdescripts}`，并暴露 `isWatched()` 与 `toggleWatch()` 给列表组件使用。
4. **限流提示**：当 API 返回 429 时抛出 `RateLimitError`，`useStations()` 捕获后设置 `rateLimited=true`，由 `RateLimitToast` 组件展示提示。

## 全局状态与本地存储

- React 组件树以 `App` 为根，通过 `useState` 持有 `campusId`、`providerId` 等筛选条件。
- `useStations()`（数据）与 `useProviders()`（选项）等 hooks 将 API 结果注入组件；刷新频率在前端的 `useAutoRefresh()` 内部自定义，无需额外的配置接口。
- `useWatchlist()`+`localStorage` 保存 `{devids, devdescripts, updated_at}`，支持多标签同步；`useTheme()` 负责 `THEME_STORAGE_KEY`。

## 地图渲染流程（`MapView`）

1. **AMap 加载**：组件初始化时调用 `loadAmap(NEXT_PUBLIC_AMAP_KEY)` 动态注入高德 JS SDK，随后 `echarts.init()` 创建实例。
2. **ECharts 配置**：`amap` 选项指定视图模式、中心、缩放与暗色样式；`series` 使用 `scatter` + `coordinateSystem: 'amap'` 渲染标记，颜色按照站点可用性（绿=空闲、橙=紧张、红=故障）。
3. **坐标转换**：`normalizeStation()` 将 BD09 坐标转换为 GCJ02，确保与高德底图一致；缺失坐标的站点会被过滤，不影响列表展示。
4. **交互能力**：
   - Tooltip 展示站点名称、校区、服务商、实时数量，并附带“高德/系统地图”导航链接。
   - 双击任意站点标记会弹出导航卡片，可一键打开高德或系统地图；右下角按钮切换实时定位（浏览器 `watchPosition` → GCJ02 → `setCenter`），并允许一键停止。
   - 校区切换会更新 AMap `center/zoom`，地图与列表保持同步。

## 列表与 UI（React 组件）

- **StationList**：从 `useStations()` 返回的 `campusStations` 中渲染卡片，排序策略保持“关注优先 → 实时数据 → 空闲数量”。卡片使用 shadcn Button/Card 组合构成，右上角为独立关注按钮，支持键盘访问，进度条、校区/服务商标签和“未抓取”提示与旧版一致。
- **Watchlist**：`useWatchlist()` 注入 `isWatched/toggleWatch`，按钮样式改为星形字符（★）并实时同步 `localStorage`。
- **NightNotice**：独立组件，通过 `isNightTime()` 决定是否展示夜间提示，不再依赖 DOM 操作。
- **HeaderBar**：封装校区按钮、服务商下拉、更新时间、手动刷新与主题切换按钮。
- **SummaryGrid**：新增校区摘要组件，显示每个校区的空闲数量与站点总数。

## 自动刷新与提示机制

- `useAutoRefresh()` 内部维护 `DEFAULT_REFRESH_INTERVAL`（默认 60 秒），前端可以在配置文件中覆盖该值；它会定时调用 `useStations().refresh()`。
- Header 中的“刷新”按钮直接触发 `refresh()`，并在 UI 上立刻进入 loading 状态。
- `RateLimitToast` 根据 `rateLimited` 状态展示限流提示；其余错误在列表卡片中提示排查步骤。

## 位置识别与校区自动切换

- `MapView` 的“实时定位”按钮调用 `useRealtimeLocation()`（内部封装了 `navigator.geolocation.watchPosition`），并通过 `wgs84ToGcj02()` 校正后持续更新用户标记，可随时停止或在权限被拒绝时提示。
- 校区切换由 React 状态驱动，`MapView` 和 `StationList` 同时响应，无需手动触发 `fitBounds`。

## 扩展指引

- **新增校区**：在 `src/config/campuses.ts` 中追加配置，并更新 `CAMPUS_LIST`；按钮会自动从配置渲染。
- **调整地图样式**：`MapView` 中的 `getStationColor()`、`symbolSize` 决定标记风格，可根据数据类型扩展多个 series。
- **附加筛选项**：在 `HeaderBar` 添加新的控件，并将状态下传给 `useStations()` 的参数即可。
- **排序/标签**：修改 `StationList` 内的排序函数或卡片标签；React 组件结构使其更易维护。

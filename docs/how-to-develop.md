# How-to-Develop

1. **初始化环境**

   ```bash
   pnpm install
   pnpm dev
   ```

   访问 `http://localhost:3000` 进行调试。

2. **代码规范**
   - UI 状态集中在 `useUIStore`，远程数据统一用 TanStack Query。
   - 保持 TypeScript 类型完整；Hooks 位于 `src/hooks/`，Store 位于 `src/store/`。
   - `pnpm lint`（Biome）必须通过后再提交代码。

3. **常用目录**
   - `src/app/page.tsx`：页面布局与主要业务逻辑。
   - `src/components/*`：HeaderBar、MapView、StationPanel 等 UI 组件。
   - `src/lib/api.ts`：API 请求、数据归一化、限流错误封装。
   - `src/store/ui.store.ts`：全局 UI 状态定义。

4. **扩展建议**
   - 新增业务状态：先在 `ui.store.ts` 中声明，再在组件/Hook 中读取。
   - 新的接口：编写 `fetch*` 辅助函数，再用 `useQuery`/`useMutation` 包装。
   - 地图/图表增强：集中在 `MapView` 处理，避免跨组件直接操作第三方实例。

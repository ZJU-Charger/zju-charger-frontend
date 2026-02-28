# How-to-Deploy

## 目录与模块职责

```text
frontend/
├── package.json            # pnpm scripts（dev/build/lint/format）
├── tailwind.config.ts      # Tailwind + shadcn 配置
├── postcss.config.mjs
├── tsconfig.json           # TypeScript & path alias 配置（@ -> src）
└── src/
    ├── app/               # Next App Router：layout/page/not-found/503/504
    ├── components/        # HeaderBar、MapView、StationList、SummaryGrid、ErrorPage 等
    ├── hooks/             # useStations/useProviders/useThemeMode/useWatchlist/useRealtimeLocation
    ├── lib/               # 校区/常量/Storage key、API 客户端、时间&坐标、AMap loader
    └── types/             # API/站点类型声明
```

生产阶段执行 `pnpm build && pnpm start` 即可预览 `.next` 输出，或交由 Vercel/Caddy/Nginx 托管。

Next.js + shadcn 仍保持组件化拆分，部署方式（Node/Vercel/自托管）灵活，新需求可以在各自文件中实现，避免脚本互相耦合。

## 部署提示

- 环境变量：
  - 本地 `frontend/.env.local`

    ```ini
    NEXT_PUBLIC_AMAP_KEY=dev-gaode-key
    NEXT_PUBLIC_API_BASE=http://localhost:8000
    ```

  - 生产（`.env.production` 或部署平台）

    ```ini
    NEXT_PUBLIC_AMAP_KEY=prod-gaode-key
    NEXT_PUBLIC_API_BASE=https://api.philfan.cn/api
    ```

  - 若前后端同域部署，可省略 `NEXT_PUBLIC_API_BASE`，客户端会直接请求 `/api/*`。
- `pnpm dev` 用于本地调试；`pnpm build && pnpm start` 可验证生产输出，随后按需部署（Vercel、自建 Node/Caddy 等）。

### Vercel 部署

1. 将前端代码推送到 GitHub/GitLab（如果使用子模块，请在 Vercel 项目设置里开启 `Git Submodules`）。
2. Vercel 仪表盘中新建项目 → 关联仓库，框架选择 **Next.js**。
3. Build Command 使用 `pnpm build`，Output 设置为默认 `.next` 即可。
4. 在 **Environment Variables** 中添加 `NEXT_PUBLIC_AMAP_KEY`、`NEXT_PUBLIC_API_BASE`（如需）。
5. 保存后 Vercel 会自动构建并生成 preview/production 域名；如果 API 与前端不同源，记得在 FastAPI 端开启 CORS。

### Cloudflare Pages 部署

Cloudflare Pages 可以使用 Next.js 的“适配器”模式，也可以简单地导出静态包（如果不需要 SSR）。推荐步骤：

1. 运行 `pnpm next export` 生成 `out/`（需先设置 `output: "export"` 或单独添加 `next.config.ts` 中的 `exportTrailingSlash` 等设置；纯静态地图场景通常足够）。
2. 在 Cloudflare Pages 控制台创建项目，选择 Git 仓库，**Build command** 设为 `pnpm next build && pnpm next export`，**Build output directory** 填 `out`。
3. 或者若需要 SSR，可使用 `@cloudflare/next-on-pages` 适配器。安装依赖后在 `package.json` 添加：

   ```json
   {
     "scripts": {
       "cf:build": "next-on-pages"
     }
   }
   ```

   然后在 Pages 中把 Build command 改为 `pnpm run cf:build`，output 目录使用 `.vercel/output/static`。
4. 同样在 Pages 项目设置里添加 `NEXT_PUBLIC_AMAP_KEY`、`NEXT_PUBLIC_API_BASE` 环境变量。
5. Cloudflare 默认开启缓存，如需最新数据可在 Workers/Pages Rules 中为 `/api/*` 路径禁用缓存。

## 部署讲解

1. **环境准备**
   - Node.js ≥ 20，使用 `pnpm` 保持与锁文件一致。
   - 设置环境变量（例：`NEXT_PUBLIC_API_BASE` 指向后端聚合接口）。

2. **构建产物**

   ```bash
   pnpm install
   pnpm build
   pnpm start   # 或由 Next.js 导出的 .next/server 交给 PM2、Docker
   ```

3. **运行方式**
   - **PM2**：`pm2 start pnpm --name zju-charger -- start`，可结合 `ecosystem.config`.
   - **Docker/容器**：复制源码到镜像，执行上述 build/start；或使用 `next start` 搭配反向代理(Nginx)。

4. **静态资源与代理**
   - Map/ECharts 静态资源由 Next.js `public/` 提供，部署后保持路径 `/logo.png` 等可访问。
   - 若后端 API 与前端同源，可直接设置 `NEXT_PUBLIC_API_BASE=/api`；若跨域需在网关配置反向代理以避免客户端 CORS。

5. **运行时监控**
   - 关注 `/api/status`、`/api/stations` 实时响应，确保未被限流；必要时调整 `useAutoRefresh` 的刷新间隔。
   - 使用 Vercel、Netlify 等托管时，记得开启 Edge/Serverless 函数日志，便于排查请求异常。

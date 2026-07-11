# AGENTS.md — zju-charger-frontend（浙大充电桩前端）

## 1. 项目定位

- **名称**：ZJU Charger Frontend
- **用途**：校内充电桩查询助手前端——列表、筛选/排序、收藏、自动刷新、实时定位与高德底图可视化
- **域名**：charger.philfan.cn
- **后端**：通过 `NEXT_PUBLIC_API_BASE` 访问 FastAPI 等 API（可同域）

## 2. 技术栈规范

| 层 | 规范 | 当前基准 |
|----|------|----------|
| 包管理 | **pnpm 锁定版本** | `packageManager: pnpm@10.20.0` + `pnpm-lock.yaml` |
| 框架 | Next.js **App Router** + React Compiler | `next@16.2.x`，`reactCompiler: true` |
| UI 库 | React **19** + TypeScript **strict** | `src/` 布局；`@/*` → `src/*` |
| 样式 | **Tailwind CSS v3** + `tailwindcss-animate` | `tailwind.config.ts`（**非** v4） |
| 组件 | **shadcn/ui** style = **`new-york`** + **Radix 分包** | `components.json`；Lucide 图标 |
| 主题 | `next-themes` | Supabase 中性色调向 |
| 数据请求 | **TanStack React Query v5** + 自建 hooks | `src/hooks/`、`src/lib/api.ts` |
| 本地状态 | Zustand（UI 等） | `src/store/` |
| 可视化 | **ECharts 5** + **`echarts-extension-amap`** | 高德底图；Key 环境变量 |
| 质量 | ESLint + **Biome 2.2** format；**pre-commit** | `pnpm lint` / `pnpm format` |
| CI | `.github/workflows/check.yml` | `pnpm lint` + pre-commit |
| 部署 | **OpenNext Cloudflare** + Wrangler 4 | `cf:build` / `cf:deploy`；`open-next.config.ts` |

**硬性约定**

- 与 food/lyrics **不同族**：本仓是 **TW3 + new-york + 可 SSR/Edge（CF）**，不要套用静态 export-only 或 TW4 配置。
- 高德 Key、API Base、Clarity 仅环境变量；`NEXT_PUBLIC_*` 会暴露到浏览器。
- 地图/列表逻辑放 hooks + components，类型放 `src/types`。
- 部署 Cloudflare 必须走项目脚本，勿手写过时 `next export` 流程覆盖 OpenNext。

## 3. 目录结构

```text
.
├── src/
│   ├── app/                 # 路由、layout、错误页
│   ├── components/          # 地图、列表、面板、header、UI
│   ├── hooks/               # 站点数据、定位、刷新、主题、语言等
│   ├── lib/                 # api、amap、geo、time、config
│   ├── store/               # UI store
│   └── types/
├── public/
├── open-next.config.ts
├── wrangler.toml
└── package.json
```

## 4. 环境变量

| 变量 | 说明 |
|------|------|
| `NEXT_PUBLIC_AMAP_KEY` | 高德 Web JS Key（必需，否则地图报错） |
| `NEXT_PUBLIC_API_BASE` | API 源；同域可留空 |
| `NEXT_PUBLIC_CLARITY_PROJECT_ID` | Clarity 分析（可选） |
| `FETCH_INTERVAL` / `NEXT_PUBLIC_FETCH_INTERVAL` | 自动刷新间隔（秒） |

本地：复制/创建 `.env.local` 后填入密钥。切勿把真实 Key 提交进 Git。

## 5. 常用命令

```bash
pnpm install
pnpm dev
pnpm lint
pnpm build
pnpm format          # biome
pre-commit run --all-files
pnpm cf:build        # OpenNext Cloudflare
pnpm cf:preview
pnpm cf:deploy
```

### 提交前质量检查（强制）

```bash
pre-commit install
pnpm lint
pre-commit run --all-files
```

| 检查 | 工具 | 说明 |
|------|------|------|
| ESLint | `pnpm lint` / pre-commit local | `eslint.config.mjs` |
| Format | Biome（`biome.json`，linter 关闭仅 format） | pre-commit `biome-check` |
| CI | Quality Check on `main` | pnpm@10 + lint + pre-commit |

勿默认 `--no-verify`。ESLint 用项目 `pnpm exec`（避免 mirrors-eslint 与 next 冲突）。

## 6. 编辑约定

- UI 与业务组件放在 `src/components/`，数据获取与副作用放在 `src/hooks/` 与 `src/lib/api.ts`。
- 地图样式/站点样式注意 `station-style` 与夜间提示等已有逻辑。
- 最小改动；**提交前必须** `pnpm lint` / pre-commit。
- Next 版本较新，API 以 `node_modules/next` 文档为准。

### 目录文档同步（强制）

**更改本仓库目录/模块时，必须同步更新下列「目录文件」：**

| 变更 | 必更文件 |
|------|----------|
| 增删 `src/app` / `components` / `hooks` / `lib` 等 | 本文件 **「目录结构」** |
| 环境变量新增 | 本文件 **「环境变量」** 表 + `.env` 示例（若有） |
| 工作区级说明 | 上级 `websites/AGENTS.md`（若适用） |

未更新目录文件即视为改动未完成。

## 7. Conventional Commits（必须）

遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```text
<type>(<scope>): <short-description>
```

| Type | 用途 |
|------|------|
| `feat` | 新功能 |
| `fix` | 缺陷修复 |
| `docs` | 文档 |
| `style` | 纯格式 |
| `refactor` | 重构 |
| `perf` | 性能 |
| `test` | 测试 |
| `build` / `ci` / `chore` | 构建、CI、依赖与部署 |

**推荐 scope**：`map`、`stations`、`list`、`watchlist`、`api`、`ui`、`hooks`、`config`、`deploy`、`deps`

**示例**：

```text
feat(stations): add distance sort option
fix(map): correct marker z-index on mobile
perf(hooks): reduce auto-refresh churn
chore(deploy): update wrangler routes
```

## 8. Agent 原则

- 不提交密钥与本地 `.env*`。
- 改 API 契约时同步 `types` 与 hooks。
- 涉及 Cloudflare 输出时用项目内 `cf:*` 脚本验证。

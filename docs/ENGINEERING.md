# 工程标准 / Engineering

门店设备管理系统（weihuan-tawa-app）的技术栈、约定、怎么跑。给设备做归档 + 新店设备清单搭建。

## 技术栈
| 层 | 技术 |
| --- | --- |
| 框架 | Next.js 16 (App Router) + TypeScript |
| UI | Tailwind CSS v4, lucide-react, dnd-kit |
| 数据 | Supabase Postgres，经 Prisma 访问 |
| 文件 | Supabase Storage（规格 PDF / floor plan） |
| 导出 | exceljs（Excel）、jszip（PDF 打包） |
| AI | Google Gemini（从规格 PDF 抽取尺寸） |
| 部署 | Vercel |

## ⚠️ 头号约定
**这不是你熟悉的 Next.js**——本版本有破坏性变更（API/约定/文件结构可能都不同）。写代码前先读 `node_modules/next/dist/docs/` 里对应的指南，注意废弃提示。（见 `AGENTS.md`）

## 怎么跑
```bash
npm install
cp .env.example .env      # 填 Supabase 凭证
npx prisma migrate dev    # 建表
npm run db:seed           # 灌 209 设备 + 3 样板门店 + 上传 PDF 到 Storage
npm run dev               # http://localhost:3000
```
其它脚本：`npm run db:push` / `npm run extract:dimensions`（Gemini 回填尺寸）。

## 数据模型（prisma/schema.prisma）
- `Equipment` — 主设备目录，`masterItemNo` 唯一；含电气/水/气规格字段；`pdfId → Pdf`；`departments` / `departmentItems`。
- `Pdf` — 规格表。**`storagePath`**=Supabase 内路径（首选），`driveUrl`=旧 Google Drive 链接（回退）。`driveId` 唯一、也用作存储文件名。
- `Store` / `StoreItem` — 门店搭建，StoreItem 引用 Equipment 或自定义条目。

## PDF 解析逻辑（重要）
`lib/data.ts` 的 `pdfUrlFor(pdf)`：**有 `storagePath` 就用 Supabase 公网 URL，否则回退 `driveUrl`**。
→ 想彻底不依赖 Drive：保证每个 Pdf 都有 `storagePath`，并把 `driveUrl` 置空。（见 T-001 / GOTCHAS）

## 种子 / 数据资产
- `data/seed/*.json` — equipment / pdfs / stores 种子。`prisma/seed.ts` 消费它们。
- `data/seed/pdfs/<driveId>.pdf` — 本地 PDF，**被 .gitignore 忽略**（上传 Storage 后不入 git）。
- `data/source/` — 原始 Google Sheet 导出（csv/xlsx）。
- `data/extract.py` — 把导出工作簿解析成 seed json。
- 一次性导入脚本：`scripts/import-spec-pdfs.mts`（NAS PDF → Storage → 链接设备 → 去 Drive）。

## 约定
- 改 schema 后 build 会自动 `prisma generate && prisma migrate deploy`（见 package.json `build`）。
- 写 `.mts` 脚本用 `npx tsx` 跑；import 本地 lib 用 `.js` 后缀（ESM）。
- 灌库脚本要**幂等**（upsert，按 `masterItemNo` / `driveId`）。
- ⚠️ `prisma/seed.ts` 的 `seedStores` 会 `deleteMany` 同号门店再重建——会冲掉门店改动。只想改 PDF 时**别**跑全量 `db:seed`，用专用脚本（见 GOTCHAS）。

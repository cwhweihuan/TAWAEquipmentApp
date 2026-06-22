# 任务书 / Backlog

> 计划要做和正在做的事。完成的条目搬到 [CHANGELOG.md](./CHANGELOG.md)。
> 状态：🔜 待办 / 🔄 进行中 / ⏸️ 阻塞 / ✅ 完成(搬走)

---

## 📍 项目当前状态（2026-06-22 收尾快照）

- **线上**：已部署 Vercel 生产（`main` 分支自动部署）；仓库 `github.com/cwhweihuan/TAWAEquipmentApp`，本地与 `origin/main` 同步。
- **规格表**：209 件设备中 **164 件已配规格表**，全部托管 Supabase Storage，**已无任何 Google Drive 依赖**。
- **门店界面**：设备行支持「✏️ 编辑底层 family」联动改；Status 为下拉（New/Existing/(E)Relocate/Remove），生产库旧值已规范化。
- **交接物**：审计 Excel 在 [`docs/设备规格表-待处理清单.xlsx`](./设备规格表-待处理清单.xlsx)（🟢164 / 🟡17 / 🔴28）。
- **唯一未完成的活**：下面的 **T-003**（补 28 缺失 + 抽查 17 旧 PDF）——纯人工找图，不阻塞任何功能。
- **接手入口**：`AGENTS.md` 顶部「接手先读」；工程约定见 [ENGINEERING.md](./ENGINEERING.md)，坑见 [GOTCHAS.md](./GOTCHAS.md)。

---

## 🔄 进行中（无人实时推进，等素材）

### T-003 补齐剩余 28 件缺失 + 抽查 17 件旧规格表
**目标**：把 209 件设备的规格表补到尽量全。
**清单**：全部列在 [`docs/设备规格表-待处理清单.xlsx`](./设备规格表-待处理清单.xlsx)（也可在 app 设备目录里按编号查）。

- 🔴 **缺失 28 件**（公司图库里没有匹配规格表，需手动找图/向供应商索取）：
  `35,48,51,52,54,56,58,59,60,61,63,64,66,72,73,77,81,88,91,119,121,122,137,139,164,174,202,206`
  （多为 冷藏陈列柜 Hill Phoenix/Novum「SEE R. DWGS」类——规格在建筑图里、本无独立 cut sheet；以及个别型号库里确实没有，如 #174 HOBART HL200。）
- 🟡 **待抽查 17 件**（系统里原本有一份旧 PDF，但 AI 复核未确认，建议人工抽查对不对）：
  `37,96,107,183,185,191,192,193,194,195,196,197,198,199,201,204,208`
- **拿到正确 PDF 后怎么补**：建一份 `data/seed/_match.json`（`[{itemNo,file,path}]`，path 指向 PDF 文件），再跑 `npx tsx scripts/import-spec-pdfs.mts`——会上传 Storage、链接设备、清 Drive，幂等。

---

## 🔜 待办（已知但未排期）
- 各门店文件夹（`/Volumes/Work/Wei_Huan/2026-TAWA/` 下 #92 Edmonds / #1695 Portland 等）的 store-specific 设备清单 + floor plan 对应到 `Store`。
- 用 `npm run extract:dimensions`（Gemini）从规格 PDF 回填设备 `dimension` 字段。

# 踩坑记录 / Gotchas

> 已经踩过的坑，避免下次重踩。新坑往上加，带日期。

## 2026-06-17

### G-001 cut-sheet 文件名的编号前缀 ≠ 系统 masterItemNo
NAS 规格表多以 `NNN_厂商-描述_型号.pdf` 命名（如 `030_Killion_Single Check-Stand_KCu3500.pdf`）。
那个 `NNN` 是**某个门店 schedule 的编号，不是本系统的 `masterItemNo`**。低号（约 #1–50）大致重合，#50 之后明显漂移（实测同号文件名与设备描述的词重叠：#1-50=32/50，#101-150=6/50）。
**→ 匹配必须以「厂商/型号/描述」内容为主，编号前缀只当弱提示/tie-break。** 别信编号。

### G-002 “还连着 Google Drive” 的根因
`lib/data.ts: pdfUrlFor()` 在 `storagePath` 为空时**回退 `driveUrl`**。原数据 209 个设备只有 24 个真正下载到 Storage，其余靠 Drive 链接 → 表现为“有些 PDF 还在连 Drive”。
**→ 去 Drive = 给每个 Pdf 灌上 `storagePath` + 把 `driveUrl` 置 null**（`scripts/import-spec-pdfs.mts` 末尾对所有已托管行清 driveUrl）。

### G-003 别用全量 db:seed 来改 PDF
`prisma/seed.ts` 的 `seedStores` 会按门店号 `deleteMany` 再重建——**会清掉用户在 app 里对门店做的改动**。
**→ 只想更新设备 PDF 时，用专用脚本 `scripts/import-spec-pdfs.mts`（只动 Pdf/Equipment，不碰 Store）。**

### G-004 NAS 路径里有双空格 + 中文卷名
主目录是 `.../EQUIPMENT CUT SHEETS  - Master`（`SHEETS` 后**两个空格**），卷挂在 `/Volumes/Work`。脚本里路径要原样照抄、加引号，别手敲省掉空格。

### G-005 data/seed/pdfs 被 gitignore
`/data/seed/pdfs/` 在 .gitignore 里（“已上传 Storage”）。往那放 PDF 不会进 git，也不会撑大仓库——这是放本地种子资产的正确位置。

# 更新日志 / Changelog

> 已经做完并 ship 的事，倒序排列。计划/在做的在 [BACKLOG.md](./BACKLOG.md)。
> 更早的代码级历史见 `git log`。

## 2026-06-21
- ✅ **门店 Status 改下拉**：门店搭建页的 Status(=`proposeNew`) 由自由输入改为下拉 `New / Existing / (E)Relocate / Remove`，与审计 Excel 一致。旧值（`NEW`、`(E) Relocate`）通过 `canonicalStatus()` 大小写/空格不敏感地显示为对应选项，重新选择即写回规范值；无需改数据库。
- ✅ **门店界面联动编辑设备 family**：门店搭建页每个设备行的「删除」左边加了「✏️ 编辑」按钮，点开抽屉直接改底层 `Equipment`（family）资料；保存后该门店内所有引用此设备的行即时联动更新，并 `router.refresh()` 同步目录面板。实现：给 `EquipmentForm` 加 `embedded` 模式复用 + 新增 `components/stores/EquipmentEditDrawer.tsx`。tsc/eslint 通过，门店页冒烟测试 200 正常渲染。
- ✅ **Excel 升级**：`设备规格表-待处理清单.xlsx` 加「状态（下拉选择）」列——下拉 `New / Existing / (E)Relocate / Remove`（数据校验），加宽、浅黄提示填写；两个 sheet 都有。对应 app 里的 Status(=proposeNew) 字段。

## 2026-06-17
- ✅ **T-001 规格 PDF 全量对应**：把公司 NAS cut-sheet 图库对应到 209 件设备。多智能体工作流（209×「Sonnet 判定 + 对抗复核」，395 agent）产出 163 确认 + 1 件（#182）型号精确回收 = **164 件已配**，全部上传 Supabase Storage（`scripts/import-spec-pdfs.mts`，幂等，uploaded=164 linked=164 零失败）。
- ✅ **彻底去除 Google Drive 依赖**：清空全部 `Pdf.driveUrl`，app 的 `pdfUrlFor` 不再回退 Drive。抽查 3 个公网 URL 均 `200 application/pdf`。
- ✅ **T-002 出 Excel**：[`docs/设备规格表-待处理清单.xlsx`](./设备规格表-待处理清单.xlsx)——颜色分级（🟢已配164 / 🟡待抽查17 / 🔴缺失28），含设备信息 + 线索 + 手填备注，给非技术同学看。
- 🚧 余下 28 缺失 + 17 待抽查 转入 [T-003]（见 BACKLOG）。
- 📁 项目纳入 `Ethan-Projects` 统一管理，由 `WeiHuanTAWA` 更名为 `门店设备管理系统`（git 历史保留）。
- 📝 建立 `docs/` 文档体系（CHANGELOG / BACKLOG / ENGINEERING / GOTCHAS）+ `AGENTS.md` 入口指针。

<!--
ship 一条就往上加。建议格式：
## YYYY-MM-DD
- <emoji> <一句话成果>（关联任务 T-00X，如有）
-->

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 使用者協作偏好
- 每次完成使用者要求的修改並通過適當檢查後，直接 commit 並 push，無須再次確認。
- 僅提交本次任務相關檔案，保留使用者其他未提交的變更。
- 使用繁體中文說明進度與結果。

# 接手先读（clear session 后的入口）
- [docs/BACKLOG.md](./docs/BACKLOG.md) — 正在做/要做的任务（**当前活：T-001 规格 PDF 全量对应 + 去 Drive**）
- [docs/CHANGELOG.md](./docs/CHANGELOG.md) — 已 ship 的成果
- [docs/ENGINEERING.md](./docs/ENGINEERING.md) — 技术栈 / 怎么跑 / 数据管线 / 约定
- [docs/GOTCHAS.md](./docs/GOTCHAS.md) — 踩坑记录（看 G-001 编号不可靠、G-002 去 Drive、G-003 别全量 seed）

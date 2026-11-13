# 从现有规格 PDF 补全设备细节

推荐入口：由当前工作区 Codex 阅读 PDF、产出已核对的提取 JSON，再用 `npm run extract:reviewed` 预览/回填；不需要 Gemini 或 OpenAI API key。

旧的 Gemini 批次入口仍可选用：`npm run extract:specs`。只读取 Equipment 已关联的 Supabase PDF，不匹配文件名编号，不跑 seed，不修改 Store/StoreItem。

## 工作区 Codex 阅读（无需 AI API 金钥）

1. 当前线上目录快照存于被 Git 忽略的 `data/extractions/catalog-snapshot.json`。
2. `prepare-spec-review.py` 可将选定设备 PDF 暂存至 `/tmp/tawa-spec-review` 并抽取分页文字：

```bash
PYTHONPATH=/tmp/tawa-pdf-tools python3 scripts/prepare-spec-review.py --item 175
```

PDF 工具在 `/tmp/tawa-pdf-tools`，重建环境时需安装 PyMuPDF。扫描件需转为页图逐页核对。联网下载需要工作区网络权限。

3. Codex 核对厂商/型号与具体参数，保存 JSON 数组，每项含 `equipmentId`、`itemNo`、`pdfUrl`、PDF `sha256` 与 `extraction`（match/reason/evidence）。保存原文和页码后，删除已核对的暂存 PDF、文字和页图，仅保留核对记录及目录快照。
4. 不连数据库即可预览：

```bash
npm run extract:reviewed -- --reviewed data/extractions/reviewed-specs.json
```

5. 在 `.env.local` 安全配置 `DATABASE_URL` 后执行：

```bash
npm run extract:reviewed -- --reviewed data/extractions/reviewed-specs.json --apply
```

回填前验证目录快照、设备身份、关联 PDF URL 和现有字段，资料已变化则标记 stale，不写入。只补空白值或明确占位符（VERIFY、TBD、CUSTOM、SEE R./M./P. DWGS 等）；已有实际规格保留。备注保留原文并以 PDF: 追加已核对说明，重复执行不重复追加。先保存写入意图/原值，再写库；中断时核对 pending_write。该脚本不调用任何 AI API，也不将 ChatGPT/Codex 登录凭证当成 API key。

## Gemini 可选配置与运行

在本机 `.env.local` 或 `.env` 安全配置：`DATABASE_URL`、`NEXT_PUBLIC_SUPABASE_URL`、`GEMINI_API_KEY`。
可选 `GEMINI_MODEL`（默认沿用项目的 `gemini-2.5-flash`）、`SUPABASE_PDF_BUCKET`（默认 `pdfs`）。不需要 Storage service-role key，只读已有公网 PDF。不要把凭证提交或贴到聊天。

```bash
# 先抽取 3 件，生成报告，不写数据库
npm run extract:specs -- --limit 3

# 指定设备；可重复 --item
npm run extract:specs -- --item 175 --item 182

# 补空白字段；全量扫描已有 PDF
npm run extract:specs -- --apply
```

每次重新扫描会调用 Gemini（使用对应账户的 API 配额）。运行前配置好可用模型和金钥。

## 字段对应

| PDF 内容 | 设备字段 |
| --- | --- |
| 设备本体长/宽/深/高，保留尺寸轴与原单位 | `dimension` |
| 电压、相数、频率、电流、功率、电机 HP、电路要求 | `power` |
| 电源接点/插座安装高度或位置 | `height` |
| 插头/插座 NEMA 编号 | `nema` |
| 数据/电话连接 | `dataPhone` |
| 明确注明的冷/热水管径、压力、流量 | `waterCold` / `waterHot` |
| 给水接点标高 | `waterElev` |
| 燃气管径、气种、输入功率、接点标高 | `gasPipe` / `gasBtu` / `gasElev` |
| 排水/地漏/间接排水要求 | `floorSink` |
| 排风 CFM/静压、制冷剂/冷量、散热、蒸汽/压缩空气、净距等 | `remarks`（前缀 Mechanical / Refrigeration 等） |

**注意：`height` 是旧设备 schedule 的电气接点高度，不是设备本体高度。** 不把本体高度灌进这个字段。

## 回填规则与报告

- 每件设备将厂商、型号、描述一起送入 PDF 擷取；型号不匹配或选配不明确时，报告为 `review`，不写入。
- 同 PDF 多型号时不混用参数；不推算、不转换单位、不挑选不明确的选配电压。
- 每个提取字段都须有值、PDF 页码和来源原文；这是模型提供的依据，仍需抽查原 PDF，不代表独立人工验证。
- 仅补 `null`、空白和明确的未核实占位符；不覆盖已有实际规格或 N/A。已有备注保留，追加有来源的 PDF 说明并避免重复。
- 写入时比较 `updatedAt` 与 `pdfId`；有人同时编辑或换 PDF，就跳过为 `stale`。
- 单个 PDF 失败会记录并继续；损坏、超 14 MB、API/连接错误都不写入对应设备。不自动重复请求，避免长时间重试或重复计费。
- 审计报告存于被 Git 忽略的 `data/extractions/specs-*.json`，含原始字段、拟写入值、页码、原文与逐件状态。每次写库之前先落地意图记录，写入后更新状态；若中断时停在 `pending_write`，需先核对数据库再重跑。
- 报告文件未能写入时停止运行；退出码非零表示执行失败或有并发修改待处理，不代表所有条目都未写入。检查报告后用 `--item` 定向重试。

验证：`node --import tsx --test scripts/equipment-specs.test.mts`。

## 网站表单回填（无需 DATABASE_URL）

本次使用正式网站原有编辑表单，不需要 Gemini/OpenAI API key 或数据库密码。

```bash
# 临时浏览器依赖安装在 /tmp，不加入应用依赖
npm install --prefix /tmp/tawa-browser playwright @sparticuz/chromium
# 默认只预览；指定 --apply 才保存
node --import tsx scripts/apply-reviewed-browser.mjs --item 175 --apply
```

保存前核对设备厂商/型号/描述及关联 PDF；保持未编辑表单字段不变。保存后重新载入并逐栏读回确认。每三件重启浏览器以限制 PDF/页面内存。遇不确定写入即停止，检查 pending_write/failed 后定向续跑；浏览器记录的 `updated_verified` 才计为已写入并验证。

## 全量核对范围（2026-11-13）

本次快照共 238 件，其中所有 **202 件附 PDF 的设备均已检查**（包含扫描页图与尺寸图）；36 件无 PDF 不在本次来源核对范围。143 件匹配（部分只提取同系列共有信息），48 件型号/配置不明确，11 件存在型号或用途冲突。不能把 matched 解读为每项规格均已获确认；选配电压、燃气、长度、地区版本仍按逐件备注处理。

最终逐件结果、线上写入状态和页码证据见 [PDF-SPEC-REVIEW-2026-11-13.xlsx](./PDF-SPEC-REVIEW-2026-11-13.xlsx)，完整结构化记录见 [JSON](./PDF-SPEC-REVIEW-2026-11-13.json)。

```bash
# 重建交接报告；任何待写入条目会以非零退出码提示
node --import tsx scripts/export-spec-review.mts
```

`data/extractions` 保留本地完整表单前后值与中断记录，默认不进 Git；提交的交接 JSON/Excel 仅包含设备身份、规格、公开 PDF 来源、校验值和已验证的修改。临时下载 PDF/文字/页图在保存证据后删除；不删除 Supabase 原始 PDF。

PDF 名称副标题使用 `Pdf.filename`，不是自动提取的 PDF 内文标题。设备目录、详情与 Store 行显示小字；目录与 Store 搜寻包含档名并处理大小写、底线与标点。数据库原设备名称及 PDF 文件不重命名。

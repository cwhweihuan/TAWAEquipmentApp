import ExcelJS from "exceljs";
import { getStore } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getStore(id);
  if (!store) return new Response("Not found", { status: 404 });

  const wb = new ExcelJS.Workbook();
  wb.creator = "WeihuanTAWAApp";
  const ws = wb.addWorksheet(`#${store.number}`.slice(0, 31));

  // title
  ws.mergeCells("A1:O1");
  const title = ws.getCell("A1");
  title.value = `${store.name} — Equipment Schedule`;
  title.font = { size: 14, bold: true };
  ws.getRow(1).height = 22;

  const header = [
    "#NO",
    "DEPT ITEM#",
    "ROOM",
    "PROPOSE-NEW",
    "QTY",
    "EQUIPMENT DESCRIPTION",
    "MANUFACTURER",
    "MODEL",
    "SUPPLY BY",
    "INSTALL BY",
    "POWER",
    "NEMA",
    "DATA/PHONE",
    "REMARKS",
    "FLOOR PLAN NO.",
  ];
  ws.addRow(header).eachCell((cell) => {
    cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D54E6" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });

  store.items.forEach((it, i) => {
    const eq = it.equipment;
    const deptCode = eq?.departmentItems
      ? Object.values(eq.departmentItems as Record<string, string>).join(" / ")
      : "";
    ws.addRow([
      i + 1,
      deptCode,
      it.rooms.join(", "),
      it.proposeNew ?? "",
      it.quantity,
      (eq?.description ?? it.description ?? "").toUpperCase(),
      eq?.manufacturer ?? it.manufacturer ?? "",
      eq?.model ?? it.model ?? "",
      eq?.supplyBy ?? "",
      eq?.installBy ?? "",
      eq?.power ?? "",
      eq?.nema ?? "",
      eq?.dataPhone ?? "",
      it.remarks ?? eq?.remarks ?? "",
      it.scheduleNo ?? "",
    ]);
  });

  const widths = [6, 14, 10, 12, 6, 38, 18, 18, 12, 12, 14, 10, 12, 24, 16];
  ws.columns.forEach((col, i) => {
    col.width = widths[i] ?? 12;
  });
  ws.eachRow((row, n) => {
    if (n >= 3) row.eachCell((c) => (c.alignment = { vertical: "middle", wrapText: true }));
  });
  ws.views = [{ state: "frozen", ySplit: 2 }];

  const buf = await wb.xlsx.writeBuffer();
  const fname = `Store-${store.number}-schedule.xlsx`;
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fname}"`,
    },
  });
}

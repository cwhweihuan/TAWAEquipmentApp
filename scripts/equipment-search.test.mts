import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesEquipmentSearch, pdfDisplayName } from "../lib/equipment-search.js";
const item = {
  description: "20 Q MIXER", manufacturer: "GLOBE", model: "SP20", masterItemNo: 175,
  pdfFilename: "180_Globe_Planetary_Mixer_SP20.PDF",
};
test("finds the equipment by a PDF-only title and normalizes filename separators", () => {
  assert.equal(matchesEquipmentSearch(item, "planetary mixer"), true);
  assert.equal(matchesEquipmentSearch(item, "PLANETARY_MIXER"), true);
  assert.equal(matchesEquipmentSearch(item, "Globe SP20"), true);
  assert.equal(matchesEquipmentSearch(item, "175"), true);
  assert.equal(matchesEquipmentSearch(item, "nonexistent mixer"), false);
});
test("supports missing PDFs, Chinese text, and empty queries", () => {
  assert.equal(matchesEquipmentSearch({ ...item, pdfFilename: null }, "mixer"), true);
  assert.equal(matchesEquipmentSearch({ ...item, pdfFilename: null }, "planetary"), false);
  assert.equal(matchesEquipmentSearch(item, ""), true);
  assert.equal(matchesEquipmentSearch({ ...item, pdfFilename: "川島屋_三層展示架.pdf" }, "川島屋 三層"), true);
});
test("PDF display names preserve model numbers and do not modify the original", () => {
  assert.equal(pdfDisplayName(item.pdfFilename), "180 Globe Planetary Mixer SP20");
  assert.equal(item.pdfFilename, "180_Globe_Planetary_Mixer_SP20.PDF");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { extractEquipmentSpecs, parseSpecExtraction, planSpecBackfill } from "../lib/equipment-specs.js";

const valid = () => ({
  match: "matched", reason: "Exact model HL200 appears on page 1",
  evidence: [
    { field: "dimension", value: '19.1"W x 23.2"D x 29"H', page: 1, quote: '19.1 W 23.2 D 29 H' },
    { field: "power", value: "120 V, 1 phase, 60 Hz, 8 A", page: 2, quote: "120/60/1 8 amps" },
    { field: "remarks", value: "Mechanical: minimum 6 in clearance", page: 2, quote: "minimum clearance 6 in" },
  ],
});

test("fills null, empty and whitespace fields, preserving existing specifications", () => {
  const extraction = parseSpecExtraction(valid());
  assert.deepEqual(planSpecBackfill({ dimension: '48"W', power: " ", remarks: "Keep existing note" }, extraction), {
    power: "120 V, 1 phase, 60 Hz, 8 A",
    remarks: "Keep existing note\nPDF: Mechanical: minimum 6 in clearance",
  });
  assert.equal(Object.keys(planSpecBackfill({}, extraction)).length, 3);
  assert.equal(planSpecBackfill({ dimension: "" }, extraction).dimension, extraction.evidence[0].value);
});

test("replaces only explicit schedule placeholders, preserving meaningful nonempty values", () => {
  const extraction = parseSpecExtraction(valid());
  assert.equal(planSpecBackfill({ dimension: "Custom", power: "SEE R. DWGS", remarks: "VERIFY" }, extraction).power, extraction.evidence[1].value);
  assert.equal(planSpecBackfill({ power: "N/A" }, extraction).power, undefined);
  assert.equal(planSpecBackfill({ power: "120-20A" }, extraction).power, undefined);
});

test("appends sourced remarks without deleting existing notes and is idempotent", () => {
  const extraction = parseSpecExtraction(valid());
  const first = planSpecBackfill({ remarks: "Existing drain note" }, extraction);
  assert.match(first.remarks!, /^Existing drain note\nPDF:/);
  assert.equal(planSpecBackfill({ remarks: first.remarks }, extraction).remarks, undefined);
});

test("ambiguous or wrong-model PDFs never produce writes", () => {
  for (const match of ["ambiguous", "mismatch"]) {
    assert.deepEqual(planSpecBackfill({}, parseSpecExtraction({ ...valid(), match })), {});
  }
});

test("rejects unsupported fields, duplicate evidence and unsourced values", () => {
  for (const override of [
    { field: "description" }, { page: 0 }, { page: 1.2 }, { page: "1" },
    { quote: " " }, { value: " " }, { value: "NONE" }, { value: "N/A" },
  ]) {
    assert.throws(() => parseSpecExtraction({ ...valid(), evidence: [{ ...valid().evidence[0], ...override }] }));
  }
  assert.throws(() => parseSpecExtraction({ ...valid(), evidence: [valid().evidence[0], valid().evidence[0]] }));
  assert.throws(() => parseSpecExtraction({ ...valid(), match: "probably" }));
});

test("no applicable facts is a valid no-op", () => {
  assert.deepEqual(planSpecBackfill({}, parseSpecExtraction({ ...valid(), evidence: [] })), {});
});

test("Gemini request carries exact identity, schema and PDF; rejects incomplete output", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-key";
  try {
    let finishReason = "STOP";
    let status = 200;
    globalThis.fetch = async (url, init) => {
      assert.ok(!String(url).includes("test-key"));
      assert.equal(new Headers(init?.headers).get("x-goog-api-key"), "test-key");
      const body = JSON.parse(String(init?.body));
      assert.equal(body.generationConfig.responseMimeType, "application/json");
      assert.match(body.contents[0].parts[1].text, /HL200/);
      assert.match(body.contents[0].parts[1].text, /HOBART/);
      assert.match(body.contents[0].parts[1].text, /NEVER put equipment overall height here/);
      assert.equal(body.contents[0].parts[0].inline_data.mime_type, "application/pdf");
      return new Response(JSON.stringify({ candidates: [{ finishReason, content: { parts: [{ text: JSON.stringify(valid()) }] } }] }), { status });
    };
    const identity = { description: "Mixer", manufacturer: "HOBART", model: "HL200" };
    assert.equal((await extractEquipmentSpecs(new Uint8Array([1]), identity)).evidence.length, 3);
    finishReason = "MAX_TOKENS";
    await assert.rejects(extractEquipmentSpecs(new Uint8Array([1]), identity), /Incomplete/);
    status = 429;
    await assert.rejects(extractEquipmentSpecs(new Uint8Array([1]), identity), /^Error: Gemini HTTP 429$/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  }
});

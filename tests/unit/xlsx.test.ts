import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { buildXlsx, xlsxFilename } from "@/lib/export/xlsx";
import type { TestResult } from "@/lib/contracts/types";

function sampleResult(): TestResult {
  return {
    runId: "run-1",
    media: "image",
    test: "jpeg",
    parameter: 90,
    inputBytes: 1000,
    outputBytes: 800,
    metrics: { mse: 0.5, psnrDb: 51.14, identical: false },
    pcmIdentical: null,
    extractionStatus: "FAIL",
    elapsedMs: 120,
    errorCode: null,
  };
}

describe("XLSX export", () => {
  it("produces a non-empty workbook with the three required sheets and rows", async () => {
    const blob = await buildXlsx({
      media: "image",
      test: "jpeg",
      buildVersion: "0.1.0",
      environment: "test",
      comparisonSource: "stego vs jpeg",
      parameters: { qualities: "90,70,50" },
      rows: [{ ...sampleResult(), filename: "stego.png", mediaMeta: null, messageBytes: 25 }],
    });

    expect(blob.size).toBeGreaterThan(1000);

    const workbook = new ExcelJS.Workbook();
    const buffer = Buffer.from(await blob.arrayBuffer());
    await workbook.xlsx.load(buffer as never);
    expect(workbook.worksheets.map((ws) => ws.name)).toEqual([
      "Metadata",
      "Results",
      "Definitions",
    ]);

    const results = workbook.getWorksheet("Results");
    expect(results).toBeDefined();
    if (!results) return;
    expect(results.rowCount).toBeGreaterThan(1);
    const header = results.getRow(1).values as string[];
    expect(header).toContain("psnr_db");
    expect(header).toContain("pcm_identical");
  });

  it("names the file with media, test and a timestamp", () => {
    const name = xlsxFilename("audio", "flac", new Date("2026-09-24T12:00:00"));
    expect(name).toMatch(/^stego-ae_audio_flac_\d{8}-\d{6}\.xlsx$/);
  });
});

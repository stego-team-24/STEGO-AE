"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/forms/Button";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { MetricCard } from "@/components/analysis/MetricCard";
import { HistogramChart } from "@/components/analysis/HistogramChart";
import { ResultTable, type TableColumn } from "@/components/analysis/ResultTable";
import { ImagePreview } from "@/components/media/MediaPreview";
import {
  analyzeImage,
  analyzeAudio,
  compressAudio,
  compressAudioArtifact,
  compressImage,
  compressImageArtifact,
  extractAudio,
  extractImage,
  fetchMap,
  restoreAudioArtifact,
  restoreImageArtifact,
  type MediaArtifact,
  type MapSummary,
} from "@/lib/api/client";
import { buildXlsx, saveBlob, xlsxFilename, type ExportRow } from "@/lib/export/xlsx";
import type { AudioAnalyzeResponse, Metrics, TestKind, TestResult } from "@/lib/contracts/types";

const IMAGE_FORMATS = ["jpeg", "webp"] as const;
const AUDIO_FORMATS = ["flac", "mp3"] as const;
type ImageFormat = (typeof IMAGE_FORMATS)[number];
type AudioFormat = (typeof AUDIO_FORMATS)[number];
function resultParameter(format: ImageFormat | AudioFormat) {
  return format === "jpeg" || format === "webp" ? 80 : format === "mp3" ? 128 : 5;
}
function artifactFile(artifact: MediaArtifact) {
  const binary = atob(artifact.base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], artifact.name, { type: artifact.mime });
}

function attackColumns(media: "image" | "audio"): TableColumn[] {
  return [
    { key: "parameter", header: "Format" },
    { key: "sizeRatio", header: "Size ratio" },
    { key: "mse", header: "MSE" },
    { key: "psnr", header: "PSNR" },
    { key: "pcmIdentical", header: media === "image" ? "Extraction" : "PCM identical" },
    { key: "status", header: "Status" },
    { key: "elapsed", header: "Elapsed (ms)" },
  ];
}

export function ForensicConsole() {
  const [maps, setMaps] = useState<MapSummary[]>([]);
  const [assetMapId, setAssetMapId] = useState("");
  const [assetClues, setAssetClues] = useState<Awaited<ReturnType<typeof fetchMap>>["clues"]>([]);
  const [pairClues, setPairClues] = useState<Awaited<ReturnType<typeof fetchMap>>["clues"]>([]);
  const [assetLoading, setAssetLoading] = useState(false);
  const [attackFile, setAttackFile] = useState<File | null>(null);
  const [attackPass, setAttackPass] = useState("");
  const [attackShowPass, setAttackShowPass] = useState(false);
  const [attackRows, setAttackRows] = useState<TestResult[]>([]);
  const [attackError, setAttackError] = useState<string | null>(null);
  const [attackRunning, setAttackRunning] = useState(false);
  const [baselineText, setBaselineText] = useState<string | null>(null);
  const [compressedFile, setCompressedFile] = useState<File | null>(null);
  const [compressedPlaybackFile, setCompressedPlaybackFile] = useState<File | null>(null);
  const [restoredFile, setRestoredFile] = useState<File | null>(null);
  const [restoredMetrics, setRestoredMetrics] = useState<Metrics | null>(null);
  const [restoredPcmIdentical, setRestoredPcmIdentical] = useState<boolean | null>(null);
  const [finalText, setFinalText] = useState<string | null>(null);
  const [attackFormat, setAttackFormat] = useState<ImageFormat | AudioFormat>("jpeg");
  const [sourcePreview, setSourcePreview] = useState("");
  const [compressedPreview, setCompressedPreview] = useState("");
  const [compressedPlaybackPreview, setCompressedPlaybackPreview] = useState("");
  const [restoredPreview, setRestoredPreview] = useState("");
  const attackStartedAt = useRef(0);

  useEffect(() => {
    fetch("/api/maps").then((response) => response.json()).then((data: { maps?: MapSummary[] }) => setMaps(data.maps ?? [])).catch(() => setMaps([]));
  }, []);

  const loadMapAssets = async (mapId: string) => {
    setAssetMapId(mapId);
    setAssetClues([]);
    if (!mapId) return;
    setAssetLoading(true);
    try {
      const detail = await fetchMap(mapId);
      setAssetClues(detail.clues);
    } catch (err) {
      setAttackError(err instanceof Error ? err.message : "Could not load map assets.");
    } finally {
      setAssetLoading(false);
    }
  };

  const selectMapAsset = async (clueId: string) => {
    const clue = assetClues.find((item) => item.id === clueId);
    if (!clue) return;
    setAttackError(null);
    setAttackRows([]);
    try {
      const response = await fetch(clue.mediaUrl);
      if (!response.ok) throw new Error("Could not download this map asset.");
      const blob = await response.blob();
      const extension = clue.mediaType === "IMAGE" ? "png" : "wav";
      setAttackFile(new File([blob], `clue-${clue.nodeOrder + 1}.${extension}`, { type: clue.mediaType === "IMAGE" ? "image/png" : "audio/wav" }));
      setAttackFormat(clue.mediaType === "IMAGE" ? "jpeg" : "flac");
      setAttackPass(clue.passphrase);
      setBaselineText(null);
      setCompressedFile(null);
      setRestoredFile(null);
      setRestoredMetrics(null);
      setRestoredPcmIdentical(null);
      setFinalText(null);
      setAttackRows([]);
    } catch (err) {
      setAttackError(err instanceof Error ? err.message : "Could not load map asset.");
    }
  };
  // Pair analysis state
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [stegoFile, setStegoFile] = useState<File | null>(null);
  const [pairResult, setPairResult] = useState<Awaited<ReturnType<typeof analyzeImage>> | null>(null);
  const [audioPairResult, setAudioPairResult] = useState<AudioAnalyzeResponse | null>(null);
  const [pairMedia, setPairMedia] = useState<"IMAGE" | "AUDIO">("IMAGE");
  const [pairAttackFormat, setPairAttackFormat] = useState<ImageFormat | AudioFormat | "original">("original");
  const [pairRunning, setPairRunning] = useState(false);
  const [audioCoverFile, setAudioCoverFile] = useState<File | null>(null);
  const [audioStegoFile, setAudioStegoFile] = useState<File | null>(null);
  const [audioCoverPreview, setAudioCoverPreview] = useState("");
  const [audioStegoPreview, setAudioStegoPreview] = useState("");
  const [pairError, setPairError] = useState<string | null>(null);
  const [pairFullscreen, setPairFullscreen] = useState(false);
  const [pairSourceMap, setPairSourceMap] = useState("");
  const [pairCoverClue, setPairCoverClue] = useState("");
  const [pairCoverPreview, setPairCoverPreview] = useState("");
  const [pairStegoPreview, setPairStegoPreview] = useState("");

  // Batch state
  const [batchAssetIds, setBatchAssetIds] = useState<string[]>([]);
  const [batchPassphrases, setBatchPassphrases] = useState<Record<string, string>>({});
  const [batchRows, setBatchRows] = useState<BatchAssetRow[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [auditMapId, setAuditMapId] = useState("");
  const [auditClues, setAuditClues] = useState<Awaited<ReturnType<typeof fetchMap>>["clues"]>([]);
  const [auditSource, setAuditSource] = useState<"map" | "upload">("map");
  const [auditUploads, setAuditUploads] = useState<File[]>([]);
  const [auditShowPass, setAuditShowPass] = useState<Record<string, boolean>>({});

  const isImageAttack = attackFile?.type === "image/png";

  useEffect(() => {
    if (!attackFile) return;
    const url = URL.createObjectURL(attackFile);
    const timer = window.setTimeout(() => setSourcePreview(url), 0);
    return () => { window.clearTimeout(timer); URL.revokeObjectURL(url); };
  }, [attackFile]);
  useEffect(() => {
    if (!coverFile) return;
    const url = URL.createObjectURL(coverFile);
    const timer = window.setTimeout(() => setPairCoverPreview(url), 0);
    return () => { window.clearTimeout(timer); URL.revokeObjectURL(url); };
  }, [coverFile]);
  useEffect(() => {
    if (!stegoFile) return;
    const url = URL.createObjectURL(stegoFile);
    const timer = window.setTimeout(() => setPairStegoPreview(url), 0);
    return () => { window.clearTimeout(timer); URL.revokeObjectURL(url); };
  }, [stegoFile]);
  useEffect(() => {
    if (!audioCoverFile) return;
    const url = URL.createObjectURL(audioCoverFile);
    const timer = window.setTimeout(() => setAudioCoverPreview(url), 0);
    return () => { window.clearTimeout(timer); URL.revokeObjectURL(url); };
  }, [audioCoverFile]);
  useEffect(() => {
    if (!audioStegoFile) return;
    const url = URL.createObjectURL(audioStegoFile);
    const timer = window.setTimeout(() => setAudioStegoPreview(url), 0);
    return () => { window.clearTimeout(timer); URL.revokeObjectURL(url); };
  }, [audioStegoFile]);
  useEffect(() => {
    if (!compressedFile) return;
    const url = URL.createObjectURL(compressedFile);
    const timer = window.setTimeout(() => setCompressedPreview(url), 0);
    return () => { window.clearTimeout(timer); URL.revokeObjectURL(url); };
  }, [compressedFile]);
  useEffect(() => {
    if (!compressedPlaybackFile) return;
    const url = URL.createObjectURL(compressedPlaybackFile);
    const timer = window.setTimeout(() => setCompressedPlaybackPreview(url), 0);
    return () => { window.clearTimeout(timer); URL.revokeObjectURL(url); };
  }, [compressedPlaybackFile]);
  useEffect(() => {
    if (!restoredFile) return;
    const url = URL.createObjectURL(restoredFile);
    const timer = window.setTimeout(() => setRestoredPreview(url), 0);
    return () => { window.clearTimeout(timer); URL.revokeObjectURL(url); };
  }, [restoredFile]);

  const checkBaseline = async () => {
    if (!attackFile || attackPass.length < 12) return;
    setAttackRunning(true);
    setAttackError(null);
    attackStartedAt.current = performance.now();
    try {
      const baseline = isImageAttack
        ? await extractImage(attackFile, attackPass)
        : await extractAudio(attackFile, attackPass);
      setBaselineText(baseline.text);
    } catch (err) {
      setBaselineText(null);
      setAttackError(err instanceof Error ? err.message : "Original media could not be decrypted.");
    } finally {
      setAttackRunning(false);
    }
  };

  const compressSource = async () => {
    if (!attackFile) return;
    setAttackRunning(true);
    setAttackError(null);
    setCompressedFile(null);
    setRestoredFile(null);
    setRestoredMetrics(null);
    setRestoredPcmIdentical(null);
    setFinalText(null);
    setAttackRows([]);
    try {
      if (isImageAttack) {
        const result = await compressImageArtifact(attackFile, attackFormat as ImageFormat);
        setCompressedFile(artifactFile(result.artifact));
        setCompressedPlaybackFile(null);
      } else {
        const result = await compressAudioArtifact(attackFile, attackFormat as AudioFormat);
        setCompressedFile(artifactFile(result.artifact));
        setCompressedPlaybackFile(artifactFile(result.playback));
      }
    } catch (err) {
      setAttackError(err instanceof Error ? err.message : "Compression failed.");
    } finally {
      setAttackRunning(false);
    }
  };

  const restoreSource = async () => {
    if (!attackFile || !compressedFile) return;
    setAttackRunning(true);
    setAttackError(null);
    setRestoredFile(null);
    setFinalText(null);
    try {
      if (isImageAttack) {
        const result = await restoreImageArtifact(compressedFile, attackFile);
        setRestoredFile(artifactFile(result.artifact));
        setRestoredMetrics(result.metrics);
        setRestoredPcmIdentical(null);
      } else {
        const result = await restoreAudioArtifact(compressedFile, attackFile);
        setRestoredFile(artifactFile(result.artifact));
        setRestoredMetrics(result.metrics);
        setRestoredPcmIdentical(result.pcmIdentical);
      }
    } catch (err) {
      setAttackError(err instanceof Error ? err.message : "Format restoration failed.");
    } finally {
      setAttackRunning(false);
    }
  };

  const decryptRestored = async () => {
    if (!restoredFile || !attackFile) return;
    setAttackRunning(true);
    setAttackError(null);
    try {
      const result = isImageAttack
        ? await extractImage(restoredFile, attackPass)
        : await extractAudio(restoredFile, attackPass);
      setFinalText(result.text);
      setAttackRows((previous) => [...previous, {
        runId: crypto.randomUUID(),
        media: isImageAttack ? "image" : "audio",
        test: attackFormat,
        parameter: resultParameter(attackFormat),
        inputBytes: attackFile.size,
        outputBytes: compressedFile?.size ?? null,
        metrics: restoredMetrics,
        pcmIdentical: restoredPcmIdentical,
        extractionStatus: "PASS",
        elapsedMs: Math.round(performance.now() - attackStartedAt.current),
        errorCode: null,
      }]);
    } catch (err) {
      setFinalText(null);
      setAttackError(err instanceof Error ? `Restored file could not decrypt the message: ${err.message}` : "Restored file could not decrypt the message.");
      setAttackRows((previous) => [...previous, {
        runId: crypto.randomUUID(), media: isImageAttack ? "image" : "audio", test: attackFormat,
        parameter: resultParameter(attackFormat), inputBytes: attackFile.size, outputBytes: compressedFile?.size ?? null,
        metrics: restoredMetrics, pcmIdentical: restoredPcmIdentical, extractionStatus: "FAIL",
        elapsedMs: Math.round(performance.now() - attackStartedAt.current), errorCode: "DECRYPT_FAILED",
      }]);
    } finally {
      setAttackRunning(false);
    }
  };

  const runPair = async () => {
    if (!coverFile || !stegoFile) return;
    setPairError(null);
    setPairResult(null);
    setAudioPairResult(null);
    setPairRunning(true);
    try {
      let comparedStego = stegoFile;
      if (pairAttackFormat === "jpeg" || pairAttackFormat === "webp") {
        const compressed = await compressImageArtifact(stegoFile, pairAttackFormat);
        const restored = await restoreImageArtifact(artifactFile(compressed.artifact), stegoFile);
        comparedStego = artifactFile(restored.artifact);
      }
      setPairResult(await analyzeImage(coverFile, comparedStego));
    } catch (err) {
      setPairError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setPairRunning(false);
    }
  };

  const runAudioPair = async () => {
    if (!audioCoverFile || !audioStegoFile) return;
    setPairError(null);
    setPairResult(null);
    setAudioPairResult(null);
    setPairRunning(true);
    try {
      let comparedStego = audioStegoFile;
      if (pairAttackFormat === "flac" || pairAttackFormat === "mp3") {
        const compressed = await compressAudioArtifact(audioStegoFile, pairAttackFormat);
        const restored = await restoreAudioArtifact(artifactFile(compressed.artifact), audioStegoFile);
        comparedStego = artifactFile(restored.artifact);
      }
      setAudioPairResult(await analyzeAudio(audioCoverFile, comparedStego));
    } catch (err) {
      setPairError(err instanceof Error ? err.message : "Audio analysis failed.");
    } finally {
      setPairRunning(false);
    }
  };

  const choosePairAsset = async (clueId: string) => {
    const clue = pairClues.find((item) => item.id === clueId && item.mediaType === pairMedia);
    if (!clue) return;
    try {
      const [coverResponse, stegoResponse] = await Promise.all([fetch(clue.coverMediaUrl), fetch(clue.mediaUrl)]);
      if (!coverResponse.ok || !stegoResponse.ok) throw new Error("Could not load this palace image pair.");
      const [coverBlob, stegoBlob] = await Promise.all([coverResponse.blob(), stegoResponse.blob()]);
      const image = pairMedia === "IMAGE";
      const extension = image ? "png" : "wav";
      const mime = image ? "image/png" : "audio/wav";
      const rawFile = new File([coverBlob], `cover-clue-${clue.nodeOrder + 1}.${extension}`, { type: mime });
      const embeddedFile = new File([stegoBlob], `stego-clue-${clue.nodeOrder + 1}.${extension}`, { type: mime });
      if (image) { setCoverFile(rawFile); setStegoFile(embeddedFile); }
      else { setAudioCoverFile(rawFile); setAudioStegoFile(embeddedFile); }
      setPairCoverClue(clueId);
      setPairResult(null);
      setAudioPairResult(null);
    } catch (err) {
      setPairError(err instanceof Error ? err.message : "Could not load palace image.");
    }
  };

  const runBatch = async () => {
    const sourceClues = auditSource === "map" ? auditClues.filter((clue) => batchAssetIds.includes(clue.id)) : [];
    const selected = auditSource === "map"
      ? sourceClues.map((clue) => ({ id: clue.id, media: clue.mediaType === "IMAGE" ? "image" as const : "audio" as const, passphrase: batchPassphrases[clue.id] ?? clue.passphrase, filename: `clue-${clue.nodeOrder + 1}`, file: undefined as File | undefined, clue }))
      : auditUploads.map((file, index) => ({ id: `${file.name}:${file.size}:${index}`, media: file.type === "image/png" ? "image" as const : "audio" as const, passphrase: batchPassphrases[`${file.name}:${file.size}:${index}`] ?? "", filename: file.name, file, clue: null }));
    if (selected.length === 0 || selected.some((asset) => asset.passphrase.length < 12)) return;
    setBatchRunning(true);
    setBatchRows([]);
    const rows: BatchAssetRow[] = [];
    for (const asset of selected) {
      const media = asset.media;
      let file: File;
      try {
        if (asset.file) file = asset.file;
        else {
          const response = await fetch(asset.clue!.mediaUrl);
          if (!response.ok) throw new Error("Asset unavailable");
          const blob = await response.blob();
          file = new File([blob], `${asset.filename}.${media === "image" ? "png" : "wav"}`, { type: media === "image" ? "image/png" : "audio/wav" });
        }
      } catch (error) {
        rows.push({ filename: asset.filename, media, format: "unavailable", parameter: 0, result: null, status: "ERROR", error: error instanceof Error ? error.message : "Asset unavailable" });
        continue;
      }
      for (const parameter of media === "image" ? IMAGE_FORMATS : AUDIO_FORMATS) {
        try {
          const result = media === "image"
            ? await compressImage(file, asset.passphrase, parameter as ImageFormat)
            : await compressAudio(file, asset.passphrase, parameter as AudioFormat);
          rows.push({ filename: file.name, media, format: parameter, parameter: result.parameter ?? resultParameter(parameter), result, status: result.extractionStatus === "PASS" ? "PASS" : result.extractionStatus === "FAIL" ? "FAIL" : "ERROR" });
        } catch (error) {
          rows.push({ filename: file.name, media, format: parameter, parameter: resultParameter(parameter), result: null, status: "ERROR", error: error instanceof Error ? error.message : "Attack failed" });
        }
      }
    }
    setBatchRows(rows);
    setBatchRunning(false);
  };

  const exportAttack = async () => {
    const blob = await buildXlsx({
      media: isImageAttack ? "image" : "audio",
      test: attackFormat,
      buildVersion: "0.1.0",
      environment: "demo",
      comparisonSource: `stego tested after ${attackFormat.toUpperCase()} compression and restoration`,
      parameters: { format: attackFormat, setting: resultParameter(attackFormat), passphrase: null },
      rows: attackRows.map((row) => ({
        ...row,
        filename: attackFile?.name ?? null,
        compressedFilename: compressedFile?.name ?? null,
        compressedBytes: compressedFile?.size ?? row.outputBytes,
        restoredFilename: restoredFile?.name ?? null,
        restoredBytes: restoredFile?.size ?? null,
        mediaMeta: restoredMetrics ? `MSE ${restoredMetrics.mse.toFixed(6)} · PSNR ${restoredMetrics.psnrDb == null ? "INF" : restoredMetrics.psnrDb.toFixed(2)} dB` : null,
      })),
    });
    saveBlob(blob, xlsxFilename(isImageAttack ? "image" : "audio", attackFormat));
  };

  const exportBatch = async () => {
    const formats = [...new Set(batchRows.map((row) => row.format).filter((format) => format !== "unavailable"))] as Array<ImageFormat | AudioFormat>;
    for (const format of formats) {
      const media = format === "jpeg" || format === "webp" ? "image" : "audio";
      const selectedRows = batchRows.filter((row) => row.format === format);
      const rows: ExportRow[] = selectedRows.map((row) => ({
        ...(row.result ?? {
          runId: `${row.filename}-error-${row.format}`,
          media: row.media,
          test: row.format === "unavailable" ? (row.media === "image" ? "jpeg" : "flac") : row.format as TestKind,
          parameter: row.parameter,
          inputBytes: 0,
          outputBytes: null,
          metrics: null,
          pcmIdentical: null,
          extractionStatus: "ERROR",
          elapsedMs: 0,
          errorCode: row.error ?? "AUDIT_ERROR",
        }),
        filename: row.filename,
        compressedFilename: row.result ? `${row.filename.replace(/\.[^.]+$/, "")}.${row.format === "jpeg" ? "jpg" : row.format}` : null,
        compressedBytes: row.result?.outputBytes ?? null,
        mediaMeta: row.result ? `Format ${row.format.toUpperCase()} · setting ${row.parameter}; extraction ${row.status}; output ${row.result.outputBytes ?? "N/A"} bytes` : row.error ?? null,
      }));
      const test = format;
      const blob = await buildXlsx({
        media,
        test,
        buildVersion: "0.1.0",
        environment: "demo",
        comparisonSource: "palace media tested with selected compression format, followed by extraction",
        parameters: { selectedAssets: selectedRows.length, format, setting: resultParameter(format) },
        rows,
      });
      saveBlob(blob, xlsxFilename(media, test));
    }
  };

  return (
    <div className="space-y-8">
      {/* Manual attack */}
      <Section title="Manual test console" subtitle="Apply a lossy/lossless attack to a stego media and verify extraction.">
        <div className="mb-3 grid gap-3 min-[900px]:grid-cols-2">
          <select value={assetMapId} onChange={(event) => void loadMapAssets(event.target.value)} className="rounded-control border border-line bg-canvas px-4 py-3 text-[13px] text-ink">
            <option value="">Choose an asset from a palace…</option>
            {maps.map((map) => <option key={map.id} value={map.id}>{map.title} · {map.clueCount} assets</option>)}
          </select>
          <select disabled={!assetMapId || assetLoading} defaultValue="" onChange={(event) => void selectMapAsset(event.target.value)} className="rounded-control border border-line bg-canvas px-4 py-3 text-[13px] text-ink disabled:opacity-50">
            <option value="">{assetLoading ? "Loading palace assets…" : "Select a clue asset…"}</option>
            {assetClues.map((clue, index) => <option key={clue.id} value={clue.id}>Clue {index + 1} · {clue.mediaType}</option>)}
          </select>
        </div>
        <div className="grid gap-3 min-[900px]:grid-cols-2">
          <label className="inline-flex min-h-[44px] cursor-pointer items-center rounded-control border border-line px-4 text-[13px] hover:bg-raised">
            {attackFile ? attackFile.name : "Upload stego PNG or WAV"}
            <input
              type="file"
              accept="image/png,audio/wav"
              className="hidden"
              onChange={(event) => {
                setAttackFile(event.target.files?.[0] ?? null);
                setAttackPass("");
                setAttackRows([]);
                setBaselineText(null);
                setCompressedFile(null);
                setCompressedPlaybackFile(null);
                setRestoredFile(null);
                setRestoredMetrics(null);
                setRestoredPcmIdentical(null);
                setFinalText(null);
                setAttackError(null);
                setAttackFormat(event.target.files?.[0]?.type === "image/png" ? "jpeg" : "flac");
                event.target.value = "";
              }}
            />
          </label>
          <div className="flex gap-2"><input type={attackShowPass ? "text" : "password"} value={attackPass} onChange={(event) => setAttackPass(event.target.value)} placeholder="Passphrase (12+ chars)" className="min-w-0 flex-1 rounded-control border border-line bg-canvas px-4 py-3 text-ink placeholder:text-muted" /><button type="button" onClick={() => setAttackShowPass((show) => !show)} className="rounded-control border border-line px-3 text-[12px] text-muted">{attackShowPass ? "Hide" : "Show"}</button></div>
        </div>

        {attackError ? <div className="mt-3"><ErrorBanner message={attackError} /></div> : null}
        {attackFile ? <StagePreview title="Original file · preserved" file={attackFile} src={sourcePreview} /> : null}
        <div className="mt-4 space-y-4">
          <StageStep number="1" title="Check original decryption">
            <p className="mb-2 text-[12px] text-muted">Check the unmodified file first to establish the baseline.</p>
            <Button disabled={!attackFile || attackPass.length < 12 || attackRunning} onClick={checkBaseline}>{attackRunning ? "Checking…" : "Decrypt original"}</Button>
            {baselineText !== null ? <p className="mt-3 rounded-control border border-success/30 bg-success/5 p-3 text-[12px] text-success">Baseline: PASS · {baselineText}</p> : null}
          </StageStep>
          <StageStep number="2" title={`Compress to ${attackFormat.toUpperCase()}`}>
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-[12px] text-muted">Compression format
                <select value={attackFormat} onChange={(event) => { const format = event.target.value as ImageFormat | AudioFormat; setAttackFormat(format); setCompressedFile(null); setCompressedPlaybackFile(null); setRestoredFile(null); setRestoredMetrics(null); setRestoredPcmIdentical(null); setFinalText(null); setAttackRows([]); }} className="ml-2 rounded-control border border-line bg-canvas px-3 py-2 text-ink">
                  {(isImageAttack ? IMAGE_FORMATS : AUDIO_FORMATS).map((format) => <option key={format} value={format}>{format.toUpperCase()}</option>)}
                </select>
              </label>
              <Button disabled={!attackFile || baselineText === null || attackRunning} onClick={compressSource}>{attackRunning ? "Compressing…" : `Compress ${attackFormat.toUpperCase()}`}</Button>
            </div>
            {compressedFile ? <StagePreview title="Compressed output · original kept above" file={compressedFile} src={compressedPreview} playbackSrc={compressedPlaybackPreview || undefined} /> : null}
          </StageStep>
          <StageStep number="3" title={isImageAttack ? "Restore to PNG" : "Restore to WAV"}>
            <Button disabled={!compressedFile || attackRunning} onClick={restoreSource}>{attackRunning ? "Restoring…" : `Restore ${isImageAttack ? "PNG" : "WAV"}`}</Button>
            {restoredFile ? <StagePreview title="Restored output" file={restoredFile} src={restoredPreview} /> : null}
            {restoredMetrics ? <p className="mt-2 font-mono text-[11px] text-muted">MSE {restoredMetrics.mse.toFixed(6)} · PSNR {restoredMetrics.psnrDb == null ? "∞" : `${restoredMetrics.psnrDb.toFixed(2)} dB`}{restoredPcmIdentical === null ? "" : ` · PCM identical: ${restoredPcmIdentical ? "yes" : "no"}`}</p> : null}
          </StageStep>
          <StageStep number="4" title="Decrypt restored file">
            <Button disabled={!restoredFile || attackPass.length < 12 || attackRunning} onClick={decryptRestored}>{attackRunning ? "Decrypting…" : "Decrypt restored media"}</Button>
            {finalText ? <p className="mt-3 rounded-control border border-success/30 bg-success/5 p-3 text-[12px] text-success">Extraction: PASS · {finalText}</p> : null}
            {attackRows.length > 0 ? <div className="mt-3 flex flex-wrap gap-3"><Button variant="secondary" onClick={exportAttack}>Export XLSX report</Button>{restoredFile ? <a href={restoredPreview} download={restoredFile.name} className="inline-flex min-h-[44px] items-center rounded-control border border-line px-4 text-[12px] text-ink">Download restored file</a> : null}</div> : null}
          </StageStep>
        </div>

        {attackRows.length > 0 ? (
          <div className="mt-3">
            <ResultTable
              columns={attackColumns(isImageAttack ? "image" : "audio")}
              rows={attackRows.map((r) => {
                const ratio = r.outputBytes != null ? (r.outputBytes / r.inputBytes).toFixed(3) : "N/A";
                return {
                  parameter: r.test.toUpperCase(),
                  sizeRatio: ratio,
                  mse: r.metrics ? r.metrics.mse.toFixed(6) : "N/A",
                  psnr: r.metrics ? (r.metrics.psnrDb == null ? "INF" : `${r.metrics.psnrDb.toFixed(2)} dB`) : "N/A",
                  pcmIdentical: isImageAttack
                    ? r.extractionStatus
                    : r.pcmIdentical == null
                      ? "N/A"
                      : r.pcmIdentical
                        ? "TRUE"
                        : "FALSE",
                  status: r.extractionStatus === "PASS" ? "PASS" : r.extractionStatus === "FAIL" ? "FAIL" : "ERROR",
                  elapsed: r.elapsedMs,
                };
              })}
            />
          </div>
        ) : null}
      </Section>

      <Section title="Pair analysis" subtitle="Compare raw and stego image or audio assets, from a palace clue or local files.">
        <div className="mb-3 grid gap-3 min-[900px]:grid-cols-4">
          <select value={pairMedia} onChange={(event) => { setPairMedia(event.target.value as "IMAGE" | "AUDIO"); setPairAttackFormat("original"); setPairCoverClue(""); setCoverFile(null); setStegoFile(null); setAudioCoverFile(null); setAudioStegoFile(null); setPairResult(null); setAudioPairResult(null); }} className="rounded-control border border-line bg-canvas px-3 py-2 text-[12px] text-ink"><option value="IMAGE">Image analysis</option><option value="AUDIO">Audio analysis</option></select>
              <select value={pairSourceMap} onChange={(event) => { const id = event.target.value; setPairSourceMap(id); setPairCoverClue(""); setPairClues([]); setCoverFile(null); setStegoFile(null); setAudioCoverFile(null); setAudioStegoFile(null); setPairResult(null); setAudioPairResult(null); if (id) void fetchMap(id).then((map) => setPairClues(map.clues)).catch((err) => setPairError(err instanceof Error ? err.message : "Could not load map assets.")); }} className="rounded-control border border-line bg-canvas px-3 py-2 text-[12px] text-ink">
            <option value="">Choose palace map…</option>
            {maps.map((map) => <option key={map.id} value={map.id}>{map.title}</option>)}
          </select>
          <select disabled={!pairSourceMap} value={pairCoverClue} onChange={(event) => { setPairCoverClue(event.target.value); void choosePairAsset(event.target.value); }} className="rounded-control border border-line bg-canvas px-3 py-2 text-[12px] text-ink disabled:opacity-50">
            <option value="">Select one image clue (raw + stego paired)…</option>
            {pairClues.filter((clue) => clue.mediaType === pairMedia).map((clue, i) => <option key={clue.id} value={clue.id}>Clue {i + 1} · paired {pairMedia.toLowerCase()} files</option>)}
          </select>
          <select value={pairAttackFormat} onChange={(event) => setPairAttackFormat(event.target.value as ImageFormat | AudioFormat | "original")} className="rounded-control border border-line bg-canvas px-3 py-2 text-[12px] text-ink">
            <option value="original">Compare original stego</option>
            {(pairMedia === "IMAGE" ? IMAGE_FORMATS : AUDIO_FORMATS).map((format) => <option key={format} value={format}>After {format.toUpperCase()}</option>)}
          </select>
        </div>
        <p className="mb-3 text-center font-mono text-[10px] uppercase text-muted">Or upload a pair</p>
        {pairMedia === "IMAGE" ? <div className="grid gap-3 min-[900px]:grid-cols-2">
          <label className="inline-flex min-h-[44px] cursor-pointer items-center rounded-control border border-line px-4 text-[13px] hover:bg-raised">
            {coverFile ? coverFile.name : "Choose cover PNG"}
            <input
              type="file"
              accept="image/png"
              className="hidden"
              onChange={(event) => { setCoverFile(event.target.files?.[0] ?? null); setPairCoverClue(""); setPairResult(null); }}
            />
          </label>
          <label className="inline-flex min-h-[44px] cursor-pointer items-center rounded-control border border-line px-4 text-[13px] hover:bg-raised">
            {stegoFile ? stegoFile.name : "Choose stego PNG"}
            <input
              type="file"
              accept="image/png"
              className="hidden"
              onChange={(event) => { setStegoFile(event.target.files?.[0] ?? null); setPairCoverClue(""); setPairResult(null); }}
            />
          </label>
        </div> : <div className="grid gap-3 min-[900px]:grid-cols-2">
          <label className="inline-flex min-h-[44px] cursor-pointer items-center rounded-control border border-line px-4 text-[13px] hover:bg-raised">{audioCoverFile?.name ?? "Choose raw cover WAV"}<input type="file" accept="audio/wav" className="hidden" onChange={(event) => { setAudioCoverFile(event.target.files?.[0] ?? null); setPairCoverClue(""); setAudioPairResult(null); }} /></label>
          <label className="inline-flex min-h-[44px] cursor-pointer items-center rounded-control border border-line px-4 text-[13px] hover:bg-raised">{audioStegoFile?.name ?? "Choose stego WAV"}<input type="file" accept="audio/wav" className="hidden" onChange={(event) => { setAudioStegoFile(event.target.files?.[0] ?? null); setPairCoverClue(""); setAudioPairResult(null); }} /></label>
        </div>}
        {pairMedia === "IMAGE" && coverFile && stegoFile ? <div className="mt-4 grid gap-4 rounded-card border border-line bg-canvas p-4 min-[900px]:grid-cols-2">
          {([[coverFile, pairCoverPreview, "Original cover"], [stegoFile, pairStegoPreview, "Embedded stego"]] as const).map(([file, src, label]) => (
            <div key={label}><div className="mb-2 flex justify-between text-[11px] text-muted"><span>{label}</span><span>{file.name} · {formatBytes(file.size)}</span></div><button type="button" onClick={() => setPairFullscreen(true)} className="w-full cursor-zoom-in"><ImagePreview src={src} alt={label} /></button></div>
          ))}
        </div> : null}
        {pairMedia === "AUDIO" && audioCoverFile && audioStegoFile ? <div className="mt-4 grid gap-4 rounded-card border border-line bg-canvas p-4 min-[900px]:grid-cols-2">{[[audioCoverFile, audioCoverPreview, "Raw cover audio"], [audioStegoFile, audioStegoPreview, "Stego audio"]].map(([file,src,label]) => <div key={label as string}><p className="mb-2 text-[11px] text-muted">{label as string} · {(file as File).name} · {formatBytes((file as File).size)}</p><audio controls preload="metadata" src={src as string} className="w-full" /></div>)}</div> : null}
        <div className="mt-3">
          {pairMedia === "IMAGE" ? <Button disabled={!coverFile || !stegoFile || pairRunning} onClick={runPair}>{pairRunning ? "Analyzing…" : `Analyze image · ${pairAttackFormat.toUpperCase()}`}</Button> : <Button disabled={!audioCoverFile || !audioStegoFile || pairRunning} onClick={runAudioPair}>{pairRunning ? "Analyzing…" : `Analyze audio · ${pairAttackFormat.toUpperCase()}`}</Button>}
        </div>
        {pairError ? <div className="mt-3"><ErrorBanner message={pairError} /></div> : null}
        {pairMedia === "IMAGE" && pairResult ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 min-[900px]:grid-cols-3">
              <MetricCard label="MSE" value={pairResult.metrics.mse.toFixed(6)} />
              <MetricCard
                label="PSNR"
                value={pairResult.metrics.psnrDb == null ? "∞" : `${pairResult.metrics.psnrDb.toFixed(2)} dB`}
              />
              <MetricCard label="Identical" value={pairResult.metrics.identical ? "TRUE" : "FALSE"} />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-medium">Combined RGB histogram · raw cover vs {pairAttackFormat === "original" ? "original stego" : `${pairAttackFormat.toUpperCase()} restored stego`}</h3>
            </div>
            <HistogramChart cover={pairResult.histograms.cover} stego={pairResult.histograms.stego} />
            <div><h3 className="mb-2 text-[13px] font-medium">Enhanced LSB · grayscale channel planes</h3><div className="space-y-5">{([['r','Red'],['g','Green'],['b','Blue']] as const).map(([channel,label]) => <div key={channel}><h4 className="mb-2 text-[12px] text-muted">{label}</h4><div className="grid gap-4 min-[900px]:grid-cols-2"><div><p className="mb-1 text-[10px] text-muted">Cover</p><ImagePreview src={`data:image/png;base64,${pairResult.lsbChannels.cover[channel]}`} alt={`${label} cover LSB plane`} /></div><div><p className="mb-1 text-[10px] text-muted">Stego</p><ImagePreview src={`data:image/png;base64,${pairResult.lsbChannels.stego[channel]}`} alt={`${label} stego LSB plane`} /></div></div></div>)}</div></div>
          </div>
        ) : null}
        {pairMedia === "AUDIO" && audioPairResult ? <div className="mt-4 space-y-4">
          <div className="grid gap-3 min-[900px]:grid-cols-3">
            <MetricCard label="Changed PCM samples" value={`${audioPairResult.changedSamples.toLocaleString()} / ${audioPairResult.totalSamples.toLocaleString()} (${(audioPairResult.changedSamples / audioPairResult.totalSamples * 100).toFixed(4)}%)`} />
            <MetricCard label="Mean absolute sample delta" value={audioPairResult.meanAbsoluteError.toFixed(4)} />
            <MetricCard label="Maximum sample delta" value={String(audioPairResult.maxAbsoluteError)} />
            <MetricCard label="MSE" value={audioPairResult.metrics.mse.toFixed(6)} />
            <MetricCard label="PSNR" value={audioPairResult.metrics.psnrDb == null ? "∞" : `${audioPairResult.metrics.psnrDb.toFixed(2)} dB`} />
            <MetricCard label="PCM identical" value={audioPairResult.metrics.identical ? "YES" : "NO"} />
          </div>
          <div><h3 className="mb-2 text-[13px] font-medium">Audio comparison over time · raw cover vs {pairAttackFormat === "original" ? "original stego" : `${pairAttackFormat.toUpperCase()} restored stego`}</h3><AudioComparisonChart cover={audioPairResult.waveform.cover} stego={audioPairResult.waveform.stego} changedRate={audioPairResult.waveform.changedRate} /></div>
          <p className="text-[11px] text-muted">PCM samples are 16-bit values. For LSB steganography, MSE can be near zero and PSNR very high because only a small fraction of samples change by one least significant bit; changed-sample rate and mean delta show that more directly.</p>
        </div> : null}
        {pairFullscreen && coverFile && stegoFile ? <div role="dialog" aria-modal="true" aria-label="Full size image comparison" className="fixed inset-0 z-[70] grid place-items-center bg-black/95 p-6" onClick={() => setPairFullscreen(false)}><button type="button" className="absolute right-5 top-5 rounded-control border border-white/30 px-4 py-2 text-white">Close ✕</button><div className="grid w-full grid-cols-2 gap-4">{[[pairCoverPreview, "Original cover"], [pairStegoPreview, "Embedded image"]].map(([src, label]) => <div key={label}><p className="mb-2 text-center text-white">{label}</p><ImagePreview src={src} alt={label} className="h-[82vh] w-full bg-transparent object-contain" /></div>)}</div></div> : null}
      </Section>

      <Section title="Palace asset audit" subtitle="Test each selected asset once with JPEG and WebP (images) or FLAC and MP3 (audio).">
        <div className="mb-3 flex flex-wrap gap-2">
          <Button variant={auditSource === "map" ? "primary" : "secondary"} onClick={() => setAuditSource("map")}>Choose palace</Button>
          <Button variant={auditSource === "upload" ? "primary" : "secondary"} onClick={() => setAuditSource("upload")}>Upload custom assets</Button>
        </div>
        {auditSource === "map" ? <>
          <select value={auditMapId} onChange={(event) => { const id = event.target.value; setAuditMapId(id); setBatchAssetIds([]); setAuditClues([]); if (id) void fetchMap(id).then((detail) => { setAuditClues(detail.clues); setBatchPassphrases((prev) => Object.fromEntries([...Object.entries(prev), ...detail.clues.map((clue) => [clue.id, prev[clue.id] ?? clue.passphrase]) ])); }).catch((error) => setPairError(error instanceof Error ? error.message : "Could not load palace assets.")); }} className="mb-3 w-full rounded-control border border-line bg-canvas px-4 py-3 text-[13px] text-ink">
            <option value="">Choose palace to audit…</option>{maps.map((map) => <option key={map.id} value={map.id}>{map.title} · {map.clueCount} assets</option>)}
          </select>
        </> : <label className="mb-3 inline-flex min-h-[44px] cursor-pointer items-center rounded-control border border-line px-4 text-[13px] hover:bg-raised">{auditUploads.length ? `${auditUploads.length} custom file(s) selected` : "Choose stego PNG or WAV files"}<input type="file" multiple accept="image/png,audio/wav" className="hidden" onChange={(event) => { setAuditUploads(Array.from(event.target.files ?? [])); setBatchPassphrases({}); setBatchAssetIds([]); event.target.value = ""; }} /></label>}
        <div className="space-y-3">
          {(auditSource === "map" ? auditClues.map((clue, index) => ({ id: clue.id, name: `Clue ${index + 1} · ${clue.mediaType}`, pass: batchPassphrases[clue.id] ?? clue.passphrase })) : auditUploads.map((file, index) => ({ id: `${file.name}:${file.size}:${index}`, name: `${file.name} · ${file.type.includes("image") ? "IMAGE" : "AUDIO"}`, pass: batchPassphrases[`${file.name}:${file.size}:${index}`] ?? "" }))).map((asset, index) => (
            <div key={asset.id} className="grid gap-2 rounded-control border border-line bg-canvas p-3 sm:grid-cols-[auto_1fr_minmax(200px,1fr)_auto] sm:items-center">
              <input type="checkbox" checked={batchAssetIds.includes(asset.id)} onChange={(event) => setBatchAssetIds((previous) => event.target.checked ? [...previous, asset.id] : previous.filter((id) => id !== asset.id))} aria-label={`Include asset ${index + 1}`} />
              <span className="font-mono text-[12px] text-ink">{asset.name}</span>
              <input type={auditShowPass[asset.id] ? "text" : "password"} value={asset.pass} onChange={(event) => setBatchPassphrases((previous) => ({ ...previous, [asset.id]: event.target.value }))} placeholder="Passphrase (12+ chars)" className="rounded-control border border-line bg-surface px-3 py-2 text-[12px] text-ink" />
              <button type="button" onClick={() => setAuditShowPass((previous) => ({ ...previous, [asset.id]: !previous[asset.id] }))} className="text-[11px] text-muted">{auditShowPass[asset.id] ? "Hide" : "Show"}</button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-3">
          <Button disabled={batchAssetIds.length === 0 || batchRunning || batchAssetIds.some((id) => (batchPassphrases[id] ?? (auditSource === "map" ? auditClues.find((clue) => clue.id === id)?.passphrase : "") ?? "").length < 12)} onClick={runBatch}>
            {batchRunning ? "Testing compression formats…" : "Run Full Asset Audit"}
          </Button>
          <Button variant="secondary" disabled={batchRows.length === 0} onClick={exportBatch}>
            Export Forensic XLSX Report(s)
          </Button>
        </div>
        {batchRows.length > 0 ? (
          <div className="mt-3">
            <ResultTable
              columns={[
                { key: "filename", header: "Map asset" },
                { key: "media", header: "Format" },
                { key: "attack", header: "Attack" },
                { key: "mse", header: "MSE" },
                { key: "psnr", header: "PSNR" },
                { key: "pcm", header: "PCM identical" },
                { key: "status", header: "Status" },
              ]}
              rows={batchRows.map((row) => ({
                filename: row.filename,
                media: row.media.toUpperCase(),
                attack: row.format.toUpperCase(),
                mse: row.result?.metrics ? row.result.metrics.mse.toFixed(6) : row.error ?? "N/A",
                psnr: row.result?.metrics ? (row.result.metrics.psnrDb == null ? "INF" : `${row.result.metrics.psnrDb.toFixed(2)} dB`) : "N/A",
                pcm: row.media === "audio" && row.result ? (row.result.pcmIdentical ? "YES" : "NO") : "N/A",
                status: row.status,
              }))}
            />
          </div>
        ) : null}
      </Section>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-line bg-surface p-5">
      <h2 className="text-heading">{title}</h2>
      <p className="mt-1 text-[13px] text-muted">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

interface BatchAssetRow {
  filename: string;
  media: "image" | "audio";
  format: ImageFormat | AudioFormat | "unavailable";
  parameter: number;
  result: TestResult | null;
  status: "PASS" | "FAIL" | "ERROR";
  error?: string;
}

function StageStep({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return <section className="rounded-control border border-line bg-canvas p-4"><div className="mb-3 flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full border border-accent/50 font-mono text-[11px] text-accent">{number}</span><h3 className="text-[13px] font-semibold text-ink">{title}</h3></div>{children}</section>;
}

function StagePreview({ title, file, src, playbackSrc }: { title: string; file: File; src: string; playbackSrc?: string }) {
  const [expanded, setExpanded] = useState(false);
  return <div className="mt-3 rounded-control border border-line bg-surface p-3"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="text-[12px] font-medium text-ink">{title}</p><div className="flex items-center gap-3"><p className="font-mono text-[10px] text-muted">{file.name} · {formatBytes(file.size)}</p><a href={src} download={file.name} className="text-[10px] text-accent hover:underline">Download</a></div></div>{file.type.startsWith("image/") ? <><button type="button" onClick={() => setExpanded(true)} className="block w-full cursor-zoom-in" aria-label="View image fullscreen"><ImagePreview src={src} alt={title} className="max-h-80 w-full rounded-control border border-line bg-canvas object-contain" /><span className="mt-1 block text-right text-[10px] text-muted">Click to expand</span></button>{expanded ? <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[80] grid place-items-center bg-black/95 p-5" onClick={() => setExpanded(false)}><button type="button" className="absolute right-5 top-5 rounded-control border border-white/30 px-4 py-2 text-white">Close ✕</button><ImagePreview src={src} alt={title} className="max-h-[92vh] max-w-[94vw] rounded-none border-0 bg-transparent object-contain" /></div> : null}</> : <><audio controls preload="auto" src={playbackSrc ?? src} className="w-full" />{playbackSrc ? <p className="mt-1 text-[10px] text-muted">Playback uses a complete WAV decode of this FLAC; download above is the original FLAC.</p> : null}</>}</div>;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function AudioComparisonChart({ cover, stego, changedRate }: { cover: number[]; stego: number[]; changedRate: number[] }) {
  const width = 800;
  const height = 220;
  const left = 42;
  const right = 12;
  const top = 16;
  const bottom = 30;
  const count = Math.min(cover.length, stego.length);
  const points = (values: number[]) => values.slice(0, count).map((value, index) => {
    const x = left + (index / Math.max(1, count - 1)) * (width - left - right);
    const y = top + (1 - Math.min(1, value)) * (height - top - bottom);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const ratePeak = Math.max(0.0001, ...changedRate);
  const barWidth = (width - left - right) / changedRate.length;
  return <div className="rounded-control border border-line bg-canvas p-3">
    <h4 className="mb-1 text-[11px] font-medium text-ink">Signal level (RMS)</h4>
    <div className="mb-1 flex flex-wrap gap-4 text-[10px] text-muted"><span className="text-sky-400">— Raw cover</span><span className="text-accent">— Stego</span></div>
    <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img" aria-label="Root mean square audio signal level across time, comparing raw cover and stego">
      {[0, 0.5, 1].map((fraction) => { const y = top + (1 - fraction) * (height - top - bottom); return <g key={fraction}><line x1={left} x2={width - right} y1={y} y2={y} stroke="#343448" strokeDasharray="3 4" /><text x={left - 8} y={y + 4} fill="#b1b1c3" textAnchor="end" fontSize="12">{fraction.toFixed(1)}</text></g>; })}
      <polyline points={points(cover)} fill="none" stroke="#38bdf8" strokeWidth="2" />
      <polyline points={points(stego)} fill="none" stroke="#e4be70" strokeWidth="1.5" />
      <text x={left} y={height - 6} fill="#b1b1c3" fontSize="12">Start</text><text x={width - right} y={height - 6} fill="#b1b1c3" textAnchor="end" fontSize="12">End</text>
    </svg>
    <p className="mb-4 text-[10px] text-muted">RMS smooths the signal into average energy per time bucket. The two lines may overlap because LSB changes are tiny.</p>
    <h4 className="mb-1 text-[11px] font-medium text-ink">Samples changed per time bucket</h4>
    <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img" aria-label="Percentage of changed audio samples in each time bucket">
      {[0, 0.5, 1].map((fraction) => { const y = top + (1 - fraction) * (height - top - bottom); return <g key={fraction}><line x1={left} x2={width - right} y1={y} y2={y} stroke="#343448" strokeDasharray="3 4" /><text x={left - 8} y={y + 4} fill="#b1b1c3" textAnchor="end" fontSize="12">{(ratePeak * fraction * 100).toFixed(1)}%</text></g>; })}
      {changedRate.map((rate, index) => { const barHeight = (rate / ratePeak) * (height - top - bottom); return <rect key={index} x={left + index * barWidth} y={top + (height - top - bottom) - barHeight} width={Math.max(1, barWidth - 0.5)} height={barHeight} fill="#ef6262" opacity="0.86" />; })}
      <text x={left} y={height - 6} fill="#b1b1c3" fontSize="12">Start</text><text x={width - right} y={height - 6} fill="#b1b1c3" textAnchor="end" fontSize="12">End</text>
    </svg>
    <p className="mt-1 text-[10px] text-muted">Bars use an auto-scaled percent axis. Higher bars mark regions where more PCM samples differ.</p>
  </div>;
}

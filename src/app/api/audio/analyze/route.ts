import type { AudioAnalyzeResponse } from "@/lib/contracts/types";
import { ApiError } from "@/lib/contracts/errors";
import { decodeWav } from "@/lib/media/wav";
import { audioMetrics, waveformPreview } from "@/lib/analysis/audio";
import { jsonOk, runHandler } from "@/lib/api/http";

export const runtime = "nodejs";

const WAVEFORM_BUCKETS = 200;

export async function POST(request: Request) {
  return runHandler(async () => {
    const form = await request.formData();
    const coverFile = form.get("cover");
    const stegoFile = form.get("stego");
    if (!(coverFile instanceof File) || !(stegoFile instanceof File)) {
      throw ApiError.badRequest("Both cover and stego files are required.");
    }

    const cover = decodeWav(new Uint8Array(await coverFile.arrayBuffer()));
    const stego = decodeWav(new Uint8Array(await stegoFile.arrayBuffer()));

    const { metrics, changedSamples, totalSamples } = audioMetrics(cover, stego);

    const response: AudioAnalyzeResponse = {
      metrics,
      changedSamples,
      totalSamples,
      waveform: {
        cover: waveformPreview(cover, WAVEFORM_BUCKETS),
        stego: waveformPreview(stego, WAVEFORM_BUCKETS),
      },
    };

    return jsonOk(response);
  });
}

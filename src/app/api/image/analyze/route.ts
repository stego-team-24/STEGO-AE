import type { ImageAnalyzeResponse } from "@/lib/contracts/types";
import { decodePng, encodePng } from "@/lib/media/png";
import { imageMetrics } from "@/lib/analysis/image";
import { rgbHistogram } from "@/lib/analysis/histogram";
import { lsbPlane, lsbPlaneCombined } from "@/lib/analysis/lsb-plane";
import { ApiError } from "@/lib/contracts/errors";
import { jsonOk, runHandler, toBase64 } from "@/lib/api/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return runHandler(async () => {
    const form = await request.formData();
    const coverFile = form.get("cover");
    const stegoFile = form.get("stego");
    if (!(coverFile instanceof File) || !(stegoFile instanceof File)) {
      throw ApiError.badRequest("Both cover and stego files are required.");
    }

    const cover = await decodePng(new Uint8Array(await coverFile.arrayBuffer()));
    const stego = await decodePng(new Uint8Array(await stegoFile.arrayBuffer()));

    const response: ImageAnalyzeResponse = {
      metrics: imageMetrics(cover, stego),
      histograms: { cover: rgbHistogram(cover), stego: rgbHistogram(stego) },
      lsbCombined: {
        cover: toBase64(await encodePng(lsbPlaneCombined(cover))),
        stego: toBase64(await encodePng(lsbPlaneCombined(stego))),
      },
      lsbChannels: {
        cover: {
          r: toBase64(await encodePng(lsbPlane(cover, 0))),
          g: toBase64(await encodePng(lsbPlane(cover, 1))),
          b: toBase64(await encodePng(lsbPlane(cover, 2))),
        },
        stego: {
          r: toBase64(await encodePng(lsbPlane(stego, 0))),
          g: toBase64(await encodePng(lsbPlane(stego, 1))),
          b: toBase64(await encodePng(lsbPlane(stego, 2))),
        },
      },
    };

    return jsonOk(response);
  });
}

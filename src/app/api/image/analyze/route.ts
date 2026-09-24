import type {
  ChannelName,
  ImageAnalyzeResponse,
  PngCarrier,
} from "@/lib/contracts/types";
import { decodePng, encodePng } from "@/lib/media/png";
import { imageMetrics } from "@/lib/analysis/image";
import { rgbHistogram } from "@/lib/analysis/histogram";
import { lsbPlane } from "@/lib/analysis/lsb-plane";
import { ApiError } from "@/lib/contracts/errors";
import { jsonOk, runHandler, toBase64 } from "@/lib/api/http";

export const runtime = "nodejs";

const CHANNELS: ChannelName[] = ["r", "g", "b"];

async function lsbThumbnails(carrier: PngCarrier) {
  const result = {} as Record<ChannelName, string>;
  for (const channel of CHANNELS) {
    const plane = lsbPlane(carrier, channel);
    result[channel] = toBase64(await encodePng(plane));
  }
  return result;
}

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
      lsbThumbnails: {
        cover: await lsbThumbnails(cover),
        stego: await lsbThumbnails(stego),
      },
    };

    return jsonOk(response);
  });
}

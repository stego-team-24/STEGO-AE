import { LIMITS, type ImageEmbedResponse } from "@/lib/contracts/types";
import { messageSchema, parseOrThrow, passphraseSchema, readField } from "@/lib/contracts/schemas";
import { decodePng, encodePng, pngThumbnail, PNG_MIME } from "@/lib/media/png";
import { imageMetrics } from "@/lib/analysis/image";
import { embedImagePayload } from "@/lib/engine/embed";
import { jsonOk, readUpload, runHandler, toBase64 } from "@/lib/api/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return runHandler(async () => {
    const form = await request.formData();
    const { bytes } = await readUpload(form);
    const message = parseOrThrow(messageSchema, readField(form, "message"), "message");
    const passphrase = parseOrThrow(
      passphraseSchema,
      readField(form, "passphrase"),
      "passphrase",
    );

    const cover = await decodePng(bytes);
    const { carrier, messageBytes } = embedImagePayload(cover, message, passphrase);

    const stegoBytes = await encodePng(carrier);
    const metrics = imageMetrics(cover, carrier);
    const thumbnail = await pngThumbnail(carrier, LIMITS.maxThumbnailPx);

    const response: ImageEmbedResponse = {
      artifact: {
        base64: toBase64(stegoBytes),
        mime: PNG_MIME,
        filename: "stego.png",
      },
      metrics,
      metadata: {
        width: carrier.width,
        height: carrier.height,
        channels: carrier.channels,
        messageBytes,
        coverBytes: bytes.length,
        stegoBytes: stegoBytes.length,
      },
      thumbnail,
    };

    return jsonOk(response);
  });
}

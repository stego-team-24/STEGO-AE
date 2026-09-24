import type { AudioEmbedResponse } from "@/lib/contracts/types";
import {
  messageSchema,
  parseOrThrow,
  passphraseSchema,
  readField,
} from "@/lib/contracts/schemas";
import { decodeWav, encodeWav, WAV_MIME } from "@/lib/media/wav";
import { audioMetrics } from "@/lib/analysis/audio";
import { embedAudioPayload } from "@/lib/engine/embed";
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

    const cover = decodeWav(bytes);
    const { carrier, messageBytes } = embedAudioPayload(cover, message, passphrase);

    const stegoBytes = encodeWav(carrier);
    const { metrics } = audioMetrics(cover, carrier);

    const response: AudioEmbedResponse = {
      artifact: {
        base64: toBase64(stegoBytes),
        mime: WAV_MIME,
        filename: "stego.wav",
      },
      metrics,
      metadata: {
        sampleRate: carrier.sampleRate,
        channels: carrier.channels,
        frames: carrier.frames,
        messageBytes,
        coverBytes: bytes.length,
        stegoBytes: stegoBytes.length,
      },
    };

    return jsonOk(response);
  });
}

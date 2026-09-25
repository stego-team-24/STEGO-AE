import { flacLevelSchema, parseOrThrow, readField } from "@/lib/contracts/schemas";
import { jsonOk, readUpload, runHandler, toBase64 } from "@/lib/api/http";
import { decodeWav, encodeWav } from "@/lib/media/wav";
import { flacRoundTrip } from "@/lib/media/flac";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return runHandler(async () => {
    const form = await request.formData();
    const { file, bytes } = await readUpload(form);
    const level = parseOrThrow(flacLevelSchema, readField(form, "level"), "level");
    const wav = decodeWav(bytes);
    const { flacBytes, decoded } = await flacRoundTrip(wav.samples, wav.sampleRate, wav.channels, 16, level);
    const playbackBytes = encodeWav({ ...wav, samples: decoded });
    return jsonOk({
      artifact: { name: file.name.split(".").slice(0, -1).join(".") + `-level${level}.flac`, mime: "audio/flac", size: flacBytes.length, base64: toBase64(flacBytes) },
      playback: { name: "flac-decoded-preview.wav", mime: "audio/wav", size: playbackBytes.length, base64: toBase64(playbackBytes) },
      parameter: level,
    });
  });
}

import { audioCompressionFormatSchema, parseOrThrow, readField } from "@/lib/contracts/schemas";
import { jsonOk, readUpload, runHandler, toBase64 } from "@/lib/api/http";
import { decodeWav, encodeWav } from "@/lib/media/wav";
import { flacRoundTrip } from "@/lib/media/flac";
import { decodeMp3ToCarrier, encodeMp3, MP3_BITRATE_KBPS } from "@/lib/media/mp3";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return runHandler(async () => {
    const form = await request.formData();
    const { file, bytes } = await readUpload(form);
    const format = parseOrThrow(audioCompressionFormatSchema, readField(form, "format"), "format");
    const wav = decodeWav(bytes);
    const { artifactBytes, decodedSamples } = format === "flac"
      ? await flacRoundTrip(wav.samples, wav.sampleRate, wav.channels, 16, 5).then(({ flacBytes, decoded }) => ({ artifactBytes: flacBytes, decodedSamples: decoded }))
      : await encodeMp3(wav).then(async (mp3Bytes) => {
          const decoded = await decodeMp3ToCarrier(mp3Bytes, wav);
          return { artifactBytes: mp3Bytes, decodedSamples: decoded.samples };
        });
    const playbackBytes = encodeWav({ ...wav, samples: decodedSamples });
    const extension = format === "flac" ? "flac" : "mp3";
    const mime = format === "flac" ? "audio/flac" : "audio/mpeg";
    const stem = (file.name.replace(/\.[^.]+$/, "") || "asset").replace(/[^a-zA-Z0-9._-]+/g, "-");
    return jsonOk({
      artifact: { name: `${format}-${stem}.${extension}`, mime, size: artifactBytes.length, base64: toBase64(artifactBytes) },
      playback: { name: `${stem}-after-${format}.wav`, mime: "audio/wav", size: playbackBytes.length, base64: toBase64(playbackBytes) },
      parameter: format === "flac" ? 5 : MP3_BITRATE_KBPS,
      format,
    });
  });
}

import { inspectPng } from "@/lib/media/png";
import { jsonOk, readUpload, runHandler } from "@/lib/api/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return runHandler(async () => {
    const form = await request.formData();
    const { bytes } = await readUpload(form);
    return jsonOk(await inspectPng(bytes));
  });
}

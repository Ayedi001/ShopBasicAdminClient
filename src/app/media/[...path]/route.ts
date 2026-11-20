import fs from "node:fs/promises";
import path from "node:path";
import { uploadRoot } from "@/server/media";

const TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await ctx.params;
  const root = uploadRoot();
  const rel = parts.map((p) => decodeURIComponent(p)).join("/");
  const abs = path.resolve(root, rel);
  // Path traversal protection
  if (!abs.startsWith(root + path.sep) || rel.includes("\0")) return new Response("Not found", { status: 404 });
  const type = TYPES[path.extname(abs).toLowerCase()];
  if (!type || type === "image/svg+xml") return new Response("Not found", { status: 404 });

  let stat;
  try {
    stat = await fs.stat(abs);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const headers: Record<string, string> = {
    "Content-Type": type,
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
  };

  const range = req.headers.get("range");
  if (range && type.startsWith("video/")) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    if (m) {
      const start = m[1] ? Number(m[1]) : 0;
      const end = m[2] ? Math.min(Number(m[2]), stat.size - 1) : Math.min(start + 2 * 1024 * 1024, stat.size - 1);
      if (start >= stat.size || start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${stat.size}` } });
      const fh = await fs.open(abs, "r");
      try {
        const buf = Buffer.alloc(end - start + 1);
        await fh.read(buf, 0, buf.length, start);
        return new Response(new Uint8Array(buf), {
          status: 206,
          headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${stat.size}`, "Content-Length": String(buf.length) },
        });
      } finally {
        await fh.close();
      }
    }
  }
  const data = await fs.readFile(abs);
  return new Response(new Uint8Array(data), { headers: { ...headers, "Content-Length": String(stat.size) } });
}

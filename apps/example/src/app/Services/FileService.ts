import path from "path";
import fs from "fs";
import { ModelAttributes } from "@vest/db";
import File from "@app/Models/File/File";
import { TRequest } from "@app/Http/types";
import sharp from "sharp";
type MulterFile = Express.Multer.File;

export class FileService {
  private uploadDir: string;
  private thumbDir: string;
  private maxThumbWidth: number;
  private maxThumbHeight: number;
  private sizes: { key: string; width: number; height: number }[]; // multi sizes
  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || path.resolve(process.cwd(), "uploads");
    if (!fs.existsSync(this.uploadDir)) fs.mkdirSync(this.uploadDir, { recursive: true });
    this.thumbDir = path.join(this.uploadDir, "thumbnails");
    if (!fs.existsSync(this.thumbDir)) fs.mkdirSync(this.thumbDir, { recursive: true });
    this.maxThumbWidth = parseInt(process.env.THUMB_MAX_WIDTH || "320");
    this.maxThumbHeight = parseInt(process.env.THUMB_MAX_HEIGHT || "320");
    // Parse multi sizes from env THUMB_SIZES format: "64x64:sm,128x128:md,320x320:lg"
    const rawSizes = process.env.THUMB_SIZES || "";
    const parsed: { key: string; width: number; height: number }[] = [];
    rawSizes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((def) => {
        const [dim, keyMaybe] = def.split(":");
        const [wStr, hStr] = (dim || "").split("x");
        const w = parseInt(wStr || "0");
        const h = parseInt(hStr || "0");
        if (w > 0 && h > 0) parsed.push({ key: keyMaybe || `${w}x${h}`, width: w, height: h });
      });
    // Fallback default sizes if none provided
    if (parsed.length === 0) {
      this.sizes = [
        { key: "sm", width: 64, height: 64 },
        { key: "md", width: 320, height: 320 },
      ];
    } else {
      this.sizes = parsed;
    }
  }
  private isImage(mime: string) {
    return ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mime);
  }
  // New multi-size thumbnail generator with webp + original format fallback
  private async generateThumbnails(fileRecord: any, force = false) {
    if (!fileRecord || !fileRecord.disk_path || !fileRecord.mime_type) return null;
    if (!this.isImage(fileRecord.mime_type)) return null;
    const thumbnails: any = fileRecord.thumbnails || {};
    try {
      const inputPath = fileRecord.disk_path;
      const originalExt = path.extname(fileRecord.filename).replace(".", "").toLowerCase();
      const originalIsWebp = originalExt === "webp";
      const base = path.basename(fileRecord.filename, path.extname(fileRecord.filename));
      const meta = await sharp(inputPath).metadata();
      if (
        (!fileRecord.original_width || !fileRecord.original_height) &&
        meta.width &&
        meta.height
      ) {
        await fileRecord.update({ original_width: meta.width, original_height: meta.height });
      }
      for (const sizeDef of this.sizes) {
        const key = sizeDef.key;
        if (!thumbnails[key]) thumbnails[key] = {};
        // WebP thumbnail path
        const webpName = `${base}-thumb-${key}.webp`;
        const webpPath = path.join(this.thumbDir, webpName);
        // Original format fallback (skip if original already webp)
        const origName = `${base}-thumb-${key}.${originalExt}`;
        const origPath = path.join(this.thumbDir, origName);
        if (force) {
          if (fs.existsSync(webpPath)) await fs.promises.unlink(webpPath).catch(() => {});
          if (!originalIsWebp && fs.existsSync(origPath))
            await fs.promises.unlink(origPath).catch(() => {});
        }
        // Generate if missing
        if (!fs.existsSync(webpPath)) {
          await sharp(inputPath)
            .resize({ width: sizeDef.width, height: sizeDef.height, fit: "inside" })
            .webp({ quality: 80 })
            .toFile(webpPath);
        }
        thumbnails[key].webp = webpPath;
        if (!originalIsWebp) {
          if (!fs.existsSync(origPath)) {
            // Use original format conversion; match MIME type
            let pipeline = sharp(inputPath).resize({
              width: sizeDef.width,
              height: sizeDef.height,
              fit: "inside",
            });
            switch (fileRecord.mime_type) {
              case "image/jpeg":
                pipeline = pipeline.jpeg({ quality: 82 });
                break;
              case "image/png":
                pipeline = pipeline.png({ compressionLevel: 8 });
                break;
              case "image/gif":
                // GIF resizing still outputs gif
                pipeline = pipeline.gif();
                break;
              default:
                pipeline = pipeline.jpeg({ quality: 80 });
            }
            await pipeline.toFile(origPath);
          }
          thumbnails[key].original = origPath;
        }
      }
      // Backwards compatibility: set thumbnail_path to medium (or first) webp
      const defaultKey = this.sizes.find((s) => s.key === "md")?.key || this.sizes[0].key;
      const defaultThumbPath = thumbnails[defaultKey]?.webp;
      const updatePayload: any = { thumbnails };
      if (defaultThumbPath) updatePayload.thumbnail_path = defaultThumbPath;
      await fileRecord.update(updatePayload);
      return thumbnails;
    } catch (e) {
      return null;
    }
  }
  private async generateThumbnail(fileRecord: any, force = false) {
    // Delegate to multi-size generator for backward compatibility
    const thumbs = await this.generateThumbnails(fileRecord, force);
    if (!thumbs) return null;
    const defaultKey = this.sizes.find((s) => s.key === "md")?.key || this.sizes[0].key;
    return thumbs[defaultKey]?.webp || null;
  }
  async regenerateThumbnail(id: number | string) {
    const file: any = await File.find(id);
    if (!file) return null;
    await this.generateThumbnails(file, true);
    const defaultKey = this.sizes.find((s) => s.key === "md")?.key || this.sizes[0].key;
    return (file.thumbnails || {})[defaultKey]?.webp || file.thumbnail_path || null;
  }
  // Retrieve a specific thumbnail variant (size + format)
  async getThumbnailVariant(id: number | string, sizeKey?: string, format?: "webp" | "original") {
    const file: any = await File.find(id);
    if (!file) return null;
    if (!this.isImage(file.mime_type)) return null;
    // Ensure thumbnails generated
    if (!file.thumbnails) {
      await this.generateThumbnails(file);
    }
    const thumbs = file.thumbnails || {};
    // Default size selection
    const selectedSize =
      sizeKey && thumbs[sizeKey]
        ? sizeKey
        : this.sizes.find((s) => s.key === "md")?.key || this.sizes[0].key;
    const variants = thumbs[selectedSize] || {};
    // Choose format: prefer requested, else negotiate: if format webp exists use it else original
    let chosen: string | null = null;
    if (format) {
      chosen = variants[format] || null;
    } else {
      chosen = variants.webp || variants.original || null;
    }
    // Fallback: if chosen missing and force regenerate that size
    if (!chosen) {
      await this.generateThumbnails(file);
      const refreshed = (file.thumbnails || {})[selectedSize] || {};
      chosen = refreshed.webp || refreshed.original || null;
    }
    return chosen;
  }
  async getThumbnailPath(id: number | string) {
    const file: any = await File.find(id);
    if (!file) return null;
    if (!file.thumbnail_path && this.isImage(file.mime_type)) {
      await this.generateThumbnails(file);
    }
    return file.thumbnail_path || null;
  }
  async delete(id: number | string) {
    const file: any = await File.find(id);
    if (!file) return false;
    try {
      const p = file.disk_path;
      if (p && fs.existsSync(p)) await fs.promises.unlink(p).catch(() => {});
      // Remove legacy single thumbnail path
      const tp = file.thumbnail_path;
      if (tp && fs.existsSync(tp)) await fs.promises.unlink(tp).catch(() => {});
      // Remove multi thumbnails
      const thumbs = file.thumbnails || {};
      for (const key of Object.keys(thumbs)) {
        const variants = thumbs[key];
        for (const fmt of Object.keys(variants || {})) {
          const vp = variants[fmt];
          if (vp && fs.existsSync(vp)) await fs.promises.unlink(vp).catch(() => {});
        }
      }
    } catch (_) {}
    await file.delete();
    return true;
  }

  async list(request: TRequest) {
    const { query, user } = request;
    let builder = File.query();
    if ((query as any).user_id) builder.where("user_id", "=", (query as any).user_id);
    if (user && !(user.roles || []).includes("admin")) {
      builder.where("user_id", "=", (user as any).id);
    }
    if ((query as any).sort) builder.orderBy((query as any).sort, (query as any).order || "asc");
    return builder.paginate((query as any).limit, (query as any).page);
  }

  async find(id: number | string) {
    return await File.find(id);
  }

  async createFromUpload(upload: MulterFile, userId?: number | string) {
    const attrs: ModelAttributes = {
      original_name: upload.originalname,
      filename: upload.filename,
      mime_type: upload.mimetype,
      size: upload.size,
      disk_path: (upload as any).path,
      user_id: userId || null,
    } as any;
    const created: any = await File.create(attrs);
    if (this.isImage(upload.mimetype)) {
      await this.generateThumbnails(created);
    }
    return created;
  }

  async createFromBuffer(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    userId?: number | string,
  ) {
    const unique = Date.now() + "-" + Math.random().toString(16).slice(2);
    const safeOriginal = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = unique + "-" + safeOriginal;
    const target = path.join(this.uploadDir, filename);
    await fs.promises.writeFile(target, buffer);
    const stats = await fs.promises.stat(target);
    const created: any = await File.create({
      original_name: originalName,
      filename,
      mime_type: mimeType,
      size: stats.size,
      disk_path: target,
      user_id: userId || null,
    } as any);
    if (this.isImage(mimeType)) {
      await this.generateThumbnails(created);
    }
    return created;
  }
}

export default new FileService();

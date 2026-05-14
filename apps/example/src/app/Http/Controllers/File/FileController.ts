import type { Request, Response } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import jwt from "jsonwebtoken";
import { FileService } from "@app/Services/FileService";
import File from "@app/Models/File/File";
import { ValidationError } from "@app/Helpers/validator";
import { parseRequest } from "@app/Helpers/auth";
import { Doc } from "@vest/router";

type MulterFile = Express.Multer.File;

const uploadDir = process.env.UPLOAD_DIR || path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const MAX_UPLOAD_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE || String(10 * 1024 * 1024));
const ALLOWED_MIME = (
  process.env.ALLOWED_MIME_TYPES ||
  "image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const storage = multer.diskStorage({
  destination: (req: Request, file: MulterFile, cb: (error: any, destination: string) => void) =>
    cb(null, uploadDir),
  filename: (req: Request, file: MulterFile, cb: (error: any, filename: string) => void) => {
    const unique = Date.now() + "-" + Math.random().toString(16).slice(2);
    const safeOriginal = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, unique + "-" + safeOriginal);
  },
});

export const multerUpload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(new Error("Unsupported file type"));
    }
    cb(null, true);
  },
});

const JWT_SECRET: string =
  process.env.FILE_URL_SECRET || process.env.JWT_SECRET || "dev-secret-change";

export class FileController {
  public constructor(public fileService: FileService) {}

  @Doc({
    summary: "List files",
    tags: ["Files"],
    params: [
      { name: "user_id", in: "query", description: "Filter by user ID", type: "string" },
      { name: "page", in: "query", description: "Page number", type: "integer" },
      { name: "limit", in: "query", description: "Items per page", type: "integer" },
      {
        name: "sort",
        in: "query",
        description: "Sort field",
        type: "string",
        enum: ["id", "created_at", "size"],
      },
      {
        name: "order",
        in: "query",
        description: "Sort direction",
        type: "string",
        enum: ["asc", "desc"],
      },
    ],
  })
  async index(req: Request, res: Response) {
    const queryRules: any = {
      user_id: "nullable|exists:users,id",
      page: "nullable|int",
      limit: "nullable|int",
      sort: "nullable|string|in:id,created_at,size",
      order: "nullable|string|in:asc,desc",
    };
    try {
      await (req as any).validate(req.query, queryRules);
    } catch (_) {}
    const data = await this.fileService.list(parseRequest(req));
    res.json(data);
  }

  @Doc({
    summary: "Get file metadata by ID",
    tags: ["Files"],
    responses: [
      { status: 200, description: "File found" },
      { status: 404, description: "Not found" },
    ],
  })
  async show(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
      await req.validate({ id }, { id: "required|exists:files,id" });
    } catch (e) {
      if (e instanceof ValidationError)
        return res.status(422).json({ errors: e.errors, messages: e.messages });
      throw e;
    }
    const file = await this.fileService.find(id);
    if (!file) return res.status(404).json({ message: "Not found" });
    res.json(file.toJSON());
  }

  @Doc({
    summary: "Download a file",
    tags: ["Files"],
    responses: [
      { status: 200, description: "File stream" },
      { status: 404, description: "Not found or missing on disk" },
    ],
  })
  async download(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
      await req.validate({ id }, { id: "required|exists:files,id" });
    } catch (e) {
      if (e instanceof ValidationError)
        return res.status(422).json({ errors: e.errors, messages: e.messages });
      throw e;
    }
    const file = await this.fileService.find(id);
    if (!file) return res.status(404).json({ message: "Not found" });
    const diskPath = (file as any).disk_path;
    if (!diskPath || !fs.existsSync(diskPath))
      return res.status(404).json({ message: "File missing on disk" });
    res.setHeader("Content-Type", (file as any).mime_type || "application/octet-stream");
    res.setHeader("Content-Length", (file as any).size || 0);
    res.setHeader("Content-Disposition", `attachment; filename="${(file as any).original_name}"`);
    fs.createReadStream(diskPath).pipe(res);
  }

  @Doc({
    summary: "Upload a file (multipart/form-data)",
    tags: ["Files"],
    responses: [
      { status: 201, description: "File uploaded" },
      { status: 400, description: "No file provided" },
      { status: 422, description: "Unsupported file type or file too large" },
    ],
  })
  async store(req: Request, res: Response) {
    const user = (req as any).user;
    const upload = (req as any).file as MulterFile | undefined;
    if (!upload) return res.status(400).json({ message: "No file uploaded" });
    try {
      const created = await this.fileService.createFromUpload(upload, user ? user.id : undefined);
      return res.status(201).json(created.toJSON());
    } catch (e) {
      const msg = String(e);
      const isTypeErr = /Unsupported file type/i.test(msg);
      const isSizeErr = /File too large|LIMIT_FILE_SIZE/i.test(msg);
      const status = isTypeErr || isSizeErr ? 422 : 500;
      return res.status(status).json({
        message: isTypeErr
          ? "Unsupported file type"
          : isSizeErr
            ? "File too large"
            : "Upload failed",
        error: msg,
      });
    }
  }

  @Doc({
    summary: "Upload a file from base64 content",
    tags: ["Files"],
    validationRules: {
      filename: "required|string",
      mime_type: "required|string",
      content: "required|string",
    },
    responses: [
      { status: 201, description: "File uploaded" },
      { status: 422, description: "Unsupported type or file too large" },
    ],
  })
  async storeRaw(req: Request, res: Response) {
    const rules = {
      filename: "required|string",
      mime_type: "required|string",
      content: "required|string",
    } as any;
    let validated: any;
    try {
      validated = await req.validate(rules);
    } catch (e) {
      if (e instanceof ValidationError)
        return res.status(422).json({ errors: e.errors, messages: e.messages });
      throw e;
    }
    try {
      const buffer = Buffer.from(validated.content, "base64");
      const mime = validated.mime_type;
      if (!ALLOWED_MIME.includes(mime)) {
        return res.status(422).json({ message: "Unsupported file type" });
      }
      if (buffer.length > MAX_UPLOAD_SIZE) {
        return res.status(422).json({ message: "File too large" });
      }
      const user = (req as any).user;
      const created = await this.fileService.createFromBuffer(
        buffer,
        validated.filename,
        mime,
        user ? user.id : undefined,
      );
      return res.status(201).json(created.toJSON());
    } catch (e) {
      return res.status(500).json({ message: "Raw upload failed", error: String(e) });
    }
  }

  @Doc({
    summary: "Delete a file",
    tags: ["Files"],
    responses: [
      { status: 200, description: "File deleted" },
      { status: 403, description: "Forbidden" },
      { status: 404, description: "Not found" },
    ],
  })
  async destroy(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
      await req.validate({ id }, { id: "required|exists:files,id" });
    } catch (e) {
      if (e instanceof ValidationError)
        return res.status(422).json({ errors: e.errors, messages: e.messages });
      throw e;
    }
    const file = await File.find(id);
    if (!file) return res.status(404).json({ message: "Not found" });
    const user = (req as any).user;
    const isOwner =
      user && (file as any).user_id && String(user.id) === String((file as any).user_id);
    const canDelete = isOwner || (user && (user.roles || []).includes("admin"));
    if (!canDelete) return res.status(403).json({ message: "Forbidden" });
    const ok = await this.fileService.delete(id);
    if (!ok) return res.status(404).json({ message: "Not found" });
    res.json({ success: true });
  }

  @Doc({
    summary: "Generate a signed download URL for a file",
    tags: ["Files"],
    responses: [
      {
        status: 200,
        description: "Signed URL generated",
        example: { url: "", token: "", expires_at: "" },
      },
      { status: 404, description: "Not found" },
    ],
  })
  async signedUrl(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
      await req.validate({ id }, { id: "required|exists:files,id" });
    } catch (e) {
      if (e instanceof ValidationError)
        return res.status(422).json({ errors: e.errors, messages: e.messages });
      throw e;
    }
    const file = await this.fileService.find(id);
    if (!file) return res.status(404).json({ message: "Not found" });
    const expiresInSec = parseInt(process.env.FILE_URL_EXPIRES || "900");
    const payload = { file_id: (file as any).id } as any;
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: expiresInSec });
    const url = `${process.env.APP_URL || "http://localhost:3000"}/public/files/${token}`;
    const expires_at = new Date(Date.now() + expiresInSec * 1000).toISOString();
    res.json({ url, token, expires_at });
  }

  @Doc({
    summary: "Serve a file via a signed token (public)",
    tags: ["Files"],
    responses: [
      { status: 200, description: "File stream" },
      { status: 401, description: "Invalid or expired token" },
      { status: 404, description: "Not found" },
    ],
  })
  async publicDownload(req: Request, res: Response) {
    const token = req.params.token as string;
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ message: "Invalid or expired link" });
    }
    const file = await this.fileService.find(decoded.file_id);
    if (!file) return res.status(404).json({ message: "Not found" });
    const diskPath = (file as any).disk_path;
    if (!diskPath || !fs.existsSync(diskPath))
      return res.status(404).json({ message: "File missing on disk" });
    res.setHeader("Content-Type", (file as any).mime_type || "application/octet-stream");
    res.setHeader("Content-Length", (file as any).size || 0);
    res.setHeader("Content-Disposition", `attachment; filename="${(file as any).original_name}"`);
    fs.createReadStream(diskPath).pipe(res);
  }

  @Doc({
    summary: "View a file inline in the browser",
    tags: ["Files"],
    responses: [
      { status: 200, description: "File stream (inline)" },
      { status: 404, description: "Not found or missing on disk" },
    ],
  })
  async view(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
      await req.validate({ id }, { id: "required|exists:files,id" });
    } catch (e) {
      if (e instanceof ValidationError)
        return res.status(422).json({ errors: e.errors, messages: e.messages });
      throw e;
    }
    const file = await this.fileService.find(id);
    if (!file) return res.status(404).json({ message: "Not found" });
    const diskPath = (file as any).disk_path;
    if (!diskPath || !fs.existsSync(diskPath))
      return res.status(404).json({ message: "File missing on disk" });
    res.setHeader("Content-Type", (file as any).mime_type || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${(file as any).original_name}"`);
    fs.createReadStream(diskPath).pipe(res);
  }

  @Doc({
    summary: "Get image thumbnail",
    tags: ["Files"],
    params: [
      {
        name: "size",
        in: "query",
        description: "Thumbnail size key (e.g. sm, md, lg)",
        type: "string",
      },
      {
        name: "format",
        in: "query",
        description: "Output format",
        type: "string",
        enum: ["webp", "original"],
      },
    ],
    responses: [
      { status: 200, description: "Thumbnail image stream" },
      { status: 404, description: "Not an image or thumbnail not generated" },
    ],
  })
  async thumbnail(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
      await req.validate({ id }, { id: "required|exists:files,id" });
    } catch (e) {
      if (e instanceof ValidationError)
        return res.status(422).json({ errors: e.errors, messages: e.messages });
      throw e;
    }
    const file: any = await this.fileService.find(id);
    if (!file) return res.status(404).json({ message: "Not found" });
    if (!/^(image\/(jpeg|png|webp|gif))$/.test(file.mime_type))
      return res.status(404).json({ message: "No thumbnail" });
    const size = (req.query.size as string) || undefined;
    const format = req.query.format as string as "webp" | "original" | undefined;
    const thumbPath = await this.fileService.getThumbnailVariant(id, size, format);
    if (!thumbPath || !fs.existsSync(thumbPath))
      return res.status(404).json({ message: "Thumbnail not generated" });
    const ext = path.extname(thumbPath).toLowerCase();
    const contentType =
      ext === ".webp"
        ? "image/webp"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".png"
            ? "image/png"
            : ext === ".gif"
              ? "image/gif"
              : "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    const downloadName = `thumb-${size || "md"}-${file.original_name.replace(/\.[^.]+$/, "")}${ext}`;
    res.setHeader("Content-Disposition", `inline; filename="${downloadName}"`);
    fs.createReadStream(thumbPath).pipe(res);
  }

  @Doc({
    summary: "Regenerate thumbnails for an image file",
    tags: ["Files"],
    responses: [
      { status: 200, description: "Thumbnails regenerated" },
      { status: 404, description: "Not an image or not found" },
      { status: 500, description: "Regeneration failed" },
    ],
  })
  async regenerateThumbnail(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
      await req.validate({ id }, { id: "required|exists:files,id" });
    } catch (e) {
      if (e instanceof ValidationError)
        return res.status(422).json({ errors: e.errors, messages: e.messages });
      throw e;
    }
    const file: any = await this.fileService.find(id);
    if (!file) return res.status(404).json({ message: "Not found" });
    if (!/^(image\/(jpeg|png|webp|gif))$/.test(file.mime_type))
      return res.status(404).json({ message: "Not an image" });
    const thumbPath = await this.fileService.regenerateThumbnail(id);
    if (!thumbPath) return res.status(500).json({ message: "Regeneration failed" });
    res.json({ success: true, thumbnail_path: thumbPath, thumbnails: file.thumbnails || {} });
  }

  @Doc({
    summary: "Generate a signed thumbnail URL",
    tags: ["Files"],
    params: [
      { name: "size", in: "query", description: "Thumbnail size key", type: "string" },
      {
        name: "format",
        in: "query",
        description: "Output format",
        type: "string",
        enum: ["webp", "original"],
      },
    ],
    responses: [
      {
        status: 200,
        description: "Signed thumbnail URL",
        example: { url: "", token: "", expires_at: "", size: null, format: null },
      },
      { status: 404, description: "Not an image or not found" },
    ],
  })
  async signedThumbnailUrl(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
      await req.validate({ id }, { id: "required|exists:files,id" });
    } catch (e) {
      if (e instanceof ValidationError)
        return res.status(422).json({ errors: e.errors, messages: e.messages });
      throw e;
    }
    const file: any = await this.fileService.find(id);
    if (!file) return res.status(404).json({ message: "Not found" });
    if (!/^(image\/(jpeg|png|webp|gif))$/.test(file.mime_type))
      return res.status(404).json({ message: "No thumbnail" });
    const size = (req.query.size as string) || undefined;
    const format = req.query.format as string as "webp" | "original" | undefined;
    const expiresInSec = parseInt(
      process.env.THUMB_URL_EXPIRES || process.env.FILE_URL_EXPIRES || "900",
    );
    const payload: any = { file_id: file.id, size: size, format: format, kind: "thumbnail" };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: expiresInSec });
    const url = `${process.env.APP_URL || "http://localhost:3000"}/public/thumbnails/${token}`;
    const expires_at = new Date(Date.now() + expiresInSec * 1000).toISOString();
    res.json({ url, token, expires_at, size: size || null, format: format || null });
  }

  @Doc({
    summary: "Serve a thumbnail via a signed token (public)",
    tags: ["Files"],
    responses: [
      { status: 200, description: "Thumbnail image stream" },
      { status: 400, description: "Bad token kind" },
      { status: 401, description: "Invalid or expired token" },
      { status: 404, description: "Not found or thumbnail not generated" },
    ],
  })
  async publicThumbnail(req: Request, res: Response) {
    const token = req.params.token as string;
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ message: "Invalid or expired link" });
    }
    if (!decoded || decoded.kind !== "thumbnail")
      return res.status(400).json({ message: "Bad token kind" });
    const file: any = await this.fileService.find(decoded.file_id);
    if (!file) return res.status(404).json({ message: "Not found" });
    if (!/^(image\/(jpeg|png|webp|gif))$/.test(file.mime_type))
      return res.status(404).json({ message: "No thumbnail" });
    const thumbPath = await this.fileService.getThumbnailVariant(
      decoded.file_id,
      decoded.size,
      decoded.format,
    );
    if (!thumbPath || !fs.existsSync(thumbPath))
      return res.status(404).json({ message: "Thumbnail not generated" });
    const ext = path.extname(thumbPath).toLowerCase();
    const contentType =
      ext === ".webp"
        ? "image/webp"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".png"
            ? "image/png"
            : ext === ".gif"
              ? "image/gif"
              : "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    const sizeKey = decoded.size || "md";
    const downloadName = `thumb-${sizeKey}-${file.original_name.replace(/\.[^.]+$/, "")}${ext}`;
    res.setHeader("Content-Disposition", `inline; filename="${downloadName}"`);
    fs.createReadStream(thumbPath).pipe(res);
  }
}

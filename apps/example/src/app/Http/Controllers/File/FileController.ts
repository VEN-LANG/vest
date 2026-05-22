import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { Injectable } from '@lara-node/core';
import { Doc } from '@lara-node/router';
import { FileService } from '@app/Services/index';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads/files';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

export const multerUpload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

@Injectable()
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Doc({ summary: 'List all uploaded files', tags: ['Files'], auth: true })
  async index(_req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: await this.fileService.index() });
  }

  @Doc({ summary: 'Get file metadata by ID', tags: ['Files'], auth: true, params: [{ name: 'id', in: 'path', type: 'integer' }] })
  async show(req: Request, res: Response): Promise<void> {
    const file = await this.fileService.find(req.params.id);
    if (!file) { res.status(404).json({ success: false, message: 'Not found' }); return; }
    res.json({ success: true, data: file });
  }

  @Doc({ summary: 'Upload a file (multipart/form-data, field: file)', tags: ['Files'], auth: true, responses: [{ status: 201, description: 'File uploaded' }] })
  async store(req: Request, res: Response): Promise<void> {
    if (!req.file) { res.status(400).json({ success: false, message: 'No file uploaded' }); return; }
    res.status(201).json({ success: true, data: await this.fileService.store(req.file, req.user!.id) });
  }

  @Doc({ summary: 'Download a file by ID', tags: ['Files'], auth: true })
  async download(req: Request, res: Response): Promise<void> {
    const file = await this.fileService.find(req.params.id);
    if (!file) { res.status(404).json({ success: false, message: 'Not found' }); return; }
    res.download(
      file.getAttribute('disk_path') as string,
      file.getAttribute('original_name') as string,
    );
  }

  @Doc({ summary: 'Delete a file (soft delete + remove from disk)', tags: ['Files'], auth: true })
  async destroy(req: Request, res: Response): Promise<void> {
    await this.fileService.destroy(req.params.id);
    res.json({ success: true, message: 'File deleted' });
  }
}

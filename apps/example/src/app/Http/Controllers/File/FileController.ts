import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { Injectable } from '@lara-node/core';
import { Doc } from '@lara-node/router';
import { FileService } from '@app/Services/index';
import FileModel from '@app/Models/File/File';

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

  @Doc({
    summary: 'Get file metadata by ID (route-model binding)',
    description: 'The :file parameter is automatically resolved to a File model instance.',
    tags: ['Files'],
    auth: true,
    params: [{ name: 'file', in: 'path', type: 'integer', description: 'File ID — auto-bound to File model' }],
    responses: [{ status: 200, description: 'File metadata' }, { status: 404, description: 'Not found' }],
  })
  async show(_req: Request, res: Response, file: FileModel): Promise<void> {
    res.json({ success: true, data: file });
  }

  @Doc({ summary: 'Upload a file (multipart/form-data, field: file)', tags: ['Files'], auth: true, responses: [{ status: 201, description: 'File uploaded' }] })
  async store(req: Request, res: Response): Promise<void> {
    if (!req.file) { res.status(400).json({ success: false, message: 'No file uploaded' }); return; }
    res.status(201).json({ success: true, data: await this.fileService.store(req.file, req.user!.id) });
  }

  @Doc({ summary: 'Download a file by ID (route-model binding)', tags: ['Files'], auth: true })
  async download(_req: Request, res: Response, file: FileModel): Promise<void> {
    res.download(
      file.disk_path,
      file.original_name,
    );
  }

  @Doc({ summary: 'Delete a file (soft delete + remove from disk)', tags: ['Files'], auth: true })
  async destroy(_req: Request, res: Response, file: FileModel): Promise<void> {
    await this.fileService.destroy(file.id);
    res.json({ success: true, message: 'File deleted' });
  }
}

import { promises as fs } from 'fs';
import { Injectable } from '@lara-node/core';
import File from '../Models/File/File';

@Injectable()
export class FileService {
  async index() { return File.query().get(); }
  async find(id: number | string) { return File.find(id); }

  async store(file: Express.Multer.File, userId: number | string) {
    return File.create({
      original_name: file.originalname,
      filename: file.filename,
      mime_type: file.mimetype,
      size: file.size,
      disk_path: file.path,
      user_id: userId,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  async destroy(id: number | string) {
    const file = await File.find(id) as File | null;
    if (!file) throw Object.assign(new Error('File not found'), { status: 404 });
    try { await fs.unlink(file.disk_path); } catch { /* file missing on disk */ }
    await file.delete();
  }
}

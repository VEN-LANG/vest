import { Model, use } from '@lara-node/db';
import { SoftDeletes, Timestamps } from '@lara-node/db';
import { Bind } from '@lara-node/router';

@Bind()            // registers 'file' for route-model binding
@use(SoftDeletes, Timestamps)
export class File extends Model {
  static table = 'files';
  static fillable: string[] = [
    'original_name', 'filename', 'mime_type', 'size', 'disk_path',
    'user_id', 'created_at', 'updated_at', 'deleted_at',
  ];
  static casts: Record<string, string> = {
    size: 'int',
    created_at: 'datetime', updated_at: 'datetime', deleted_at: 'datetime',
  };
}

export default File;

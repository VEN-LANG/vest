import RouterBuilder from '@lara-node/router';
import { AuthController } from '../app/Http/Controllers/User/AuthController';
import { UserController } from '../app/Http/Controllers/User/UserController';
import { RoleController } from '../app/Http/Controllers/User/RoleController';
import { PermissionController } from '../app/Http/Controllers/User/PermissionController';
import { FileController, multerUpload } from '../app/Http/Controllers/File/FileController';
import { ExportController } from '../app/Http/Controllers/User/ExportController';

export const routesBuilder = new RouterBuilder();
const rb = routesBuilder;

rb.prefix('/auth').group((g: RouterBuilder) => {
  g.post('/register', [AuthController, 'register']);
  g.post('/login', [AuthController, 'login']);
  g.get('/me', 'auth', [AuthController, 'me']);
});

// :user — route-model binding auto-resolves to User model instance
rb.prefix('/users').middleware(['auth', 'must-be-active']).group((g: RouterBuilder) => {
  g.get('/', 'can:view_users', [UserController, 'index']);
  g.get('/:user', 'can:view_users', [UserController, 'show']);
  g.get('/:user/profile', [UserController, 'showProfile']);
  g.post('/', 'can:create_users', [UserController, 'store']);
  g.put('/:user', 'can:update_users', [UserController, 'update']);
  g.put('/:user/profile', [UserController, 'updateProfile']);
  g.post('/:user/password', 'can:update_users', [UserController, 'setPassword']);
  g.post('/:user/password/reset', [UserController, 'resetPassword']);
  g.post('/:user/roles', 'can:add_roles_to_users', [UserController, 'addRole']);
  g.delete('/:user/roles/:role', 'can:remove_roles_from_users', [UserController, 'removeRole']);
  g.delete('/:user', 'can:delete_users', [UserController, 'destroy']);
  g.patch('/:user/status', 'can:activate_and_deactivate_users', [UserController, 'toggleStatus']);
});

// :role — route-model binding auto-resolves to Role model instance
rb.prefix('/roles').middleware(['auth', 'must-be-active']).group((g: RouterBuilder) => {
  g.get('/', 'can:view_roles', [RoleController, 'index']);
  g.get('/:role', 'can:view_roles', [RoleController, 'show']);
  g.post('/', 'can:create_roles', [RoleController, 'store']);
  g.put('/:role', 'can:update_roles', [RoleController, 'update']);
  g.delete('/:role', 'can:delete_roles', [RoleController, 'destroy']);
  g.post('/:role/permissions', 'can:add_permissions_to_roles', [RoleController, 'syncPermissions']);
});

// :permission — route-model binding auto-resolves to Permission model instance
rb.prefix('/permissions').middleware(['auth', 'must-be-active']).group((g: RouterBuilder) => {
  g.get('/', 'can:view_permissions', [PermissionController, 'index']);
  g.get('/:permission', 'can:view_permissions', [PermissionController, 'show']);
});

// Exports — CSV, Excel, PDF, XML
rb.prefix('/users/export').middleware(['auth', 'must-be-active', 'can:view_users']).group((g: RouterBuilder) => {
  g.get('/csv',   [ExportController, 'csv']);
  g.get('/excel', [ExportController, 'excel']);
  g.get('/pdf',   [ExportController, 'pdf']);
  g.get('/xml',   [ExportController, 'xml']);
});

// :file — route-model binding auto-resolves to File model instance
rb.prefix('/files').middleware(['auth', 'must-be-active']).group((g: RouterBuilder) => {
  g.get('/', 'can:view_files', [FileController, 'index']);
  g.get('/:file', 'can:view_files', [FileController, 'show']);
  g.get('/:file/download', 'can:view_files', [FileController, 'download']);
  g.post('/', multerUpload.single('file'), 'can:upload_files', [FileController, 'store']);
  g.delete('/:file', 'can:delete_files', [FileController, 'destroy']);
});

export default rb;

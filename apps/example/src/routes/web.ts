/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group.
|
*/

import RouterBuilder from "@vest/router";
import { FileController } from "@app/Http/Controllers/File/FileController";

export const webRoutesBuilder = new RouterBuilder();
const rb = webRoutesBuilder;

/*
|--------------------------------------------------------------------------
| Public File Routes (no auth required)
|--------------------------------------------------------------------------
*/
rb.prefix("/public").group((g: RouterBuilder) => {
  g.get("/files/:token", [FileController, "publicDownload"]);
  g.get("/thumbnails/:token", [FileController, "publicThumbnail"]);
});

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/
rb.get("/health", (_req: any, res: any) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default rb;

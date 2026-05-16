import { container, Application } from '@lara-node/core';
import { AppServiceProvider } from '../app/Providers/AppServiceProvider';

export const app = new Application(container);

export async function bootForConsole(): Promise<void> {
  try {
    app.register(AppServiceProvider);
    await app.boot();
  } catch (err) {
    console.error('Failed to boot application:', err);
    process.exit(1);
  }
}

export async function startApplication(): Promise<void> {
  const port = process.env.PORT ?? 3000;
  app.register(AppServiceProvider);
  app.configureBaseMiddleware();
  await app.boot();
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

export default app;

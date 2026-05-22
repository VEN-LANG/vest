import { Router } from 'express';

/*
|--------------------------------------------------------------------------
| Broadcasting Channel Authorization Routes
|--------------------------------------------------------------------------
|
| Define channel authorization endpoints for WebSocket channels.
| These are used by the @lara-node/events broadcasting system.
|
*/

export const channelRouter = Router();

channelRouter.post('/auth', (req, res) => {
  // Channel authorization endpoint
  // The @lara-node/events BroadcastServiceProvider handles this automatically
  // when configured. This route is a manual fallback.
  res.json({ authorized: false, message: 'Configure BroadcastServiceProvider' });
});

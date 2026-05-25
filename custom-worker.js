import { default as handler } from './.open-next/worker.js';
import { refreshBingImages } from './worker/refresh.js';

export default {
  fetch: handler.fetch,

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(refreshBingImages(env));
  },
};

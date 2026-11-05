/** The browser calls its own Vite origin; only that origin may use this proxy. */
export function createDevApiProxy(target) {
  const backend = new URL(target);
  const sameOrigin = (req) => {
    if (!req.headers.origin) return true;
    try {
      const origin = new URL(req.headers.origin);
      return ['http:', 'https:'].includes(origin.protocol) && origin.host === req.headers.host;
    } catch {
      return false;
    }
  };
  return {
    target: backend.origin,
    changeOrigin: true,
    bypass(req, res) {
      if (sameOrigin(req)) return;
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Cross-origin API requests are not permitted by the development proxy.' }));
      return false;
    },
    configure(proxy) {
      proxy.on('proxyReq', (upstream, req) => {
        // changeOrigin changes Host, but does not change Origin. Normalize both
        // for the same-origin backend hop, after rejecting unrelated browsers.
        if (req.headers.origin && sameOrigin(req)) upstream.setHeader('Origin', backend.origin);
      });
    },
  };
}

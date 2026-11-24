/* MauKue static site on Freebuff Sites: serve the staged public build.
   Directory URLs such as "/" are resolved to index.html explicitly. */
export default {
  async fetch(request, env) {
    if (!env || !env.ASSETS) {
      return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    }
    const url = new URL(request.url);
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;
    if (url.pathname === '/' || url.pathname.charAt(url.pathname.length - 1) === '/') {
      url.pathname += 'index.html';
      const index = await env.ASSETS.fetch(new Request(url.toString(), request));
      if (index.ok) {
        return new Response(index.body, { status: 200, headers: index.headers });
      }
    }
    return response;
  }
};

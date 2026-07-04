import '../_lib/crypto-polyfill.js';
import Meting from '@meting/core';

export const onRequestGet = async ({ request }) => {
  const url = new URL(request.url);
  const keyword = (url.searchParams.get('keyword') || '').trim();
  if (!keyword) {
    return Response.json({ error: 'keyword is required' }, { status: 400 });
  }

  const server = url.searchParams.get('server') || 'netease';
  const limit = Math.min(Number(url.searchParams.get('limit')) || 10, 30);
  const page = Math.max(Number(url.searchParams.get('page')) || 1, 1);

  const supported = Meting.getSupportedPlatforms();
  const useServer = supported.includes(server) ? server : 'netease';

  try {
    const meting = new Meting(useServer);
    meting.format(true);
    const raw = await meting.search(keyword, { limit, page });
    const songs = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Response.json({ songs });
  } catch (err) {
    console.error('search error:', err);
    const body = JSON.stringify({
      error: err.message || 'search failed',
      stack: err.stack,
      name: err.name,
    });
    return new Response(body, {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

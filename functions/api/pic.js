import '../_lib/crypto-polyfill.js';
import Meting from '@meting/core';

export const onRequestGet = async ({ request }) => {
  const url = new URL(request.url);
  const id = (url.searchParams.get('id') || '').trim();
  if (!id) {
    return Response.json({ error: 'id is required' }, { status: 400 });
  }

  const server = url.searchParams.get('server') || 'netease';
  const size = Number(url.searchParams.get('size')) || 300;
  const supported = Meting.getSupportedPlatforms();
  const useServer = supported.includes(server) ? server : 'netease';

  try {
    const meting = new Meting(useServer);
    meting.format(true);
    const raw = await meting.pic(id, size);
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!data.url) {
      return Response.json({ error: 'cover not found' }, { status: 404 });
    }
    return Response.json({ url: data.url });
  } catch (err) {
    return Response.json({ error: err.message || 'pic failed' }, { status: 500 });
  }
};

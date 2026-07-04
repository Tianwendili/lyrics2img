import '../_lib/crypto-polyfill.js';
import Meting from '@meting/core';

export const onRequestGet = async ({ request }) => {
  const url = new URL(request.url);
  const id = (url.searchParams.get('id') || '').trim();
  if (!id) {
    return Response.json({ error: 'id is required' }, { status: 400 });
  }

  const server = url.searchParams.get('server') || 'netease';
  const supported = Meting.getSupportedPlatforms();
  const useServer = supported.includes(server) ? server : 'netease';

  try {
    const meting = new Meting(useServer);
    meting.format(true);
    const raw = await meting.lyric(id);
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Response.json({
      lyric: data.lyric || '',
      tlyric: data.tlyric || '',
    });
  } catch (err) {
    return Response.json({ error: err.message || 'lyric failed' }, { status: 500 });
  }
};

export const onRequestGet = async ({ request }) => {
  const url = new URL(request.url);
  const targetUrl = (url.searchParams.get('url') || '').trim();
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
    return Response.json({ error: 'valid url is required' }, { status: 400 });
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': new URL(targetUrl).origin,
      },
    });

    if (!upstream.ok) {
      return Response.json({ error: 'upstream error' }, { status: upstream.status });
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const buffer = await upstream.arrayBuffer();

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    return Response.json({ error: err.message || 'proxy failed' }, { status: 500 });
  }
};

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
    let lyricText = data.lyric || '';
    let kanaText = '';

    // 提取 QQ 音乐特有的 [kana:...] 假名标签
    // 格式：[kana:N假名N假名...]，其中 N 是数字前缀（表示该假名对应后面 N 个汉字）
    if (lyricText) {
      const kanaMatch = lyricText.match(/\[kana:(.+?)\]/);
      if (kanaMatch) {
        kanaText = kanaMatch[1];
        // 从歌词中移除 kana 行，避免显示出来
        lyricText = lyricText.replace(/\[kana:.+?\]\r?\n?/g, '');
      }
    }

    return Response.json({
      lyric: lyricText,
      tlyric: data.tlyric || '',
      kana: kanaText,
    });
  } catch (err) {
    return Response.json({ error: err.message || 'lyric failed' }, { status: 500 });
  }
};

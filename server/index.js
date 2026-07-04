import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Meting from '@meting/core';
import Kuroshiro from 'kuroshiro';
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji';

const app = express();
const PORT = process.env.PORT || 3001;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');

app.use(cors());
app.use(express.static(PUBLIC_DIR));

// ===== Kuroshiro (furigana) 懒加载 =====
let kuroshiro = null;
let kuroshiroReady = false;
let kuroshiroInitPromise = null;

function initKuroshiro() {
  if (kuroshiroInitPromise) return kuroshiroInitPromise;
  kuroshiroInitPromise = (async () => {
    // kuroshiro / kuromoji 是 CommonJS 包，ESM import 后需要解包 default.default
    const K = Kuroshiro.default?.default || Kuroshiro.default || Kuroshiro;
    const A = KuromojiAnalyzer.default?.default || KuromojiAnalyzer.default || KuromojiAnalyzer;
    kuroshiro = new K();
    await kuroshiro.init(new A());
    kuroshiroReady = true;
    console.log('kuroshiro ready');
  })();
  return kuroshiroInitPromise;
}

const SUPPORTED_SERVERS = Meting.getSupportedPlatforms();

function pickServer(req) {
  const server = String(req.query.server || 'netease').toLowerCase();
  return SUPPORTED_SERVERS.includes(server) ? server : 'netease';
}

function parseJson(value) {
  if (value == null) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

app.get('/api/platforms', (req, res) => {
  res.json({ platforms: SUPPORTED_SERVERS, default: 'netease' });
});

app.get('/api/search', async (req, res) => {
  const keyword = String(req.query.keyword || '').trim();
  if (!keyword) {
    return res.status(400).json({ error: 'keyword is required' });
  }

  const server = pickServer(req);
  const limit = Math.min(Number(req.query.limit) || 10, 30);
  const page = Math.max(Number(req.query.page) || 1, 1);

  try {
    const meting = new Meting(server);
    meting.format(true);
    const raw = await meting.search(keyword, { limit, page });
    const songs = parseJson(raw) || [];
    res.json({ songs });
  } catch (err) {
    console.error('search error:', err);
    res.status(500).json({ error: err.message || 'search failed' });
  }
});

app.get('/api/lyric', async (req, res) => {
  const id = String(req.query.id || '').trim();
  if (!id) {
    return res.status(400).json({ error: 'id is required' });
  }

  const server = pickServer(req);

  try {
    const meting = new Meting(server);
    meting.format(true);
    const raw = await meting.lyric(id);
    const data = parseJson(raw) || {};
    res.json({
      lyric: data.lyric || '',
      tlyric: data.tlyric || '',
    });
  } catch (err) {
    console.error('lyric error:', err);
    res.status(500).json({ error: err.message || 'lyric failed' });
  }
});

app.get('/api/pic', async (req, res) => {
  const id = String(req.query.id || '').trim();
  if (!id) {
    return res.status(400).json({ error: 'id is required' });
  }

  const server = pickServer(req);
  const size = Number(req.query.size) || 300;

  try {
    const meting = new Meting(server);
    meting.format(true);
    const raw = await meting.pic(id, size);
    const data = parseJson(raw) || {};
    if (!data.url) {
      return res.status(404).json({ error: 'cover not found' });
    }
    res.json({ url: data.url });
  } catch (err) {
    console.error('pic error:', err);
    res.status(500).json({ error: err.message || 'pic failed' });
  }
});

app.get('/api/proxy-image', async (req, res) => {
  const url = String(req.query.url || '').trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: 'valid url is required' });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': new URL(url).origin,
      },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'upstream error' });
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (err) {
    console.error('proxy-image error:', err);
    res.status(500).json({ error: err.message || 'proxy failed' });
  }
});

app.get('/api/furigana', async (req, res) => {
  const text = String(req.query.text || '').trim();
  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }

  try {
    await initKuroshiro();
    const rawHtml = await kuroshiro.convert(text, {
      to: 'hiragana',
      mode: 'furigana',
    });
    // 去掉 rp 标签（括号降级），海报只保留 ruby/rt
    const cleanHtml = rawHtml
      .replace(/<rp>[^<]*<\/rp>/gi, '')
      .replace(/<ruby>/gi, '<ruby>')
      .replace(/<\/ruby>/gi, '</ruby>');
    res.json({ html: cleanHtml, raw: rawHtml });
  } catch (err) {
    console.error('furigana error:', err);
    res.status(500).json({ error: err.message || 'furigana failed' });
  }
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`lyrics2img server listening on http://localhost:${PORT}`);
  console.log(`serving frontend from: ${PUBLIC_DIR}`);
  console.log(`supported platforms: ${SUPPORTED_SERVERS.join(', ')}`);
});

# lyrics2img

Generate share-ready lyrics poster images using the [Meting](https://github.com/metowolf/Meting) music API framework.

UI inspired by [LyricPost](https://github.com/palinkiewicz/lyricpost) — but rebuilt to fetch song data from Meting (NetEase / Tencent / KuGou / Baidu / Kuwo) and **without** the Spotify logo on the generated posters.

## Architecture

```
lyrics2img/
├── public/                 # Frontend (vanilla JS, no build step)
│   ├── index.html
│   ├── index.js
│   ├── _routes.json        # Pages Functions routing
│   ├── classes/
│   │   ├── DataFetcher.js  # calls the Pages Functions API
│   │   ├── DOMHandler.js   # UI logic (no Spotify logo, client-side furigana)
│   │   └── data/
│   │       ├── Artist.js
│   │       ├── Lyric.js    # supports [mm:ss.xx] and [mm:ss.xxx] timestamps
│   │       └── Song.js     # adapted to Meting's data shape
│   └── styles/
│       ├── main.css
│       ├── wizard.css
│       └── song-image.css
├── functions/              # Cloudflare Pages Functions (serverless backend)
│   ├── _lib/
│   │   └── crypto-polyfill.js  # patches node:crypto AES-ECB null iv for Workers
│   └── api/
│       ├── platforms.js    # GET /api/platforms
│       ├── search.js       # GET /api/search
│       ├── lyric.js        # GET /api/lyric
│       ├── pic.js          # GET /api/pic
│       └── proxy-image.js  # GET /api/proxy-image (CORS bypass)
├── wrangler.toml           # Cloudflare Pages config (nodejs_compat)
└── package.json            # Root deps for Functions (@meting/core)
```

### Backend endpoints (Cloudflare Pages Functions)

| Endpoint | Purpose |
|---|---|
| `GET /api/platforms` | List supported music platforms |
| `GET /api/search?keyword=&server=&limit=` | Search songs (returns Meting-formatted array) |
| `GET /api/lyric?id=&server=` | Get `{lyric, tlyric}` for a song |
| `GET /api/pic?id=&server=&size=` | Resolve a `pic_id` to a cover URL |
| `GET /api/proxy-image?url=` | Proxy external image bytes to bypass CORS for `html2canvas` |

### Furigana (Japanese ruby annotation)

Furigana is **client-side**: `kuroshiro` + `kuroshiro-analyzer-kuromoji` are loaded from `esm.sh` on demand, and the kuromoji dictionary (~22MB) is fetched from `cdn.jsdelivr.net`. No backend involved — works on any static host.

## Deployment

### Option A: Cloudflare Pages (recommended, free)

1. Push this repo to GitHub.
2. Go to [Cloudflare Pages](https://pages.cloudflare.com/) → Create a project → Connect to GitHub → Select `lyrics2img`.
3. Configure build settings:
   - **Framework preset**: `None`
   - **Build command**: `npm install` (or leave empty if you don't need to install root deps — Cloudflare will install from `package.json` automatically)
   - **Build output directory**: `public`
   - **Environment variables**: `NODEJS_COMPAT` = `1`
4. Deploy. Your site will be live at `https://lyrics2img.pages.dev/`.

The `wrangler.toml` already sets `compatibility_flags = ["nodejs_compat"]` and `pages_build_output_dir = "public"`, which Cloudflare reads automatically.

### Option B: Local development

```bash
# Install root dependencies (for @meting/core used by Functions)
npm install

# Run wrangler pages dev (serves both /api/* Functions and public/ static files)
npm run dev
# → http://127.0.0.1:8788
```

### Option C: Legacy Node.js backend (optional)

If you prefer the original Node.js + Express backend (e.g. for local testing without wrangler), it's preserved in `server/`:

```bash
cd server
npm install
npm start
# → http://localhost:3001
```

Set `window.API_BASE = 'http://localhost:3001'` in the browser console to point the frontend at it.

## Usage

1. Pick a music platform from the dropdown (default: NetEase Cloud Music).
2. Type a song name + artist, hit **搜索！**.
3. Pick the right song from the results.
4. Select one or more lyric lines (use **全选** to select all).
5. Customize background color, text color, width, font, furigana (for Japanese lyrics).
6. Hit the download icon to save a PNG — no Spotify logo, no watermark.

## Notes

- Cover images and lyrics come from the chosen platform via Meting. Availability depends on the platform.
- The image proxy exists because platform CDNs do not send CORS headers; `html2canvas` needs same-origin bytes.
- The Spotify-logo toggle from LyricPost has been removed entirely (HTML, CSS, and JS).
- `functions/_lib/crypto-polyfill.js` patches a `node:crypto` quirk in the Workers runtime where `createCipheriv('aes-128-ecb', key, null)` rejects `null` iv. ECB mode legitimately has no iv, so the polyfill converts `null` to an empty Buffer.

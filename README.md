# lyrics2img

Generate share-ready lyrics poster images using the [Meting](https://github.com/metowolf/Meting) music API framework.

UI inspired by [LyricPost](https://github.com/palinkiewicz/lyricpost) — but rebuilt to fetch song data from Meting (NetEase / Tencent / KuGou / Baidu / Kuwo) and **without** the Spotify logo on the generated posters.

## Architecture

```
lyrics2img/
├── server/                 # Node.js + Express backend wrapping @meting/core
│   ├── index.js            # REST endpoints + static file serving
│   └── package.json
├── public/                 # Frontend (vanilla JS, no build step)
│   ├── index.html
│   ├── index.js
│   ├── classes/
│   │   ├── DataFetcher.js  # calls the local backend
│   │   ├── DOMHandler.js   # UI logic (no Spotify logo)
│   │   └── data/
│   │       ├── Artist.js
│   │       ├── Lyric.js    # supports [mm:ss.xx] and [mm:ss.xxx] timestamps
│   │       └── Song.js     # adapted to Meting's data shape
│   └── styles/
│       ├── main.css
│       ├── wizard.css
│       └── song-image.css
├── Meting/                 # cloned reference (upstream source)
└── lyricpost/              # cloned reference (UI inspiration)
```

### Backend endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/platforms` | List supported music platforms |
| `GET /api/search?keyword=&server=&limit=` | Search songs (returns Meting-formatted array) |
| `GET /api/lyric?id=&server=` | Get `{lyric, tlyric}` for a song |
| `GET /api/pic?id=&server=&size=` | Resolve a `pic_id` to a cover URL |
| `GET /api/proxy-image?url=` | Proxy external image bytes to bypass CORS for `html2canvas` |

The backend also serves the `public/` directory statically, so the entire app is reachable at a single origin.

## Running

```bash
cd server
npm install
npm start
```

Then open <http://localhost:3001/> in your browser.

## Usage

1. Pick a music platform from the dropdown (default: NetEase Cloud Music).
2. Type a song name + artist, hit **Find that song!**.
3. Pick the right song from the results.
4. Select one or more lyric lines.
5. Customize background color, text color, width, font.
6. Hit the download icon to save a PNG — no Spotify logo, no watermark.

## Notes

- Cover images and lyrics come from the chosen platform via Meting. Availability depends on the platform.
- The image proxy exists because platform CDNs do not send CORS headers; `html2canvas` needs same-origin bytes.
- The Spotify-logo toggle from LyricPost has been removed entirely (HTML, CSS, and JS).

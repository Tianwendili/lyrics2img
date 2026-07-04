class Song {
    /**
     * @param {object} songInfo Meting formatted song object:
     *   { id, name, artist: string[], album, pic_id, url_id, lyric_id, source }
     * @param {{lyric?: string, tlyric?: string}} [lyrics]
     */
    constructor(songInfo, lyrics = null) {
        /** @type {string} */
        this.id = String(songInfo.id ?? '');

        /** @type {string} */
        this.name = songInfo.name;

        /** @type {string} */
        this.album = songInfo.album || '';

        /** @type {string} */
        this.picId = String(songInfo.pic_id ?? '');

        /** @type {string} */
        this.lyricId = String(songInfo.lyric_id ?? this.id);

        /** @type {string} */
        this.source = songInfo.source || '';

        /** @type {Artist[]} */
        this.artists = Array.isArray(songInfo.artist)
            ? songInfo.artist.map((name) => new Artist({ name: String(name) }))
            : [];

        /** @type {string|null} Resolved cover URL (set by DataFetcher) */
        this.albumCoverUrl = null;

        /** @type {boolean} */
        this.hasSyncedLyrics = Boolean(lyrics?.lyric);

        /** @type {Lyric[]|undefined} */
        this.lyrics = undefined;

        if (lyrics) {
            this.loadLyrics(lyrics);
        }
    }

    /**
     * Parses a Meting lyric payload ({lyric, tlyric}) into Lyric[].
     * Drops empty lines and translation-only metadata.
     * @param {{lyric?: string, tlyric?: string}} lyrics
     */
    loadLyrics(lyrics) {
        const raw = lyrics?.lyric || '';
        this.hasSyncedLyrics = /\[\d{2}:\d{2}/.test(raw);

        this.lyrics = raw
            .replace(/\r/g, '')
            .split('\n')
            .map((line) => new Lyric(line))
            .filter((lyric) => {
                const t = lyric.text.trim();
                if (t === '') return false;
                if (lyric.time === null && /^\[[a-z]+:/i.test(lyric.text)) return false;
                return true;
            });

        if (this.lyrics.length === 0) {
            this.lyrics = undefined;
        }
    }
}

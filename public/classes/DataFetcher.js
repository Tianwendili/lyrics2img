class DataFetcher {
    constructor() {
        /** @type {string} current music platform */
        this.server = 'tencent';

        /**
         * Backend base URL. Empty string means same-origin; override via
         * window.API_BASE if the backend runs on a different host/port.
         * @type {string}
         */
        this.apiBase = (typeof window !== 'undefined' && window.API_BASE) || '';
    }

    /**
     * Switches the active music platform.
     * @param {string} server one of netease/tencent/kugou/baidu/kuwo
     */
    setServer(server) {
        this.server = server;
    }

    /**
     * Wraps an external image URL with the local proxy to avoid CORS issues
     * when fetching the bytes (e.g. for html2canvas base64 conversion).
     * @param {string} url
     * @returns {string}
     */
    proxyImageUrl(url) {
        if (!url) return '';
        if (url.startsWith(this.apiBase + '/') || url.startsWith('/api/')) {
            return url;
        }
        return `${this.apiBase}/api/proxy-image?url=${encodeURIComponent(url)}`;
    }

    /**
     * Searches for songs via the local Meting backend.
     * @param {string} keyword
     * @param {number} [limit=6]
     * @returns {Promise<Song[]>}
     */
    async getSongInfos(keyword, limit = 6) {
        const url =
            `${this.apiBase}/api/search?keyword=${encodeURIComponent(keyword)}` +
            `&server=${encodeURIComponent(this.server)}&limit=${limit}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
        }
        const data = await response.json();
        const songs = (data.songs || []).map((s) => new Song(s));

        // Resolve cover URLs in parallel; the proxy makes them fetchable.
        await Promise.all(
            songs.map(async (song) => {
                try {
                    const coverUrl = await this.getCoverUrl(song.picId);
                    song.albumCoverUrl = coverUrl || null;
                } catch (err) {
                    console.error('cover fetch failed for', song.name, err);
                    song.albumCoverUrl = null;
                }
            })
        );

        return songs;
    }

    /**
     * Resolves the album cover URL for a pic_id.
     * @param {string} picId
     * @returns {Promise<string|null>}
     */
    async getCoverUrl(picId) {
        if (!picId) return null;
        const url =
            `${this.apiBase}/api/pic?id=${encodeURIComponent(picId)}` +
            `&server=${encodeURIComponent(this.server)}&size=300`;

        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        return data.url || null;
    }

    /**
     * Fetches lyrics for a song.
     * @param {string} lyricId
     * @returns {Promise<{lyric: string, tlyric: string}|null>}
     */
    async getSongLyrics(lyricId) {
        const url =
            `${this.apiBase}/api/lyric?id=${encodeURIComponent(lyricId)}` +
            `&server=${encodeURIComponent(this.server)}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Lyric fetch failed: ${response.status}`);
        }
        const data = await response.json();
        if (!data || (!data.lyric && !data.tlyric)) return null;
        return { lyric: data.lyric || '', tlyric: data.tlyric || '' };
    }
}

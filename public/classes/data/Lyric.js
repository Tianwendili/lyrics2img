class Lyric {
    /**
     * @param {string} lyric a single line, optionally prefixed with [mm:ss.xx] or [mm:ss.xxx]
     */
    constructor(lyric) {
        const timeMatch = lyric.match(/\[(\d{2}):(\d{2})\.(\d{1,3})\]/);

        /** @type {number?} milliseconds, or null when the line has no timestamp */
        this.time = timeMatch
            ? (parseInt(timeMatch[1], 10) * 60 * 1000) +
                (parseInt(timeMatch[2], 10) * 1000) +
                (parseInt(timeMatch[3], 10) * (timeMatch[3].length === 3 ? 1 : 10))
            : null;

        /** @type {string} */
        this.text = timeMatch
            ? lyric.substring(timeMatch[0].length).trim()
            : lyric.trim();
    }
}

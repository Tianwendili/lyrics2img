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
     * Parses a Meting lyric payload ({lyric, tlyric, kana}) into Lyric[].
     * Drops empty lines and translation-only metadata.
     * @param {{lyric?: string, tlyric?: string, kana?: string}} lyrics
     */
    loadLyrics(lyrics) {
        const raw = lyrics?.lyric || '';
        this.hasSyncedLyrics = /\[\d{2}:\d{2}/.test(raw);

        /** @type {string} QQ 音乐特有：假名注音串（格式如 "1よる1か1し..."） */
        this.kana = lyrics?.kana || '';

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

    /**
     * 用 QQ 音乐自带的 kana 字符串，把给定歌词文本转换成带 <ruby>/<rt> 的 HTML。
     *
     * 工作原理：
     * - kana 串形如 "N假名N假名..."，其中数字 N 是前缀，
     *   表示这个假名对应歌词中接下来 N 个汉字（熟字训/多字连读时 N > 1）。
     * - 按顺序遍历歌词全文，遇到汉字就消耗一个 kana 条目，非汉字直接输出。
     * - 返回字符串中汉字被包裹成 <ruby>漢字<rt>かな</rt></ruby>。
     *
     * @param {string} text 一行纯文本歌词
     * @param {number} globalKanjiIndex 这行开头之前，已经消耗了多少个汉字（全局偏移）
     * @returns {{html: string, consumed: number}} 带 ruby 的 HTML，以及本行消耗的汉字数
     */
    applyKanaToText(text, globalKanjiIndex) {
        if (!this.kana) {
            return { html: text, consumed: 0 };
        }
        const entries = this._parseKanaEntries();
        let result = '';
        let kanjiInLine = 0;
        let entryIdx = globalKanjiIndex;

        // 累积未闭合的汉字（用于 N>1 的熟字训情况：多个汉字共享一个假名）
        let pendingKanji = '';
        let pendingKana = '';
        let pendingRemaining = 0;

        for (const ch of text) {
            if (this._isKanji(ch)) {
                if (pendingRemaining > 0) {
                    // 继续累积到当前熟字训组
                    pendingKanji += ch;
                    pendingRemaining--;
                    kanjiInLine++;
                    if (pendingRemaining === 0) {
                        result += `<ruby>${pendingKanji}<rt>${pendingKana}</rt></ruby>`;
                        pendingKanji = '';
                        pendingKana = '';
                    }
                } else {
                    // 开始新的 kana 条目
                    if (entryIdx < entries.length) {
                        const { count, kana } = entries[entryIdx];
                        entryIdx++;
                        if (count <= 1) {
                            result += `<ruby>${ch}<rt>${kana}</rt></ruby>`;
                            kanjiInLine++;
                        } else {
                            pendingKanji = ch;
                            pendingKana = kana;
                            pendingRemaining = count - 1;
                            kanjiInLine++;
                        }
                    } else {
                        result += ch;
                        kanjiInLine++;
                    }
                }
            } else {
                // 非汉字：如果有未闭合的 pending（理论上不会，因为 count 应准确）
                if (pendingRemaining > 0 && pendingKanji) {
                    result += `<ruby>${pendingKanji}<rt>${pendingKana}</rt></ruby>`;
                    pendingKanji = '';
                    pendingKana = '';
                    pendingRemaining = 0;
                }
                result += ch;
            }
        }

        // 行末还有未闭合的 pending（行刚好以熟字训结尾）
        if (pendingKanji) {
            result += `<ruby>${pendingKanji}<rt>${pendingKana}</rt></ruby>`;
        }

        return { html: result, consumed: kanjiInLine };
    }

    /**
     * 把 kana 字符串解析成 [{count, kana}, ...] 数组（缓存）
     * @private
     * @returns {Array<{count: number, kana: string}>}
     */
    _parseKanaEntries() {
        if (this._kanaEntriesCache) return this._kanaEntriesCache;
        const entries = [];
        if (!this.kana) {
            this._kanaEntriesCache = entries;
            return entries;
        }
        const re = /(\d+)(\D+)/g;
        let m;
        while ((m = re.exec(this.kana)) !== null) {
            entries.push({
                count: parseInt(m[1], 10) || 1,
                kana: m[2],
            });
        }
        this._kanaEntriesCache = entries;
        return entries;
    }

    /**
     * 判断一个字符是否是 CJK 统一汉字
     * @param {string} ch
     * @returns {boolean}
     * @private
     */
    _isKanji(ch) {
        const code = ch.codePointAt(0);
        return code >= 0x4e00 && code <= 0x9fff;
    }
}

const SONGS_TO_FETCH = 6;
const DOWNLOAD_SCALING_FACTOR = 4;
const SELECTION_ANIMATION_DELAY = 300;
const NEXT_LINE_ANIMATION_DELAY = 30;
const SEARCHING_FOR_SONG = "正在搜索歌曲...";
const SEARCHING_FOR_LYRICS = "正在获取歌词...";
const DOWNLOADING = "正在下载海报...";
const NO_LYRICS_FOUND =
    "未找到歌词<br>也可以点击这里手动输入歌词 :)";
const NO_LYRICS_SELECTED =
    "还没有选择歌词<br>也可以点击这里手动输入歌词 :)";
const FURIGANA_LOADING = "正在生成假名注释...";

const BACKGROUND_SHADOW_COLOR = "rgba(0, 0, 0, 0.25)";
const BACKGROUND_SHADOW_BORDER_RADIUS = 24;
const BACKGROUND_SHADOW_BLUR = 12;
const BACKGROUND_SHADOW_OFFSET_X = 0;
const BACKGROUND_SHADOW_OFFSET_Y = 4;
const BACKGROUND_TO_SHADOW_FACTOR = 4;

const COLORS = [
    "#008fd1",
    "#549aab",
    "#8fc00c",
    "#729962",
    "#a2904e",
    "#cd6800",
    "#fc302f",
];

class DOMHandler {
    /**
     * @param {DataFetcher} fetcher
     */
    constructor(fetcher) {
        /** @type {DataFetcher} */
        this.fetcher = fetcher;

        /** @type {Song[]} */
        this.songs = [];

        /** @type {number?} */
        this.selectedSongIndex = null;

        /** @type {boolean} */
        this.furiganaEnabled = false;

        /** @type {boolean} */
        this.furiganaLoading = false;

        /** 缓存已转换的歌词行的 ruby HTML，index -> ruby html string */
        this.furiganaCache = new Map();

        // ===== DOM 元素 =====
        /** @type {NodeListOf<Element>} */
        this.errorTexts = document.querySelectorAll(".error");
        /** @type {NodeListOf<Element>} */
        this.searchingTexts = document.querySelectorAll(".searching");
        /** @type {NodeListOf<Element>} */
        this.screens = document.querySelectorAll(".lyrics-image-screen");

        /** @type {Element} */
        this.searchInput = document.querySelector("#song-name");
        /** @type {Element} */
        this.searchButton = document.querySelector("#search");
        /** @type {Element} */
        this.platformSelect = document.querySelector("#platform-select");

        /** @type {Element} */
        this.cloneableSelectSong = document.querySelector(
            ".select-song.cloneable"
        );
        /** @type {Element} */
        this.songSelection = document.querySelector(".song-selection");
        /** @type {Element} */
        this.lineSelection = document.querySelector(".lines-selection");
        /** @type {Element} */
        this.selectAllBtn = document.querySelector("#select-all-btn");
        /** @type {Element} */
        this.deselectAllBtn = document.querySelector("#deselect-all-btn");

        /** @type {Element} */
        this.songInfoCover = document.querySelector(".song-info-cover");
        /** @type {Element} */
        this.songInfoName = document.querySelector(".song-info-name");
        /** @type {Element} */
        this.songInfoArtist = document.querySelector(".song-info-artist");
        /** @type {Element} */
        this.goToFinal = document.querySelector(
            ".lyrics-image-screen .go-to-screen.right"
        );
        /** @type {Element} */
        this.lyricsFab = document.querySelector("#lyrics-fab");

        /** @type {Element} */
        this.lastGoBack = document.querySelector("#last-go-back");
        /** @type {Element} */
        this.downloadButton = document.querySelector("#download");
        /** @type {Element} */
        this.colorSelection = document.querySelector(".color-selection");
        /** @type {Element} */
        this.customColorInput = document.querySelector("#custom-color input");
        /** @type {Element} */
        this.lightTextSwitch = document.querySelector("#light-text");
        /** @type {Element} */
        this.additionalBgSwitch = document.querySelector("#additional-bg");
        /** @type {Element} */
        this.furiganaSwitch = document.querySelector("#furigana-toggle");
        /** @type {Element} */
        this.fontLangSelect = document.querySelector("#font-lang");
        /** @type {Element} */
        this.songImage = document.querySelector(".song-image");

        /** @type {Element} */
        this.widthSlider = document.querySelector("#width-slider");
        /** @type {Element} */
        this.widthValue = document.querySelector("#width-value");

        /** @type {Element} */
        this.toggleDarkMode = document.querySelector("#dark-mode-toggle");

        this.populateColorSelection();
        this.setListeners();
        this.setTheme(
            localStorage.getItem("theme") ??
                (window.matchMedia("(prefers-color-scheme: dark)").matches
                    ? "dark"
                    : "light")
        );
    }

    /**
     * 设置所有静态元素的事件监听
     */
    setListeners() {
        this.searchButton.addEventListener("click", (e) => {
            e.preventDefault();
            this.findSong();
        });

        this.platformSelect.addEventListener("change", (e) => {
            this.fetcher.setServer(e.target.value);
        });

        this.selectAllBtn.addEventListener("click", () => this.selectAllLines(true));
        this.deselectAllBtn.addEventListener("click", () => this.selectAllLines(false));

        this.lastGoBack.addEventListener("click", () => {
            this.displayScreen(
                this.songs[this.selectedSongIndex].lyrics === undefined ? 2 : 3
            );
        });

        document.querySelectorAll(".go-to-screen").forEach((button) => {
            button.addEventListener("click", () => {
                const targetScreen = Number(button.dataset.number);
                this.displayScreen(targetScreen);
            });
        });

        this.goToFinal.addEventListener("click", () => {
            this.displaySongImage();
        });

        this.lyricsFab.addEventListener("click", () => {
            this.displaySongImage();
        });

        this.customColorInput.addEventListener("input", () => {
            this.setSongImageColor(this.customColorInput.value);
        });

        this.lightTextSwitch.addEventListener("click", () => {
            this.lightTextSwitch.parentElement.classList.toggle("light-text");
        });

        this.additionalBgSwitch.addEventListener("click", () => {
            this.additionalBgSwitch.parentElement.classList.toggle(
                "additional-bg"
            );
        });

        this.furiganaSwitch.addEventListener("click", () => {
            this.toggleFurigana();
        });

        this.downloadButton.addEventListener("click", () => {
            this.downloadSongImage();
        });

        // contenteditable 粘贴为纯文本
        document.querySelectorAll("[contenteditable]").forEach((field) => {
            field.addEventListener("paste", function (event) {
                event.preventDefault();
                document.execCommand(
                    "inserttext",
                    false,
                    event.clipboardData.getData("text/plain")
                );
            });
        });

        this.widthSlider.addEventListener("input", () => {
            const width = this.widthSlider.value;
            this.setSongImageWidth(width);
            this.widthValue.textContent = `${width}px`;
        });

        window.addEventListener("resize", () => {
            this.setSongImageWidth(this.widthSlider.value);
        });

        this.fontLangSelect.addEventListener("change", (e) => {
            document.documentElement.lang = e.target.value;
        });

        this.toggleDarkMode.addEventListener("click", () => {
            this.setTheme(
                document.body.classList.contains("dark-mode") ? "light" : "dark"
            );
        });
    }

    /**
     * 创建颜色选择按钮
     */
    populateColorSelection() {
        COLORS.forEach((color) => {
            const element = document.createElement("div");
            element.classList.add("select-color");
            element.style.backgroundColor = color;
            element.textContent = ".";

            element.addEventListener("click", () => {
                this.setSongImageColor(color);
            });

            this.colorSelection.insertBefore(
                element,
                this.colorSelection.querySelector("#custom-color")
            );
        });
    }

    /**
     * 搜索歌曲并准备歌曲选择列表
     */
    async findSong() {
        const name = this.searchInput.value
            .replaceAll("\\", "")
            .replaceAll("/", "")
            .trim();

        if (name === "") {
            return this.throwError("等等，你是不是忘了输入歌曲名？");
        }

        this.searchInput.setAttribute("disabled", "true");
        this.searchButton.setAttribute("disabled", "true");

        this.hideError();
        this.displaySearching(SEARCHING_FOR_SONG);

        try {
            this.songs = await this.fetcher.getSongInfos(name, SONGS_TO_FETCH);
            this.populateSongSelection();
            this.displayScreen(2);
        } catch (error) {
            console.error(error);
            this.throwError(`糟糕！没有找到「${name}」相关的歌曲。`);
        }

        this.hideSearching();
        this.searchInput.removeAttribute("disabled");
        this.searchButton.removeAttribute("disabled");
    }

    /**
     * 根据 Song 对象创建歌曲选择列表
     */
    populateSongSelection() {
        this.songSelection
            .querySelectorAll(".select-song:not(.cloneable)")
            .forEach((el) => el.remove());

        this.songSelection.classList.add("hidden");

        this.songs.forEach((song, index) => {
            const clone = this.cloneableSelectSong.cloneNode(true);

            clone.querySelector("img").setAttribute("src", song.albumCoverUrl || "");
            clone.querySelector(".name").textContent = song.name;
            clone.querySelector(".authors").textContent = song.artists
                .map((artist) => artist.name)
                .join(", ");

            clone.addEventListener("click", () => {
                this.selectedSongIndex = index;
                // 切歌时清空假名缓存
                this.furiganaCache.clear();
                this.findLyrics();
            });

            clone.classList.remove("cloneable");

            this.songSelection.append(clone);
        });

        setTimeout(() => {
            this.songSelection.classList.remove("hidden");
        }, SELECTION_ANIMATION_DELAY);
    }

    /**
     * 获取歌词并准备歌词行选择列表
     */
    async findLyrics() {
        this.lineSelection.innerHTML = "";

        this.displayScreen(3);
        this.displaySongInfo();
        this.displaySearching(SEARCHING_FOR_LYRICS);

        /** @type {Song} */
        const song = this.songs[this.selectedSongIndex];

        let lyrics = null;
        try {
            lyrics = await this.fetcher.getSongLyrics(song.lyricId);

            if (lyrics === null) {
                throw Error("Lyrics not found");
            }
        } catch (error) {
            this.hideSearching();

            if (
                document
                    .querySelector(".final-options")
                    .classList.contains("hidden")
            ) {
                this.displaySongImage();
            }

            return console.error(error);
        }

        this.hideSearching();
        song.loadLyrics(lyrics);
        this.populateLineSelection();
    }

    /**
     * 显示当前歌曲信息（封面、歌名、歌手）
     */
    displaySongInfo() {
        const song = this.songs[this.selectedSongIndex];

        this.songInfoCover.setAttribute("src", song.albumCoverUrl || "");
        this.songInfoName.textContent = song.name;
        this.songInfoArtist.textContent = song.artists
            .map((artist) => artist.name)
            .join(", ");
    }

    /**
     * 创建歌词行选择元素
     */
    populateLineSelection() {
        let animationDelay = SELECTION_ANIMATION_DELAY;

        this.songs[this.selectedSongIndex].lyrics.forEach((line, index) => {
            const element = document.createElement("div");
            element.classList.add("select-line", "hidden");
            element.textContent = line.text;
            element.dataset.index = index;

            element.addEventListener("click", () => {
                element.classList.toggle("selected");
                this.updateFabVisibility();
            });

            setTimeout(() => {
                element.classList.remove("hidden");
            }, animationDelay);

            animationDelay += NEXT_LINE_ANIMATION_DELAY;

            this.lineSelection.append(element);
        });
    }

    /**
     * 全选/取消全选歌词行
     * @param {boolean} selectAll
     */
    selectAllLines(selectAll) {
        const lines = this.lineSelection.querySelectorAll(".select-line");
        lines.forEach((el) => {
            if (selectAll) {
                el.classList.add("selected");
            } else {
                el.classList.remove("selected");
            }
        });
        this.updateFabVisibility();
    }

    /**
     * 根据选中的歌词行数更新 FAB 可见性
     */
    updateFabVisibility() {
        const selectedLines = document.querySelectorAll(".select-line.selected");
        if (selectedLines.length > 0) {
            this.lyricsFab.classList.remove("hidden");
        } else {
            this.lyricsFab.classList.add("hidden");
        }
    }

    /**
     * 显示海报最终页面
     */
    displaySongImage() {
        this.setSongImage();
        this.displayScreen(4);
        this.setSongImageWidth(this.widthSlider.value);
        this.widthValue.textContent = `${this.widthSlider.value}px`;
        this.lyricsFab.classList.add("hidden");
    }

    /**
     * 准备海报 DOM 元素
     */
    async setSongImage() {
        this.setBase64Image(
            this.songs[this.selectedSongIndex].albumCoverUrl,
            ".song-image > .header > img"
        );
        this.setSongInfo();
        await this.setSongLyrics(
            Array.from(document.querySelectorAll(".select-line.selected")).map(
                (selectLine) => Number(selectLine.dataset.index)
            )
        );
        this.setSongImageColor(
            COLORS[Math.floor(Math.random() * COLORS.length)]
        );
    }

    /**
     * 设置海报背景色
     * @param {string} background
     */
    setSongImageColor(background) {
        this.songImage.style.backgroundColor = background;
    }

    /**
     * 设置海报宽度
     * @param {number} width - 像素
     */
    setSongImageWidth(width) {
        const numericWidth = Number(width);
        this.songImage.style.setProperty("--song-image-width", `${numericWidth}px`);

        const fullHeight = this.songImage.offsetHeight;
        const screen = this.songImage.closest(".lyrics-image-screen");

        if (!screen) {
            this.songImage.style.setProperty("--song-image-scale", 1);
            this.songImage.style.marginBottom = "0px";
            return;
        }

        const screenWidth = screen.clientWidth;
        const horizontalMargin = 32;
        const maxVisualWidth = Math.max(screenWidth - horizontalMargin, 0);

        const scale =
            numericWidth > 0 && maxVisualWidth > 0
                ? Math.min(1, maxVisualWidth / numericWidth)
                : 1;

        this.songImage.style.setProperty("--song-image-scale", scale);

        const marginBottom = fullHeight * (scale - 1);
        this.songImage.style.marginBottom = `${marginBottom}px`;
    }

    /**
     * 设置海报上的歌名和歌手
     */
    setSongInfo() {
        document.querySelector(".song-image > .header .name").textContent =
            this.songs[this.selectedSongIndex].name;
        document.querySelector(".song-image > .header .authors").textContent =
            this.songs[this.selectedSongIndex].artists
                .map((artist) => artist.name)
                .join(", ");
    }

    /**
     * 设置海报歌词部分；如果启用了假名注释则渲染 ruby 标签
     * @param {number[]} indexes
     */
    async setSongLyrics(indexes) {
        const song = this.songs[this.selectedSongIndex];
        const lyricsEl = document.querySelector(".song-image > .lyrics");

        const lines = song.lyrics
            ?.filter((_, index) => indexes.includes(index))
            ?.map((lyric) => lyric.text);

        if (!lines || lines.length === 0) {
            lyricsEl.innerHTML = NO_LYRICS_SELECTED;
            return;
        }

        if (this.furiganaEnabled) {
            // 显示加载中
            lyricsEl.innerHTML = FURIGANA_LOADING;
            try {
                const rubyLines = [];
                for (const text of lines) {
                    const ruby = await this.getFuriganaHtml(text);
                    rubyLines.push(ruby);
                }
                lyricsEl.innerHTML = rubyLines.join("<br>");
            } catch (err) {
                console.error("furigana error:", err);
                lyricsEl.innerHTML = lines.join("<br>");
            }
        } else {
            lyricsEl.innerHTML = lines.join("<br>");
        }
    }

    /**
     * 切换假名注释开关
     */
    async toggleFurigana() {
        this.furiganaEnabled = !this.furiganaEnabled;
        const body = document.body;
        if (this.furiganaEnabled) {
            body.classList.add("furigana-on");
        } else {
            body.classList.remove("furigana-on");
        }
        // 如果当前在第 4 屏（海报页），实时刷新歌词
        if (
            !document.querySelector(".final-options").classList.contains("hidden")
        ) {
            await this.setSongLyrics(
                Array.from(document.querySelectorAll(".select-line.selected")).map(
                    (el) => Number(el.dataset.index)
                )
            );
            this.setSongImageWidth(this.widthSlider.value);
        }
    }

    /**
     * 调用后端 API 获取单行文本的假名注释（ruby HTML）
     * @param {string} text
     * @returns {Promise<string>} 带 <ruby>/<rt> 标签的 HTML
     */
    async getFuriganaHtml(text) {
        if (this.furiganaCache.has(text)) {
            return this.furiganaCache.get(text);
        }

        const url =
            `${this.fetcher.apiBase}/api/furigana?text=${encodeURIComponent(text)}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`furigana API failed: ${response.status}`);
        }
        const data = await response.json();
        const html = data.html || text;
        this.furiganaCache.set(text, html);
        return html;
    }

    /**
     * 下载海报
     */
    async downloadSongImage() {
        this.displaySearching(DOWNLOADING);

        const song = this.songs[this.selectedSongIndex];
        const downloadName = `${song.artists
            .map((artist) => artist.name)
            .join(", ")} - ${song.name}.png`;

        let canvas = await html2canvas(this.songImage, {
            backgroundColor: null,
            scale: window.devicePixelRatio * DOWNLOAD_SCALING_FACTOR,
        });

        if (
            this.additionalBgSwitch.parentElement.classList.contains(
                "additional-bg"
            )
        ) {
            canvas = this.addBgToDownloadCanvas(canvas);
        }

        canvas.toBlob((blob) => {
            window.saveAs(blob, downloadName);
            this.hideSearching();
        });
    }

    /**
     * 给 canvas 添加阴影背景
     * @param {HTMLCanvasElement} canvas
     * @returns {HTMLCanvasElement}
     */
    addBgToDownloadCanvas(canvas) {
        const backgroundColor = this.songImage.style.backgroundColor;

        const borderRadius =
            BACKGROUND_SHADOW_BORDER_RADIUS *
            window.devicePixelRatio *
            DOWNLOAD_SCALING_FACTOR;

        const shadowBlur =
            BACKGROUND_SHADOW_BLUR *
            window.devicePixelRatio *
            DOWNLOAD_SCALING_FACTOR;

        const margin = shadowBlur * BACKGROUND_TO_SHADOW_FACTOR;

        const shadowOffsetX =
            BACKGROUND_SHADOW_OFFSET_X *
            window.devicePixelRatio *
            DOWNLOAD_SCALING_FACTOR;

        const shadowOffsetY =
            BACKGROUND_SHADOW_OFFSET_Y *
            window.devicePixelRatio *
            DOWNLOAD_SCALING_FACTOR;

        const shadowCanvas = document.createElement("canvas");
        shadowCanvas.width = canvas.width + margin * 2;
        shadowCanvas.height = canvas.height + margin * 2;
        const shadowContext = shadowCanvas.getContext("2d");

        shadowContext.fillStyle = backgroundColor;
        shadowContext.fillRect(0, 0, shadowCanvas.width, shadowCanvas.height);

        shadowContext.fillStyle = BACKGROUND_SHADOW_COLOR;
        shadowContext.filter = `blur(${shadowBlur}px)`;
        shadowContext.beginPath();
        shadowContext.moveTo(
            margin + shadowOffsetX + borderRadius,
            margin + shadowOffsetY
        );
        shadowContext.lineTo(
            margin + shadowOffsetX + canvas.width - borderRadius,
            margin + shadowOffsetY
        );
        shadowContext.quadraticCurveTo(
            margin + shadowOffsetX + canvas.width,
            margin + shadowOffsetY,
            margin + shadowOffsetX + canvas.width,
            margin + shadowOffsetY + borderRadius
        );
        shadowContext.lineTo(
            margin + shadowOffsetX + canvas.width,
            margin + shadowOffsetY + canvas.height - borderRadius
        );
        shadowContext.quadraticCurveTo(
            margin + shadowOffsetX + canvas.width,
            margin + shadowOffsetY + canvas.height,
            margin + shadowOffsetX + canvas.width - borderRadius,
            margin + shadowOffsetY + canvas.height
        );
        shadowContext.lineTo(
            margin + shadowOffsetX + borderRadius,
            margin + shadowOffsetY + canvas.height
        );
        shadowContext.quadraticCurveTo(
            margin + shadowOffsetX,
            margin + shadowOffsetY + canvas.height,
            margin + shadowOffsetX,
            margin + shadowOffsetY + canvas.height - borderRadius
        );
        shadowContext.lineTo(
            margin + shadowOffsetX,
            margin + shadowOffsetY + borderRadius
        );
        shadowContext.quadraticCurveTo(
            margin + shadowOffsetX,
            margin + shadowOffsetY,
            margin + shadowOffsetX + borderRadius,
            margin + shadowOffsetY
        );
        shadowContext.closePath();
        shadowContext.fill();

        shadowContext.filter = "none";
        shadowContext.drawImage(canvas, margin, margin);

        return shadowCanvas;
    }

    /**
     * 将封面图转为 base64（防止 html2canvas CORS 问题）
     * @param {string} url
     * @param {string} imgSelector
     */
    async setBase64Image(url, imgSelector) {
        if (!url) return;
        const proxied = this.fetcher.proxyImageUrl(url);
        const response = await fetch(proxied);
        const blob = await response.blob();

        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        document.querySelector(imgSelector).setAttribute("src", base64);
    }

    /**
     * 显示错误信息
     * @param {string} html
     */
    throwError(html) {
        this.errorTexts.forEach((element) => {
            element.innerHTML = html;
            element.classList.remove("hidden");
        });
    }

    /**
     * 隐藏错误信息
     */
    hideError() {
        this.errorTexts.forEach((element) => {
            element.classList.add("hidden");
        });
    }

    /**
     * 显示加载中文字
     * @param {string} text
     */
    displaySearching(text) {
        this.searchingTexts.forEach((element) => {
            element.textContent = text;
            element.classList.remove("hidden");
        });
    }

    /**
     * 隐藏加载中文字
     */
    hideSearching() {
        this.searchingTexts.forEach((element) => {
            element.classList.add("hidden");
        });
    }

    /**
     * 切换到指定编号的屏幕
     * @param {number} number
     */
    displayScreen(number) {
        this.screens.forEach((screen) => {
            if (Number(screen.dataset.number) < number) {
                screen.classList.add("hidden");
                screen.classList.add("left");
            } else if (Number(screen.dataset.number) === number) {
                screen.classList.remove("hidden");
                screen.classList.remove("left");
            } else {
                screen.classList.add("hidden");
                screen.classList.remove("left");
            }
        });

        if (number === 3) {
            this.updateFabVisibility();
        } else {
            this.lyricsFab.classList.add("hidden");
        }
    }

    /**
     * 设置深浅主题
     * @param {string} theme
     */
    setTheme(theme) {
        if (theme === "dark") {
            document.body.classList.add("dark-mode");
            localStorage.setItem("theme", "dark");
        } else {
            document.body.classList.remove("dark-mode");
            localStorage.setItem("theme", "light");
        }
    }
}

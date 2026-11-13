/* 廣東話小幫手 — trial app. Students photograph a page; text is recognized on this device and read aloud in Cantonese. Do not commit textbook text. */
(function () {
  "use strict";

  const STORAGE_KEY = "p3CantoneseTrial.ocrText";
  const MIN_CJK = 8;
  const TESS_VER = "5.1.1";
  const TESS_CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@" + TESS_VER;
  const LANG_PATH = "https://tessdata.projectnaptha.com/4.0.0";

  const $ = (id) => document.getElementById(id);
  const screens = {
    home: $("screen-home"),
    listen: $("screen-listen"),
    talk: $("screen-talk"),
  };

  let voicesReady = [];
  let yueVoice = null;
  let cmnVoice = null;
  let voiceWarning = "";

  let capturedText = "";
  let previewUrl = "";
  let addPageMode = false;
  let ocrBusy = false;
  let ocrWorker = null;
  let ocrWorkerPromise = null;

  let lessonSentences = [];
  let lessonIndex = 0;
  let lessonPlaying = false;
  let lessonPaused = false;

  let recognition = null;
  let recognizing = false;
  let talkBusy = false;

  function showScreen(name) {
    stopLessonPlayback();
    stopListening();
    cancelSpeech();
    Object.keys(screens).forEach((key) => {
      screens[key].classList.toggle("is-active", key === name);
    });
    if (name === "listen") renderListen();
    if (name === "talk") prepareTalk();
    paintVoiceNotes();
    window.scrollTo(0, 0);
  }

  function readStoredText() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? String(raw) : "";
    } catch (err) {
      return "";
    }
  }

  function persistText(text) {
    capturedText = String(text || "");
    try {
      if (capturedText) localStorage.setItem(STORAGE_KEY, capturedText);
      else localStorage.removeItem(STORAGE_KEY);
    } catch (err) { /* ignore quota */ }
  }

  /* ---------- voices & speech ---------- */

  function scoreYue(voice) {
    const n = ((voice && voice.name) || "").toLowerCase();
    const lang = ((voice && voice.lang) || "").toLowerCase();
    const blob = n + " " + lang;
    if (/sinji|sin-ji|meijia|mei-jia|美佳|善怡/.test(blob)) return 100;
    if (lang === "zh-hk" || lang === "yue-hk" || lang === "zh-yue") return 92;
    if (/zh-hk|yue-hk|zh-yue/.test(lang)) return 90;
    if (/yue|粵|cantonese|hong kong|\bhk\b/.test(blob)) return 80;
    return 0;
  }

  function scoreCmn(voice) {
    const n = ((voice && voice.name) || "").toLowerCase();
    const lang = ((voice && voice.lang) || "").toLowerCase();
    const blob = n + " " + lang;
    if (/tingting|ting-ting|xiaoxiao|yaoyao|lili|中文（普通话|漢語普通話/.test(blob)) return 90;
    if (lang === "zh-cn" || lang === "cmn-hans" || lang === "zh-cmn-hans") return 80;
    if (/zh-cn|cmn-hans|zh-hans/.test(lang)) return 70;
    if (/zh-tw|cmn-hant/.test(lang)) return 50;
    return 0;
  }

  function pickBest(voices, scorer) {
    let best = null;
    let bestScore = 0;
    voices.forEach((v) => {
      const s = scorer(v);
      if (s > bestScore) {
        bestScore = s;
        best = v;
      }
    });
    return bestScore > 0 ? best : null;
  }

  function refreshVoices() {
    if (!window.speechSynthesis) {
      voicesReady = [];
      yueVoice = null;
      cmnVoice = null;
      voiceWarning = "這部裝置未能使用朗讀功能。請改用 iPad 的 Safari，或一部有廣東話語音的電腦瀏覽器。";
      paintVoiceNotes();
      return;
    }
    voicesReady = window.speechSynthesis.getVoices() || [];
    yueVoice = pickBest(voicesReady, scoreYue);
    cmnVoice = pickBest(voicesReady, scoreCmn) || yueVoice;
    if (!yueVoice) {
      voiceWarning = "這部裝置未找到廣東話語音。讀出聲音在 iPad（或已安裝廣東話語音的裝置）上效果最好。現在會嘗試以香港中文朗讀。";
    } else {
      voiceWarning = "";
    }
    paintVoiceNotes();
  }

  function paintVoiceNotes() {
    ["home-voice-note", "teacher-voice-note", "listen-voice-note", "talk-voice-note"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      if (voiceWarning) {
        el.hidden = false;
        el.textContent = voiceWarning;
      } else {
        el.hidden = true;
        el.textContent = "";
      }
    });
  }

  function waitForVoices() {
    refreshVoices();
    if (!window.speechSynthesis) return;
    window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
    // Some browsers populate voices slightly later without an event.
    [150, 400, 1000, 2000].forEach((ms) => setTimeout(refreshVoices, ms));
  }

  let speechGen = 0;

  function cancelSpeech() {
    speechGen += 1;
    if (!window.speechSynthesis) return;
    // Chrome can ignore a single cancel(); a second call is cheap and helps
    // leftover utterances stop when leaving 聽課文.
    try { window.speechSynthesis.cancel(); } catch (err) { /* ignore */ }
    try { window.speechSynthesis.cancel(); } catch (err) { /* ignore */ }
  }

  function makeUtterance(text, kind) {
    const u = new SpeechSynthesisUtterance(text);
    if (kind === "cmn") {
      u.lang = "zh-CN";
      if (cmnVoice) u.voice = cmnVoice;
      u.rate = 1;
    } else {
      u.lang = "zh-HK";
      if (yueVoice) u.voice = yueVoice;
      u.rate = kind === "lesson" ? 0.9 : 1;
    }
    u.pitch = 1;
    u.volume = 1;
    return u;
  }

  function queueUtterances(items) {
    if (!window.speechSynthesis) return;
    // Queue in the same user-gesture turn. Do not delay after cancel(),
    // or iOS Safari may drop later utterances.
    cancelSpeech();
    const gen = speechGen;
    items.forEach((item) => {
      const u = makeUtterance(item.text, item.kind);
      u.onstart = function (ev) {
        if (gen !== speechGen) {
          cancelSpeech();
          return;
        }
        if (item.onstart) item.onstart(ev);
      };
      u.onend = function (ev) {
        if (gen !== speechGen) return;
        if (item.onend) item.onend(ev);
      };
      u.onerror = function (ev) {
        if (gen !== speechGen) return;
        if (item.onerror) item.onerror(ev);
      };
      window.speechSynthesis.speak(u);
    });
  }

  /* ---------- lesson splitting / playback ---------- */

  function splitSentences(text) {
    const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
    const out = [];
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const chunks = trimmed.split(/(?<=[。！？!?；;])/);
      chunks.forEach((chunk) => {
        const s = chunk.trim();
        if (s) out.push(s);
      });
    });
    return out;
  }

  function highlightSentence(index) {
    const board = $("lesson-board");
    if (!board) return;
    board.querySelectorAll(".sentence").forEach((el) => {
      const on = Number(el.dataset.index) === index;
      el.classList.toggle("is-current", on);
      if (on) {
        try {
          el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
        } catch (err) {
          el.scrollIntoView(true);
        }
      }
    });
  }

  function setListenState(text) {
    $("listen-state").textContent = text || "";
  }

  function stopLessonPlayback() {
    lessonPlaying = false;
    lessonPaused = false;
    cancelSpeech();
    const playBtn = $("btn-play");
    const pauseBtn = $("btn-pause");
    if (playBtn) {
      playBtn.disabled = false;
      playBtn.textContent = "播放";
    }
    if (pauseBtn) pauseBtn.disabled = true;
  }

  function playLessonFrom(index) {
    if (!window.speechSynthesis) {
      setListenState("這部裝置未能朗讀。");
      return;
    }
    if (!lessonSentences.length) return;
    const start = Math.max(0, Math.min(index, lessonSentences.length - 1));
    lessonIndex = start;
    lessonPlaying = true;
    lessonPaused = false;
    $("btn-play").disabled = true;
    $("btn-pause").disabled = false;
    setListenState("正在播放");

    const items = lessonSentences.slice(start).map((text, offset) => {
      const i = start + offset;
      const last = i === lessonSentences.length - 1;
      return {
        text: text,
        kind: "lesson",
        onstart: function () {
          if (!lessonPlaying) return;
          lessonIndex = i;
          highlightSentence(i);
        },
        onend: function () {
          if (!lessonPlaying) return;
          if (last) {
            lessonPlaying = false;
            lessonPaused = false;
            lessonIndex = 0;
            $("btn-play").disabled = false;
            $("btn-pause").disabled = true;
            setListenState("已播完");
            $("lesson-board").querySelectorAll(".sentence").forEach((el) => {
              el.classList.remove("is-current");
            });
          }
        },
        onerror: function () {
          if (!lessonPlaying) return;
          lessonPlaying = false;
          $("btn-play").disabled = false;
          setListenState("播放中斷，請再按「播放」。");
        },
      };
    });
    queueUtterances(items);
  }

  function pauseLesson() {
    if (!lessonPlaying) return;
    lessonPlaying = false;
    lessonPaused = true;
    cancelSpeech();
    $("btn-play").disabled = false;
    $("btn-pause").disabled = true;
    $("btn-play").textContent = "播放";
    setListenState("已暫停，再按「播放」可從本句繼續。");
  }


  /* ---------- camera / OCR ---------- */

  function countCjk(text) {
    return (String(text || "").match(/[\u4e00-\u9fff]/g) || []).length;
  }

  function cleanOcrText(raw) {
    let t = String(raw || "").replace(/\r\n/g, "\n");
    t = t.replace(/[^\u4e00-\u9fff\u3400-\u4dbf0-9。，、．！？!?：:；;「」『』（）()《》—\-·…\n\sA-Za-z]/g, "");
    t = t.replace(/[-—–_=]{2,}/g, "");
    t = t.replace(/[A-Za-z]{1,3}/g, "");
    t = t.replace(/[ \t]+/g, "");
    t = t.replace(/[。，、．！？!?：:；;「」『』（）()《》—\-·…]{3,}/g, "，");
    t = t.replace(/\n{3,}/g, "\n\n").trim();
    return t;
  }

  function looksLikeGibberish(text, confidence, latinCount, dashCount) {
    const cjk = countCjk(text);
    if (cjk < MIN_CJK) return true;
    if ((Number(confidence) || 0) < 40) return true;
    if ((latinCount || 0) >= 8 && (latinCount || 0) >= cjk * 0.12) return true;
    if ((dashCount || 0) >= 8) return true;
    return false;
  }

  function assembleFromResult(data) {
    const rawText = String((data && data.text) || "");
    const latinCount = (rawText.match(/[A-Za-z]/g) || []).length;
    const dashCount = (rawText.match(/[-—–_=]{2,}/g) || []).join("").length;
    const lines = (data && data.lines) || [];
    if (!lines.length) {
      return {
        text: rawText,
        confidence: Number(data && data.confidence) || 0,
        latinCount: latinCount,
        dashCount: dashCount
      };
    }
    const kept = [];
    let confSum = 0;
    let confN = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] || {};
      const raw = String(line.text || "");
      const conf = Number(line.confidence) || 0;
      const cjk = countCjk(raw);
      const latin = (raw.match(/[A-Za-z]/g) || []).length;
      const dashes = (raw.match(/[-—–_=]{2,}/g) || []).join("").length;
      if (cjk === 0) continue;
      if (conf < 40 && cjk < 4) continue;
      if (latin > cjk) continue;
      if (dashes >= 6 && cjk < 8) continue;
      kept.push(raw);
      confSum += conf;
      confN += 1;
    }
    return {
      text: kept.length ? kept.join("\n") : rawText,
      confidence: confN ? confSum / confN : (Number(data && data.confidence) || 0),
      latinCount: latinCount,
      dashCount: dashCount
    };
  }

  function evaluateOcr(result) {
    const data = (result && result.data) || {};
    const assembled = assembleFromResult(data);
    const cleaned = cleanOcrText(assembled.text);
    const bad = looksLikeGibberish(
      cleaned,
      assembled.confidence,
      assembled.latinCount,
      assembled.dashCount
    );
    const cjk = countCjk(cleaned);
    let score = Math.min(cjk, 120) * 2 + (assembled.confidence || 0);
    score -= Math.min(80, (assembled.latinCount || 0) * 3);
    score -= Math.min(40, (assembled.dashCount || 0) * 2);
    if (bad) score -= 80;
    if (cjk < MIN_CJK) score -= 100;
    return { text: cleaned, confidence: assembled.confidence, bad: bad, score: score };
  }

  function setOcrProgress(msg, frac) {
    const lead = $("ocr-progress-text");
    if (lead && msg) lead.textContent = msg;
    const fill = $("ocr-bar-fill");
    if (fill) fill.style.width = Math.max(8, Math.min(100, Math.round((frac || 0) * 100))) + "%";
  }

  function showListenMode(mode) {
    $("listen-empty").hidden = mode !== "empty";
    $("listen-progress").hidden = mode !== "progress";
    $("listen-ready").hidden = mode !== "ready";
  }

  function setPreview(url) {
    if (previewUrl && previewUrl.indexOf("blob:") === 0) {
      try { URL.revokeObjectURL(previewUrl); } catch (err) { /* ignore */ }
    }
    previewUrl = url || "";
    const img = $("photo-preview");
    if (!img) return;
    if (previewUrl) {
      img.src = previewUrl;
      img.hidden = false;
    } else {
      img.removeAttribute("src");
      img.hidden = true;
    }
  }

  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      const existing = document.querySelector('script[data-tess="1"]');
      if (existing) {
        existing.addEventListener("load", function () { resolve(); });
        existing.addEventListener("error", function () { reject(new Error("script")); });
        return;
      }
      const el = document.createElement("script");
      el.src = TESS_CDN + "/dist/tesseract.min.js";
      el.async = true;
      el.setAttribute("data-tess", "1");
      el.onload = function () { resolve(); };
      el.onerror = function () { reject(new Error("script")); };
      document.head.appendChild(el);
    });
  }

  function getOcrWorker() {
    if (ocrWorker) return Promise.resolve(ocrWorker);
    if (ocrWorkerPromise) return ocrWorkerPromise;
    ocrWorkerPromise = loadTesseract().then(function () {
      if (!window.Tesseract) throw new Error("script");
      return window.Tesseract.createWorker("chi_tra", 1, {
        workerPath: TESS_CDN + "/dist/worker.min.js",
        langPath: LANG_PATH,
        logger: function (m) {
          if (!m) return;
          if (m.status === "loading tesseract core") setOcrProgress("正在準備辨識工具，請稍候。", 0.15);
          else if (m.status === "loading language traineddata") setOcrProgress("正在下載中文辨識資料，請保持網絡連接。", 0.35);
          else if (m.status === "initializing api" || m.status === "initializing tesseract") setOcrProgress("正在準備辨認文字，請稍候。", 0.55);
          else if (m.status === "recognizing text") setOcrProgress("正在辨認文字，請稍候。", 0.6 + 0.35 * (Number(m.progress) || 0));
        }
      });
    }).then(function (worker) {
      ocrWorker = worker;
      return worker;
    }).catch(function (err) {
      ocrWorkerPromise = null;
      throw err;
    });
    return ocrWorkerPromise;
  }

  function recognizeCanvas(worker, canvas, psm) {
    return worker.setParameters({
      tessedit_pageseg_mode: String(psm),
      user_defined_dpi: "180"
    }).then(function () {
      return worker.recognize(canvas);
    });
  }

  function loadOrientedBitmap(file) {
    if (typeof createImageBitmap === "function") {
      return createImageBitmap(file, { imageOrientation: "from-image" }).catch(function () {
        return createImageBitmap(file);
      });
    }
    return new Promise(function (resolve, reject) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("image"));
      };
      img.src = url;
    });
  }

  function prepareCanvas(source) {
    const srcW = source.width || source.naturalWidth || source.videoWidth;
    const srcH = source.height || source.naturalHeight || source.videoHeight;
    const max = 2000;
    const longSide = Math.max(srcW, srcH);
    const scale = longSide > max ? max / longSide : 1;
    const w = Math.max(1, Math.round(srcW * scale));
    const h = Math.max(1, Math.round(srcH * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(source, 0, 0, w, h);
    try {
      const data = ctx.getImageData(0, 0, w, h);
      const d = data.data;
      for (let i = 0; i < d.length; i += 4) {
        const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        let v = (g - 128) * 1.2 + 128;
        if (v < 0) v = 0;
        if (v > 255) v = 255;
        d[i] = d[i + 1] = d[i + 2] = v;
      }
      ctx.putImageData(data, 0, 0);
    } catch (err) { /* some browsers may block read; use original draw */ }
    return canvas;
  }

  function cropTextRegion(canvas) {
    const w = canvas.width;
    const h = canvas.height;
    if (w < 16 || h < 16) return canvas;
    let ctx;
    let data;
    try {
      ctx = canvas.getContext("2d", { willReadFrequently: true });
      data = ctx.getImageData(0, 0, w, h).data;
    } catch (err) {
      return canvas;
    }
    const scores = new Float32Array(h);
    for (let y = 0; y < h; y++) {
      let edges = 0;
      let ink = 0;
      for (let x = 1; x < w; x++) {
        const g = data[(y * w + x) * 4];
        const prev = data[(y * w + x - 1) * 4];
        if (g < 145) ink += 1;
        if (Math.abs(g - prev) > 38) edges += 1;
      }
      const inkRatio = ink / w;
      // Photos and drawings have dense ink; text lines are mid-density with many edges.
      const inkPenalty = (inkRatio > 0.55 || inkRatio < 0.02) ? 0.35 : 1;
      scores[y] = edges * inkPenalty;
    }
    const smooth = new Float32Array(h);
    const radius = Math.max(2, Math.round(h / 220));
    for (let y = 0; y < h; y++) {
      let sum = 0;
      let n = 0;
      for (let k = y - radius; k <= y + radius; k++) {
        if (k >= 0 && k < h) {
          sum += scores[k];
          n += 1;
        }
      }
      smooth[y] = n ? sum / n : 0;
    }
    let maxVal = 0;
    for (let y = 0; y < h; y++) if (smooth[y] > maxVal) maxVal = smooth[y];
    if (maxVal <= 0) return canvas;
    const thresh = maxVal * 0.22;
    function lineness(start, end) {
      const peaks = [];
      for (let y = start + 1; y < end - 1; y++) {
        if (smooth[y] >= thresh && smooth[y] >= smooth[y - 1] && smooth[y] >= smooth[y + 1]) {
          peaks.push(y);
        }
      }
      if (peaks.length < 2) return peaks.length ? 0.6 : 0.2;
      const gaps = [];
      for (let i = 1; i < peaks.length; i++) gaps.push(peaks[i] - peaks[i - 1]);
      let mean = 0;
      for (let i = 0; i < gaps.length; i++) mean += gaps[i];
      mean /= gaps.length;
      if (mean < 8 || mean > Math.max(80, h * 0.12)) return 0.5 * peaks.length;
      let v = 0;
      for (let i = 0; i < gaps.length; i++) v += (gaps[i] - mean) * (gaps[i] - mean);
      const std = Math.sqrt(v / gaps.length);
      const regular = std / mean < 0.4 ? 2.2 : 1;
      return peaks.length * regular;
    }
    const bands = [];
    let y = 0;
    while (y < h) {
      while (y < h && smooth[y] < thresh) y += 1;
      if (y >= h) break;
      const start = y;
      while (y < h && smooth[y] >= thresh) y += 1;
      const end = y - 1;
      if (end - start >= Math.max(6, Math.round(h * 0.006))) {
        let energy = 0;
        for (let i = start; i <= end; i++) energy += smooth[i];
        const height = end - start + 1;
        bands.push({
          start: start,
          end: end,
          score: energy * lineness(start, end) * Math.min(1.4, Math.max(1, height / Math.max(16, h * 0.08)))
        });
      }
    }
    if (!bands.length) return canvas;
    // Merge neighbouring text lines separated by ordinary line spacing,
    // but do not jump across a large illustration gap.
    const merged = [];
    let cur = {
      start: bands[0].start,
      end: bands[0].end,
      score: bands[0].score
    };
    const smallGap = Math.max(36, Math.round(h * 0.07));
    for (let i = 1; i < bands.length; i++) {
      const gap = bands[i].start - cur.end;
      if (gap <= smallGap) {
        cur.end = bands[i].end;
        cur.score += bands[i].score;
      } else {
        merged.push(cur);
        cur = { start: bands[i].start, end: bands[i].end, score: bands[i].score };
      }
    }
    merged.push(cur);
    let best = merged[0];
    for (let i = 1; i < merged.length; i++) {
      if (merged[i].score > best.score) best = merged[i];
    }
    const pad = Math.max(8, Math.round(h * 0.015));
    let top = Math.max(0, best.start - pad);
    let bottom = Math.min(h - 1, best.end + pad);
    if (bottom - top < h * 0.12) return canvas;
    if (top <= h * 0.03 && bottom >= h * 0.97) return canvas;
    const out = document.createElement("canvas");
    out.width = w;
    out.height = bottom - top + 1;
    out.getContext("2d").drawImage(canvas, 0, top, w, out.height, 0, 0, w, out.height);
    return out;
  }

  function binarizeCanvas(src) {
    const canvas = document.createElement("canvas");
    canvas.width = src.width;
    canvas.height = src.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(src, 0, 0);
    try {
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = image.data;
      const hist = new Array(256);
      for (let i = 0; i < 256; i++) hist[i] = 0;
      const n = canvas.width * canvas.height;
      for (let i = 0; i < d.length; i += 4) hist[d[i]] += 1;
      let sum = 0;
      for (let i = 0; i < 256; i++) sum += i * hist[i];
      let sumB = 0;
      let wB = 0;
      let best = 0;
      let threshold = 128;
      for (let t = 0; t < 256; t++) {
        wB += hist[t];
        if (wB === 0) continue;
        const wF = n - wB;
        if (wF === 0) break;
        sumB += t * hist[t];
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;
        const between = wB * wF * (mB - mF) * (mB - mF);
        if (between > best) {
          best = between;
          threshold = t;
        }
      }
      for (let i = 0; i < d.length; i += 4) {
        const v = d[i] <= threshold ? 0 : 255;
        d[i] = d[i + 1] = d[i + 2] = v;
      }
      ctx.putImageData(image, 0, 0);
    } catch (err) {
      return src;
    }
    return canvas;
  }

  function recognizeFile(file, append) {
    if (ocrBusy) return;
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      window.alert("照片檔案太大，請改用較清晰但較小的照片。");
      return;
    }
    ocrBusy = true;
    stopLessonPlayback();
    showListenMode("progress");
    setOcrProgress("正在準備照片，請稍候。", 0.08);

    if (!append) setPreview(URL.createObjectURL(file));
    else if (!previewUrl) setPreview(URL.createObjectURL(file));

    loadOrientedBitmap(file)
      .then(function (bmp) {
        const base = prepareCanvas(bmp);
        if (bmp.close) try { bmp.close(); } catch (err) { /* ignore */ }
        const crop = cropTextRegion(base);
        const firstPsm = crop !== base ? "4" : "6";
        setOcrProgress("正在辨認文字，請稍候。第一次使用需要下載辨識資料，請保持網絡連接。", 0.2);
        return getOcrWorker().then(function (worker) {
          return recognizeCanvas(worker, crop, firstPsm).then(function (result) {
            const first = evaluateOcr(result);
            if (!first.bad) return first;
            setOcrProgress("正在再試一次，請稍候。", 0.55);
            return recognizeCanvas(worker, binarizeCanvas(crop), "3").then(function (result2) {
              const second = evaluateOcr(result2);
              return second.score >= first.score ? second : first;
            });
          });
        });
      })
      .then(function (picked) {
        if (!picked || picked.bad || countCjk(picked.text) < MIN_CJK) {
          throw new Error("empty");
        }
        const next = picked.text;
        const body = append && capturedText
          ? capturedText.replace(/\s+$/, "") + "\n\n" + next
          : next;
        persistText(body);
        addPageMode = false;
        ocrBusy = false;
        renderListen();
      })
      .catch(function (err) {
        ocrBusy = false;
        const code = String((err && err.message) || err || "");
        if (capturedText && countCjk(capturedText) >= MIN_CJK) {
          renderListen();
          setListenState(code === "empty"
            ? "未能清楚辨認這頁的文字。請靠近文字部分拍攝，避免只拍插圖或反光。現有文字仍可播放。"
            : "辨認失敗，請檢查網絡後再試。現有文字仍可播放。");
          return;
        }
        showListenMode("empty");
        const lead = $("listen-empty").querySelector(".lead");
        if (lead) {
          lead.textContent = code === "empty"
            ? "未能清楚辨認文字。請靠近課文的文字部分拍攝，光線充足，避免只拍插圖或反光，再試一次。"
            : "未能辨認文字。請檢查網絡連接後再拍攝一次。照片只在這部裝置處理，不會上載。";
        }
      });
  }

  function renderListen() {
    if (ocrBusy) {
      showListenMode("progress");
      return;
    }
    if (!capturedText || countCjk(capturedText) < 1) {
      showListenMode("empty");
      const lead = $("listen-empty").querySelector(".lead");
      if (lead) lead.textContent = "請靠近課文的文字部分拍攝，盡量避免只拍插圖，並避免反光。辨認文字後會用廣東話朗讀。照片只在這部裝置處理，不會上載。";
      $("photo-preview").hidden = true;
      return;
    }
    showListenMode("ready");
    const img = $("photo-preview");
    if (previewUrl) {
      img.src = previewUrl;
      img.hidden = false;
    } else {
      img.hidden = true;
    }

    const board = $("lesson-board");
    board.textContent = "";
    lessonSentences = splitSentences(capturedText);
    if (!lessonSentences.length) lessonSentences = [capturedText.trim()];
    lessonSentences.forEach((s, i) => {
      const span = document.createElement("span");
      span.className = "sentence";
      span.dataset.index = String(i);
      span.textContent = s;
      board.appendChild(span);
      board.appendChild(document.createTextNode(" "));
    });
    lessonIndex = 0;
    lessonPaused = false;
    lessonPlaying = false;
    $("btn-play").disabled = false;
    $("btn-play").textContent = "播放";
    $("btn-pause").disabled = true;
    setListenState("按「播放」開始聆聽。");
  }

  function openPicker(which) {
    const input = $(which === "album" ? "album-input" : "camera-input");
    if (!input) return;
    input.value = "";
    input.click();
  }

  /* ---------- dialogue ---------- */

  const TOPICS = [
    { id: "greet", label: "問候", ask: "你好。" },
    { id: "howareyou", label: "近況", ask: "你好吗？" },
    { id: "name", label: "名字", ask: "你叫什么名字？" },
    { id: "family", label: "家庭", ask: "你家有几个人？" },
    { id: "school", label: "學校", ask: "你喜欢上学吗？" },
    { id: "food", label: "食物", ask: "你喜欢吃什么？" },
    { id: "likes", label: "喜好", ask: "你喜欢做什么？" },
    { id: "weather", label: "天氣", ask: "今天天气怎么样？" },
    { id: "friends", label: "朋友", ask: "你有好朋友吗？" },
    { id: "pets", label: "寵物", ask: "你有养宠物吗？" },
    { id: "feelings", label: "心情", ask: "你今天心情怎么样？" },
    { id: "weekend", label: "週末", ask: "周末你喜欢做什么？" },
  ];

  const REPLIES = {
    greet: [
      "嗨，你好呀！我係廣東話小幫手，好開心同你傾偈。",
      "你好你好！今日想同我講啲咩呢？",
      "早晨呀！我喺度等你一齊練習廣東話。",
    ],
    howareyou: [
      "我今日精神爽利呀！你呢，心情點呀？",
      "我好好喎，多謝你關心。你今日開心嗎？",
      "我幾好呀！希望你今日都過得開開心心。",
    ],
    name: [
      "我叫小幫手呀，專門陪你練習廣東話。你叫咩名呀？得閒同我講下啦。",
      "大家叫我小幫手。你呢，點稱呼你呀？",
      "我嘅名就係小幫手。你願意講自己個名嘅話，我好歡迎呀。",
    ],
    age: [
      "我係一個小幫手，冇真實年紀㗎。你今年幾多歲呀？",
      "我一直都喺度陪同學練習。你今年幾歲？讀三年級啦嘛？",
    ],
    grade: [
      "三年級真不錯呀！慢慢學，廣東話會愈講愈順。",
      "小學三年級正係好玩嘅時候。課堂有冇得意嘅嘢呀？",
      "原來你讀三年級。有唔明白嘅字，可以再問我。",
    ],
    school: [
      "上學可以識新朋友，又學新嘢，其實幾好玩。你最鍾意邊一科呀？",
      "學校生活忙忙碌碌都幾充實。今日上課開心嗎？",
      "我好欣賞認真返學嘅同學。你今日有冇功課呀？",
    ],
    family: [
      "陪家人食飯傾偈，最溫暖啦。你屋企有邊啲人呀？",
      "屋企人一齊幫忙，最開心。你平時會唔會幫爸爸媽媽做嘢呀？",
      "有家人關心，真係好幸福。你最鍾意同邊個一齊玩？",
    ],
    food: [
      "我好鍾意腸粉同新鮮水果，又唔會太甜。你最鍾意食咩呀？",
      "食得開心最緊要。你鍾意甜嘢多，定係鹹香嗰啲多？",
      "天氣熱食啲水果最舒服。你今朝有冇食早餐呀？",
    ],
    likes: [
      "我鍾意聽故仔同識新朋友。你平時最鍾意做咩呀？",
      "有自己鍾意嘅活動，課餘就特別開心。你鍾意畫畫、運動，定係睇書？",
      "得閒做自己喜愛嘅事，心情都會好好。你同我分享下啦。",
    ],
    dislikes: [
      "唔鍾意某啲嘢都好正常，唔使勉強自己。你比較唔鍾意咩呀？",
      "慢慢試，或者會發現新口味。但如果真係唔鍾意，講出嚟都得嘅。",
    ],
    weather: [
      "今日天氣好好就最適合出街行下。你屋企附近有冇公園呀？",
      "如果落雨，就喺屋企睇書或者畫畫啦。而家窗外係晴天定雨天？",
      "熱就飲多啲水，凍就記得添件衫。你而家覺得熱定涼？",
    ],
    weekday: [
      "上課日子要早啲休息，第二朝先有精神。你今日最記得邊一堂？",
      "平日返學、做功課，節奏要穩陣。今晚會早啲瞓嗎？",
    ],
    weekend: [
      "週末可以瞓晏少少，再同家人出街。你通常週末做咩呀？",
      "星期六日最適合去公園或者探親友。你今個週末有冇計劃？",
      "週末玩完，記得都留啲時間休息。你鍾意出街定係留喺屋企？",
    ],
    friends: [
      "有好朋友一齊玩、一齊學習，真係好幸福。你同朋友最鍾意玩咩？",
      "待朋友好，朋友都會待你好。你今日有冇同同學傾過偈呀？",
      "一齊分享玩具同故仔，朋友之間就會更親近。你有幾多個好朋友？",
    ],
    pets: [
      "小動物好得意，不過要負責餵同照顧。你屋企有寵物嗎？",
      "小狗小貓都可以做伴。如果你未有寵物，鍾意邊一種動物呀？",
      "有寵物就要每日關心佢哋。你會唔會幫手餵飼料呀？",
    ],
    home: [
      "屋企係最安心嘅地方。你最鍾意喺屋企邊一角休息呀？",
      "返到屋企放下書包，飲杯水先。你屋企附近安靜嗎？",
    ],
    feelings: [
      "開心嘅時候就同人分享，唔開心都可以講出嚟。你而家心情點？",
      "無論開心定有啲累，照顧好自己最緊要。要不要同我講下今日發生咩事？",
      "心情有上有落都正常。深呼吸一下，再慢慢講俾我聽啦。",
    ],
    sports: [
      "做運動可以強身，又可以交朋友。你鍾意跑步、游水，定係球類？",
      "每星期活動一下身體就好舒服。課堂有冇體育課呀？",
      "踢波、跳高、跳繩都好好玩。你最拿手邊一樣？",
    ],
    colours: [
      "我好鍾意天藍色同暖暖嘅橙色。你最鍾意邊種顏色呀？",
      "不同顏色會帶嚟唔同心情。你今日著咗咩顏色嘅衫？",
    ],
    afterschool: [
      "放學之後先做功課，再玩一陣就剛剛好。你放學通常做咩？",
      "課後可以睇書、去興趣班，或者同家人行下。你今日放學想做咩呀？",
    ],
    birthday: [
      "生日係好特別嘅日子，可以同家人食蛋糕。你生日係邊個月呀？",
      "祝你每年生日都開開心心。你鍾意邊一種蛋糕？",
    ],
    thanks: [
      "唔使客氣呀，能夠幫到你我就好開心。",
      "多謝你同我傾偈。再有問題隨時問我啦。",
    ],
    bye: [
      "拜拜，小心身體，下次再一齊練習呀！",
      "再見啦，今日講得好好。返屋企要休息充足喔。",
      "再會，有機會再同你傾偈。慢慢嚟，你會愈講愈好。",
    ],
    unknown: [
      "對唔住，我而家仲未聽得太明。你可以再講一次，或者撳下面嘅話題試下。",
      "嗯，我唔太肯定你嘅意思。試下講家庭、食物或者天氣啦，我即刻答你。",
      "我可能聽漏咗少少。唔該你再問一次，或者揀一個話題按鈕。",
    ],
  };

  const lastReply = {};

  function pickReply(id) {
    const list = REPLIES[id] || REPLIES.unknown;
    if (list.length === 1) return list[0];
    let choice = list[Math.floor(Math.random() * list.length)];
    if (choice === lastReply[id] && list.length > 1) {
      choice = list[Math.floor(Math.random() * list.length)];
    }
    lastReply[id] = choice;
    return choice;
  }

  function editDistance(a, b) {
    const m = a.length;
    const n = b.length;
    if (Math.abs(m - n) > 2) return 99;
    const dp = new Array(n + 1);
    for (let j = 0; j <= n; j++) dp[j] = j;
    for (let i = 1; i <= m; i++) {
      let prev = dp[0];
      dp[0] = i;
      for (let j = 1; j <= n; j++) {
        const tmp = dp[j];
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
        prev = tmp;
      }
    }
    return dp[n];
  }

  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[\s，。！？、,.!?;；：:「」""''“”‘’（）()【】\[\]～~…·\-—]/g, "");
  }

  function containsLoose(hay, needle) {
    if (!needle) return false;
    if (hay.indexOf(needle) !== -1) return true;
    // Only typo-tolerate longer phrases, to avoid 2-character false matches.
    if (needle.length < 3 || hay.length < 2) return false;
    const maxLen = needle.length + 1;
    for (let i = 0; i < hay.length; i++) {
      for (let len = Math.max(3, needle.length - 1); len <= maxLen && i + len <= hay.length; len++) {
        if (editDistance(hay.substr(i, len), needle) <= 1) return true;
      }
    }
    return false;
  }

  const INTENT_RULES = [
    { id: "thanks", any: ["谢谢", "謝謝", "多谢", "多謝", "thankyou", "thanks"] },
    { id: "bye", any: ["再见", "再見", "拜拜", "再会", "再會", "bye", "goodbye"] },
    { id: "howareyou", any: ["你好吗", "你好嗎", "你好嘛", "你怎么样", "你怎麼樣", "最近好吗", "最近好嗎", "你开心吗", "你開心嗎", "还好吗", "還好嗎"] },
    { id: "birthday", any: ["生日", "蛋糕", "岁数", "歲數"] },
    { id: "afterschool", any: ["放学", "放學", "课后", "課後", "放学后", "放學後"] },
    { id: "colours", any: ["颜色", "顏色", "紅色", "红色", "藍色", "蓝色", "黃色", "黄色", "綠色", "绿色", "什麼顏色", "什么颜色"] },
    { id: "sports", any: ["运动", "運動", "足球", "篮球", "籃球", "游泳", "游水", "跑步", "乒乓球", "羽毛球", "体育", "體育", "跳繩", "跳绳"] },
    { id: "feelings", any: ["心情", "开心", "開心", "难过", "難過", "害怕", "生气", "生氣", "累了", "很累", "好累", "伤心", "傷心", "高興", "高兴"] },
    { id: "pets", any: ["宠物", "寵物", "小猫", "小貓", "小狗", "猫咪", "貓咪", "养猫", "養狗", "养狗", "仓鼠", "倉鼠", "金鱼", "金魚", "小猫咪", "一隻貓", "一只猫", "一隻狗", "一只狗"] },
    { id: "friends", any: ["朋友", "同学", "同學", "好朋友", "玩伴"] },
    { id: "weekend", any: ["周末", "週末", "星期六", "星期日", "周日", "週日", "星期六日"] },
    { id: "weekday", any: ["星期一", "星期二", "星期三", "星期四", "星期五", "平时", "平日", "上课日", "上課日", "今天上课", "今天上課"] },
    { id: "weather", any: ["天气", "天氣", "下雨", "晴天", "阴天", "陰天", "很热", "很熱", "很冷", "凉快", "涼快", "台风", "颱風", "打风", "打風"] },
    { id: "dislikes", any: ["不喜欢", "不喜歡", "讨厌", "討厭", "不爱", "不愛"] },
    { id: "food", any: ["吃什么", "吃什麼", "喜歡吃", "喜欢吃", "食物", "早餐", "午饭", "午飯", "晚饭", "晚飯", "米饭", "米飯", "面条", "麵條", "点心", "點心", "水果", "饿", "餓"] },
    { id: "likes", any: ["喜欢做什么", "喜歡做什麼", "爱好", "愛好", "兴趣", "興趣", "最喜欢", "最喜歡"] },
    { id: "family", any: ["家人", "家庭", "爸爸", "妈妈", "媽媽", "父亲", "父親", "母亲", "母親", "哥哥", "姐姐", "弟弟", "妹妹", "爷爷", "爺爺", "奶奶", "婆婆", "外公", "外婆", "你家", "我家有", "几个人", "幾個人", "家里有", "家裡有", "口人"] },
    { id: "home", any: ["家里", "家裡", "在家", "房子", "住在", "屋企", "回家", "返屋企"] },
    { id: "school", any: ["学校", "學校", "上学", "上學", "课堂", "課堂", "老师", "老師", "功课", "功課", "返學", "返学"] },
    { id: "grade", any: ["几年级", "幾年級", "三年级", "三年級", "年级", "年級", "小学", "小學"] },
    { id: "age", any: ["几岁", "幾歲", "多大了", "你多大", "年龄", "年齡"] },
    { id: "name", any: ["你叫什么", "你叫什麼", "你的名字", "我叫", "我的名字", "怎么称呼", "怎麼稱呼"] },
    { id: "likes", any: ["喜欢", "喜歡", "爱好", "愛好"] },
    { id: "greet", any: ["你好", "您好", "嗨", "哈喽", "哈囉", "早上好", "早安", "下午好", "晚上好", "大家好"] },
  ];

  function matchIntent(raw) {
    const t = normalize(raw);
    if (!t) return "unknown";

    function bestHit(useLoose) {
      let best = { id: "unknown", len: 0 };
      INTENT_RULES.forEach((rule) => {
        rule.any.forEach((kw) => {
          const n = normalize(kw);
          if (!n) return;
          const hit = useLoose ? (n.length >= 4 && containsLoose(t, n)) : t.indexOf(n) !== -1;
          if (hit && n.length > best.len) best = { id: rule.id, len: n.length };
        });
      });
      return best;
    }

    // Exact, longer keyword wins. Typo tolerance is only a fallback.
    const exact = bestHit(false);
    if (exact.id !== "unknown") return exact.id;
    return bestHit(true).id;
  }

  function appendBubble(who, text) {
    const box = $("transcript");
    const div = document.createElement("div");
    div.className = "bubble " + (who === "you" ? "bubble-you" : "bubble-bot");
    const label = document.createElement("strong");
    label.textContent = who === "you" ? "你" : "小幫手";
    const body = document.createElement("div");
    body.textContent = text;
    div.appendChild(label);
    div.appendChild(body);
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  function replyFor(intent) {
    return pickReply(intent);
  }

  function speakDialogue(questionText, replyText, speakQuestion) {
    const items = [];
    if (speakQuestion && questionText) {
      items.push({ text: questionText, kind: "cmn" });
    }
    items.push({
      text: replyText,
      kind: "yue",
      onend: function () {
        talkBusy = false;
      },
      onerror: function () {
        talkBusy = false;
      },
    });
    talkBusy = true;
    queueUtterances(items);
  }

  function handleStudentText(text, opts) {
    const cleaned = String(text || "").trim();
    if (!cleaned) return;
    clearTranscriptHint();
    const speakQuestion = !!(opts && opts.speakQuestion);
    const intent = matchIntent(cleaned);
    const reply = replyFor(intent);
    appendBubble("you", cleaned);
    appendBubble("bot", reply);
    speakDialogue(cleaned, reply, speakQuestion);
  }

  /* ---------- speech recognition ---------- */

  function getRecognizerCtor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function setMicHint(text) {
    $("mic-hint").textContent = text || "";
  }

  function stopListening() {
    recognizing = false;
    $("listen-indicator").hidden = true;
    $("interim-text").textContent = "";
    $("btn-mic").hidden = false;
    $("btn-stop-listen").hidden = true;
    $("btn-mic").textContent = "開始對話";
    if (recognition) {
      try { recognition.onresult = null; recognition.onend = null; recognition.onerror = null; recognition.stop(); } catch (err) {}
      recognition = null;
    }
  }

  function startListening() {
    const Ctor = getRecognizerCtor();
    if (!Ctor) {
      setMicHint("這部瀏覽器未能使用麥克風。請改用下方輸入框，或在 iPad 的 Safari 再開一次。");
      $("type-input").focus();
      return;
    }
    stopListening();
    cancelSpeech();
    talkBusy = false;

    const rec = new Ctor();
    recognition = rec;
    rec.lang = "zh-CN";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    recognizing = true;
    $("listen-indicator").hidden = false;
    $("btn-mic").hidden = true;
    $("btn-stop-listen").hidden = false;
    $("interim-text").textContent = "";
    setMicHint("請用普通話清楚提問。說完後會自動停止。");

    rec.onresult = function (event) {
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += piece;
        else interim += piece;
      }
      $("interim-text").textContent = interim || finalText;
      if (finalText.trim()) {
        const said = finalText.trim();
        stopListening();
        handleStudentText(said, { speakQuestion: false });
      }
    };

    rec.onerror = function (event) {
      const err = (event && event.error) || "";
      stopListening();
      if (err === "not-allowed" || err === "service-not-allowed") {
        setMicHint("尚未允許使用麥克風。你可以在設定允許，或改用下方輸入框。兩邊都會出聲。");
      } else if (err === "no-speech") {
        setMicHint("未聽到聲音。請再按「開始對話」，或改用輸入框。");
      } else if (err === "audio-capture") {
        setMicHint("找不到麥克風。請改用輸入框提問，小幫手仍會出聲回答。");
      } else {
        setMicHint("這次未能使用語音輸入。請再試，或改用輸入框。");
      }
    };

    rec.onend = function () {
      if (recognizing) stopListening();
    };

    try {
      rec.start();
    } catch (err) {
      stopListening();
      setMicHint("未能開啟麥克風。請改用輸入框，或在允許權限後再試。");
    }
  }

  function prepareTalk() {
    if (!$("transcript").childElementCount) {
      $("transcript").textContent = "";
      const hint = document.createElement("p");
      hint.style.margin = "0";
      hint.style.color = "#3d4f59";
      hint.textContent = "對答紀錄會顯示在這裏。請先出聲或輸入一句話。";
      $("transcript").appendChild(hint);
    }
    const Ctor = getRecognizerCtor();
    if (!Ctor) {
      setMicHint("這部瀏覽器未必支援語音輸入（本機檔案或未加密連線有時不能用麥克風）。請用輸入框或話題按鈕，小幫手仍會先讀出你的問題，再用廣東話回答。");
    } else if (!$("mic-hint").textContent) {
      setMicHint("按「開始對話」後才開始收音。請允許麥克風權限。");
    }
  }

  function clearTranscriptHint() {
    const box = $("transcript");
    if (box.childElementCount === 1 && box.querySelector("p")) {
      box.textContent = "";
    }
  }


  /* ---------- events ---------- */

  function bindNav() {
    document.querySelectorAll("[data-go]").forEach((btn) => {
      btn.addEventListener("click", function () {
        showScreen(btn.getAttribute("data-go"));
      });
    });
  }

  function bindListen() {
    $("btn-play").addEventListener("click", function () {
      const from = lessonPaused ? lessonIndex : 0;
      playLessonFrom(from);
    });
    $("btn-pause").addEventListener("click", pauseLesson);
    $("btn-replay").addEventListener("click", function () {
      lessonPaused = false;
      playLessonFrom(0);
    });
    function onPicked(ev, append) {
      const file = ev.target.files && ev.target.files[0];
      ev.target.value = "";
      if (file) recognizeFile(file, append);
    }
    $("camera-input").addEventListener("change", function (ev) {
      onPicked(ev, addPageMode);
    });
    $("album-input").addEventListener("change", function (ev) {
      onPicked(ev, addPageMode);
    });
    $("btn-camera").addEventListener("click", function () {
      addPageMode = false;
      openPicker("camera");
    });
    $("btn-album").addEventListener("click", function () {
      addPageMode = false;
      openPicker("album");
    });
    $("btn-retake").addEventListener("click", function () {
      addPageMode = false;
      openPicker("camera");
    });
    $("btn-add-page").addEventListener("click", function () {
      addPageMode = true;
      openPicker("camera");
    });
    $("btn-clear-text").addEventListener("click", function () {
      const ok = window.confirm("確定清除已辨認的文字？");
      if (!ok) return;
      stopLessonPlayback();
      persistText("");
      setPreview("");
      addPageMode = false;
      renderListen();
    });
  }

  function bindTalk() {
    $("btn-mic").addEventListener("click", startListening);
    $("btn-stop-listen").addEventListener("click", function () {
      stopListening();
      setMicHint("已停止聆聽。可以再按「開始對話」，或改用輸入框。");
    });
    $("type-form").addEventListener("submit", function (e) {
      e.preventDefault();
      const value = $("type-input").value.trim();
      if (!value) return;
      stopListening();
      clearTranscriptHint();
      $("type-input").value = "";
      handleStudentText(value, { speakQuestion: true });
    });
    const wrap = $("topics");
    wrap.textContent = "";
    TOPICS.forEach((topic) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "topic-btn";
      btn.textContent = topic.label;
      btn.addEventListener("click", function () {
        stopListening();
        clearTranscriptHint();
        handleStudentText(topic.ask, { speakQuestion: true });
      });
      wrap.appendChild(btn);
    });
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (lessonPlaying) pauseLesson();
      stopListening();
    }
  });

  capturedText = readStoredText();
  waitForVoices();
  bindNav();
  bindListen();
  bindTalk();
})();

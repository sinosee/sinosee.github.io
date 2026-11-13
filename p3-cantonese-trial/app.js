/* 廣東話小幫手 — trial app. Lesson text is saved to the classroom database so students can listen on any device. Textbook text must never be committed to the repo. */
(function () {
  "use strict";

  const STORAGE_KEY = "p3CantoneseTrial.lesson";
  const TEACHER_PIN = "8800";
  const TEST_PHRASE = "你好，我係廣東話小幫手。";

  const $ = (id) => document.getElementById(id);
  const screens = {
    home: $("screen-home"),
    pin: $("screen-pin"),
    teacher: $("screen-teacher"),
    listen: $("screen-listen"),
    talk: $("screen-talk"),
  };

  let pinBuffer = "";
  let voicesReady = [];
  let yueVoice = null;
  let cmnVoice = null;
  let voiceWarning = "";

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
    if (name === "pin") resetPin();
    if (name === "teacher") fillTeacherForm();
    if (name === "listen") renderListen();
    if (name === "talk") prepareTalk();
    window.scrollTo(0, 0);
  }

  function readLocalLesson() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { title: "", body: "" };
      const data = JSON.parse(raw);
      return {
        title: String(data.title || ""),
        body: String(data.body || ""),
        savedAt: Number(data.savedAt || data.updatedAt || 0),
      };
    } catch (err) {
      return { title: "", body: "" };
    }
  }

  function loadLesson() {
    if (window.LessonCloud && window.LessonCloud.hasLoaded()) {
      const cloud = window.LessonCloud.getLesson();
      if (cloud && String(cloud.body || "").trim()) return cloud;
    }
    return readLocalLesson();
  }

  function persistLocal(title, body) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        title: title,
        body: body,
        savedAt: Date.now(),
      })
    );
  }

  function saveLessonLocal(title, body) {
    persistLocal(title, body);
  }

  function clearLessonLocal() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function cloudStatusMessage(code, kind) {
    if (kind === "save") {
      if (code === "rules") return "本機已暫存，但未能儲到雲端。請先更新課堂資料庫規則，並設定本試版的老師密碼，學生才能在其他裝置聆聽。";
      return "本機已暫存，但暫時未能儲到雲端。請檢查網絡後再儲存一次，否則學生在其他裝置暫時聽不到。";
    }
    if (code === "rules") return "本機已清除，但未能更新雲端。請先更新課堂資料庫規則，並設定本試版的老師密碼。";
    return "本機已清除，但暫時未能更新雲端。其他裝置可能仍看得到舊課文，請檢查網絡後再試。";
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

  function renderListen() {
    const lesson = loadLesson();
    const empty = $("listen-empty");
    const ready = $("listen-ready");
    const hasBody = lesson.body.trim().length > 0;
    empty.hidden = hasBody;
    ready.hidden = !hasBody;
    if (!hasBody) {
      const lead = empty.querySelector(".lead");
      if (lead) {
        lead.textContent = (window.LessonCloud && !window.LessonCloud.hasLoaded())
          ? "正在載入課文，請稍候。"
          : "尚未設定課文。請先請老師設定課文，才可以聆聽朗讀。";
      }
      return;
    }

    const titleEl = $("listen-title");
    titleEl.textContent = lesson.title.trim() || "課文";
    titleEl.hidden = !lesson.title.trim();

    const board = $("lesson-board");
    board.textContent = "";
    lessonSentences = splitSentences(lesson.body);
    if (!lessonSentences.length) {
      lessonSentences = [lesson.body.trim()];
    }
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

  /* ---------- teacher ---------- */

  function resetPin() {
    pinBuffer = "";
    paintPin();
    $("pin-error").hidden = true;
  }

  function paintPin() {
    const dots = $("pin-dots").querySelectorAll("span");
    dots.forEach((dot, i) => {
      dot.classList.toggle("is-on", i < pinBuffer.length);
    });
  }

  function handlePinDigit(digit) {
    $("pin-error").hidden = true;
    if (digit === "clear") {
      pinBuffer = "";
      paintPin();
      return;
    }
    if (pinBuffer.length >= 4) return;
    pinBuffer += digit;
    paintPin();
    if (pinBuffer.length === 4) {
      if (pinBuffer === TEACHER_PIN) {
        showScreen("teacher");
      } else {
        $("pin-error").hidden = false;
        pinBuffer = "";
        paintPin();
      }
    }
  }

  function fillTeacherForm() {
    const lesson = loadLesson();
    $("lesson-title").value = lesson.title;
    $("lesson-body").value = lesson.body;
    if (lesson.body.trim()) {
      $("teacher-status").textContent = "已有儲存的課文，學生在任何裝置打開這個網址都可以聆聽。可按需要修改後再儲存。";
    } else if (window.LessonCloud && !window.LessonCloud.hasLoaded()) {
      $("teacher-status").textContent = "正在載入已儲存的課文…";
    } else {
      $("teacher-status").textContent = "尚未儲存課文。儲存後，學生在任何裝置都可以聆聽。";
    }
  }

  function onCloudLesson() {
    const cloud = window.LessonCloud ? window.LessonCloud.getLesson() : { title: "", body: "" };
    if (String(cloud.body || "").trim()) {
      persistLocal(cloud.title, cloud.body);
    }
    if (screens.teacher.classList.contains("is-active")) fillTeacherForm();
    if (screens.listen.classList.contains("is-active")) renderListen();
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

  function bindPin() {
    $("pin-pad").addEventListener("click", function (e) {
      const btn = e.target.closest("[data-digit]");
      if (!btn) return;
      handlePinDigit(btn.getAttribute("data-digit"));
    });
  }

  function bindTeacher() {
    $("btn-save-lesson").addEventListener("click", function () {
      const title = $("lesson-title").value.trim();
      const body = $("lesson-body").value.trim();
      if (!body) {
        $("teacher-status").textContent = "請先貼上課文全文，再儲存。";
        return;
      }
      if (body.length > 20000) {
        $("teacher-status").textContent = "課文過長，請縮短後再儲存。";
        return;
      }
      saveLessonLocal(title, body);
      $("teacher-status").textContent = "正在儲存，請稍候。";
      const btn = $("btn-save-lesson");
      btn.disabled = true;
      const cloud = window.LessonCloud;
      if (!cloud) {
        $("teacher-status").textContent = "本機已暫存，但未能連接雲端，學生在其他裝置暫時聽不到。";
        btn.disabled = false;
        return;
      }
      cloud.save(title, body, TEACHER_PIN).then(function () {
        $("teacher-status").textContent = "已儲存。學生在任何裝置打開這個網址，都可以進入「聽課文」。";
        btn.disabled = false;
      }).catch(function (err) {
        $("teacher-status").textContent = cloudStatusMessage(err && err.code, "save");
        btn.disabled = false;
      });
    });

    $("btn-clear-lesson").addEventListener("click", function () {
      const ok = window.confirm("確定清除已儲存的課文？所有裝置上的學生將無法再聆聽這篇課文。");
      if (!ok) return;
      clearLessonLocal();
      $("lesson-title").value = "";
      $("lesson-body").value = "";
      $("teacher-status").textContent = "正在清除，請稍候。";
      const btn = $("btn-clear-lesson");
      btn.disabled = true;
      const cloud = window.LessonCloud;
      if (!cloud) {
        $("teacher-status").textContent = "本機已清除，但未能更新雲端。";
        btn.disabled = false;
        return;
      }
      cloud.clear(TEACHER_PIN).then(function () {
        $("teacher-status").textContent = "已清除。尚未儲存課文。";
        btn.disabled = false;
      }).catch(function (err) {
        $("teacher-status").textContent = cloudStatusMessage(err && err.code, "clear");
        btn.disabled = false;
      });
    });

    $("btn-test-voice").addEventListener("click", function () {
      if (!window.speechSynthesis) {
        $("teacher-status").textContent = "這部裝置未能朗讀。";
        return;
      }
      queueUtterances([{ text: TEST_PHRASE, kind: "yue" }]);
      $("teacher-status").textContent = yueVoice
        ? "正在試聽廣東話語音（" + (yueVoice.name || "zh-HK") + "）。"
        : "正在嘗試以香港中文朗讀。若沒有聲音，請改用 iPad 再試。";
    });
  }

  function bindListen() {
    $("btn-play").addEventListener("click", function () {
      // iOS needs a fresh user gesture; resume repeats the current sentence.
      const from = lessonPaused ? lessonIndex : 0;
      playLessonFrom(from);
    });
    $("btn-pause").addEventListener("click", pauseLesson);
    $("btn-replay").addEventListener("click", function () {
      lessonPaused = false;
      playLessonFrom(0);
    });
    $("btn-empty-to-teacher").addEventListener("click", function () {
      showScreen("pin");
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

  waitForVoices();
  bindNav();
  bindPin();
  bindTeacher();
  bindListen();
  bindTalk();
  $("btn-teacher-entry").addEventListener("click", function () {
    showScreen("pin");
  });
  if (window.LessonCloud) {
    window.LessonCloud.seedFromLocal(readLocalLesson());
    window.LessonCloud.onLesson(onCloudLesson);
    window.LessonCloud.start();
  }
})();

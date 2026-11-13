/* 廣東話小幫手 — cloud lesson store.
   Path: /p3CantoneseTrial/lesson  {title, body, updatedAt}
   Never store the teacher PIN or any textbook text in the repo.
   Teacher writes /p3CantoneseTrial/lessonGate {pin, action} first (pin must match
   /p3CantoneseTrial/teacherPin), then writes or removes /p3CantoneseTrial/lesson,
   then removes lessonGate. Students may only read the lesson.
*/
(function (root) {
  "use strict";

  var FB_APP = "https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js";
  var FB_DB = "https://www.gstatic.com/firebasejs/10.13.2/firebase-database-compat.js";
  var ROOT_PATH = "p3CantoneseTrial";
  var TITLE_MAX = 80;
  var BODY_MAX = 20000;
  var PIN_RE = /^[0-9]{4,8}$/;

  var memory = { title: "", body: "", updatedAt: 0 };
  var memoryReady = false;
  var listeners = [];
  var fbPromise = null;
  var started = false;

  function clean(raw) {
    return String(raw == null ? "" : raw).replace(/[\u200B-\u200D\uFEFF]/g, "");
  }

  function normalize(raw) {
    if (!raw || typeof raw !== "object") return { title: "", body: "", updatedAt: 0 };
    var title = clean(raw.title).trim().slice(0, TITLE_MAX);
    var body = clean(raw.body).trim().slice(0, BODY_MAX);
    var updatedAt = Number(raw.updatedAt) || 0;
    return { title: title, body: body, updatedAt: updatedAt };
  }

  function sameLesson(a, b) {
    return a.title === b.title && a.body === b.body && a.updatedAt === b.updatedAt;
  }

  function setMemory(lesson, notify) {
    var next = normalize(lesson);
    var changed = !sameLesson(memory, next);
    memory = next;
    memoryReady = true;
    if (notify && changed) {
      listeners.slice().forEach(function (fn) {
        try { fn(getLesson()); } catch (err) {}
      });
    }
    return next;
  }

  function getLesson() {
    return { title: memory.title, body: memory.body, updatedAt: memory.updatedAt };
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[src="' + src + '"]');
      if (existing) {
        if (existing.getAttribute("data-loaded") === "1") return resolve();
        existing.addEventListener("load", function () { resolve(); });
        existing.addEventListener("error", function () { reject(new Error("script")); });
        return;
      }
      var el = document.createElement("script");
      el.src = src;
      el.async = true;
      el.onload = function () {
        el.setAttribute("data-loaded", "1");
        resolve();
      };
      el.onerror = function () { reject(new Error("script")); };
      document.head.appendChild(el);
    });
  }

  function connect() {
    if (fbPromise) return fbPromise;
    fbPromise = Promise.resolve()
      .then(function () {
        var cfg = root.FIREBASE_CONFIG;
        if (!cfg || !cfg.databaseURL || !cfg.apiKey) {
          var err = new Error("unconfigured");
          err.code = "unconfigured";
          throw err;
        }
        return loadScript(FB_APP).then(function () { return loadScript(FB_DB); });
      })
      .then(function () {
        if (!root.firebase) {
          var err = new Error("unavailable");
          err.code = "offline";
          throw err;
        }
        if (!root.firebase.apps || !root.firebase.apps.length) {
          root.firebase.initializeApp(root.FIREBASE_CONFIG);
        }
        return root.firebase.database();
      })
      .catch(function (err) {
        fbPromise = null;
        if (err && err.code) throw err;
        var wrapped = new Error("offline");
        wrapped.code = "offline";
        throw wrapped;
      });
    return fbPromise;
  }

  function classifyError(err) {
    var msg = String((err && (err.code || err.message)) || err || "");
    if (/unconfigured/.test(msg)) return "unconfigured";
    if (/PERMISSION_DENIED|permission-denied/.test(msg)) return "rules";
    return "offline";
  }

  function start() {
    if (started) return;
    started = true;
    connect()
      .then(function (db) {
        db.ref(ROOT_PATH + "/lesson").on("value", function (snap) {
          var val = snap.val();
          if (!val) setMemory({ title: "", body: "", updatedAt: 0 }, true);
          else setMemory(val, true);
        }, function () {
          memoryReady = true;
          listeners.slice().forEach(function (fn) {
            try { fn(getLesson()); } catch (e) {}
          });
        });
      })
      .catch(function () {
        memoryReady = true;
        listeners.slice().forEach(function (fn) {
          try { fn(getLesson()); } catch (e) {}
        });
      });
  }

  function onLesson(fn) {
    if (typeof fn === "function") listeners.push(fn);
  }

  function withGate(db, pin, action, work) {
    var gateRef = db.ref(ROOT_PATH + "/lessonGate");
    var lessonRef = db.ref(ROOT_PATH + "/lesson");
    return gateRef
      .set({ pin: String(pin), action: action })
      .then(function () { return work(lessonRef); })
      .then(function (result) {
        return gateRef.remove().then(function () { return result; }, function () { return result; });
      })
      .catch(function (err) {
        return gateRef.remove().then(function () { throw err; }, function () { throw err; });
      });
  }

  function save(title, body, pin) {
    var lesson = normalize({
      title: title,
      body: body,
      updatedAt: Date.now()
    });
    if (!lesson.body) {
      var empty = new Error("empty");
      empty.code = "empty";
      return Promise.reject(empty);
    }
    if (!PIN_RE.test(String(pin || ""))) {
      var pinErr = new Error("pin");
      pinErr.code = "pin";
      return Promise.reject(pinErr);
    }
    return connect()
      .then(function (db) {
        return withGate(db, pin, "save", function (lessonRef) {
          return lessonRef.set({
            title: lesson.title,
            body: lesson.body,
            updatedAt: lesson.updatedAt
          });
        });
      })
      .then(function () {
        setMemory(lesson, true);
        return { ok: true, lesson: getLesson() };
      })
      .catch(function (err) {
        var code = classifyError(err);
        if (err && err.code === "empty") code = "empty";
        var out = new Error(code);
        out.code = code;
        throw out;
      });
  }

  function clear(pin) {
    if (!PIN_RE.test(String(pin || ""))) {
      var pinErr = new Error("pin");
      pinErr.code = "pin";
      return Promise.reject(pinErr);
    }
    return connect()
      .then(function (db) {
        return withGate(db, pin, "clear", function (lessonRef) {
          return lessonRef.remove();
        });
      })
      .then(function () {
        setMemory({ title: "", body: "", updatedAt: 0 }, true);
        return { ok: true, lesson: getLesson() };
      })
      .catch(function (err) {
        var code = classifyError(err);
        var out = new Error(code);
        out.code = code;
        throw out;
      });
  }

  root.LessonCloud = {
    TITLE_MAX: TITLE_MAX,
    BODY_MAX: BODY_MAX,
    start: start,
    onLesson: onLesson,
    getLesson: getLesson,
    hasLoaded: function () { return memoryReady; },
    seedFromLocal: function (lesson) {
      if (!memoryReady && lesson && clean(lesson.body).trim()) {
        setMemory({
          title: lesson.title,
          body: lesson.body,
          updatedAt: lesson.savedAt || lesson.updatedAt || 0
        }, false);
      }
    },
    save: save,
    clear: clear
  };
})(typeof window !== "undefined" ? window : this);

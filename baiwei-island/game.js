(() => {
  const D = window.BAIWEI;
  const Art = window.BAIWEI_ART;
  const SAVE_KEY = "baiwei-island-v3";
  const PLOT_COUNT = 12;
  const XP_TABLE = [0, 0, 25, 60, 110, 180, 270, 380, 520, 700];

  const byId = Object.fromEntries(D.ingredients.map((i) => [i.id, i]));
  const recipeById = Object.fromEntries(D.recipes.map((r) => [r.id, r]));

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function artIng(id) {
    const ing = byId[id];
    if (Art && Art.ingredient) return Art.ingredient(id, ing && ing.color);
    return `<span style="font-size:28px">${(ing && ing.emoji) || "🌱"}</span>`;
  }
  function artDish(id, hue) {
    if (Art && Art.dish) return Art.dish(id, hue);
    const r = recipeById[id];
    return `<span style="font-size:28px">${(r && r.dish) || "🍽️"}</span>`;
  }

  function levelFromXp(xp) {
    let lv = 1;
    for (let i = 2; i < XP_TABLE.length; i++) {
      if (xp >= XP_TABLE[i]) lv = i;
      else break;
    }
    return Math.min(lv, XP_TABLE.length - 1);
  }

  function xpToNext(xp) {
    const lv = levelFromXp(xp);
    if (lv >= XP_TABLE.length - 1) return { cur: 1, need: 1, max: true };
    const prev = XP_TABLE[lv];
    const next = XP_TABLE[lv + 1];
    return { cur: xp - prev, need: next - prev, max: false };
  }

  function unlockedPlots(level) {
    return Math.min(PLOT_COUNT, 4 + level);
  }

  function isIngUnlocked(ing, level) {
    return (ing.unlock || 1) <= level;
  }

  function isRecipeUnlocked(r, level) {
    if ((r.unlock || 1) > level) return false;
    return Object.keys(r.need).every((id) => isIngUnlocked(byId[id], level));
  }

  function defaultState() {
    const inv = {};
    D.ingredients.forEach((i) => {
      inv[i.id] = isIngUnlocked(i, 1) ? (i.market ? 4 : 1) : 0;
    });
    return {
      coins: 40,
      xp: 0,
      cooked: 0,
      served: 0,
      harvests: 0,
      selectedSeed: "tomato",
      plots: Array.from({ length: PLOT_COUNT }, () => ({
        crop: null,
        plantedAt: 0,
        duration: 0,
        watered: false,
      })),
      inv,
      guestIdx: 0,
      filter: "all",
    };
  }

  let state = load() || defaultState();
  let tickTimer = null;

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s.plots || s.plots.length !== PLOT_COUNT) return null;
      if (typeof s.xp !== "number") s.xp = 0;
      if (typeof s.harvests !== "number") s.harvests = 0;
      D.ingredients.forEach((i) => {
        if (typeof s.inv[i.id] !== "number") s.inv[i.id] = 0;
      });
      return s;
    } catch {
      return null;
    }
  }

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }

  function level() {
    return levelFromXp(state.xp);
  }

  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), 2000);
  }

  function showScreen(id) {
    $$(".screen").forEach((s) => s.classList.toggle("on", s.id === id));
  }

  function showPanel(name) {
    $$(".panel").forEach((p) => p.classList.toggle("on", p.dataset.panel === name));
    $$(".nav button").forEach((b) => b.classList.toggle("on", b.dataset.nav === name));
    if (name === "farm") renderFarm();
    if (name === "pantry") renderPantry();
    if (name === "market") renderMarket();
    if (name === "kitchen") renderKitchen();
    if (name === "guest") renderGuest();
  }

  function updateTop() {
    const lv = level();
    const prog = xpToNext(state.xp);
    $("#coinVal").textContent = state.coins;
    $("#lvVal").textContent = lv;
    const bar = $("#xpBar");
    if (bar) {
      const pct = prog.max ? 100 : Math.min(100, (prog.cur / prog.need) * 100);
      bar.style.width = pct + "%";
    }
    updateQuest();
  }

  function updateQuest() {
    const el = $("#questText");
    if (!el) return;
    const need = 3;
    const done = Math.min(state.harvests, need);
    if (state.harvests < need) {
      el.textContent = `種植並收成 ${need} 次（${done}/${need}）`;
    } else if (state.cooked < 2) {
      el.textContent = `完成 2 道料理（${Math.min(state.cooked, 2)}/2）`;
    } else if (state.served < 1) {
      el.textContent = `招呼 1 位來客（${Math.min(state.served, 1)}/1）`;
    } else {
      el.textContent = `繼續升級，解鎖更多世界食材`;
    }
  }

  function gainXp(amount) {
    const before = level();
    state.xp += amount;
    const after = level();
    updateTop();
    if (after > before) onLevelUp(before, after);
  }

  function onLevelUp(from, to) {
    const newly = D.ingredients.filter(
      (i) => (i.unlock || 1) > from && (i.unlock || 1) <= to
    );
    newly.forEach((i) => {
      if (!i.market) state.inv[i.id] = Math.max(state.inv[i.id] || 0, 1);
      else state.inv[i.id] = Math.max(state.inv[i.id] || 0, 3);
    });
    save();
    const names = newly.slice(0, 4).map((i) => i.name).join("、");
    const extra = newly.length > 4 ? `等${newly.length}樣` : names;
    toast(`升級到 Lv.${to}！解鎖：${extra || "新內容"}`);
    spawnFxArt(Art.lock());
    if ($('[data-panel="farm"]').classList.contains("on")) renderFarm();
  }

  function plantables() {
    return D.ingredients.filter((i) => !i.market && isIngUnlocked(i, level()));
  }

  function growProgress(plot) {
    if (!plot.crop || !plot.watered) return 0;
    const elapsed = (Date.now() - plot.plantedAt) / 1000;
    return Math.min(1, elapsed / plot.duration);
  }

  function isReady(plot) {
    return plot.crop && plot.watered && growProgress(plot) >= 1;
  }

  function renderSeeds() {
    const row = $("#seedRow");
    const list = plantables();
    if (!list.find((i) => i.id === state.selectedSeed)) {
      state.selectedSeed = list[0] ? list[0].id : "tomato";
    }
    const lockedNext = D.ingredients
      .filter((i) => !i.market && !isIngUnlocked(i, level()))
      .sort((a, b) => (a.unlock || 1) - (b.unlock || 1))[0];

    row.innerHTML =
      list
        .map((ing) => {
          const sel = state.selectedSeed === ing.id ? "sel" : "";
          return `<button type="button" class="seed ${sel}" data-seed="${ing.id}" aria-pressed="${!!sel}">
            <div class="art">${artIng(ing.id)}</div>
            <div class="nm">${ing.name}</div>
            <div class="tm">${ing.grow}秒</div>
          </button>`;
        })
        .join("") +
      (lockedNext
        ? `<div class="seed locked" title="升級解鎖">
            <div class="art">${Art.lock()}</div>
            <div class="nm">${lockedNext.name}</div>
            <div class="tm">Lv.${lockedNext.unlock}</div>
          </div>`
        : "");
  }

  function renderFarm() {
    renderSeeds();
    const open = unlockedPlots(level());
    const grid = $("#farmGrid");
    grid.innerHTML = state.plots
      .map((plot, i) => {
        if (i >= open) {
          const needLv = Math.max(2, i - 3);
          return `<div class="plot locked-plot" aria-label="未解鎖農田">
            <div class="crop-art">${Art.lock()}</div>
            <span class="hint">Lv.${needLv}</span>
          </div>`;
        }
        if (!plot.crop) {
          return `<button type="button" class="plot empty" data-plot="${i}" aria-label="空地，點擊種植"></button>`;
        }
        const ing = byId[plot.crop];
        const ready = isReady(plot);
        const prog = growProgress(plot);
        let cls = "plot";
        let extra = "";
        if (!plot.watered) {
          cls += " dry";
          extra = `<span class="hint">要澆水</span>`;
        } else if (ready) {
          cls += " ready";
          extra = `<span class="hint">收成！</span>`;
        } else {
          cls += " growing";
          extra = `<div class="bar"><i style="width:${prog * 100}%"></i></div>`;
        }
        return `<button type="button" class="${cls}" data-plot="${i}" aria-label="${ing.name}">
          <div class="crop-art">${artIng(ing.id)}</div>${extra}
        </button>`;
      })
      .join("");
  }

  function plantAt(i) {
    if (i >= unlockedPlots(level())) {
      toast("這一格農田尚未解鎖，請繼續升級");
      return;
    }
    const plot = state.plots[i];
    if (plot.crop) {
      if (isReady(plot)) {
        harvestAt(i);
        return;
      }
      if (!plot.watered) {
        waterAt(i);
        return;
      }
      toast("還在生長，請稍等～");
      return;
    }
    const seed = byId[state.selectedSeed];
    if (!seed || seed.market || !isIngUnlocked(seed, level())) return;
    plot.crop = seed.id;
    plot.plantedAt = 0;
    plot.duration = seed.grow;
    plot.watered = false;
    save();
    renderFarm();
    toast(`已種下${seed.name}！記得澆水`);
  }

  function waterAt(i) {
    const plot = state.plots[i];
    if (!plot.crop || plot.watered) return;
    plot.watered = true;
    plot.plantedAt = Date.now();
    save();
    renderFarm();
    toast("已澆好水，等它長大～");
  }

  function waterAll() {
    let n = 0;
    const open = unlockedPlots(level());
    state.plots.forEach((p, i) => {
      if (i < open && p.crop && !p.watered) {
        p.watered = true;
        p.plantedAt = Date.now();
        n++;
      }
    });
    if (n === 0) toast("沒有需要澆水的作物");
    else {
      save();
      renderFarm();
      toast(`已為 ${n} 格澆水～`);
    }
  }

  function harvestAt(i, silent) {
    const plot = state.plots[i];
    if (!isReady(plot)) return false;
    const ing = byId[plot.crop];
    const yieldAmt = 2 + Math.floor(Math.random() * 2);
    state.inv[ing.id] = (state.inv[ing.id] || 0) + yieldAmt;
    state.harvests += 1;
    spawnFxArt(artIng(ing.id));
    plot.crop = null;
    plot.plantedAt = 0;
    plot.duration = 0;
    plot.watered = false;
    gainXp(3);
    if (!silent) toast(`收成 ${ing.name} ×${yieldAmt}`);
    return true;
  }

  function harvestAll() {
    let n = 0;
    state.plots.forEach((_, i) => {
      if (harvestAt(i, true)) n++;
    });
    save();
    renderFarm();
    updateTop();
    if (n === 0) toast("還沒有成熟的作物");
    else toast(`一次收成 ${n} 格！`);
  }

  function spawnFxArt(html) {
    const fx = document.createElement("div");
    fx.className = "harvest-fx";
    fx.innerHTML = html;
    fx.style.left = 30 + Math.random() * 40 + "%";
    fx.style.top = 40 + Math.random() * 20 + "%";
    $(".app-shell").appendChild(fx);
    setTimeout(() => fx.remove(), 900);
  }

  function renderPantry() {
    const lv = level();
    $("#pantryList").innerHTML = D.ingredients
      .map((ing) => {
        const open = isIngUnlocked(ing, lv);
        const q = state.inv[ing.id] || 0;
        if (!open) {
          return `<div class="inv-card locked">
            <div class="art">${Art.lock()}</div>
            <div class="nm">？？？</div>
            <div class="qty">Lv.${ing.unlock || 1}</div>
          </div>`;
        }
        return `<div class="inv-card ${q === 0 ? "zero" : ""}">
          <div class="art">${artIng(ing.id)}</div>
          <div class="nm">${ing.name}</div>
          <div class="qty">×${q}</div>
        </div>`;
      })
      .join("");
  }

  function renderMarket() {
    const lv = level();
    const goods = D.ingredients.filter((i) => i.market);
    $("#marketList").innerHTML =
      `<div class="market-row free-pack">
        <div class="art">${artIng("lettuce")}</div>
        <div class="copy">
          <div class="nm">已解鎖補給包</div>
          <div class="sub">已解鎖市集食材各 ×3 · 完全免費 · 不用儲值</div>
        </div>
        <button type="button" class="get" id="btnFreePack">領取</button>
      </div>` +
      goods
        .map((ing) => {
          const open = isIngUnlocked(ing, lv);
          if (!open) {
            return `<div class="market-row locked-row">
              <div class="art">${Art.lock()}</div>
              <div class="copy">
                <div class="nm">未解鎖食材</div>
                <div class="sub">升到 Lv.${ing.unlock} 解鎖 · 仍然免費</div>
              </div>
              <button type="button" class="get" disabled>Lv.${ing.unlock}</button>
            </div>`;
          }
          return `<div class="market-row">
            <div class="art">${artIng(ing.id)}</div>
            <div class="copy">
              <div class="nm">${ing.name}</div>
              <div class="sub">庫存 ×${state.inv[ing.id] || 0} · 免費領取 ×2</div>
            </div>
            <button type="button" class="get" data-get="${ing.id}">領取</button>
          </div>`;
        })
        .join("");
  }

  function getMarket(id) {
    const ing = byId[id];
    if (!ing || !ing.market || !isIngUnlocked(ing, level())) return;
    state.inv[id] = (state.inv[id] || 0) + 2;
    save();
    renderMarket();
    toast(`已免費領取 ${ing.name} ×2`);
  }

  function getFreePack() {
    const lv = level();
    let n = 0;
    D.ingredients.filter((i) => i.market && isIngUnlocked(i, lv)).forEach((ing) => {
      state.inv[ing.id] = (state.inv[ing.id] || 0) + 3;
      n++;
    });
    save();
    renderMarket();
    toast(n ? `免費補給 ${n} 樣食材！` : "暫未有已解鎖市集食材");
  }

  function canCook(recipe) {
    if (!isRecipeUnlocked(recipe, level())) return false;
    return Object.entries(recipe.need).every(([id, n]) => (state.inv[id] || 0) >= n);
  }

  function renderKitchen() {
    const filter = state.filter || "all";
    const lv = level();
    $$(".chip").forEach((c) => c.classList.toggle("on", c.dataset.filter === filter));
    const recipes = D.recipes
      .filter((r) => filter === "all" || r.region === filter)
      .slice()
      .sort((a, b) => {
        const ua = isRecipeUnlocked(a, lv) ? 0 : 1;
        const ub = isRecipeUnlocked(b, lv) ? 0 : 1;
        if (ua !== ub) return ua - ub;
        return (a.unlock || 1) - (b.unlock || 1);
      });
    $("#recipeList").innerHTML = recipes
      .map((r) => {
        const unlocked = isRecipeUnlocked(r, lv);
        if (!unlocked) {
          return `<div class="recipe locked-recipe">
            <div class="plate">${Art.lock()}</div>
            <div class="body">
              <div class="nm">？？？</div>
              <div class="meta">Lv.${r.unlock || 1} 解鎖 · ${r.regionLabel}</div>
              <div class="desc">種植、烹飪、招呼客人即可升級 · 不用付錢</div>
            </div>
            <button type="button" class="cook" disabled>鎖</button>
          </div>`;
        }
        const ok = canCook(r);
        const needs = Object.entries(r.need)
          .map(([id, n]) => {
            const have = state.inv[id] || 0;
            const cls = have >= n ? "ok" : "miss";
            return `<span class="need-tag ${cls}"><span class="mini">${artIng(id)}</span>${byId[id].name}×${n}</span>`;
          })
          .join("");
        return `<div class="recipe">
          <div class="plate">${artDish(r.id, r.hue)}</div>
          <div class="body">
            <div class="nm">${r.name}</div>
            <div class="meta">${r.regionLabel} · +${r.reward}幣 · +${Math.ceil(r.reward / 6)}經驗</div>
            <div class="desc">${r.desc}</div>
            <div class="needs">${needs}</div>
          </div>
          <button type="button" class="cook" data-cook="${r.id}" ${ok ? "" : "disabled"}>煮</button>
        </div>`;
      })
      .join("");
  }

  function cook(id) {
    const r = recipeById[id];
    if (!r || !canCook(r)) {
      toast("食材不足");
      return;
    }
    Object.entries(r.need).forEach(([k, n]) => {
      state.inv[k] -= n;
    });
    state.coins += r.reward;
    state.cooked += 1;
    gainXp(Math.ceil(r.reward / 6));
    save();
    updateTop();
    renderKitchen();
    spawnFxArt(artDish(r.id, r.hue));
    toast(`完成「${r.name}」！+${r.reward}島幣`);
  }

  function eligibleGuests() {
    const lv = level();
    return D.guests.filter((g) => isRecipeUnlocked(recipeById[g.want], lv));
  }

  function currentGuest() {
    const list = eligibleGuests();
    if (!list.length) return null;
    return list[state.guestIdx % list.length];
  }

  function renderGuest() {
    const g = currentGuest();
    if (!g) {
      $("#guestCard").innerHTML = `
        <div class="face">${artIng("basil")}</div>
        <h3 class="who">暫未有客人</h3>
        <p class="say">多加種植、多做菜來升級，解鎖更多菜式之後就會有客人到來。</p>`;
      return;
    }
    const r = recipeById[g.want];
    const have = canCook(r);
    $("#guestCard").innerHTML = `
      <div class="face">${artDish(r.id, r.hue)}</div>
      <h3 class="who">${g.name}</h3>
      <p class="say">「${g.say}」</p>
      <p class="say" style="color:var(--leaf)">想要：${r.name}</p>
      <button type="button" class="serve" id="btnServe" ${have ? "" : "disabled"}>
        ${have ? `端上「${r.name}」` : "尚未有足夠食材烹調這道菜"}
      </button>
      <p class="splash-free">升級即可解鎖新食材 · 全程不用儲值</p>
    `;
  }

  function serveGuest() {
    const g = currentGuest();
    if (!g) return;
    const r = recipeById[g.want];
    if (!canCook(r)) {
      toast("食材不足");
      return;
    }
    Object.entries(r.need).forEach(([k, n]) => {
      state.inv[k] -= n;
    });
    const tip = r.reward + 15;
    state.coins += tip;
    state.cooked += 1;
    state.served += 1;
    state.guestIdx += 1;
    gainXp(12);
    save();
    updateTop();
    renderGuest();
    toast(`${g.name}很高興！+${tip}島幣`);
  }

  function initChromeArt() {
    if (!Art) return;
    try {
      const coin = $("#coinIcon");
      if (coin) coin.innerHTML = artIng("corn");
      const quest = $("#questIcon");
      if (quest) quest.innerHTML = artIng("tomato");
      const navMap = {
        navFarm: () => artIng("lettuce"),
        navPantry: () => artIng("carrot"),
        navMarket: () => artIng("egg"),
        navKitchen: () => artDish("tomato-egg", "#ffe8e0"),
        navGuest: () => artDish("nasi-lemak", "#e8f5d0"),
      };
      Object.entries(navMap).forEach(([id, fn]) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = fn();
      });
    } catch (err) {
      console.warn("art init failed", err);
    }
  }

  function bind() {
    const start = () => {
      if ($("#screen-play").classList.contains("on")) return;
      showScreen("screen-play");
      showPanel("farm");
      updateTop();
      startTick();
    };
    $("#btnStart").addEventListener("click", (e) => {
      e.preventDefault();
      start();
    });

    $$(".nav button").forEach((b) => {
      b.addEventListener("click", () => showPanel(b.dataset.nav));
    });

    $("#seedRow").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-seed]");
      if (!btn) return;
      state.selectedSeed = btn.dataset.seed;
      save();
      renderSeeds();
    });

    $("#farmGrid").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-plot]");
      if (!btn) return;
      plantAt(+btn.dataset.plot);
    });

    $("#btnWaterAll").addEventListener("click", waterAll);
    $("#btnHarvestAll").addEventListener("click", harvestAll);

    $("#marketList").addEventListener("click", (e) => {
      if (e.target.id === "btnFreePack") {
        getFreePack();
        return;
      }
      const btn = e.target.closest("[data-get]");
      if (btn) getMarket(btn.dataset.get);
    });

    $("#recipeList").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cook]");
      if (btn && !btn.disabled) cook(btn.dataset.cook);
    });

    $$(".chip").forEach((c) => {
      c.addEventListener("click", () => {
        state.filter = c.dataset.filter;
        save();
        renderKitchen();
      });
    });

    $("#guestCard").addEventListener("click", (e) => {
      if (e.target.id === "btnServe" && !e.target.disabled) serveGuest();
    });

    $("#btnReset").addEventListener("click", () => {
      if (confirm("確定清除存檔並重新開始？全部進度將會消失。")) {
        state = defaultState();
        save();
        updateTop();
        showPanel("farm");
        toast("已重新開始");
      }
    });

    $("#screen-home").addEventListener("click", (e) => {
      if (e.target.closest("#btnStart") || e.target.closest(".home-copy") || e.target.closest(".home-island")) {
        start();
      }
    });
  }

  function startTick() {
    clearInterval(tickTimer);
    tickTimer = setInterval(() => {
      const farmOn = $('[data-panel="farm"]').classList.contains("on");
      if (!farmOn) return;
      const anyGrowing = state.plots.some((p) => p.crop && p.watered && !isReady(p));
      if (anyGrowing) renderFarm();
    }, 250);
  }

  initChromeArt();
  bind();
  updateTop();

  if (/[?&]play=1(?:&|$)/.test(location.search)) {
    showScreen("screen-play");
    const m = location.search.match(/[?&]panel=([a-z]+)/);
    showPanel((m && m[1]) || "farm");
    startTick();
  }
})();

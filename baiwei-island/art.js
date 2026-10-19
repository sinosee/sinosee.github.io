/* 百味小島 — 原創柔和插畫風 SVG（唔用 emoji） */
window.BAIWEI_ART = (() => {
  const soft = (hex, a = 1) => {
    const n = hex.replace("#", "");
    const r = parseInt(n.slice(0, 2), 16);
    const g = parseInt(n.slice(2, 4), 16);
    const b = parseInt(n.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  };

  let _uid = 0;
  function wrap(inner, bg) {
    const id = `s${++_uid}`;
    return `<svg class="food-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <radialGradient id="${id}" cx="35%" cy="30%" r="55%">
          <stop offset="0%" stop-color="#fff" stop-opacity=".5"/>
          <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="${bg || "#f5efe4"}"/>
      <circle cx="32" cy="32" r="30" fill="url(#${id})"/>
      ${inner}
    </svg>`;
  }

  const icons = {
    rice: () => wrap(`
      <ellipse cx="32" cy="42" rx="18" ry="8" fill="#e8d9a8"/>
      <path d="M18 40 Q32 18 46 40" fill="#f3e7b8" stroke="#cbb87a" stroke-width="1"/>
      <path d="M24 38 Q32 24 40 38" fill="#fff6d4" opacity=".8"/>
      <circle cx="28" cy="34" r="1.4" fill="#d4c48a"/><circle cx="34" cy="32" r="1.2" fill="#d4c48a"/>
      <circle cx="30" cy="28" r="1.1" fill="#d4c48a"/>`, "#f7f0d8"),
    tomato: () => wrap(`
      <ellipse cx="32" cy="36" rx="16" ry="14" fill="#e85a4a"/>
      <ellipse cx="26" cy="30" rx="6" ry="5" fill="#ff8a78" opacity=".55"/>
      <path d="M32 22 c0-6 8-8 8-2" fill="none" stroke="#5a9b4a" stroke-width="2.5" stroke-linecap="round"/>
      <ellipse cx="32" cy="23" rx="5" ry="2.5" fill="#6bb85a"/>`, "#ffe8e2"),
    chili: () => wrap(`
      <path d="M22 44 Q18 28 30 20 Q42 16 44 28 Q46 44 34 48 Q24 50 22 44Z" fill="#e23b2e"/>
      <ellipse cx="28" cy="28" rx="4" ry="7" fill="#ff7a6a" opacity=".45" transform="rotate(-25 28 28)"/>
      <path d="M30 20 Q34 12 40 14" fill="none" stroke="#5aa34a" stroke-width="2.2" stroke-linecap="round"/>`, "#ffe6e0"),
    garlic: () => wrap(`
      <ellipse cx="32" cy="36" rx="14" ry="12" fill="#f4efe6"/>
      <path d="M22 36 Q32 20 42 36" fill="#fff" opacity=".5"/>
      <path d="M26 40 Q32 28 38 40" fill="none" stroke="#d9d0c0" stroke-width="1.2"/>
      <path d="M32 24 v-6" stroke="#b8c99a" stroke-width="2" stroke-linecap="round"/>`, "#f3f0ea"),
    ginger: () => wrap(`
      <path d="M18 38 Q22 22 34 26 Q44 18 48 30 Q50 44 36 46 Q22 48 18 38Z" fill="#e0a86a"/>
      <ellipse cx="30" cy="30" rx="5" ry="4" fill="#f0c48a" opacity=".5"/>
      <path d="M26 34 Q34 28 40 36" fill="none" stroke="#c48848" stroke-width="1.2"/>`, "#f8e8d0"),
    onion: () => wrap(`
      <ellipse cx="32" cy="36" rx="14" ry="13" fill="#d4a06a"/>
      <ellipse cx="32" cy="36" rx="10" ry="9" fill="#e8bc88" opacity=".55"/>
      <path d="M32 23 Q28 14 32 10 Q36 14 32 23" fill="#7cbc6a"/>
      <path d="M24 40 Q32 28 40 40" fill="none" stroke="#b88048" stroke-width="1.1"/>`, "#f6e6d0"),
    lemongrass: () => wrap(`
      <path d="M28 48 Q26 20 34 10" fill="none" stroke="#c8d86a" stroke-width="4" stroke-linecap="round"/>
      <path d="M32 48 Q36 18 44 12" fill="none" stroke="#a8c84a" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M24 48 Q20 24 18 16" fill="none" stroke="#9cbc4a" stroke-width="3" stroke-linecap="round"/>`, "#eef6d8"),
    basil: () => wrap(`
      <ellipse cx="32" cy="30" rx="14" ry="18" fill="#4caa62" transform="rotate(-8 32 30)"/>
      <path d="M32 46 Q34 30 32 14" fill="none" stroke="#2e7a42" stroke-width="1.5"/>
      <ellipse cx="26" cy="26" rx="4" ry="6" fill="#7ed48a" opacity=".45"/>`, "#e4f6e8"),
    cilantro: () => wrap(`
      <circle cx="24" cy="28" r="7" fill="#4aaa5a"/><circle cx="34" cy="24" r="7" fill="#5abc6a"/>
      <circle cx="38" cy="34" r="7" fill="#3e9a4e"/><circle cx="28" cy="36" r="6" fill="#6acc78"/>
      <path d="M32 48 v-16" stroke="#2e7a3e" stroke-width="2"/>`, "#e6f8ea"),
    lime: () => wrap(`
      <circle cx="32" cy="34" r="16" fill="#b8d84a"/>
      <circle cx="32" cy="34" r="12" fill="#d4f06a" opacity=".35"/>
      <path d="M32 18 Q36 12 40 16" fill="none" stroke="#6a9a3a" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="26" cy="28" rx="4" ry="3" fill="#e8ff9a" opacity=".5"/>`, "#f0fad8"),
    coconut: () => wrap(`
      <ellipse cx="32" cy="36" rx="16" ry="14" fill="#8b5a2b"/>
      <ellipse cx="32" cy="36" rx="12" ry="10" fill="#a06a38"/>
      <circle cx="26" cy="32" r="1.5" fill="#5a3818"/><circle cx="32" cy="30" r="1.5" fill="#5a3818"/>
      <circle cx="38" cy="34" r="1.5" fill="#5a3818"/>
      <ellipse cx="28" cy="28" rx="4" ry="3" fill="#c48858" opacity=".4"/>`, "#f0e0d0"),
    mango: () => wrap(`
      <path d="M24 42 Q18 28 28 16 Q44 12 46 30 Q48 46 34 48 Q24 48 24 42Z" fill="#f0a030"/>
      <ellipse cx="30" cy="28" rx="6" ry="8" fill="#ffd060" opacity=".45"/>
      <path d="M30 16 Q34 8 40 12" fill="none" stroke="#5aaa4a" stroke-width="2.2" stroke-linecap="round"/>`, "#fff0d0"),
    pineapple: () => wrap(`
      <ellipse cx="32" cy="40" rx="12" ry="14" fill="#e8b84a"/>
      <path d="M22 34 L42 46 M22 46 L42 34 M22 40 L42 40" stroke="#c89830" stroke-width="1.2" opacity=".7"/>
      <path d="M26 26 Q32 10 38 26" fill="#5aaa4a"/>
      <path d="M28 26 Q24 14 22 20" fill="#6abc5a"/><path d="M36 26 Q40 14 42 20" fill="#6abc5a"/>`, "#fff6d8"),
    eggplant: () => wrap(`
      <ellipse cx="34" cy="36" rx="12" ry="16" fill="#7a4aaa" transform="rotate(15 34 36)"/>
      <ellipse cx="30" cy="28" rx="4" ry="6" fill="#a878d0" opacity=".4"/>
      <path d="M28 20 Q32 12 38 18" fill="#5aaa4a"/>`, "#f0e8f8"),
    cucumber: () => wrap(`
      <ellipse cx="32" cy="34" rx="10" ry="20" fill="#5aaa4a" transform="rotate(-20 32 34)"/>
      <ellipse cx="28" cy="28" rx="3" ry="8" fill="#8ad86a" opacity=".4" transform="rotate(-20 28 28)"/>
      <circle cx="30" cy="24" r="1.2" fill="#3e8a3a"/><circle cx="36" cy="36" r="1.2" fill="#3e8a3a"/>`, "#e8f8e4"),
    carrot: () => wrap(`
      <path d="M28 22 L36 22 L34 50 L30 50 Z" fill="#f08a30"/>
      <ellipse cx="32" cy="28" rx="3" ry="6" fill="#ffb060" opacity=".45"/>
      <path d="M28 22 Q24 12 28 10" fill="#5aaa4a"/><path d="M32 22 Q34 8 38 12" fill="#6abc5a"/>
      <path d="M34 22 Q40 14 36 10" fill="#4e9a3a"/>`, "#fff0e0"),
    potato: () => wrap(`
      <ellipse cx="32" cy="34" rx="16" ry="12" fill="#d4b080"/>
      <circle cx="26" cy="30" r="1.8" fill="#a88858"/><circle cx="36" cy="36" r="1.5" fill="#a88858"/>
      <circle cx="34" cy="28" r="1.3" fill="#a88858"/>
      <ellipse cx="28" cy="28" rx="4" ry="3" fill="#e8d0a8" opacity=".4"/>`, "#f6ead8"),
    mushroom: () => wrap(`
      <ellipse cx="32" cy="28" rx="16" ry="12" fill="#c48868"/>
      <ellipse cx="32" cy="26" rx="12" ry="8" fill="#e0a888"/>
      <rect x="26" y="28" width="12" height="16" rx="4" fill="#f0e0c8"/>
      <circle cx="26" cy="24" r="2" fill="#f5d0b0" opacity=".6"/>`, "#f6eae0"),
    lettuce: () => wrap(`
      <ellipse cx="32" cy="34" rx="18" ry="14" fill="#6abc5a"/>
      <ellipse cx="26" cy="30" rx="8" ry="10" fill="#8ad86a"/>
      <ellipse cx="38" cy="32" rx="8" ry="10" fill="#5aaa4a"/>
      <ellipse cx="32" cy="36" rx="7" ry="8" fill="#a8e878"/>`, "#e8f8e4"),
    corn: () => wrap(`
      <ellipse cx="32" cy="36" rx="10" ry="18" fill="#f0d050"/>
      <g fill="#e8c030">${[0,1,2,3,4].map(r=>[0,1,2].map(c=>`<circle cx="${26+c*6}" cy="${24+r*5}" r="1.8"/>`).join("")).join("")}</g>
      <path d="M22 28 Q18 40 24 48" fill="#5aaa4a"/><path d="M42 28 Q46 40 40 48" fill="#6abc5a"/>`, "#fff8d8"),
    wheat: () => wrap(`
      <path d="M32 52 V18" stroke="#c8a848" stroke-width="2"/>
      ${[0,1,2,3,4,5].map(i=>`<ellipse cx="32" cy="${20+i*5}" rx="6" ry="3" fill="#e8d070" transform="rotate(${i%2?12:-12} 32 ${20+i*5})"/>`).join("")}`, "#f8f0d8"),
    olive: () => wrap(`
      <ellipse cx="28" cy="34" rx="8" ry="11" fill="#6a8a2a" transform="rotate(-20 28 34)"/>
      <ellipse cx="40" cy="30" rx="7" ry="10" fill="#7a9a3a" transform="rotate(15 40 30)"/>
      <ellipse cx="26" cy="30" rx="2.5" ry="3" fill="#a8c85a" opacity=".4"/>`, "#eef4d8"),
    avocado: () => wrap(`
      <path d="M32 12 Q48 20 46 40 Q44 54 32 54 Q20 54 18 40 Q16 20 32 12Z" fill="#5a8a2a"/>
      <ellipse cx="32" cy="36" rx="10" ry="12" fill="#c8d86a"/>
      <circle cx="32" cy="36" r="5" fill="#8a5a28"/>`, "#e8f4d8"),
    chickpea: () => wrap(`
      <ellipse cx="26" cy="34" rx="9" ry="8" fill="#e0b878"/>
      <ellipse cx="38" cy="32" rx="8" ry="7" fill="#d4a868"/>
      <ellipse cx="32" cy="40" rx="7" ry="6" fill="#e8c888"/>
      <circle cx="24" cy="32" r="1.5" fill="#c89858"/>`, "#f8ecd8"),
    turmeric: () => wrap(`
      <path d="M20 40 Q24 22 36 26 Q46 20 48 34 Q50 48 34 48 Q20 48 20 40Z" fill="#e8a820"/>
      <ellipse cx="32" cy="32" rx="5" ry="4" fill="#f8d050" opacity=".5"/>`, "#fff4d0"),
    mint: () => wrap(`
      <ellipse cx="24" cy="32" rx="10" ry="14" fill="#5abc7a" transform="rotate(-25 24 32)"/>
      <ellipse cx="40" cy="32" rx="10" ry="14" fill="#4aaa6a" transform="rotate(25 40 32)"/>
      <path d="M32 48 V20" stroke="#2e8a4a" stroke-width="2"/>`, "#e4f8ec"),
    sesame: () => wrap(`
      ${[[22,28],[30,24],[38,28],[26,36],[34,34],[40,38],[28,42]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx="4" ry="3" fill="#f0e0b8" stroke="#d4c090" stroke-width=".6"/>`).join("")}`, "#f8f4e8"),
    nori: () => wrap(`
      <rect x="16" y="16" width="32" height="32" rx="3" fill="#2a4a3a"/>
      <path d="M20 24 H44 M20 32 H44 M20 40 H44" stroke="#3a6a52" stroke-width="1.5" opacity=".6"/>`, "#e4ece8"),
    soybean: () => wrap(`
      <ellipse cx="26" cy="34" rx="8" ry="7" fill="#e8d070"/>
      <ellipse cx="38" cy="30" rx="7" ry="6" fill="#dcc060"/>
      <ellipse cx="34" cy="40" rx="7" ry="6" fill="#f0dc80"/>`, "#f8f4d8"),
    pepper: () => wrap(`
      <path d="M22 40 Q20 24 32 18 Q44 22 44 38 Q44 50 32 50 Q22 50 22 40Z" fill="#e85a3a"/>
      <ellipse cx="28" cy="30" rx="5" ry="6" fill="#ff8a6a" opacity=".4"/>
      <path d="M32 18 Q34 10 38 12" fill="none" stroke="#5aaa4a" stroke-width="2.2" stroke-linecap="round"/>`, "#ffe8e0"),
    egg: () => wrap(`
      <ellipse cx="32" cy="34" rx="12" ry="16" fill="#f8f0dc"/>
      <ellipse cx="28" cy="28" rx="5" ry="6" fill="#fff" opacity=".55"/>`, "#f8f4e8"),
    milk: () => wrap(`
      <rect x="22" y="16" width="20" height="34" rx="4" fill="#f4f6f8" stroke="#d0d8e0" stroke-width="1.5"/>
      <rect x="24" y="20" width="16" height="10" fill="#fff"/>
      <rect x="26" y="14" width="12" height="5" rx="1" fill="#c8d0d8"/>`, "#eef2f6"),
    chicken: () => wrap(`
      <ellipse cx="34" cy="36" rx="14" ry="10" fill="#e8b888"/>
      <path d="M20 30 Q28 18 36 28" fill="#f0c8a0"/>
      <path d="M18 28 Q14 24 18 22" fill="#e85a3a"/>
      <circle cx="40" cy="30" r="2" fill="#5a3a28"/>`, "#f8e8d8"),
    beef: () => wrap(`
      <ellipse cx="32" cy="34" rx="18" ry="12" fill="#c45a48"/>
      <ellipse cx="28" cy="32" rx="6" ry="5" fill="#e88070" opacity=".4"/>
      <path d="M20 34 Q32 28 44 34" fill="none" stroke="#a04038" stroke-width="1.2"/>`, "#f8e4e0"),
    pork: () => wrap(`
      <ellipse cx="32" cy="34" rx="16" ry="11" fill="#e8a0a0"/>
      <ellipse cx="28" cy="30" rx="5" ry="4" fill="#f8c0c0" opacity=".5"/>
      <path d="M22 36 Q32 30 42 36" fill="none" stroke="#d08080" stroke-width="1"/>`, "#f8e8e8"),
    shrimp: () => wrap(`
      <path d="M20 36 Q28 18 42 22 Q50 28 44 40 Q36 50 24 44 Q16 40 20 36Z" fill="#f08060"/>
      <ellipse cx="34" cy="28" rx="4" ry="5" fill="#ffb090" opacity=".45"/>
      <circle cx="44" cy="26" r="1.8" fill="#5a2a20"/>
      <path d="M18 34 Q14 28 16 24" fill="none" stroke="#f08060" stroke-width="2" stroke-linecap="round"/>`, "#ffe8e0"),
    fish: () => wrap(`
      <ellipse cx="30" cy="34" rx="16" ry="10" fill="#6ab0d0"/>
      <path d="M44 34 L54 26 L54 42 Z" fill="#5a9cbc"/>
      <circle cx="22" cy="32" r="2" fill="#1a3a4a"/>
      <ellipse cx="28" cy="30" rx="4" ry="3" fill="#a8d8ec" opacity=".45"/>`, "#e4f2f8"),
    tofu: () => wrap(`
      <rect x="16" y="22" width="32" height="24" rx="3" fill="#f8f4e8" stroke="#e0d8c0" stroke-width="1.5"/>
      <path d="M20 30 H44 M20 38 H44" stroke="#ebe4d0" stroke-width="1.2"/>
      <ellipse cx="24" cy="28" rx="3" ry="2" fill="#fff" opacity=".5"/>`, "#f6f2e8"),
    noodle: () => wrap(`
      <ellipse cx="32" cy="40" rx="18" ry="8" fill="#e8d8a8"/>
      <path d="M18 34 Q28 20 38 34 Q46 22 50 34" fill="none" stroke="#f0e0b0" stroke-width="3" stroke-linecap="round"/>
      <path d="M16 38 Q26 26 36 38 Q44 28 48 38" fill="none" stroke="#e0c888" stroke-width="2.5" stroke-linecap="round"/>`, "#f8f0d8"),
    butter: () => wrap(`
      <rect x="14" y="24" width="36" height="20" rx="3" fill="#f8e050"/>
      <rect x="14" y="24" width="36" height="6" rx="3" fill="#fff090" opacity=".6"/>
      <path d="M20 36 H44" stroke="#e8c830" stroke-width="1" opacity=".5"/>`, "#fff8d8"),
    cheese: () => wrap(`
      <path d="M14 44 L32 16 L50 44 Z" fill="#f0d050"/>
      <circle cx="28" cy="34" r="3" fill="#e8b830" opacity=".5"/>
      <circle cx="36" cy="38" r="2.5" fill="#e8b830" opacity=".5"/>
      <path d="M18 40 L32 22 L46 40" fill="none" stroke="#e0b830" stroke-width="1"/>`, "#fff6d0"),
    fishsauce: () => wrap(`
      <rect x="24" y="14" width="16" height="36" rx="3" fill="#8a6818"/>
      <rect x="26" y="18" width="12" height="8" fill="#c8a848"/>
      <rect x="28" y="12" width="8" height="4" rx="1" fill="#6a5010"/>`, "#f0e8d0"),
    oil: () => wrap(`
      <path d="M26 18 H38 L42 48 H22 Z" fill="#f0e070"/>
      <ellipse cx="32" cy="18" rx="6" ry="3" fill="#e8d050"/>
      <rect x="28" y="12" width="8" height="6" rx="1" fill="#d8c040"/>
      <ellipse cx="30" cy="30" rx="3" ry="6" fill="#fff8a0" opacity=".4"/>`, "#f8f4d0"),
    flour: () => wrap(`
      <path d="M18 48 Q18 20 32 16 Q46 20 46 48 Z" fill="#f4efe4"/>
      <ellipse cx="32" cy="48" rx="14" ry="4" fill="#e8e0d0"/>
      <path d="M24 28 Q32 22 40 28" fill="none" stroke="#ddd5c4" stroke-width="1.5"/>`, "#f6f2ea"),
    yogurt: () => wrap(`
      <ellipse cx="32" cy="40" rx="16" ry="10" fill="#f8f4ec"/>
      <ellipse cx="32" cy="34" rx="14" ry="8" fill="#fff"/>
      <ellipse cx="32" cy="30" rx="10" ry="4" fill="#f0ece0" opacity=".5"/>`, "#f6f2ea"),
    lamb: () => wrap(`
      <ellipse cx="32" cy="34" rx="16" ry="12" fill="#b86848"/>
      <ellipse cx="28" cy="30" rx="5" ry="4" fill="#d88868" opacity=".4"/>
      <path d="M20 36 Q32 28 44 36" fill="none" stroke="#984830" stroke-width="1.2"/>`, "#f4e4dc"),
  };

  const dishes = {
    "tomato-egg": () => wrap(`
      <ellipse cx="32" cy="42" rx="20" ry="8" fill="#e8e0d0"/>
      <ellipse cx="32" cy="36" rx="16" ry="10" fill="#f0c050"/>
      <ellipse cx="26" cy="32" rx="6" ry="5" fill="#e85a4a"/>
      <ellipse cx="38" cy="34" rx="5" ry="4" fill="#ff8a6a"/>
      <ellipse cx="30" cy="28" rx="4" ry="3" fill="#fff090" opacity=".5"/>`, "#fff4e0"),
    "garlic-cucumber": () => wrap(`
      <ellipse cx="32" cy="42" rx="18" ry="7" fill="#e8e0d0"/>
      <ellipse cx="26" cy="32" rx="6" ry="12" fill="#5aaa4a" transform="rotate(-20 26 32)"/>
      <ellipse cx="38" cy="34" rx="5" ry="11" fill="#6abc5a" transform="rotate(15 38 34)"/>
      <circle cx="32" cy="36" r="3" fill="#f4efe6"/>`, "#eef8e8"),
    "chili-chicken": () => wrap(`
      <ellipse cx="32" cy="42" rx="18" ry="7" fill="#e8e0d0"/>
      <ellipse cx="30" cy="34" rx="12" ry="8" fill="#e8a878"/>
      <path d="M36 28 Q42 22 44 28" fill="#e23b2e"/>
      <ellipse cx="26" cy="30" rx="3" ry="2" fill="#ffb090" opacity=".5"/>`, "#fff0e4"),
    "onion-omlette": () => wrap(`
      <ellipse cx="32" cy="40" rx="18" ry="8" fill="#e8e0d0"/>
      <ellipse cx="32" cy="34" rx="16" ry="10" fill="#f5d060"/>
      <path d="M24 32 Q32 26 40 34" fill="#e8b878" opacity=".5"/>`, "#fff6e0"),
    flatbread: () => wrap(`
      <ellipse cx="32" cy="36" rx="18" ry="12" fill="#e8c888"/>
      <ellipse cx="32" cy="34" rx="14" ry="9" fill="#f0d8a0"/>
      <circle cx="28" cy="32" r="1.5" fill="#d4b070"/><circle cx="36" cy="36" r="1.2" fill="#d4b070"/>`, "#f8ecd8"),
    "rice-bowl": () => wrap(`
      <ellipse cx="32" cy="44" rx="16" ry="6" fill="#d8c8a0"/>
      <path d="M16 40 Q18 28 32 24 Q46 28 48 40" fill="#f4ead0"/>
      <ellipse cx="32" cy="28" rx="10" ry="5" fill="#fff8e8"/>`, "#f8f2e4"),
    "nasi-lemak": () => wrap(`
      <ellipse cx="32" cy="44" rx="18" ry="7" fill="#d8c8a0"/>
      <ellipse cx="28" cy="34" rx="10" ry="8" fill="#f4ead0"/>
      <ellipse cx="40" cy="36" rx="6" ry="5" fill="#e85a3a"/>
      <ellipse cx="34" cy="28" rx="5" ry="4" fill="#f8f0dc"/>`, "#f4f0e0"),
    pho: () => wrap(`
      <ellipse cx="32" cy="44" rx="18" ry="7" fill="#d0c4a8"/>
      <ellipse cx="32" cy="36" rx="16" ry="8" fill="#e8c878"/>
      <path d="M22 34 Q32 28 42 36" fill="none" stroke="#f0e0b0" stroke-width="2"/>
      <ellipse cx="28" cy="32" rx="4" ry="3" fill="#8a5a3a"/>
      <path d="M38 28 Q40 22 42 28" fill="#4aaa5a"/>`, "#f8f0e0"),
    "green-curry": () => wrap(`
      <ellipse cx="32" cy="44" rx="18" ry="7" fill="#d0c4a8"/>
      <ellipse cx="32" cy="36" rx="16" ry="9" fill="#6aaa5a"/>
      <ellipse cx="28" cy="32" rx="4" ry="3" fill="#e8b888"/>
      <ellipse cx="38" cy="34" rx="3" ry="2.5" fill="#4a8a3a"/>`, "#e8f4e4"),
    laksa: () => wrap(`
      <ellipse cx="32" cy="44" rx="18" ry="7" fill="#d0c4a8"/>
      <ellipse cx="32" cy="36" rx="16" ry="9" fill="#e89858"/>
      <path d="M22 34 Q30 28 40 36" fill="none" stroke="#f0d090" stroke-width="2"/>
      <ellipse cx="36" cy="30" rx="4" ry="3" fill="#f08060"/>`, "#fff0e4"),
    "mango-sticky": () => wrap(`
      <ellipse cx="32" cy="44" rx="16" ry="6" fill="#d8c8a0"/>
      <ellipse cx="26" cy="34" rx="8" ry="7" fill="#f4ead0"/>
      <path d="M34 40 Q40 22 48 32 Q46 42 38 42 Z" fill="#f0a030"/>
      <ellipse cx="28" cy="30" rx="3" ry="2" fill="#fff8e8" opacity=".5"/>`, "#fff6e0"),
    "goi-cuon": () => wrap(`
      <rect x="14" y="28" width="36" height="12" rx="6" fill="#e8f0d8"/>
      <ellipse cx="24" cy="34" rx="3" ry="2" fill="#f08060"/>
      <ellipse cx="32" cy="34" rx="3" ry="4" fill="#5aaa4a"/>
      <ellipse cx="40" cy="34" rx="2.5" ry="2" fill="#f4efe6"/>`, "#f0f8e8"),
    satay: () => wrap(`
      <rect x="30" y="12" width="4" height="40" rx="1" fill="#c8a878"/>
      <ellipse cx="32" cy="24" rx="8" ry="5" fill="#c87840"/>
      <ellipse cx="32" cy="34" rx="8" ry="5" fill="#d88848"/>
      <ellipse cx="32" cy="44" rx="8" ry="5" fill="#c87840"/>`, "#f8ecd8"),
    sinigang: () => wrap(`
      <ellipse cx="32" cy="44" rx="18" ry="7" fill="#d0c4a8"/>
      <ellipse cx="32" cy="36" rx="16" ry="9" fill="#e87050"/>
      <ellipse cx="28" cy="32" rx="4" ry="3" fill="#e8a878"/>
      <circle cx="38" cy="34" r="3" fill="#e85a4a"/>`, "#fff0e8"),
    "hainan-chicken": () => wrap(`
      <ellipse cx="32" cy="44" rx="18" ry="7" fill="#d8c8a0"/>
      <ellipse cx="24" cy="34" rx="8" ry="7" fill="#f4ead0"/>
      <ellipse cx="40" cy="34" rx="8" ry="7" fill="#e8b888"/>
      <ellipse cx="40" cy="28" rx="3" ry="2" fill="#8ad86a"/>`, "#f8f2e4"),
    "ginger-chicken": () => wrap(`
      <ellipse cx="32" cy="42" rx="18" ry="7" fill="#e8e0d0"/>
      <ellipse cx="32" cy="34" rx="14" ry="9" fill="#e8a878"/>
      <ellipse cx="26" cy="30" rx="3" ry="2" fill="#e0a86a"/>
      <ellipse cx="38" cy="32" rx="3" ry="2" fill="#d4a06a"/>`, "#fff0e4"),
    "pineapple-shrimp": () => wrap(`
      <ellipse cx="32" cy="42" rx="18" ry="7" fill="#e8e0d0"/>
      <ellipse cx="26" cy="32" rx="6" ry="5" fill="#f08060"/>
      <ellipse cx="38" cy="34" rx="7" ry="6" fill="#e8b84a"/>
      <ellipse cx="32" cy="28" rx="3" ry="2" fill="#e23b2e"/>`, "#fff4e0"),
    "pasta-pomodoro": () => wrap(`
      <ellipse cx="32" cy="44" rx="18" ry="7" fill="#d8c8a0"/>
      <path d="M18 36 Q28 24 38 36 Q46 26 50 36" fill="none" stroke="#e8c888" stroke-width="3"/>
      <ellipse cx="30" cy="32" rx="5" ry="4" fill="#e85a4a"/>
      <ellipse cx="38" cy="30" rx="3" ry="2" fill="#4caa62"/>`, "#fff0e4"),
    "french-onion": () => wrap(`
      <ellipse cx="32" cy="44" rx="16" ry="7" fill="#c8b898"/>
      <ellipse cx="32" cy="34" rx="14" ry="10" fill="#c88848"/>
      <ellipse cx="32" cy="26" rx="12" ry="4" fill="#f0d050"/>
      <ellipse cx="28" cy="24" rx="3" ry="2" fill="#fff090" opacity=".5"/>`, "#f8ecd8"),
    "greek-salad": () => wrap(`
      <ellipse cx="32" cy="40" rx="18" ry="8" fill="#e8e0d0"/>
      <ellipse cx="26" cy="32" rx="5" ry="4" fill="#e85a4a"/>
      <ellipse cx="36" cy="30" rx="5" ry="6" fill="#5aaa4a"/>
      <rect x="34" y="34" width="8" height="6" rx="1" fill="#f0f4f8"/>
      <ellipse cx="24" cy="38" rx="3" ry="2" fill="#6a8a2a"/>`, "#eef6e8"),
    burger: () => wrap(`
      <ellipse cx="32" cy="40" rx="16" ry="5" fill="#e8b060"/>
      <ellipse cx="32" cy="36" rx="15" ry="3" fill="#5aaa4a"/>
      <ellipse cx="32" cy="32" rx="15" ry="4" fill="#c45a48"/>
      <ellipse cx="32" cy="28" rx="15" ry="3" fill="#e85a4a"/>
      <ellipse cx="32" cy="24" rx="16" ry="5" fill="#e8b060"/>`, "#fff0e0"),
    "fish-chips": () => wrap(`
      <ellipse cx="24" cy="36" rx="10" ry="6" fill="#f0d070"/>
      <rect x="34" y="24" width="5" height="22" rx="2" fill="#f0c850"/>
      <rect x="42" y="26" width="5" height="20" rx="2" fill="#e8b840"/>
      <ellipse cx="22" cy="32" rx="3" ry="2" fill="#fff090" opacity=".4"/>`, "#fff6e0"),
    paella: () => wrap(`
      <ellipse cx="32" cy="42" rx="18" ry="8" fill="#c8a878"/>
      <ellipse cx="32" cy="36" rx="16" ry="9" fill="#e8b840"/>
      <ellipse cx="26" cy="32" rx="4" ry="3" fill="#f08060"/>
      <ellipse cx="38" cy="34" rx="4" ry="3" fill="#6ab0d0"/>
      <ellipse cx="32" cy="30" rx="3" ry="2" fill="#e85a3a"/>`, "#fff4d8"),
    tacos: () => wrap(`
      <path d="M16 40 Q32 12 48 40" fill="#e8c070"/>
      <path d="M20 38 Q32 18 44 38" fill="#5aaa4a"/>
      <ellipse cx="28" cy="32" rx="4" ry="3" fill="#c45a48"/>
      <ellipse cx="36" cy="34" rx="3" ry="2" fill="#e85a4a"/>`, "#fff0e0"),
    "mushroom-soup": () => wrap(`
      <ellipse cx="32" cy="44" rx="16" ry="7" fill="#c8b898"/>
      <ellipse cx="32" cy="34" rx="14" ry="10" fill="#d4b898"/>
      <ellipse cx="28" cy="30" rx="4" ry="3" fill="#c48868"/>
      <ellipse cx="36" cy="32" rx="3" ry="2.5" fill="#a87050"/>`, "#f4ece4"),
    ratatouille: () => wrap(`
      <ellipse cx="32" cy="42" rx="16" ry="7" fill="#e8e0d0"/>
      <ellipse cx="26" cy="32" rx="6" ry="8" fill="#7a4aaa"/>
      <ellipse cx="36" cy="30" rx="6" ry="5" fill="#e85a4a"/>
      <ellipse cx="34" cy="38" rx="5" ry="4" fill="#e85a3a"/>`, "#f4e8f0"),
    "curry-rice": () => wrap(`
      <ellipse cx="32" cy="44" rx="18" ry="7" fill="#d8c8a0"/>
      <ellipse cx="24" cy="34" rx="8" ry="7" fill="#f4ead0"/>
      <ellipse cx="40" cy="34" rx="9" ry="8" fill="#e8a820"/>
      <ellipse cx="38" cy="30" rx="3" ry="2" fill="#e8b888"/>`, "#fff4d8"),
    "sushi-roll": () => wrap(`
      <circle cx="24" cy="34" r="10" fill="#2a4a3a"/>
      <circle cx="24" cy="34" r="7" fill="#f4ead0"/>
      <circle cx="24" cy="34" r="3" fill="#e85a4a"/>
      <circle cx="42" cy="34" r="10" fill="#2a4a3a"/>
      <circle cx="42" cy="34" r="7" fill="#f4ead0"/>
      <circle cx="42" cy="34" r="3" fill="#5a8a2a"/>`, "#e8f0e8"),
    bibimbap: () => wrap(`
      <ellipse cx="32" cy="44" rx="18" ry="7" fill="#d8c8a0"/>
      <ellipse cx="32" cy="34" rx="16" ry="10" fill="#f4ead0"/>
      <ellipse cx="24" cy="30" rx="4" ry="3" fill="#f08a30"/>
      <ellipse cx="32" cy="28" rx="4" ry="3" fill="#5aaa4a"/>
      <ellipse cx="40" cy="32" rx="4" ry="3" fill="#c48868"/>
      <ellipse cx="32" cy="36" rx="4" ry="3" fill="#f0d050"/>`, "#fff0e4"),
    falafel: () => wrap(`
      <circle cx="24" cy="34" r="9" fill="#c89850"/>
      <circle cx="40" cy="34" r="9" fill="#d4a860"/>
      <circle cx="32" cy="42" r="7" fill="#c09048"/>
      <ellipse cx="22" cy="30" rx="2" ry="1.5" fill="#e8c888" opacity=".4"/>`, "#f8ecd8"),
    tagine: () => wrap(`
      <ellipse cx="32" cy="46" rx="16" ry="5" fill="#c87848"/>
      <path d="M16 42 Q18 28 32 14 Q46 28 48 42" fill="#d88858"/>
      <ellipse cx="32" cy="14" rx="3" ry="4" fill="#c87848"/>`, "#f8e8d8"),
    "mapo-tofu": () => wrap(`
      <ellipse cx="32" cy="44" rx="18" ry="7" fill="#d8c8a0"/>
      <ellipse cx="32" cy="36" rx="16" ry="9" fill="#e87050"/>
      <rect x="24" y="30" width="7" height="7" rx="1" fill="#f8f4e8"/>
      <rect x="34" y="32" width="7" height="7" rx="1" fill="#f8f4e8"/>
      <circle cx="28" cy="28" r="2" fill="#e23b2e"/>`, "#fff0e4"),
    ceviche: () => wrap(`
      <ellipse cx="32" cy="40" rx="18" ry="8" fill="#e8e0d0"/>
      <ellipse cx="26" cy="32" rx="6" ry="4" fill="#e8f0f4"/>
      <ellipse cx="38" cy="34" rx="6" ry="4" fill="#d0e8f0"/>
      <ellipse cx="32" cy="28" rx="3" ry="2" fill="#b8d84a"/>
      <path d="M40 26 Q42 20 44 26" fill="#4aaa5a"/>`, "#e8f8f0"),
    shakshuka: () => wrap(`
      <ellipse cx="32" cy="44" rx="18" ry="7" fill="#c8a878"/>
      <ellipse cx="32" cy="36" rx="16" ry="10" fill="#e85a3a"/>
      <ellipse cx="26" cy="32" rx="5" ry="4" fill="#f8f0dc"/>
      <ellipse cx="38" cy="34" rx="5" ry="4" fill="#f8f0dc"/>
      <circle cx="26" cy="32" r="2.5" fill="#f0c050"/>
      <circle cx="38" cy="34" r="2.5" fill="#f0c050"/>`, "#fff0e4"),
  };

  function ingredient(id, color) {
    const fn = icons[id];
    if (fn) return fn();
    return wrap(`<circle cx="32" cy="32" r="12" fill="${color || "#c8d0c8"}"/>`, color || "#eef2ee");
  }

  function dish(id, hue) {
    const fn = dishes[id];
    if (fn) return fn();
    return wrap(`
      <ellipse cx="32" cy="42" rx="18" ry="7" fill="#d8c8a0"/>
      <ellipse cx="32" cy="34" rx="14" ry="9" fill="${hue || "#e8c878"}"/>
      <ellipse cx="28" cy="30" rx="4" ry="3" fill="#fff" opacity=".35"/>`, hue || "#f8f0e0");
  }

  function lock() {
    return wrap(`
      <rect x="22" y="30" width="20" height="16" rx="3" fill="#b8c0b8"/>
      <path d="M26 30 V24 Q26 16 32 16 Q38 16 38 24 V30" fill="none" stroke="#9aa49a" stroke-width="3" stroke-linecap="round"/>
      <circle cx="32" cy="38" r="2.5" fill="#8a948a"/>`, "#e4e8e4");
  }

  return { ingredient, dish, lock };
})();

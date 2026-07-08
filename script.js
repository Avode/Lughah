/* ==========================================================================
   Lughah — lughah.com.my
   Shared JavaScript for all pages. Vanilla JS, no dependencies.

   Contents:
     1. CONFIG        — replace WhatsApp number / Stripe link / analytics IDs here
     2. Helpers       — storage, tracking
     3. Link wiring   — WhatsApp + Stripe links from CONFIG
     4. Header & nav  — sticky shadow, mobile menu
     5. Language      — EN <-> BM floating toggle (data-ms attributes)
     6. A/B test      — homepage hero headline (variants A/B/C)
     7. Reveal        — scroll-in animation
     8. Quiz          — multi-step Arabic Goal Quiz (quiz.html)
     9. Page hooks    — early-bird + thank-you tracking
   ========================================================================== */

"use strict";

/* --------------------------------------------------------------------------
   1. CONFIG — the single place to update contact, payment and tracking IDs.
   -------------------------------------------------------------------------- */
const LUGHAH_CONFIG = {
  // >>> REPLACE with your real WhatsApp Business number (country code, no "+")
  whatsappNumber: "60123456789",
  whatsappBaseText: "Hi Lughah, I am interested in Arabic classes",

  // >>> REPLACE with your real Stripe Payment Link
  stripeUrl: "https://buy.stripe.com/test_lughah_earlybird",

  // >>> OPTIONAL: set your analytics IDs here once the snippets in each
  //     page's <head> are activated. Used only for console reminders.
  gaMeasurementId: "",   // e.g. "G-XXXXXXXXXX"
  metaPixelId: "",       // e.g. "1234567890"
};

/* --------------------------------------------------------------------------
   2. Helpers
   -------------------------------------------------------------------------- */

/** Safe localStorage wrappers (private browsing can throw). */
const store = {
  get(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  },
  set(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* no-op */ }
  },
};

/**
 * Central tracking helper.
 * Fires to Google Analytics (gtag) and Meta Pixel (fbq) automatically once
 * their snippets are installed in the <head> — see comments in each HTML file.
 */
function track(eventName, data = {}) {
  // Google Analytics 4
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, data);
  }
  // Meta Pixel
  if (typeof window.fbq === "function") {
    window.fbq("trackCustom", eventName, data);
  }
  console.info("[Lughah] track:", eventName, data);
}

/** Build a WhatsApp link from CONFIG (optionally with extra context text). */
function waLink(extraText) {
  const text = LUGHAH_CONFIG.whatsappBaseText + (extraText ? " — " + extraText : "");
  return "https://wa.me/" + LUGHAH_CONFIG.whatsappNumber + "?text=" + encodeURIComponent(text);
}

/* --------------------------------------------------------------------------
   3. A/B variant (assigned before link wiring so links can carry it)
   -------------------------------------------------------------------------- */
const AB_KEY = "lughah_ab_variant";

const AB_VARIANTS = {
  A: {
    en: "Arabic for Malaysians — from zero to confident communication.",
    ms: "Bahasa Arab untuk rakyat Malaysia — dari kosong ke komunikasi yang yakin.",
  },
  B: {
    en: "Learn Arabic with a clear level-by-level pathway.",
    ms: "Belajar bahasa Arab dengan laluan tahap demi tahap yang jelas.",
  },
  C: {
    en: "Speak Arabic confidently with live Mu\u2019allim and Mu\u2019allimah guidance.",
    ms: "Bertutur bahasa Arab dengan yakin bersama bimbingan langsung Mu\u2019allim dan Mu\u2019allimah.",
  },
};

/** Return the visitor's assigned variant, assigning one on first visit. */
function getVariant() {
  let v = store.get(AB_KEY);
  if (!v || !AB_VARIANTS[v]) {
    // If the visitor arrived on a deep link that already carries a variant
    // (e.g. a shared early-bird.html?variant=B), keep attribution consistent.
    const fromUrl = new URLSearchParams(window.location.search).get("variant");
    if (fromUrl && AB_VARIANTS[fromUrl]) {
      v = fromUrl;
    } else {
      const keys = Object.keys(AB_VARIANTS);
      v = keys[Math.floor(Math.random() * keys.length)];
    }
    store.set(AB_KEY, v);
    track("ab_variant_assigned", { variant: v });
  }
  return v;
}

/* --------------------------------------------------------------------------
   4. Language (EN default, BM via floating toggle)
   Elements opt in with a data-ms attribute holding their Malay text.
   -------------------------------------------------------------------------- */
const LANG_KEY = "lughah_lang";

function currentLang() {
  const v = store.get(LANG_KEY);
  return v === "ms" ? "ms" : "en";
}

function applyLanguage(lang) {
  document.documentElement.lang = lang === "ms" ? "ms" : "en";

  document.querySelectorAll("[data-ms]").forEach((el) => {
    // Cache the original English markup once, then swap both ways.
    if (el.dataset.enHtml === undefined) el.dataset.enHtml = el.innerHTML;
    el.innerHTML = lang === "ms" ? el.dataset.ms : el.dataset.enHtml;
  });

  // Floating toggle state
  document.querySelectorAll(".float-lang__opt").forEach((btn) => {
    const active = btn.dataset.lang === lang;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });

  store.set(LANG_KEY, lang);

  // Let page-level scripts (hero headline, quiz) re-render their strings.
  window.dispatchEvent(new CustomEvent("lughah:lang", { detail: { lang } }));
}

function initLanguageToggle() {
  document.querySelectorAll(".float-lang__opt").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;
      if (lang !== currentLang()) {
        applyLanguage(lang);
        track("language_switched", { lang });
      }
    });
  });
  applyLanguage(currentLang());
}

/* --------------------------------------------------------------------------
   5. Link wiring — WhatsApp, Stripe, variant parameters
   -------------------------------------------------------------------------- */
function initLinks(variant) {
  // WhatsApp links (optionally personalised via data-wa-extra)
  document.querySelectorAll("a[data-wa-link]").forEach((a) => {
    a.href = waLink(a.dataset.waExtra || "");
    a.target = "_blank";
    a.rel = "noopener";
    a.addEventListener("click", () => track("whatsapp_click", { variant }));
  });

  // Stripe checkout links — variant travels as client_reference_id so it
  // shows up on the Stripe payment record for conversion analysis.
  document.querySelectorAll("a[data-stripe-link]").forEach((a) => {
    try {
      const url = new URL(LUGHAH_CONFIG.stripeUrl);
      url.searchParams.set("client_reference_id", "lughah_variant_" + variant);
      a.href = url.toString();
    } catch (e) {
      a.href = LUGHAH_CONFIG.stripeUrl;
    }
    a.target = "_blank";
    a.rel = "noopener";
    a.addEventListener("click", () => track("checkout_click", { variant }));
  });

  // Internal CTA links carry the variant as a URL parameter,
  // e.g. early-bird.html?variant=A
  document.querySelectorAll("a[data-variant-link]").forEach((a) => {
    const href = a.getAttribute("href");
    if (!href || href.startsWith("http")) return;
    const [pathPart, hashPart] = href.split("#");
    const joiner = pathPart.includes("?") ? "&" : "?";
    a.setAttribute(
      "href",
      pathPart + joiner + "variant=" + variant + (hashPart ? "#" + hashPart : "")
    );
  });
}

/* --------------------------------------------------------------------------
   6. Header & navigation
   -------------------------------------------------------------------------- */
function initHeader() {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav__toggle");
  const nav = document.getElementById("site-nav");
  if (!header) return;

  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    // Close the menu after choosing a link
    nav.addEventListener("click", (e) => {
      if (e.target.closest("a")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }
}

/* --------------------------------------------------------------------------
   7. Homepage hero A/B test
   -------------------------------------------------------------------------- */
function initHeroABTest(variant) {
  const headline = document.getElementById("hero-headline");
  if (!headline) return; // not on the homepage

  const render = () => {
    headline.textContent = AB_VARIANTS[variant][currentLang()];
  };
  render();
  window.addEventListener("lughah:lang", render);

  console.log("[Lughah A/B] Hero headline variant:", variant);
  track("ab_hero_impression", { variant });
}

/* --------------------------------------------------------------------------
   8. Reveal-on-scroll
   -------------------------------------------------------------------------- */
function initReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  items.forEach((el) => io.observe(el));
}

/* --------------------------------------------------------------------------
   9. Arabic Goal Quiz (quiz.html)
   -------------------------------------------------------------------------- */
const QUIZ_KEY = "lughah_quiz_answers";

/* Track ids: foundation | a1 | qm | career */
const QUIZ_QUESTIONS = [
  {
    id: "why",
    title: {
      en: "Why do you want to learn Arabic?",
      ms: "Mengapa anda ingin belajar bahasa Arab?",
    },
    options: [
      { value: "quran",    label: { en: "To understand the Quran and my prayers", ms: "Untuk memahami Al\u2011Quran dan bacaan solat saya" }, points: { qm: 3, foundation: 1 } },
      { value: "daily",    label: { en: "To speak in daily life and while travelling", ms: "Untuk bertutur dalam kehidupan seharian dan semasa melancong" }, points: { a1: 3 } },
      { value: "career",   label: { en: "For work and career opportunities", ms: "Untuk kerja dan peluang kerjaya" }, points: { career: 3 } },
      { value: "zero",     label: { en: "Personal growth — I\u2019m starting from zero", ms: "Perkembangan diri — saya bermula dari kosong" }, points: { foundation: 3 } },
    ],
  },
  {
    id: "level",
    title: {
      en: "What is your current level?",
      ms: "Apakah tahap semasa anda?",
    },
    options: [
      { value: "none",     label: { en: "I can\u2019t read Arabic letters yet", ms: "Saya belum boleh membaca huruf Arab" }, points: { foundation: 4 } },
      { value: "letters",  label: { en: "I can read slowly, but know very few words", ms: "Saya boleh membaca perlahan, tetapi kosa kata sangat terhad" }, points: { foundation: 2, a1: 1 } },
      { value: "basics",   label: { en: "I can read and know some basic words", ms: "Saya boleh membaca dan tahu beberapa perkataan asas" }, points: { a1: 2, qm: 1, career: 1 } },
      { value: "simple",   label: { en: "I can hold very simple conversations", ms: "Saya boleh berbual secara ringkas" }, points: { a1: 1, qm: 2, career: 2 } },
    ],
  },
  {
    id: "track",
    title: {
      en: "Which track interests you most?",
      ms: "Trek manakah yang paling menarik minat anda?",
    },
    options: [
      { value: "foundation", label: { en: "Lughah Foundation — read and pronounce from zero", ms: "Lughah Foundation — baca dan sebut dari kosong" }, points: { foundation: 3 } },
      { value: "a1",         label: { en: "Lughah Speak A1 — daily conversation", ms: "Lughah Speak A1 — perbualan harian" }, points: { a1: 3 } },
      { value: "qm",         label: { en: "Lughah Quranic Meaning — understand what you recite", ms: "Lughah Quranic Meaning — fahami apa yang anda baca" }, points: { qm: 3 } },
      { value: "career",     label: { en: "Lughah Career Arabic — professional settings", ms: "Lughah Career Arabic — kegunaan profesional" }, points: { career: 3 } },
      { value: "unsure",     label: { en: "Not sure yet — recommend one for me", ms: "Belum pasti — cadangkan untuk saya" }, points: {} },
    ],
  },
  {
    id: "time",
    title: {
      en: "When would you prefer to attend class?",
      ms: "Bilakah waktu kelas pilihan anda?",
    },
    options: [
      { value: "weekday-eve", label: { en: "Weekday evenings", ms: "Malam hari bekerja (Isnin\u2013Jumaat)" }, points: {} },
      { value: "weekend-am",  label: { en: "Weekend mornings", ms: "Pagi hujung minggu" }, points: {} },
      { value: "weekend-pm",  label: { en: "Weekend afternoons or evenings", ms: "Petang atau malam hujung minggu" }, points: {} },
      { value: "flexible",    label: { en: "Flexible — I can adjust", ms: "Fleksibel — saya boleh sesuaikan" }, points: {} },
    ],
  },
  {
    id: "tutor",
    title: {
      en: "Do you have a tutor preference?",
      ms: "Adakah anda ada pilihan tenaga pengajar?",
    },
    options: [
      { value: "muallim",   label: { en: "Mu\u2019allim (male tutor)", ms: "Mu\u2019allim (guru lelaki)" }, points: {} },
      { value: "muallimah", label: { en: "Mu\u2019allimah (female tutor)", ms: "Mu\u2019allimah (guru wanita)" }, points: {} },
      { value: "any",       label: { en: "No preference", ms: "Tiada pilihan khusus" }, points: {} },
    ],
  },
  {
    id: "budget",
    title: {
      en: "What is your budget for a full programme?",
      ms: "Apakah bajet anda untuk satu program penuh?",
    },
    options: [
      { value: "lt500",    label: { en: "Below RM500", ms: "Bawah RM500" }, points: {} },
      { value: "500-800",  label: { en: "RM500 \u2013 RM800", ms: "RM500 \u2013 RM800" }, points: {} },
      { value: "800-1200", label: { en: "RM800 \u2013 RM1,200", ms: "RM800 \u2013 RM1,200" }, points: {} },
      { value: "gt1200",   label: { en: "Above RM1,200", ms: "Melebihi RM1,200" }, points: {} },
    ],
  },
  {
    id: "beta",
    title: {
      en: "Would you join a paid beta class with early-bird pricing?",
      ms: "Adakah anda bersedia menyertai kelas beta berbayar dengan harga early bird?",
    },
    options: [
      { value: "yes",   label: { en: "Yes — I want early access", ms: "Ya — saya mahu akses awal" }, points: {} },
      { value: "maybe", label: { en: "Maybe — depends on schedule and price", ms: "Mungkin — bergantung pada jadual dan harga" }, points: {} },
      { value: "no",    label: { en: "Not yet — just exploring", ms: "Belum lagi — sekadar meninjau" }, points: {} },
    ],
  },
];

const QUIZ_RESULTS = {
  foundation: {
    name: "Lughah Foundation",
    arabic: "\u0627\u0644\u0623\u0633\u0627\u0633",
    duration: { en: "8 weeks", ms: "8 minggu" },
    tagline: {
      en: "Start from zero with letters, sounds and your first 300 words.",
      ms: "Mula dari kosong dengan huruf, sebutan dan 300 perkataan pertama anda.",
    },
    outcomes: {
      en: ["Read Arabic letters with confidence", "Pronounce clearly and correctly", "Understand basic sentence structure", "Learn 300 essential words"],
      ms: ["Membaca huruf Arab dengan yakin", "Menyebut dengan jelas dan betul", "Memahami struktur ayat asas", "Menguasai 300 perkataan penting"],
    },
  },
  a1: {
    name: "Lughah Speak A1",
    arabic: "\u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0629",
    duration: { en: "12 weeks", ms: "12 minggu" },
    tagline: {
      en: "Turn vocabulary into real daily conversation.",
      ms: "Jadikan kosa kata anda perbualan harian yang sebenar.",
    },
    outcomes: {
      en: ["Introduce yourself naturally", "Ask and answer simple questions", "Understand common daily phrases"],
      ms: ["Memperkenalkan diri secara semula jadi", "Bertanya dan menjawab soalan mudah", "Memahami frasa harian yang biasa"],
    },
  },
  qm: {
    name: "Lughah Quranic Meaning",
    arabic: "\u0645\u0639\u0627\u0646\u064a \u0627\u0644\u0642\u0631\u0622\u0646",
    duration: { en: "12 weeks", ms: "12 minggu" },
    tagline: {
      en: "Understand the words you recite every day.",
      ms: "Fahami perkataan yang anda baca setiap hari.",
    },
    outcomes: {
      en: ["Recognise high-frequency Quranic words", "Follow basic grammar patterns", "Connect meaning to your recitation"],
      ms: ["Mengenal perkataan Al\u2011Quran yang kerap muncul", "Mengikuti pola tatabahasa asas", "Menghubungkan makna dengan bacaan anda"],
    },
  },
  career: {
    name: "Lughah Career Arabic",
    arabic: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629 \u0644\u0644\u0639\u0645\u0644",
    duration: { en: "10 weeks", ms: "10 minggu" },
    tagline: {
      en: "Professional Arabic for business, hospitality, travel and aviation.",
      ms: "Bahasa Arab profesional untuk perniagaan, hospitaliti, pelancongan dan penerbangan.",
    },
    outcomes: {
      en: ["Handle greetings and client interactions", "Manage basic formal communication", "Sound confident in professional settings"],
      ms: ["Mengendalikan sapaan dan interaksi pelanggan", "Menguruskan komunikasi formal asas", "Kedengaran yakin dalam suasana profesional"],
    },
  },
};

const QUIZ_UI = {
  en: {
    progress: (i, n) => "Question " + i + " of " + n,
    back: "Back",
    next: "Next",
    see: "See my recommendation",
    resultEyebrow: "Your recommended programme",
    duration: "Duration",
    live: "Live on Zoom",
    smallGroup: "Small group",
    foundationNote: (name) =>
      "Because you\u2019re still mastering the letters, we recommend starting with Foundation. " +
      "You\u2019ll move into " + name + " with strong roots once you can read comfortably.",
    reserve: "Reserve Early Bird Seat",
    whatsapp: "WhatsApp Us",
    saved: "Your answers are saved on this device and help us plan beta class schedules.",
    restart: "Retake the quiz",
    waExtra: (name) => "My quiz result: " + name,
  },
  ms: {
    progress: (i, n) => "Soalan " + i + " daripada " + n,
    back: "Kembali",
    next: "Seterusnya",
    see: "Lihat cadangan saya",
    resultEyebrow: "Program yang dicadangkan untuk anda",
    duration: "Tempoh",
    live: "Langsung di Zoom",
    smallGroup: "Kumpulan kecil",
    foundationNote: (name) =>
      "Oleh sebab anda masih menguasai huruf, kami cadangkan bermula dengan Foundation. " +
      "Anda akan menyambung ke " + name + " dengan asas yang kukuh setelah lancar membaca.",
    reserve: "Tempah Tempat Early Bird",
    whatsapp: "WhatsApp Kami",
    saved: "Jawapan anda disimpan pada peranti ini dan membantu kami merancang jadual kelas beta.",
    restart: "Jawab semula kuiz",
    waExtra: (name) => "Keputusan kuiz saya: " + name,
  },
};

function initQuiz(variant) {
  const root = document.getElementById("quiz-app");
  if (!root) return;

  const state = {
    step: 0,
    answers: {},   // { questionId: optionValue }
    done: false,
    recommendation: null,
    note: false,
  };

  track("quiz_start", { variant });

  function computeRecommendation() {
    const scores = { foundation: 0, a1: 0, qm: 0, career: 0 };
    QUIZ_QUESTIONS.forEach((q) => {
      const chosen = q.options.find((o) => o.value === state.answers[q.id]);
      if (!chosen) return;
      Object.entries(chosen.points).forEach(([track_, pts]) => {
        scores[track_] += pts;
      });
    });

    // Highest score wins; the explicit track interest breaks ties.
    const order = ["foundation", "a1", "qm", "career"];
    let best = order[0];
    order.forEach((t) => { if (scores[t] > scores[best]) best = t; });
    const tied = order.filter((t) => scores[t] === scores[best]);
    const interest = state.answers.track;
    if (tied.length > 1 && tied.includes(interest)) best = interest;

    // Safety rule: if they can't read letters yet, Foundation comes first.
    let note = false;
    if (state.answers.level === "none" && best !== "foundation") {
      note = QUIZ_RESULTS[best].name;
      best = "foundation";
    }
    return { track: best, note };
  }

  function saveAnswers() {
    const labelled = {};
    QUIZ_QUESTIONS.forEach((q) => {
      const chosen = q.options.find((o) => o.value === state.answers[q.id]);
      if (chosen) labelled[q.id] = { value: chosen.value, label: chosen.label.en };
    });
    store.set(
      QUIZ_KEY,
      JSON.stringify({
        answers: labelled,
        recommendation: state.recommendation,
        variant,
        completedAt: new Date().toISOString(),
      })
    );
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "text") node.textContent = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    });
    children.forEach((c) => node.appendChild(c));
    return node;
  }

  function renderStep() {
    const lang = currentLang();
    const ui = QUIZ_UI[lang];
    const q = QUIZ_QUESTIONS[state.step];
    const total = QUIZ_QUESTIONS.length;
    root.innerHTML = "";

    // Progress
    root.appendChild(el("p", { class: "quiz__progress-text", "aria-live": "polite", text: ui.progress(state.step + 1, total) }));
    const bar = el("div", { class: "quiz__bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(total), "aria-valuenow": String(state.step + 1), "aria-label": ui.progress(state.step + 1, total) });
    const fill = el("div", { class: "quiz__bar-fill" });
    fill.style.width = ((state.step + 1) / total) * 100 + "%";
    bar.appendChild(fill);
    root.appendChild(bar);

    // Question
    const fieldset = el("fieldset", { class: "quiz__fieldset" });
    const legend = el("legend", { class: "quiz__question", text: q.title[lang], tabindex: "-1" });
    fieldset.appendChild(legend);

    const optionsWrap = el("div", { class: "quiz__options" });
    q.options.forEach((opt) => {
      const input = el("input", { type: "radio", name: q.id, value: opt.value });
      if (state.answers[q.id] === opt.value) input.checked = true;
      input.addEventListener("change", () => {
        state.answers[q.id] = opt.value;
        nextBtn.disabled = false;
      });
      const label = el("label", { class: "option-card" }, [
        input,
        el("span", { class: "option-card__dot", "aria-hidden": "true" }),
        el("span", { text: opt.label[lang] }),
      ]);
      optionsWrap.appendChild(label);
    });
    fieldset.appendChild(optionsWrap);
    root.appendChild(fieldset);

    // Navigation
    const backBtn = el("button", {
      class: "btn btn--ghost",
      type: "button",
      text: ui.back,
      onclick: () => { state.step -= 1; renderStep(); },
    });
    if (state.step === 0) backBtn.style.visibility = "hidden";

    const isLast = state.step === total - 1;
    const nextBtn = el("button", {
      class: "btn btn--green",
      type: "button",
      text: isLast ? ui.see : ui.next,
      onclick: () => {
        if (!state.answers[q.id]) return;
        if (isLast) {
          const rec = computeRecommendation();
          state.recommendation = rec.track;
          state.note = rec.note;
          state.done = true;
          saveAnswers();
          track("quiz_complete", { recommendation: rec.track, variant });
          renderResult();
        } else {
          state.step += 1;
          renderStep();
        }
      },
    });
    nextBtn.disabled = !state.answers[q.id];

    root.appendChild(el("div", { class: "quiz__nav" }, [backBtn, nextBtn]));
    legend.focus({ preventScroll: true });
  }

  function renderResult() {
    const lang = currentLang();
    const ui = QUIZ_UI[lang];
    const r = QUIZ_RESULTS[state.recommendation];
    root.innerHTML = "";

    const card = el("div", { class: "result-card", "aria-live": "polite" });
    const eyebrow = el("p", { class: "eyebrow result-card__eyebrow" }, [
      el("span", { class: "star8", "aria-hidden": "true" }),
    ]);
    eyebrow.appendChild(document.createTextNode(" " + ui.resultEyebrow));
    card.appendChild(eyebrow);

    card.appendChild(el("h2", { class: "result-card__name", text: r.name }));
    card.appendChild(el("span", { class: "result-card__ar arabic", lang: "ar", "aria-hidden": "true", text: r.arabic }));
    card.appendChild(el("p", { text: r.tagline[lang] }));

    card.appendChild(el("div", { class: "result-card__meta" }, [
      el("span", { class: "chip", text: ui.duration + ": " + r.duration[lang] }),
      el("span", { class: "chip", text: ui.live }),
      el("span", { class: "chip", text: ui.smallGroup }),
    ]));

    const list = el("ul", { class: "outcomes" });
    r.outcomes[lang].forEach((o) => {
      list.appendChild(el("li", {}, [
        el("span", { class: "tick", "aria-hidden": "true", text: "\u2713" }),
        el("span", { text: o }),
      ]));
    });
    card.appendChild(list);

    if (state.note) {
      card.appendChild(el("p", { class: "result-card__note", text: ui.foundationNote(state.note) }));
    }

    const reserve = el("a", {
      class: "btn btn--gold btn--lg",
      href: "early-bird.html?variant=" + variant + "#pricing",
      text: ui.reserve,
      onclick: () => track("cta_reserve_from_quiz", { recommendation: state.recommendation, variant }),
    });
    const wa = el("a", {
      class: "btn btn--ghost btn--lg",
      href: waLink(QUIZ_UI.en.waExtra(r.name)),
      target: "_blank",
      rel: "noopener",
      text: ui.whatsapp,
      onclick: () => track("whatsapp_click", { from: "quiz_result", variant }),
    });
    card.appendChild(el("div", { class: "result-card__ctas" }, [reserve, wa]));

    card.appendChild(el("p", { class: "quiz__restart" }, [
      el("span", { text: ui.saved + " " }),
      el("button", {
        type: "button",
        text: ui.restart,
        onclick: () => {
          state.step = 0;
          state.answers = {};
          state.done = false;
          renderStep();
        },
      }),
    ]));

    root.appendChild(card);
  }

  window.addEventListener("lughah:lang", () => {
    if (state.done) renderResult();
    else renderStep();
  });

  renderStep();
}

/* --------------------------------------------------------------------------
   10. Page-specific hooks
   -------------------------------------------------------------------------- */
function initPageHooks(variant) {
  const page = document.body.dataset.page;

  if (page === "thank-you") {
    // Conversion event — fired when a buyer lands here after checkout.
    track("early_bird_conversion", { variant });
  }

  // Footer year
  document.querySelectorAll("[data-year]").forEach((elm) => {
    elm.textContent = String(new Date().getFullYear());
  });
}

/* --------------------------------------------------------------------------
   Boot
   -------------------------------------------------------------------------- */
document.documentElement.classList.add("js");

document.addEventListener("DOMContentLoaded", () => {
  const variant = getVariant();

  initHeader();
  initLanguageToggle();
  initLinks(variant);
  initHeroABTest(variant);
  initReveal();
  initQuiz(variant);
  initPageHooks(variant);
});

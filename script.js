const root = document.documentElement;
const themeButton = document.querySelector(".theme-toggle");
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

const readTheme = () => {
  try { return window.localStorage.getItem("theme"); } catch { return null; }
};

const saveTheme = (name) => {
  try { window.localStorage.setItem("theme", name); } catch { return; }
};

const showTheme = (name) => {
  root.dataset.theme = name;
  themeButton.setAttribute("aria-pressed", name === "dark");
};

showTheme(root.dataset.theme);

themeButton.addEventListener("click", () => {
  const name = root.dataset.theme === "dark" ? "light" : "dark";
  showTheme(name);
  saveTheme(name);
});

systemDark.addEventListener("change", (event) => {
  if (!readTheme()) showTheme(event.matches ? "dark" : "light");
});

const deck = document.querySelector(".deck");
const cards = deck ? [...deck.querySelectorAll(".card")] : [];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
const behavior = () => (reduceMotion.matches ? "auto" : "smooth");

if (cards.length) {
  const reels = cards.map((card) => card.querySelector("blockquote"));
  reels.forEach((reel) => reel.classList.remove("instagram-media"));

  const queue = [];
  let ready = false;
  let dealing = false;
  let dealGap = 700;
  let started = false;

  function showLinks() {
    document.querySelectorAll(".reel-fallback").forEach((link) => {
      link.textContent = "Watch this Reel on Instagram ↗";
    });
  }

  function dealNext() {
    const reel = queue.shift();
    if (!reel) {
      dealing = false;
      return;
    }
    dealing = true;
    reel.classList.add("instagram-media");
    window.instgrm.Embeds.process();
    setTimeout(dealNext, dealGap);
  }

  function want(index) {
    [index, index + 1, index - 1, index + 2, index - 2].forEach((i) => {
      const reel = reels[i];
      if (reel && !queue.includes(reel) && !reel.classList.contains("instagram-media")) queue.push(reel);
    });
    if (ready && !dealing) dealNext();
  }

  function loadInstagram(gap) {
    if (started) return;
    started = true;
    dealGap = gap;
    const script = document.createElement("script");
    script.src = "https://www.instagram.com/embed.js";
    script.async = true;
    script.onload = () => {
      if (!window.instgrm) return;
      ready = true;
      dealNext();
    };
    script.onerror = showLinks;
    document.body.appendChild(script);
    setTimeout(showLinks, 10000);
  }

  window.addEventListener("load", () => {
    setTimeout(() => {
      if ("requestIdleCallback" in window) requestIdleCallback(() => loadInstagram(700), { timeout: 4000 });
      else loadInstagram(700);
    }, 1500);
  });

  const watcher = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      watcher.disconnect();
      loadInstagram(300);
    }
  }, { rootMargin: "600px" });
  watcher.observe(deck);

  const prevButton = document.querySelector(".deck-prev");
  const nextButton = document.querySelector(".deck-next");
  const counter = document.querySelector(".deck-count");
  const stage = document.querySelector(".reels");
  const pin = document.querySelector(".reels-pin");
  const bar = document.querySelector("header");
  const pinSpeed = 1;
  const cardMin = 330;
  const cardMax = 520;
  const frameAt = (w) => 613 + 1.25 * (w - 328);
  const fill = parseFloat(window.getComputedStyle(deck).getPropertyValue("--card-fill")) || 0.72;
  let active = null;
  let target = 0;
  let pinned = false;
  let pinStart = 0;
  let pinRange = 0;
  let rowRange = 0;
  let rowX = -1;
  let scale = 1;

  if (cards.length > 1 && finePointer.matches && !reduceMotion.matches) {
    const room = window.innerHeight - bar.offsetHeight - 80;
    const idealW = Math.round(Math.min(cardMax, Math.max(cardMin, 328 + (room - 613) / 1.25)));
    if (idealW > cardMin) deck.style.setProperty("--card-want", idealW + "px");
  }

  function fitScale() {
    const next = Math.round(Math.max(0.6, Math.min(1, (fill * window.innerWidth) / cardMin)) * 1000) / 1000;
    if (next !== scale) {
      scale = next;
      deck.style.setProperty("--s", scale);
      deck.classList.toggle("is-scaled", scale < 1);
    }
    deck.style.marginBottom = scale < 1 ? Math.round((scale - 1) * deck.offsetHeight) + "px" : "";
  }

  function activate(card) {
    if (card === active) return;
    if (active) active.classList.remove("is-active");
    active = card;
    card.classList.add("is-active");
    target = cards.indexOf(card);
    want(target);
    counter.textContent = `${target + 1} / ${cards.length}`;
    prevButton.disabled = target === 0;
    nextButton.disabled = target === cards.length - 1;
    if (document.activeElement === prevButton && prevButton.disabled) nextButton.focus();
    if (document.activeElement === nextButton && nextButton.disabled) prevButton.focus();
  }

  function go(index) {
    target = Math.max(0, Math.min(cards.length - 1, index));
    if (pinned) {
      window.scrollTo({ top: pinStart + (target / (cards.length - 1)) * pinRange, behavior: behavior() });
      return;
    }
    const card = cards[target].getBoundingClientRect();
    const row = deck.getBoundingClientRect();
    deck.scrollTo({
      left: deck.scrollLeft + ((card.left + card.width / 2) - (row.left + row.width / 2)) / scale,
      behavior: behavior(),
    });
  }

  deck.classList.add("spotlight");
  activate(cards[0]);
  const spotlight = new IntersectionObserver((entries) => {
    if (pinned) return;
    entries.forEach((entry) => {
      if (entry.isIntersecting) activate(entry.target);
    });
  }, { root: deck, rootMargin: "0px -49% 0px -49%" });
  cards.forEach((card) => spotlight.observe(card));

  deck.addEventListener("click", (event) => {
    const card = event.target.closest(".card");
    if (!card || card === active) return;
    event.preventDefault();
    go(cards.indexOf(card));
  });

  prevButton.addEventListener("click", () => go(target - 1));
  nextButton.addEventListener("click", () => go(target + 1));
  deck.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    go(target + (event.key === "ArrowRight" ? 1 : -1));
  });

  deck.addEventListener("dragstart", (event) => event.preventDefault());

  deck.addEventListener("focusin", (event) => {
    const card = event.target.closest(".card");
    if (pinned && card && card !== active) go(cards.indexOf(card));
  });

  function setPinned(on) {
    if (on === pinned) return;
    pinned = on;
    stage.classList.toggle("is-pinned", on);
    if (!on) {
      stage.style.height = "";
      pin.style.top = "";
      rowX = -1;
    }
  }

  function measure(decide) {
    fitScale();
    const barH = bar.offsetHeight;
    const free = window.innerHeight - barH;
    const h = pin.offsetHeight;
    const w = cards[0].offsetWidth + 2;
    if (decide) setPinned(scale === 1 && finePointer.matches && !reduceMotion.matches && free >= Math.max(h, frameAt(w)) + 24);
    else if (pinned && free < h) setPinned(false);
    if (!pinned) return;
    rowRange = deck.scrollWidth - deck.clientWidth;
    pinRange = rowRange * pinSpeed;
    const top = Math.round(barH + Math.max(0, Math.min((free - frameAt(w)) / 2, free - h)));
    pin.style.top = top + "px";
    stage.style.height = Math.round(h + pinRange) + "px";
    pinStart = stage.getBoundingClientRect().top + window.scrollY - top;
    update();
  }

  function update() {
    if (!pinned || !pinRange) return;
    const progress = Math.min(1, Math.max(0, (window.scrollY - pinStart) / pinRange));
    const nearest = cards[Math.round(progress * (cards.length - 1))];
    if (nearest !== active) activate(nearest);
    const x = Math.round(progress * rowRange);
    if (x !== rowX) {
      rowX = x;
      deck.scrollLeft = x;
    }
  }

  let settle;
  let scrolling = false;
  function pauseEmbeds() {
    if (!scrolling) {
      scrolling = true;
      deck.classList.add("is-scrolling");
    }
    clearTimeout(settle);
    settle = setTimeout(() => {
      scrolling = false;
      deck.classList.remove("is-scrolling");
    }, 150);
  }
  window.addEventListener("scroll", pauseEmbeds, { passive: true });
  deck.addEventListener("scroll", pauseEmbeds, { passive: true });

  if (cards.length > 1) {
    measure(true);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", () => measure(true));
    window.addEventListener("load", () => measure(true));
    reduceMotion.addEventListener("change", () => measure(true));
    finePointer.addEventListener("change", () => measure(true));
    const resized = new ResizeObserver(() => measure(false));
    resized.observe(pin);
    resized.observe(document.body);
  }
}

document.querySelectorAll(".videos").forEach((stage) => {
  const pin = stage.querySelector(".videos-pin");
  const heading = pin.querySelector("h3");
  const view = pin.querySelector(".video");
  const frames = [...view.querySelectorAll(".video-frame")];
  const prevButton = stage.querySelector(".video-prev");
  const nextButton = stage.querySelector(".video-next");
  const counter = stage.querySelector(".video-count");
  const bar = document.querySelector("header");
  const peek = 72;
  const navHeight = 48;
  const minWidth = 400;
  let active = null;
  let pinned = false;
  let started = false;
  let pinStart = 0;
  let pinRange = 0;
  let rowY = -1;
  let settle;

  if (frames.length < 2) return;

  const want = (index) => {
    [index, index + 1, index - 1].forEach((i) => {
      const iframe = frames[i] && frames[i].querySelector("iframe");
      if (iframe) iframe.loading = "eager";
    });
  };

  const activate = (frame) => {
    if (frame === active) return;
    if (active) active.classList.remove("is-active");
    active = frame;
    frame.classList.add("is-active");
    const index = frames.indexOf(frame);
    counter.textContent = `${index + 1} / ${frames.length}`;
    prevButton.disabled = index === 0;
    nextButton.disabled = index === frames.length - 1;
    if (document.activeElement === prevButton && prevButton.disabled) nextButton.focus();
    if (document.activeElement === nextButton && nextButton.disabled) prevButton.focus();
    if (started) want(index);
  };

  const go = (index) => {
    if (!pinned) return;
    const target = Math.max(0, Math.min(frames.length - 1, index));
    window.scrollTo({
      top: pinStart + (target / (frames.length - 1)) * pinRange,
      behavior: behavior(),
    });
  };

  const setPinned = (on) => {
    if (on === pinned) return;
    pinned = on;
    stage.classList.toggle("is-pinned", on);
    if (!on) {
      stage.style.height = "";
      pin.style.top = "";
      view.scrollTop = 0;
      rowY = -1;
    }
  };

  const update = () => {
    if (!pinned || !pinRange) return;
    const progress = Math.min(1, Math.max(0, (window.scrollY - pinStart) / pinRange));
    const steps = frames.length - 1;
    activate(frames[Math.round(progress * steps)]);
    const lead = peek * (1 - Math.min(1, progress * steps));
    const tail = peek * Math.min(1, Math.max(0, progress * steps - (steps - 1)));
    const y = Math.round(progress * pinRange + lead - tail);
    if (y !== rowY) {
      rowY = y;
      view.scrollTop = y;
    }
  };

  const measure = (decide) => {
    const barHeight = bar.offsetHeight;
    const free = window.innerHeight - barHeight;
    const label = heading.offsetHeight + parseFloat(window.getComputedStyle(heading).marginBottom);
    const width = Math.min(pin.clientWidth, Math.floor((((free - 24 - label - navHeight) - 2 * peek) * 16) / 9));
    if (decide) setPinned(finePointer.matches && !reduceMotion.matches && width >= minWidth);
    if (!pinned) return;
    const frameHeight = (width * 9) / 16;
    const windowHeight = Math.round(frameHeight + 2 * peek);
    stage.style.setProperty("--vw", width + "px");
    stage.style.setProperty("--win", windowHeight + "px");
    stage.style.setProperty("--vpad", Math.round((windowHeight - frameHeight) / 2) + "px");
    const height = pin.offsetHeight;
    const top = Math.round(barHeight + Math.max(0, (free - height) / 2));
    pin.style.top = top + "px";
    pinRange = view.scrollHeight - view.clientHeight;
    stage.style.height = Math.round(height + pinRange) + "px";
    pinStart = stage.getBoundingClientRect().top + window.scrollY - top;
    update();
  };

  prevButton.addEventListener("click", () => go(frames.indexOf(active) - 1));
  nextButton.addEventListener("click", () => go(frames.indexOf(active) + 1));
  view.addEventListener("click", (event) => {
    const frame = event.target.closest(".video-frame");
    if (!pinned || !frame || frame === active) return;
    go(frames.indexOf(frame));
  });
  view.addEventListener("focusin", (event) => {
    const frame = event.target.closest(".video-frame");
    if (pinned && frame && frame !== active) go(frames.indexOf(frame));
  });

  const watcher = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      watcher.disconnect();
      started = true;
      want(frames.indexOf(active));
    }
  }, { rootMargin: "600px" });
  watcher.observe(stage);

  window.addEventListener("scroll", () => {
    stage.classList.add("is-scrolling");
    clearTimeout(settle);
    settle = setTimeout(() => stage.classList.remove("is-scrolling"), 150);
  }, { passive: true });

  activate(frames[0]);
  measure(true);
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", () => measure(true));
  window.addEventListener("load", () => measure(true));
  reduceMotion.addEventListener("change", () => measure(true));
  finePointer.addEventListener("change", () => measure(true));
  new ResizeObserver(() => measure(false)).observe(document.body);
});

const clips = document.querySelectorAll(".clip video");
const play = (clip) => clip.play().catch(() => {});
if (reduceMotion.matches) {
  clips.forEach((clip) => { clip.controls = true; });
} else {
  const billboardPlayer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const clip = entry.target;
      if (!entry.isIntersecting) clip.pause();
      else if (!clip.dataset.userPaused) play(clip);
    });
  }, { threshold: 0.5 });

  clips.forEach((clip) => {
    billboardPlayer.observe(clip);
    clip.tabIndex = 0;
    const toggle = () => {
      if (clip.paused) { delete clip.dataset.userPaused; play(clip); }
      else { clip.dataset.userPaused = "yes"; clip.pause(); }
    };
    clip.addEventListener("click", toggle);
    clip.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
    });
  });
}

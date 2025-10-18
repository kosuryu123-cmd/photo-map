import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Portfolio Mock V3 — Lean Build (refactor)
 * - Lighter code via small shared components (Input, TextArea, Button, Row)
 * - Runtime config sanitized to avoid React#300/#310
 * - Maintenance: photo/video/blog/vlog/profile tabs
 * - Photo -> adds to gallery; if lat/lng present, also adds map spot
 */

// -----------------
// CONFIG (safe defaults)
//  * NOTE: Avoid inline comments inside object fields that some sandboxes misparse.
// -----------------
const CONFIG = {
  instagram: "https://www.instagram.com/ksr_2000_/",
  heroMode: "slideshow", // "video" | "slideshow"
  heroVideoSrc: "",
  slideshowImages: [
    { src: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&q=80&auto=format&fit=crop", title: "Misty Ridge", caption: "Calm to Open" },
    { src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1600&q=80&auto=format&fit=crop", title: "Golden Shore", caption: "Gate of Light" },
    { src: "https://images.unsplash.com/photo-1519681395735-4b7b8463a79e?w=1600&q=80&auto=format&fit=crop", title: "Torii Morning", caption: "Breathing Mountain" },
  ],
  background: {
    style: "transparent",
    image: "https://images.unsplash.com/photo-1499346030926-9a72daac6c63?w=2400&q=90&auto=format&fit=crop",
    imageOpacity: 0.32,
  },
  profile: {
    name: "Ryuya",
    title: "工場改善 / 製造技術",
    location: "Japan",
    avatar: "/avatar.jpg",
    bioLines: ["Landscape & cinematic frames.", "Traveler, camera, minimal words.", "Quiet, timeless portfolio."],
    gear: ["Canon RF50", "RF70-200", "ND/GL Mist", "Peak tripod"],
    socials: { instagram: "https://www.instagram.com/ksr_2000_/", youtube: "", x: "", website: "" },
  },
  management: { passcode: "ryuya2025", lsKey: "portfolio-admin-ok", qsKey: "admin" },
  map: {
    provider: "google",
    zoom: 11,
    spots: [
      { id: "s_fuji_arakawa", title: "Arakawa mudflat sunset", lat: 35.5306, lng: 139.7907, tags: ["sunset", "silhouette"], season: "winter", note: "Tele poles, Mt. Fuji back, low tide reflections.", thumb: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=1200&q=80&auto=format&fit=crop" },
      { id: "s_benten_rock", title: "Benten Rock", lat: 37.0541, lng: 137.2755, tags: ["seaside", "sunrise"], season: "autumn", note: "Torii-like rope between rocks.", thumb: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80&auto=format&fit=crop" },
      { id: "s_hill_dome", title: "Hill Dome Park", lat: 43.6208, lng: 142.4142, tags: ["grass", "architecture"], season: "autumn", note: "Hill slope with dome structure.", thumb: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200&q=80&auto=format&fit=crop" },
    ],
  },
};

type UserConfig = typeof CONFIG;
const NAV = ["ホーム", "ギャラリー", "動画", "マップ", "プロフィール", "連絡"] as const;
type NavKey = typeof NAV[number];

// -----------------
// Seeds (trimmed)
// -----------------
const photosSeed = [
  { id: "p1", title: "Curves in Sea of Clouds", oneLiner: "Led by morning", lines: ["Wind stops", "Light pours", "Road breathes"], src: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1400&q=80&auto=format&fit=crop" },
  { id: "p2", title: "Hill Dome", oneLiner: "Autumn alone", lines: ["Grass scent", "Wave of air", "Silent noon"], src: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1400&q=80&auto=format&fit=crop" },
  { id: "p3", title: "Higan Beach", oneLiner: "Crimson and light", lines: ["Blazing bloom", "Water shivers", "Sky listens"], src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1400&q=80&auto=format&fit=crop" },
];

const videosSeed = [
  { id: "v1", title: "Cinematic Mist", meta: "RF50 - 24p - Log", thumb: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200&q=80&auto=format&fit=crop" },
  { id: "v2", title: "Mountain Vibes", meta: "4K60 - Fog - LUT", thumb: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80&auto=format&fit=crop" },
];

type RuntimeData = {
  photos: typeof photosSeed;
  videos: typeof videosSeed;
  posts: { blog: any[]; vlog: any[] };
  config: UserConfig;
};

// -----------------
// Small shared UI
// -----------------
function Row({ children, className = "" }: any) {
  return <div className={`mt-2 ${className}`}>{children}</div>;
}
function Label({ children }: any) {
  return <label className="block text-xs text-zinc-600">{children}</label>;
}
function Input(props: any) {
  return <input {...props} className={`w-full rounded border px-2 py-1 text-sm ${props.className || ""}`} />;
}
function TextArea(props: any) {
  return <textarea {...props} className={`w-full rounded border px-2 py-1 text-sm ${props.className || ""}`} />;
}
function Button({ children, ...rest }: any) {
  return (
    <button
      {...rest}
      className={`rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-50 ${rest.className || ""}`}
    >
      {children}
    </button>
  );
}

// -----------------
// Utils
// -----------------
function isNonEmptyString(v: any): v is string {
  return typeof v === "string" && v.trim() !== "";
}
function ensureUrl(v: any, fallback: string): string {
  if (!isNonEmptyString(v)) return fallback;
  try {
    const u = new URL(v);
    return u.href;
  } catch {
    return fallback;
  }
}

function ImageWithFallback({ src, className }: { src?: string; className?: string }) {
  const [ok, setOk] = useState(!!src);
  if (ok && src) {
    return <img src={src} className={className} onError={() => setOk(false)} />;
  }
  const baseClass = className ? `${className} ` : "";
  return (
    <div
      className={`${baseClass}bg-[radial-gradient(120%_80%_at_50%_0%,rgba(0,0,0,0.04),transparent_60%),linear-gradient(to_bottom_right,#fff,#f8fafc,#fff)]`}
    />
  );
}

function normalizeConfig(raw: any): UserConfig {
  const c: any = typeof raw === "object" && raw ? raw : {};
  const safe: any = { ...CONFIG, ...c };
  const hm = c?.heroMode;
  safe.heroMode = hm === "video" || hm === "slideshow" ? hm : CONFIG.heroMode;
  safe.heroVideoSrc = isNonEmptyString(c?.heroVideoSrc) ? c.heroVideoSrc : CONFIG.heroVideoSrc;
  const bg = typeof c?.background === "object" && c.background ? c.background : {};
  safe.background = {
    style: isNonEmptyString(bg.style) ? bg.style : CONFIG.background.style,
    image: isNonEmptyString(bg.image) ? bg.image : CONFIG.background.image,
    imageOpacity:
      typeof bg.imageOpacity === "number" && bg.imageOpacity >= 0 && bg.imageOpacity <= 1
        ? bg.imageOpacity
        : CONFIG.background.imageOpacity,
  };
  const arr = Array.isArray(c?.slideshowImages) ? c.slideshowImages : CONFIG.slideshowImages;
  safe.slideshowImages = arr.filter((it: any) => it && isNonEmptyString(it.src));
  if (!safe.slideshowImages.length) safe.slideshowImages = CONFIG.slideshowImages;
  const p = typeof c?.profile === "object" && c.profile ? c.profile : {};
  safe.profile = {
    name: isNonEmptyString(p.name) ? p.name : CONFIG.profile.name,
    title: isNonEmptyString(p.title) ? p.title : CONFIG.profile.title,
    location: isNonEmptyString(p.location) ? p.location : CONFIG.profile.location,
    avatar: isNonEmptyString(p.avatar) ? p.avatar : CONFIG.profile.avatar,
    bioLines: Array.isArray(p.bioLines) ? p.bioLines : CONFIG.profile.bioLines,
    gear: Array.isArray(p.gear) ? p.gear : CONFIG.profile.gear,
    socials: { ...CONFIG.profile.socials, ...(typeof p.socials === "object" && p.socials ? p.socials : {}) },
  };
  const m = typeof c?.management === "object" && c.management ? c.management : {};
  safe.management = {
    passcode: isNonEmptyString(m.passcode) ? m.passcode : CONFIG.management.passcode,
    lsKey: isNonEmptyString(m.lsKey) ? m.lsKey : CONFIG.management.lsKey,
    qsKey: isNonEmptyString(m.qsKey) ? m.qsKey : CONFIG.management.qsKey,
  };
  const mp = typeof c?.map === "object" && c.map ? c.map : {};
  const spots = Array.isArray(mp.spots) ? mp.spots : CONFIG.map.spots;
  safe.map = {
    provider: mp.provider === "google" ? "google" : CONFIG.map.provider,
    zoom: Number.isFinite(mp.zoom) ? mp.zoom : CONFIG.map.zoom,
    spots: spots.filter((s: any) => s && typeof s.lat === "number" && typeof s.lng === "number" && isNonEmptyString(s.title)),
  };
  const sanitizedInsta = ensureUrl(c?.instagram, CONFIG.instagram);
  safe.instagram = sanitizedInsta;
  if (!safe.profile.socials) safe.profile.socials = { instagram: sanitizedInsta } as any;
  else safe.profile.socials.instagram = ensureUrl(safe.profile.socials.instagram, sanitizedInsta);
  return safe as UserConfig;
}

function useFirstReachableImage(urls: (string | undefined)[]) {
  const [src, setSrc] = useState<string | undefined>(undefined);
  const key = useMemo(() => (urls || []).filter(Boolean).join("|"), [urls]);
  const candidates = useMemo(() => (urls || []).filter((u): u is string => !!u), [key]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const u of candidates) {
        try {
          await new Promise((res, rej) => {
            const img = new Image();
            img.onload = () => res(null);
            img.onerror = () => rej(0);
            img.src = u;
          });
          if (!cancelled) {
            setSrc(u);
            break;
          }
        } catch {
          // try next candidate
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [candidates]);
  return src;
}

function Divider({ label }: { label?: string }) {
  return (
    <div className="my-6 flex items-center gap-4">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-400/60 to-transparent" />
      {label && <span className="text-xs tracking-[0.25em] text-zinc-600">{label}</span>}
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-400/60 to-transparent" />
    </div>
  );
}

function buildRuntimeData(): RuntimeData {
  const base = { photos: photosSeed, videos: videosSeed, posts: { blog: [] as any[], vlog: [] as any[] }, config: CONFIG };
  try {
    const saved = typeof window !== "undefined" ? localStorage.getItem("portfolio-data-v1") : null;
    if (!saved) return base;
    const obj = JSON.parse(saved) || {};
    const cfg = normalizeConfig(obj.config);
    const photos = Array.isArray(obj.photos) && obj.photos.length ? obj.photos : photosSeed;
    const videos = Array.isArray(obj.videos) && obj.videos.length ? obj.videos : videosSeed;
    const posts = typeof obj.posts === "object" && obj.posts ? obj.posts : { blog: [], vlog: [] };
    return { photos, videos, posts, config: cfg };
  } catch {
    return base;
  }
}

const RuntimeDataContext = createContext<RuntimeData | null>(null);

function RuntimeDataProvider({ children }: { children: ReactNode }) {
  const value = useMemo(() => buildRuntimeData(), []);
  return <RuntimeDataContext.Provider value={value}>{children}</RuntimeDataContext.Provider>;
}

function useRuntimeData(): RuntimeData {
  const ctx = useContext(RuntimeDataContext);
  if (!ctx) {
    throw new Error("useRuntimeData must be used within RuntimeDataProvider");
  }
  return ctx;
}

// -----------------
// Shell
// -----------------
function Shell({ children, current, setCurrent }: { children: ReactNode; current: NavKey; setCurrent: (n: NavKey) => void }) {
  const runtime = useRuntimeData();
  const conf = runtime.config;
  const rtBg = conf.background;
  const UNKAI = [
    "https://images.unsplash.com/photo-1499346030926-9a72daac6c63?w=2400&q=90&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1476041800959-2f6bb412c8ce?w=2400&q=90&auto=format&fit=crop",
  ];
  const bgCandidate = useFirstReachableImage([
    rtBg?.image && rtBg.image.trim() !== "" ? rtBg.image : undefined,
    CONFIG.background.image,
    ...UNKAI,
  ]);
  const bgImage = bgCandidate || CONFIG.background.image || UNKAI[0];
  const bgOpacity = typeof rtBg.imageOpacity === "number" ? rtBg.imageOpacity : CONFIG.background.imageOpacity;
  const instagram = ensureUrl(conf.instagram || CONFIG.instagram, CONFIG.instagram);
  const avatar = conf.profile?.avatar || CONFIG.profile.avatar || "";

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-white via-zinc-50 to-white text-zinc-900 relative">
      {bgImage && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${bgImage})`, backgroundSize: "cover", opacity: bgOpacity }}
        />
      )}
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-white/30" />

      <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b border-zinc-200/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrent("プロフィール")} aria-label="Open About" className="group">
              {avatar ? (
                <img
                  src={avatar}
                  alt="Profile"
                  className="h-9 w-9 rounded-full object-cover border border-zinc-200 group-hover:ring-2 group-hover:ring-zinc-400/60"
                />
              ) : (
                <div className="grid h-9 w-9 place-items-center rounded-full bg-zinc-900 text-white font-bold">R</div>
              )}
            </button>
            <div className="text-sm text-zinc-700 font-semibold tracking-wide">Ryuya Photography</div>
          </div>
          <nav className="hidden md:flex gap-4">
            {NAV.map((n) => (
              <button
                key={n}
                onClick={() => setCurrent(n)}
                className={`text-sm ${current === n ? "text-zinc-900 font-medium" : "text-zinc-600 hover:text-zinc-900"}`}
              >
                {n}
              </button>
            ))}
          </nav>
          <a
            href={instagram || "#"}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50"
          >
            Instagram
          </a>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 pb-12 pt-4">{children}</main>

      <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-zinc-500">
        <Divider />
        <div className="flex flex-col items-center gap-2">
          <div>(c) {new Date().getFullYear()} Ryuya</div>
          <div className="flex gap-3">
            <a className="hover:text-zinc-700" href="#">
              プライバシー
            </a>
            <a className="hover:text-zinc-700" href="#">
              表記
            </a>
            <span className="text-zinc-500">管理（オーナー用）</span>
          </div>
          <div className="mt-3 w-full max-w-4xl">
            <Maintenance variant="compact" />
          </div>
        </div>
      </footer>
    </div>
  );
}

// -----------------
// Hero
// -----------------
function Hero() {
  const { config } = useRuntimeData();
  const mode = config.heroMode;
  const videoSrc = config.heroVideoSrc;
  const slides = (Array.isArray(config.slideshowImages) && config.slideshowImages.length
    ? config.slideshowImages
    : CONFIG.slideshowImages) as { src?: string; title?: string; caption?: string }[];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (mode !== "slideshow" || !slides.length) return;
    const t = setInterval(() => setIdx((v) => (v + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length, mode]);
  const FALLBACK_VIDEO =
    "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4";
  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white/70">
      {mode === "video" ? (
        <div className="relative aspect-[21/9] w-full">
          <video className="h-full w-full object-cover" src={videoSrc || FALLBACK_VIDEO} autoPlay muted loop playsInline />
        </div>
      ) : (
        <div className="relative aspect-[21/9] w-full">
          {slides.length ? (
            <>
              <AnimatePresence mode="wait">
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="absolute inset-0"
                >
                  <ImageWithFallback src={slides[idx]?.src} className="h-full w-full object-cover" />
                </motion.div>
              </AnimatePresence>
              <div className="absolute bottom-0 left-0 p-6 bg-gradient-to-t from-white/90 via-white/40 to-transparent">
                <div className="text-2xl md:text-4xl font-serif text-zinc-900">{String(slides[idx]?.title || "")}</div>
                <div className="text-sm text-zinc-700">{String(slides[idx]?.caption || "")}</div>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 grid place-items-center p-6">
              <div className="rounded-lg border border-zinc-300 bg-white/80 px-4 py-3 text-sm text-zinc-700">
                画像がまだありません。下のメンテナンスから追加してください。
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// -----------------
// Gallery
// -----------------
function Gallery() {
  const runtime = useRuntimeData();
  const [active, setActive] = useState<any>(null);
  const items = (runtime.photos?.length ? runtime.photos : photosSeed) as typeof photosSeed;
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!active) return;
      const i = items.findIndex((p) => p.id === active.id);
      if (e.key === "ArrowRight") setActive(items[(i + 1) % items.length]);
      if (e.key === "ArrowLeft") setActive(items[(i - 1 + items.length) % items.length]);
      if (e.key === "Escape") setActive(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, items]);
  return (
    <section>
      <h2 className="mt-6 text-xl md:text-2xl font-semibold tracking-tight text-zinc-900">ギャラリー</h2>
      <p className="text-sm text-zinc-600">カードには要約1行、開くと3行メモ。</p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3">
        {items.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-600">
            まだ写真がありません。下のメンテナンスで追加してください。
          </div>
        )}
        {items.map((p) => (
          <button
            key={p.id}
            className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-zinc-200"
            onClick={() => setActive(p)}
          >
            <ImageWithFallback src={p.src} className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-white/80 via-white/40 to-transparent">
              <div className="text-sm text-zinc-900">{p.title}</div>
              <div className="text-xs text-zinc-600">{p.oneLiner}</div>
            </div>
          </button>
        ))}
      </div>
      <AnimatePresence>
        {active && (
          <motion.div
            className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActive(null)}
          >
            <motion.article
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 12, opacity: 0 }}
              className="max-w-2xl overflow-hidden rounded-2xl border border-zinc-200 bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              <ImageWithFallback src={active.src} className="w-full object-cover" />
              <div className="p-4">
                <h3 className="text-lg font-semibold text-zinc-900">{active.title}</h3>
                {active.lines?.map((l: string, i: number) => (
                  <div key={i} className="text-sm text-zinc-700 leading-relaxed">
                    {l}
                  </div>
                ))}
                <div className="mt-4 flex justify-end">
                  <Button onClick={() => setActive(null)}>閉じる</Button>
                </div>
              </div>
            </motion.article>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// -----------------
// Video (thumbnails)
// -----------------
function VideoList() {
  const runtime = useRuntimeData();
  const vids = Array.isArray(runtime.videos) && runtime.videos.length ? runtime.videos : videosSeed;
  return (
    <section>
      <h2 className="mt-6 text-xl md:text-2xl font-semibold tracking-tight text-zinc-900">動画</h2>
      <p className="text-sm text-zinc-600">サムネイル一覧（仮）。リンク先は後で追加可能。</p>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {vids.map((v: any) => (
          <a key={v.id} href={v.href || "#"} className="group relative block overflow-hidden rounded-xl border border-zinc-200">
            <ImageWithFallback src={v.thumb} className="aspect-video w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-white/85 via-white/40 to-transparent">
              <div className="text-zinc-900">{v.title}</div>
              <div className="text-xs text-zinc-600">{v.meta}</div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

// -----------------
// Map
// -----------------
function MapView() {
  const { config } = useRuntimeData();
  const [q, setQ] = useState("");
  const [season, setSeason] = useState("all");
  const [tag, setTag] = useState("all");
  const [activeId, setActiveId] = useState<string | null>(config.map.spots?.[0]?.id || null);
  const spots = (Array.isArray(config.map.spots) ? config.map.spots : []) as Array<{
    id: string;
    title: string;
    lat: number;
    lng: number;
    tags?: string[];
    season?: string;
    note?: string;
    thumb?: string;
  }>;
  const filtered = spots.filter((s) => {
    const mq = q.trim().toLowerCase();
    const matchQ = mq === "" || s.title.toLowerCase().includes(mq) || (s.note || "").toLowerCase().includes(mq);
    const matchSeason = season === "all" || (s.season || "").toLowerCase() === season;
    const matchTag = tag === "all" || (s.tags || []).includes(tag);
    return matchQ && matchSeason && matchTag;
  });
  const active = filtered.find((s) => s.id === activeId) || filtered[0] || spots[0];
  const zoom = Number.isFinite(config.map.zoom) ? config.map.zoom : 11;
  const embedSrc = active
    ? `https://www.google.com/maps?q=${active.lat},${active.lng}&z=${zoom}&output=embed`
    : `https://www.google.com/maps?q=35.681236,139.767125&z=${zoom}&output=embed`;
  const allTags = Array.from(new Set(spots.flatMap((s) => s.tags || [])));
  const seasons = Array.from(new Set(spots.map((s) => s.season || "").filter(Boolean)));
  return (
    <section>
      <h2 className="mt-6 text-xl md:text-2xl font-semibold tracking-tight text-zinc-900">マップ</h2>
      <p className="text-sm text-zinc-600">撮影スポットを簡易フィルタ。カードを押すと地図が移動。</p>
      <div className="mt-3 grid gap-4 md:grid-cols-[1.2fr,1fr]">
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <div className="aspect-[4/3] md:aspect-[16/10] w-full">
            <iframe title="map" src={embedSrc} className="h-full w-full border-0" loading="lazy" />
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input value={q} onChange={(e: any) => setQ(e.target.value)} placeholder="タイトル/メモを検索" />
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm"
            >
              <option value="all">全季節</option>
              {seasons.map((s) => (
                <option key={s} value={String(s).toLowerCase()}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm"
            >
              <option value="all">すべてのタグ</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 max-h-[22rem] overflow-auto pr-1">
            {filtered.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={`group flex items-center gap-3 rounded-xl border px-2 py-2 text-left ${
                  active?.id === s.id ? "border-zinc-800 bg-zinc-50" : "border-zinc-200 hover:bg-zinc-50"
                }`}
              >
                <ImageWithFallback src={s.thumb} className="h-16 w-24 rounded-lg object-cover" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-zinc-900">{s.title}</div>
                  <div className="truncate text-xs text-zinc-600">{s.note}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(s.tags || []).map((t) => (
                      <span key={t} className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text:[10px] text-zinc-700">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-600">
                スポットがありません。Maintenanceの JSON から config.map.spots に追加してください。
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// -----------------
// About
// -----------------
function About() {
  const { config } = useRuntimeData();
  const p = config.profile;
  const aboutThumb = config.slideshowImages?.[0]?.src || CONFIG.slideshowImages[0].src;
  return (
    <section>
      <h2 className="mt-6 text-xl md:text-2xl font-semibold tracking-tight text-zinc-900">プロフィール</h2>
      <div className="mt-4 grid gap-6 md:grid-cols-[1.1fr,1.4fr]">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center gap-4">
            <img src={p.avatar} className="h-20 w-20 rounded-full object-cover border border-zinc-200" />
            <div>
              <div className="text-xl font-semibold text-zinc-900">{p.name}</div>
              <div className="text-sm text-zinc-600">{p.title}</div>
              <div className="text-xs text-zinc-500">{p.location}</div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {p.bioLines?.map((line: string, i: number) => (
              <p key={i} className="text-[15px] leading-7 text-zinc-700">
                {line}
              </p>
            ))}
          </div>
          {Array.isArray(p.gear) && p.gear.length > 0 && (
            <div className="mt-4">
              <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Gear</div>
              <div className="flex flex-wrap gap-2">
                {p.gear.map((g: string, i: number) => (
                  <span key={i} className="rounded-full border border-zinc-300 bg-white px-2.5 py-1 text-xs text-zinc-700">
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            {p.socials?.instagram && (
              <a
                href={ensureUrl(p.socials.instagram, CONFIG.instagram)}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50"
              >
                Instagram
              </a>
            )}
            {p.socials?.youtube && (
              <a
                href={ensureUrl(p.socials.youtube, "#")}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50"
              >
                YouTube
              </a>
            )}
            {p.socials?.x && (
              <a
                href={ensureUrl(p.socials.x, "#")}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50"
              >
                X
              </a>
            )}
            {p.socials?.website && (
              <a
                href={ensureUrl(p.socials.website, "#")}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50"
              >
                Website
              </a>
            )}
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <ImageWithFallback src={aboutThumb} className="aspect-[4/3] w-full object-cover" />
        </div>
      </div>
    </section>
  );
}

// -----------------
// Maintenance (compact capable)
// -----------------
function Maintenance({ variant = "full" }: { variant?: "full" | "compact" } = {}) {
  const runtime = useRuntimeData();
  const conf = runtime.config;
  const PASS = conf.management?.passcode || "";
  const LS_KEY = conf.management?.lsKey || "portfolio-admin-ok";
  const QS_KEY = conf.management?.qsKey || "admin";
  const [authorized, setAuthorized] = useState<boolean>(() => {
    try {
      return localStorage.getItem(LS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [pin, setPin] = useState("");
  useEffect(() => {
    try {
      const qs = new URLSearchParams(location.search).get(QS_KEY);
      if (qs && qs === PASS) {
        localStorage.setItem(LS_KEY, "1");
        setAuthorized(true);
      }
    } catch {
      // ignore in SSR / sandbox
    }
  }, [PASS, QS_KEY, LS_KEY]);
  const wrapClass = variant === "compact" ? "mt-3 rounded-xl border border-zinc-200 bg-white/70 p-3" : "mt-8 rounded-2xl border border-zinc-200 bg-white/70 p-4";
  const titleClass = variant === "compact" ? "text-sm font-semibold text-zinc-900" : "text-lg font-semibold text-zinc-900";
  const hintClass = variant === "compact" ? "mt-1 text-xs text-zinc-600" : "mt-1 text-sm text-zinc-600";

  if (!authorized)
    return (
      <section className={`${wrapClass} text-center`}>
        <h2 className={titleClass}>メンテナンス</h2>
        <p className={hintClass}>オーナー専用の画面です。パスコードを入力してください。</p>
        <div className="mx-auto mt-3 flex max-w-sm items-center gap-2">
          <Input type="password" value={pin} onChange={(e: any) => setPin(e.target.value)} placeholder="パスコード" />
          <Button
            onClick={() => {
              if (pin === PASS) {
                try {
                  localStorage.setItem(LS_KEY, "1");
                } catch {
                  // ignore storage failures
                }
                setAuthorized(true);
              } else {
                alert("パスコードが違います");
              }
            }}
          >
            ログイン
          </Button>
        </div>
        {variant === "full" && (
          <p className="mt-2 text-xs text-zinc-500">ヒント: クエリ `?{QS_KEY}=パスコード` でもログインできます。</p>
        )}
      </section>
    );

  const [tab, setTab] = useState<"photo" | "video" | "blog" | "vlog" | "profile">("photo");
  const [json, setJson] = useState<string>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("portfolio-data-v1") : null;
    return (
      saved || JSON.stringify({ photos: photosSeed, videos: videosSeed, posts: { blog: [], vlog: [] }, config: CONFIG }, null, 2)
    );
  });

  function parseState(): RuntimeData {
    try {
      const o = JSON.parse(json);
      o.config = normalizeConfig(o.config);
      o.photos = Array.isArray(o.photos) ? o.photos : [];
      o.videos = Array.isArray(o.videos) ? o.videos : [];
      o.posts = typeof o.posts === "object" && o.posts ? o.posts : { blog: [], vlog: [] };
      o.posts.blog = Array.isArray(o.posts.blog) ? o.posts.blog : [];
      o.posts.vlog = Array.isArray(o.posts.vlog) ? o.posts.vlog : [];
      return o;
    } catch {
      return { photos: photosSeed.slice(), videos: videosSeed.slice(), posts: { blog: [], vlog: [] }, config: CONFIG };
    }
  }
  function saveJsonObj(o: RuntimeData) {
    const next = JSON.stringify(o, null, 2);
    setJson(next);
    try {
      localStorage.setItem("portfolio-data-v1", next);
    } catch {
      // ignore write failures (private mode, etc.)
    }
  }
  function toDataUrl(file?: File): Promise<string> {
    return new Promise((res) => {
      if (!file) return res("");
      const r = new FileReader();
      r.onload = () => res(String(r.result || ""));
      r.readAsDataURL(file);
    });
  }

  const [phFile, setPhFile] = useState<string>("");
  const [phTitle, setPhTitle] = useState("");
  const [phOne, setPhOne] = useState("");
  const [phL1, setPhL1] = useState("");
  const [phL2, setPhL2] = useState("");
  const [phL3, setPhL3] = useState("");
  const [phLat, setPhLat] = useState("");
  const [phLng, setPhLng] = useState("");
  const [phSpot, setPhSpot] = useState("");
  const spots = conf.map?.spots || [];
  function addSpotIfCoords(obj: RuntimeData, title: string, note: string, thumb: string, latStr?: string, lngStr?: string) {
    const lat = Number(latStr);
    const lng = Number(lngStr);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const id = `spot_${Date.now()}`;
    obj.config.map = obj.config.map || { provider: "google", zoom: 11, spots: [] } as any;
    obj.config.map.spots = Array.isArray(obj.config.map.spots) ? obj.config.map.spots : [];
    obj.config.map.spots.push({ id, title, lat, lng, tags: [], season: "", note, thumb });
  }
  function onPickPhoto(ev: any) {
    const f = ev.target.files?.[0];
    if (!f) return;
    toDataUrl(f).then(setPhFile);
  }
  function submitPhoto(e: any) {
    e.preventDefault();
    const o = parseState();
    if (!phFile || !phTitle) {
      alert("画像とタイトルは必須です");
      return;
    }
    const id = `p_${Date.now()}`;
    o.photos.push({ id, title: phTitle, oneLiner: phOne || "", lines: [phL1 || "", phL2 || "", phL3 || ""], src: phFile });
    if (!phSpot) {
      addSpotIfCoords(o, phTitle, phOne || "", phFile, phLat, phLng);
    }
    saveJsonObj(o);
    alert("写真を追加しました（ギャラリー & マップ更新）");
    setPhTitle("");
    setPhOne("");
    setPhL1("");
    setPhL2("");
    setPhL3("");
    setPhLat("");
    setPhLng("");
    setPhSpot("");
    setPhFile("");
  }

  const [vdTitle, setVdTitle] = useState("");
  const [vdMeta, setVdMeta] = useState("");
  const [vdThumb, setVdThumb] = useState("");
  function onPickVideoThumb(ev: any) {
    const f = ev.target.files?.[0];
    if (!f) return;
    toDataUrl(f).then(setVdThumb);
  }
  function submitVideo(e: any) {
    e.preventDefault();
    const o = parseState();
    if (!vdTitle) {
      alert("タイトルは必須です");
      return;
    }
    const id = `v_${Date.now()}`;
    o.videos.push({ id, title: vdTitle, meta: vdMeta || "", thumb: vdThumb || photosSeed[0].src });
    saveJsonObj(o);
    alert("動画を追加しました");
    setVdTitle("");
    setVdMeta("");
    setVdThumb("");
  }

  const [blTitle, setBlTitle] = useState("");
  const [blBody, setBlBody] = useState("");
  const [vlTitle, setVlTitle] = useState("");
  const [vlBody, setVlBody] = useState("");
  function submitBlog(e: any) {
    e.preventDefault();
    const o = parseState();
    if (!blTitle) {
      alert("タイトルは必須です");
      return;
    }
    const id = `b_${Date.now()}`;
    o.posts.blog.push({ id, title: blTitle, body: blBody, date: new Date().toISOString() });
    saveJsonObj(o);
    alert("ブログを追加しました");
    setBlTitle("");
    setBlBody("");
  }
  function submitVlog(e: any) {
    e.preventDefault();
    const o = parseState();
    if (!vlTitle) {
      alert("タイトルは必須です");
      return;
    }
    const id = `vl_${Date.now()}`;
    o.posts.vlog.push({ id, title: vlTitle, body: vlBody, date: new Date().toISOString() });
    saveJsonObj(o);
    alert("Vログを追加しました");
    setVlTitle("");
    setVlBody("");
  }

  return (
    <section className={wrapClass}>
      <div className="flex items-start justify-between gap-3">
        <h2 className={titleClass}>メンテナンス</h2>
        <Button
          className={variant === "compact" ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-xs"}
          onClick={() => {
            try {
              localStorage.removeItem(LS_KEY);
            } catch {
              // ignore
            }
            setAuthorized(false);
          }}
        >
          ログアウト
        </Button>
      </div>
      <p className={hintClass}>投稿と編集。保存は自動（ローカル）。</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {[
          ["photo", "写真投稿"],
          ["video", "動画投稿"],
          ["blog", "ブログ投稿"],
          ["vlog", "Vログ投稿"],
          ["profile", "プロフィール編集"],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k as any)}
            className={`rounded-full border px-3 py-1 text-xs ${
              tab === k ? "border-zinc-900 bg-zinc-50" : "border-zinc-300 bg-white hover:bg-zinc-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "photo" && (
        <form onSubmit={submitPhoto} className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <Row>
              <Label>写真（必須）</Label>
              <input type="file" accept="image/*" onChange={onPickPhoto} className="block w-full text-xs" />
            </Row>
            {phFile && <img src={phFile} className="mt-2 h-32 w-full object-cover rounded" />}
            <Row>
              <Label>タイトル（必須）</Label>
              <Input value={phTitle} onChange={(e: any) => setPhTitle(e.target.value)} />
            </Row>
            <Row>
              <Label>要約1行</Label>
              <Input value={phOne} onChange={(e: any) => setPhOne(e.target.value)} />
            </Row>
            <Row>
              <Label>文章（3行）</Label>
              <Input placeholder="1行目" value={phL1} onChange={(e: any) => setPhL1(e.target.value)} />
              <Input placeholder="2行目" value={phL2} onChange={(e: any) => setPhL2(e.target.value)} className="mt-1" />
              <Input placeholder="3行目" value={phL3} onChange={(e: any) => setPhL3(e.target.value)} className="mt-1" />
            </Row>
          </div>
          <div>
            <Row>
              <Label>場所（任意）— 方法A: 既存スポットから選択</Label>
              <select
                value={phSpot}
                onChange={(e) => setPhSpot(e.target.value)}
                className="w-full rounded border px-2 py-1 text-sm"
              >
                <option value="">選択しない</option>
                {spots.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </Row>
            <Row>
              <Label>方法B: 緯度・経度を直接入力</Label>
              <div className="flex gap-2">
                <Input placeholder="緯度 35.xxxxxx" value={phLat} onChange={(e: any) => setPhLat(e.target.value)} />
                <Input placeholder="経度 139.xxxxxx" value={phLng} onChange={(e: any) => setPhLng(e.target.value)} />
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">
                ※ 補助: <a className="underline" target="_blank" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(phTitle || "photo spot")}`}>Googleマップ検索</a> → 座標をコピー
              </div>
            </Row>
            <Row>
              <Button type="submit">写真を追加</Button>
            </Row>
          </div>
        </form>
      )}

      {tab === "video" && (
        <form onSubmit={submitVideo} className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <Row>
              <Label>タイトル（必須）</Label>
              <Input value={vdTitle} onChange={(e: any) => setVdTitle(e.target.value)} />
            </Row>
            <Row>
              <Label>メタ（任意）</Label>
              <Input value={vdMeta} onChange={(e: any) => setVdMeta(e.target.value)} />
            </Row>
          </div>
          <div>
            <Row>
              <Label>サムネイル</Label>
              <div className="flex gap-2">
                <Input placeholder="URLまたは空" value={vdThumb} onChange={(e: any) => setVdThumb(e.target.value)} />
                <label className="inline-flex cursor-pointer items-center gap-2 rounded border px-2 py-1 text-xs">
                  <input type="file" accept="image/*" className="hidden" onChange={onPickVideoThumb} />ファイル
                </label>
              </div>
            </Row>
            {vdThumb && <img src={vdThumb} className="h-28 w-full object-cover rounded mt-2" />}
            <Row>
              <Button type="submit">動画を追加</Button>
            </Row>
          </div>
        </form>
      )}

      {tab === "blog" && (
        <form onSubmit={submitBlog} className="mt-3 grid gap-3">
          <Row>
            <Label>タイトル（必須）</Label>
            <Input value={blTitle} onChange={(e: any) => setBlTitle(e.target.value)} />
          </Row>
          <Row>
            <Label>本文</Label>
            <TextArea value={blBody} onChange={(e: any) => setBlBody(e.target.value)} className="h-28" />
          </Row>
          <Row>
            <Button type="submit">ブログを追加</Button>
          </Row>
        </form>
      )}

      {tab === "vlog" && (
        <form onSubmit={submitVlog} className="mt-3 grid gap-3">
          <Row>
            <Label>タイトル（必須）</Label>
            <Input value={vlTitle} onChange={(e: any) => setVlTitle(e.target.value)} />
          </Row>
          <Row>
            <Label>本文 / ノート</Label>
            <TextArea value={vlBody} onChange={(e: any) => setVlBody(e.target.value)} className="h-28" />
          </Row>
          <Row>
            <Button type="submit">Vログを追加</Button>
          </Row>
        </form>
      )}

      {tab === "profile" && (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <Row>
            <Label>名前</Label>
            <Input
              defaultValue={conf.profile.name}
              onBlur={(e: any) => {
                const o = parseState();
                o.config.profile.name = e.target.value;
                saveJsonObj(o);
              }}
            />
          </Row>
          <Row>
            <Label>肩書き</Label>
            <Input
              defaultValue={conf.profile.title}
              onBlur={(e: any) => {
                const o = parseState();
                o.config.profile.title = e.target.value;
                saveJsonObj(o);
              }}
            />
          </Row>
          <Row>
            <Label>居住地</Label>
            <Input
              defaultValue={conf.profile.location}
              onBlur={(e: any) => {
                const o = parseState();
                o.config.profile.location = e.target.value;
                saveJsonObj(o);
              }}
            />
          </Row>
          <Row className="md:col-span-2">
            <Label>Instagram URL</Label>
            <Input
              defaultValue={conf.profile.socials?.instagram || conf.instagram}
              onBlur={(e: any) => {
                const o = parseState();
                o.config.profile.socials.instagram = e.target.value;
                o.config.instagram = e.target.value;
                saveJsonObj(o);
              }}
            />
          </Row>
          <Row>
            <Label>YouTube URL</Label>
            <Input
              defaultValue={conf.profile.socials?.youtube || ""}
              onBlur={(e: any) => {
                const o = parseState();
                o.config.profile.socials.youtube = e.target.value;
                saveJsonObj(o);
              }}
            />
          </Row>
          <Row>
            <Label>X URL</Label>
            <Input
              defaultValue={conf.profile.socials?.x || ""}
              onBlur={(e: any) => {
                const o = parseState();
                o.config.profile.socials.x = e.target.value;
                saveJsonObj(o);
              }}
            />
          </Row>
        </div>
      )}

      <div className="mt-4">
        <div className="mb-1 text-xs text-zinc-500">高度な編集（JSON）</div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Button
            onClick={() => {
              try {
                const data = JSON.parse(json);
                data.config = normalizeConfig(data.config);
                localStorage.setItem("portfolio-data-v1", JSON.stringify(data));
                alert("保存しました（ブラウザ）");
              } catch {
                alert("JSONが不正です");
              }
            }}
          >
            保存
          </Button>
          <Button
            onClick={() => {
              const s = localStorage.getItem("portfolio-data-v1");
              if (s) setJson(s);
            }}
          >
            読込
          </Button>
          <Button
            onClick={() => {
              localStorage.removeItem("portfolio-data-v1");
              alert("クリアしました");
            }}
          >
            クリア
          </Button>
          <Button
            className="border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
            onClick={() => {
              const next = JSON.stringify({ photos: photosSeed, videos: videosSeed, posts: { blog: [], vlog: [] }, config: CONFIG }, null, 2);
              setJson(next);
              localStorage.setItem("portfolio-data-v1", next);
              alert("既定に戻しました（サンプル）");
            }}
          >
            既定に戻す
          </Button>
        </div>
        <TextArea value={json} onChange={(e: any) => setJson(e.target.value)} className={variant === "compact" ? "h-40" : "h-56"} />
      </div>
    </section>
  );
}

// -----------------
// Home
// -----------------
function Home() {
  return (
    <section>
      <Hero />
      <Divider label="作品" />
      <Gallery />
    </section>
  );
}

// -----------------
// Root export
// -----------------
export default function PortfolioMockV3() {
  const [current, setCurrent] = useState<NavKey>("ホーム");
  return (
    <RuntimeDataProvider>
      <Shell current={current} setCurrent={setCurrent}>
        {current === "ホーム" && <Home />}
        {current === "ギャラリー" && <Gallery />}
        {current === "動画" && <VideoList />}
        {current === "マップ" && <MapView />}
        {current === "プロフィール" && <About />}
        {current === "連絡" && (
          <section>
            <h2 className="mt-6 text-xl md:text-2xl font-semibold tracking-tight text-zinc-900">連絡</h2>
            <p className="text-sm text-zinc-600">InstagramのDMでご連絡ください。</p>
            <div className="mt-3">
              <a
                href={ensureUrl(CONFIG.instagram, "#")}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:bg-zinc-50"
              >
                Instagram
              </a>
            </div>
          </section>
        )}
      </Shell>
    </RuntimeDataProvider>
  );
}

(function selfTest() {
  try {
    const baseOk = typeof CONFIG.instagram === "string" && (CONFIG.heroMode === "video" || CONFIG.heroMode === "slideshow");
    console.assert(baseOk, "CONFIG base sanity failed");

    console.assert(typeof CONFIG.heroMode === "string", "heroMode must be string");

    const badInsta = normalizeConfig({ instagram: "not a url" as any });
    console.assert(badInsta.instagram === CONFIG.instagram, "invalid instagram -> fallback");

    const goodInsta = normalizeConfig({ instagram: "https://example.com/x" });
    console.assert(
      goodInsta.instagram === "https://example.com/x/" || goodInsta.instagram === "https://example.com/x",
      "valid instagram kept/sanitized"
    );

    const sample = normalizeConfig({ heroMode: "invalid", slideshowImages: [{ src: "" }] });
    console.assert(sample.heroMode === "slideshow", "normalize heroMode -> slideshow");
    console.assert(sample.slideshowImages.length >= 1, "normalize slides fallback");

    const sample2 = normalizeConfig({ heroMode: null as any });
    console.assert(sample2.heroMode === "slideshow", "null heroMode -> slideshow");

    const sample3 = normalizeConfig({ heroMode: {} as any });
    console.assert(sample3.heroMode === "slideshow", "object heroMode -> slideshow");

    const valid = normalizeConfig({ heroMode: "video" });
    console.assert(valid.heroMode === "video", "explicit 'video' stays video");

    const merged = normalizeConfig({ background: { imageOpacity: 0.5 } });
    console.assert(merged.background.imageOpacity === 0.5, "normalize background.opacity");

    const photoOk = Array.isArray(photosSeed) && photosSeed.length >= 3;
    const videoOk = Array.isArray(videosSeed) && videosSeed.length >= 2;
    console.assert(photoOk && videoOk, "seed sizes valid");
  } catch (e) {
    console.warn("Runtime selfTest failed", e);
  }
})();

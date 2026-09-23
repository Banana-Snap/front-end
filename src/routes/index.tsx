import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, ChartNoAxesCombined, Check, HeartPulse, Leaf, Mail, ScanLine } from "lucide-react";
import { useEffect } from "react";
import estadisticas from "@/assets/estadisticas.png";
import pantallaprincipal from "@/assets/pantallaprincipal.png";
import escaneocomida from "@/assets/escaneocomida.png";
import escaneocomida2 from "@/assets/escaneocomida2.png";
import logoplaystore from "@/assets/logoplaystore.png";
import logoApple from "@/assets/logoapple.png";
import instagram_logo from "@/assets/instagram_logo.png";
import { LanguageSelector, useLanguage, type Language } from "@/lib/language";
import { useSession } from "@/lib/auth";

const GOOGLE_PLAY = "https://play.google.com/store/apps/details?id=com.cipherchabon.banana_app&pcampaignid=web_share";

const APPLE = "https://apple.bananasnap.ar/";
const OG_IMAGE = "https://bananasnap.com.ar/og-image.jpg";


export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "BananaSnap — Nutrición inteligente en una foto" },
      { name: "description", content: "Reconocé tus comidas con IA, conocé sus nutrientes y llevá un seguimiento nutricional simple con BananaSnap." },
      { property: "og:title", content: "BananaSnap — Tu nutrición, en una foto" },
      { property: "og:description", content: "Escaneá tus comidas, conocé sus nutrientes y tomá mejores decisiones cada día." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
});

const copy = {
  es: {
    title: "BananaSnap — Nutrición inteligente en una foto", nav: ["Características", "Descargar", "Por qué BananaSnap", "Contacto"], download: "Descargar",
    eyebrow: "Nutrición simple, todos los días", hero1: "Conocé tu comida.", hero2: "Elegí sentirte mejor.", heroText: "BananaSnap usa inteligencia artificial para reconocer alimentos, estimar sus nutrientes y ayudarte a construir hábitos más saludables.",
    featureEyebrow: "Todo en un solo lugar", featureTitle: "Tu alimentación, más fácil de entender", featureText: "Información clara para acompañar tus decisiones sin complicaciones.",
    features: [["Reconocimiento de alimentos por IA", "Tomá una foto y dejá que BananaSnap identifique tu comida al instante."], ["Seguimiento nutricional", "Conocé calorías, proteínas, carbohidratos y grasas de cada porción."], ["Pensada para tu bienestar", "Una forma simple de acompañar hábitos saludables y el manejo de diabetes."]],
    downloadTitle: "Descargá BananaSnap", downloadText: "Disponible en Google Play y PWA para Apple. Toma control de tu dieta con seguimiento de alimentos por IA.",
    whyEyebrow: "Hecha para acompañarte", whyTitle: "¿Por qué elegir BananaSnap?", why: ["Identificación de alimentos con inteligencia artificial", "Cálculos nutricionales claros y rápidos", "Apoyo para el manejo diario de la alimentación", "Seguimiento simple basado en fotos"], downloadNow: "Descargar ahora", privacy: "Política de Privacidad",
    alts: ["Pantalla principal de BananaSnap con el resumen de consumo diario de proteínas", "Reconocimiento de alimentos por IA a partir de una foto", "Valores nutricionales detallados de una comida en BananaSnap", "Estadísticas y análisis de tendencia de proteínas en BananaSnap"],
  },
  en: {
    title: "BananaSnap — Smart nutrition in one photo", nav: ["Features", "Download", "Why BananaSnap", "Contact"], download: "Download",
    eyebrow: "Simple nutrition, every day", hero1: "Know your food.", hero2: "Choose to feel better.", heroText: "BananaSnap uses artificial intelligence to recognize food, estimate nutrients, and help you build healthier habits.",
    featureEyebrow: "Everything in one place", featureTitle: "Your nutrition, easier to understand", featureText: "Clear information to support your decisions without complications.",
    features: [["AI food recognition", "Take a photo and let BananaSnap identify your meal instantly."], ["Nutrition tracking", "See calories, protein, carbohydrates, and fat in every serving."], ["Designed for your wellbeing", "A simple way to support healthy habits and diabetes management."]],
    downloadTitle: "Download BananaSnap", downloadText: "Available on Google Play and as a PWA for Apple. Take control of your diet with AI-powered food tracking.",
    whyEyebrow: "Made to support you", whyTitle: "Why choose BananaSnap?", why: ["AI-powered food identification", "Clear and fast nutritional calculations", "Support for daily nutrition management", "Simple photo-based tracking"], downloadNow: "Download now", privacy: "Privacy Policy",
    alts: ["BananaSnap home screen with daily protein intake summary", "AI food recognition from a photo", "Detailed nutritional values for a meal in BananaSnap", "Protein trend statistics and analysis in BananaSnap"],
  },
  it: {
    title: "BananaSnap — Nutrizione intelligente in una foto", nav: ["Funzionalità", "Scarica", "Perché BananaSnap", "Contatti"], download: "Scarica",
    eyebrow: "Nutrizione semplice, ogni giorno", hero1: "Conosci il tuo cibo.", hero2: "Scegli di sentirti meglio.", heroText: "BananaSnap usa l'intelligenza artificiale per riconoscere gli alimenti, stimarne i nutrienti e aiutarti a creare abitudini più sane.",
    featureEyebrow: "Tutto in un unico posto", featureTitle: "La tua alimentazione, più facile da capire", featureText: "Informazioni chiare per accompagnare le tue scelte senza complicazioni.",
    features: [["Riconoscimento degli alimenti con IA", "Scatta una foto e lascia che BananaSnap identifichi subito il tuo pasto."], ["Monitoraggio nutrizionale", "Scopri calorie, proteine, carboidrati e grassi di ogni porzione."], ["Pensata per il tuo benessere", "Un modo semplice per sostenere abitudini sane e la gestione del diabete."]],
    downloadTitle: "Scarica BananaSnap", downloadText: "Disponibile su Google Play e come PWA per Apple. Prendi il controllo della tua dieta con il monitoraggio alimentare basato sull'IA.",
    whyEyebrow: "Creata per accompagnarti", whyTitle: "Perché scegliere BananaSnap?", why: ["Identificazione degli alimenti con intelligenza artificiale", "Calcoli nutrizionali chiari e veloci", "Supporto per la gestione quotidiana dell'alimentazione", "Monitoraggio semplice basato sulle foto"], downloadNow: "Scarica ora", privacy: "Informativa sulla Privacy",
    alts: ["Schermata principale di BananaSnap con il riepilogo del consumo giornaliero di proteine", "Riconoscimento degli alimenti con IA da una foto", "Valori nutrizionali dettagliati di un pasto in BananaSnap", "Statistiche e analisi dell'andamento delle proteine in BananaSnap"],
  },
} satisfies Record<Language, Record<string, string | string[] | string[][]>>;

const icons = [ScanLine, ChartNoAxesCombined, HeartPulse];

function Brand() {
  return <span className="inline-flex items-center gap-2 text-xl font-black text-foreground"><img src={instagram_logo} alt="" className="size-9 rounded-md" aria-hidden="true" />BananaSnap</span>;
}

function AppScreenshot({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} loading="lazy" className="w-full rounded-md border border-border bg-card shadow-lg" />;
}

function StoreLinks({ compact = false, language }: { compact?: boolean; language: Language }) {
  const size = compact ? "h-8" : "h-10";
  return <div className="flex flex-wrap items-center gap-4">
    <a href={GOOGLE_PLAY} target="_blank" rel="noreferrer" className={`${compact ? "px-5 py-3" : "px-6 py-3.5"} inline-flex items-center rounded-md bg-foreground transition-transform hover:-translate-y-0.5`} aria-label={language === "es" ? "Descargar BananaSnap desde Google Play" : language === "en" ? "Download BananaSnap from Google Play" : "Scarica BananaSnap da Google Play"}><img src={logoplaystore} alt="Google Play" className={`${size} w-auto invert`} /></a>
    <a href={APPLE} target="_blank" rel="noreferrer" className={`${compact ? "px-5 py-3" : "px-6 py-3.5"} inline-flex items-center rounded-md bg-foreground transition-transform hover:-translate-y-0.5`} aria-label={language === "es" ? "Descargar BananaSnap para Apple" : language === "en" ? "Download BananaSnap for Apple" : "Scarica BananaSnap per Apple"}><img src={logoApple} alt="Apple" className={`${size} w-auto`} /></a>
  </div>;
}

const authCopy = {
  es: { signin: "Iniciar sesión", account: "Mi cuenta" },
  en: { signin: "Sign in", account: "My account" },
  it: { signin: "Accedi", account: "Il mio account" },
} satisfies Record<Language, { signin: string; account: string }>;

function AuthLink({ language }: { language: Language }) {
  const { session, loading } = useSession();
  if (loading) return <span className="hidden h-9 w-24 rounded-md bg-muted md:block" aria-hidden="true" />;
  const href = session ? "/cuenta" : "/auth";
  const label = session ? authCopy[language].account : authCopy[language].signin;
  return (
    <a
      href={href}
      onClick={(event) => { event.preventDefault(); window.location.assign(href); }}
      className="rounded-md border border-border px-3 py-2 text-sm font-extrabold text-foreground transition-colors hover:border-primary hover:text-primary"
    >
      {label}
    </a>
  );
}

function Index() {
  const { language } = useLanguage();
  const t = copy[language];
  useEffect(() => { document.title = t.title as string; }, [t.title]);
  const nav = t.nav as string[];
  const features = t.features as string[][];
  const alts = t.alts as string[];

  return <div className="min-h-screen bg-background">
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur"><div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-6"><a href="#inicio" aria-label="BananaSnap"><Brand /></a><nav className="ml-auto hidden items-center gap-7 text-sm font-bold text-ink-soft md:flex" aria-label="Navigation"><a href="#caracteristicas" className="hover:text-primary">{nav[0]}</a><a href="#descargar" className="hover:text-primary">{nav[1]}</a><a href="#porque" className="hover:text-primary">{nav[2]}</a><a href="mailto:bananasnapp@gmail.com" className="hover:text-primary">{nav[3]}</a></nav><a href="#descargar" className="ml-auto rounded-md bg-highlight px-3 py-2 text-sm font-black text-highlight-foreground hover:bg-highlight/85 md:hidden">{t.download as string}</a><AuthLink language={language} /><LanguageSelector /></div></header>
    <main>
      <section id="inicio" className="overflow-hidden bg-brand-soft"><div className="mx-auto grid min-h-[690px] max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.02fr_.98fr] lg:py-20"><div><p className="mb-4 inline-flex items-center gap-2 text-sm font-extrabold uppercase text-primary"><Leaf className="size-4" aria-hidden="true" /> {t.eyebrow as string}</p><h1 className="max-w-3xl text-5xl font-black leading-[1.03] text-foreground sm:text-6xl">{t.hero1 as string}<br /><span className="text-primary">{t.hero2 as string}</span></h1><p className="mt-6 max-w-xl text-lg leading-8 text-ink-soft">{t.heroText as string}</p><div className="mt-8"><StoreLinks language={language} /></div></div><div className="grid grid-cols-3 items-end gap-3 sm:gap-5"><AppScreenshot src={escaneocomida} alt={alts[0] ?? "BananaSnap"} /><AppScreenshot src={pantallaprincipal} alt={alts[1] ?? "BananaSnap"} /><AppScreenshot src={estadisticas} alt={alts[2] ?? "BananaSnap"} /></div></div></section>
      <section id="caracteristicas" className="bg-brand-soft-strong py-24"><div className="mx-auto max-w-6xl px-6"><div className="mx-auto max-w-2xl text-center"><p className="text-sm font-extrabold uppercase text-primary">{t.featureEyebrow as string}</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">{t.featureTitle as string}</h2><p className="mt-4 text-muted-foreground">{t.featureText as string}</p></div><div className="mt-12 grid gap-5 md:grid-cols-3">{features.map(([title, text], index) => { const Icon = icons[index] ?? ScanLine; return <article key={title} className="rounded-md border border-border bg-card p-7 shadow-sm"><span className="flex size-11 items-center justify-center rounded-md bg-highlight text-highlight-foreground"><Icon className="size-5" aria-hidden="true" /></span><h3 className="mt-5 text-xl font-extrabold text-primary">{title}</h3><p className="mt-3 leading-7 text-muted-foreground">{text}</p></article>; })}</div></div></section>
      <section id="descargar" className="py-24"><div className="mx-auto max-w-4xl px-6"><div className="rounded-md bg-primary px-7 py-14 text-center text-primary-foreground shadow-xl sm:px-12"><img src={instagram_logo} alt="" className="mx-auto size-14 rounded-xl" aria-hidden="true" /><h2 className="mt-4 text-3xl font-black sm:text-4xl">{t.downloadTitle as string}</h2><p className="mx-auto mt-4 max-w-2xl leading-7 text-primary-foreground/85">{t.downloadText as string}</p><div className="mt-8 flex justify-center"><StoreLinks compact language={language} /></div></div></div></section>
      <section id="porque" className="bg-highlight/15 py-24"><div className="mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-2"><div><p className="text-sm font-extrabold uppercase text-primary">{t.whyEyebrow as string}</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">{t.whyTitle as string}</h2><ul className="mt-7 space-y-4">{(t.why as string[]).map(item => <li key={item} className="flex gap-3 text-ink-soft"><span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-highlight"><Check className="size-4" aria-hidden="true" /></span>{item}</li>)}</ul><a href="#descargar" className="mt-8 inline-flex items-center gap-2 font-extrabold text-primary hover:underline">{t.downloadNow as string} <ArrowRight className="size-4" aria-hidden="true" /></a></div><img src={escaneocomida2} alt={alts[3] ?? "BananaSnap"} className="mx-auto w-full max-w-48 sm:max-w-60" /></div></section>
    </main>
    <footer id="contacto" className="border-t border-border bg-background"><div className="mx-auto flex max-w-6xl flex-col gap-7 px-6 py-9 sm:flex-row sm:items-center sm:justify-between"><a href="/" aria-label="BananaSnap"><Brand /></a><nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-ink-soft"><a href="/privacidad" onClick={(event) => { event.preventDefault(); window.location.assign("/privacidad"); }} className="hover:text-primary">{t.privacy as string}</a><a href="mailto:bananasnapp@gmail.com" className="inline-flex items-center gap-1.5 hover:text-primary"><Mail className="size-4" aria-hidden="true" /> {nav[3]}</a></nav><p className="text-sm text-muted-foreground">© 2026 BananaSnap</p></div></footer>
  </div>;
}
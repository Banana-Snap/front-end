import { Languages } from "lucide-react";
import { useEffect, useState } from "react";

export type Language = "es" | "en" | "it";

const STORAGE_KEY = "bananasnap-language";
const LANGUAGE_EVENT = "bananasnap-language-change";

function systemLanguage(): Language {
  const code = navigator.language.toLowerCase().split("-")[0];
  return code === "en" || code === "it" ? code : "es";
}

export function useLanguage() {
  const [language, setLanguageState] = useState<Language>("es");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const initial = stored === "es" || stored === "en" || stored === "it" ? stored : systemLanguage();
    setLanguageState(initial);
    document.documentElement.lang = initial;

    const syncLanguage = (event: Event) => {
      const next = (event as CustomEvent<Language>).detail;
      setLanguageState(next);
      document.documentElement.lang = next;
    };
    window.addEventListener(LANGUAGE_EVENT, syncLanguage);
    return () => window.removeEventListener(LANGUAGE_EVENT, syncLanguage);
  }, []);

  const setLanguage = (next: Language) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
    setLanguageState(next);
    window.dispatchEvent(new CustomEvent<Language>(LANGUAGE_EVENT, { detail: next }));
  };

  return { language, setLanguage };
}

const labels: Record<Language, string> = {
  es: "Seleccionar idioma",
  en: "Select language",
  it: "Seleziona lingua",
};

export function LanguageSelector({ className = "" }: { className?: string }) {
  const { language, setLanguage } = useLanguage();

  return (
    <label className={`relative inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground shadow-sm ${className}`}>
      <Languages className="pointer-events-none size-4" aria-hidden="true" />
      <span className="sr-only">{labels[language]}</span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value as Language)}
        aria-label={labels[language]}
        title={labels[language]}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        <option value="es">Español</option>
        <option value="en">English</option>
        <option value="it">Italiano</option>
      </select>
      <span className="pointer-events-none absolute -bottom-1 -right-1 rounded-sm bg-primary px-1 text-[9px] font-black uppercase leading-4 text-primary-foreground">
        {language}
      </span>
    </label>
  );
}
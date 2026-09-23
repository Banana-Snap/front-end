import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import instagram_logo from "@/assets/instagram_logo.png";
import { LanguageSelector, useLanguage, type Language } from "@/lib/language";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Iniciar sesión — BananaSnap" },
      { name: "description", content: "Ingresá a tu cuenta de BananaSnap con un enlace enviado a tu correo." },
      { property: "og:title", content: "Iniciar sesión — BananaSnap" },
      { property: "og:description", content: "Accedé a tu cuenta de BananaSnap y seguí tu alimentación." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/auth" }],
  }),
});

const copy = {
  es: {
    title: "Iniciá sesión",
    subtitle: "Escribí tu correo y te enviamos un enlace para entrar. Es la misma cuenta que usás en la app.",
    email: "Correo electrónico",
    send: "Enviarme el enlace de acceso",
    sent: "Te enviamos un enlace a tu correo. Abrilo desde este dispositivo para entrar.",
    emailRequired: "Ingresá tu correo electrónico.",
    back: "Volver al inicio",
    loading: "Enviando…",
  },
  en: {
    title: "Sign in",
    subtitle: "Enter your email and we'll send you a sign-in link. It's the same account you use in the app.",
    email: "Email",
    send: "Email me the sign-in link",
    sent: "We sent a link to your email. Open it on this device to sign in.",
    emailRequired: "Enter your email address.",
    back: "Back to home",
    loading: "Sending…",
  },
  it: {
    title: "Accedi",
    subtitle: "Inserisci la tua email e ti invieremo un link per accedere. È lo stesso account dell'app.",
    email: "Email",
    send: "Inviami il link di accesso",
    sent: "Ti abbiamo inviato un link via email. Aprilo da questo dispositivo per accedere.",
    emailRequired: "Inserisci la tua email.",
    back: "Torna alla home",
    loading: "Invio…",
  },
} satisfies Record<Language, Record<string, string>>;

function AuthPage() {
  const { language } = useLanguage();
  const t = copy[language];
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.assign("/cuenta");
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) window.location.assign("/cuenta");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email) {
      setError(t.emailRequired);
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/cuenta` },
    });
    if (otpError) setError(otpError.message);
    else setNotice(t.sent);
    setBusy(false);
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-brand-soft px-6 py-16">
      <LanguageSelector className="absolute right-6 top-6" />
      <div className="w-full max-w-md rounded-md border border-border bg-card p-8 shadow-lg">
        <img src={instagram_logo} alt="" aria-hidden="true" className="mx-auto size-14 rounded-xl" />
        <h1 className="mt-5 text-center text-3xl font-black text-foreground">{t.title}</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">{t.subtitle}</p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div>
            <label htmlFor="email" className="text-sm font-bold text-foreground">{t.email}</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          {error && <p className="text-sm font-bold text-destructive">{error}</p>}
          {notice && <p className="text-sm font-bold text-primary">{notice}</p>}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Mail className="size-4" aria-hidden="true" />}
            {busy ? t.loading : t.send}
          </button>
        </form>

        <a
          href="/"
          onClick={(e) => { e.preventDefault(); window.location.assign("/"); }}
          className="mt-6 block text-center text-sm text-muted-foreground hover:text-primary"
        >
          {t.back}
        </a>
      </div>
    </main>
  );
}

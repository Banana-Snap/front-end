import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import instagram_logo from "@/assets/instagram_logo.png";
import { LanguageSelector, useLanguage, type Language } from "@/lib/language";

export const Route = createFileRoute("/_authenticated/cuenta")({
  component: AccountPage,
  head: () => ({
    meta: [
      { title: "Mi cuenta — BananaSnap" },
      { name: "description", content: "Revisá y actualizá los datos de tu cuenta de BananaSnap." },
      { property: "og:title", content: "Mi cuenta — BananaSnap" },
      { property: "og:description", content: "Tus datos personales en BananaSnap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const copy = {
  es: { title: "Hola", subtitle: "Esta es tu cuenta de BananaSnap.", name: "Tu nombre", email: "Correo", save: "Guardar", saved: "Cambios guardados.", signout: "Cerrar sesión", home: "Volver al inicio" },
  en: { title: "Hi", subtitle: "This is your BananaSnap account.", name: "Your name", email: "Email", save: "Save", saved: "Changes saved.", signout: "Sign out", home: "Back to home" },
  it: { title: "Ciao", subtitle: "Questo è il tuo account BananaSnap.", name: "Il tuo nome", email: "Email", save: "Salva", saved: "Modifiche salvate.", signout: "Esci", home: "Torna alla home" },
} satisfies Record<Language, Record<string, string>>;

function AccountPage() {
  const { language } = useLanguage();
  const t = copy[language];
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");
      const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
      setDisplayName(profile?.display_name ?? "");
    })();
  }, []);

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert({ id: user.id, display_name: displayName }, { onConflict: "id" });
      if (upsertError) setError(upsertError.message);
      else setNotice(t.saved);
    }
    setBusy(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.assign("/");
  };

  return (
    <main className="relative min-h-screen bg-brand-soft px-6 py-16">
      <LanguageSelector className="absolute right-6 top-6" />
      <div className="mx-auto w-full max-w-md rounded-md border border-border bg-card p-8 shadow-lg">
        <img src={instagram_logo} alt="" aria-hidden="true" className="size-12 rounded-xl" />
        <h1 className="mt-5 text-3xl font-black text-foreground">{t.title}{displayName ? `, ${displayName}` : ""}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t.subtitle}</p>

        <div className="mt-7 space-y-4">
          <div>
            <label htmlFor="account-name" className="text-sm font-bold text-foreground">{t.name}</label>
            <input id="account-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary" />
          </div>
          <div>
            <label htmlFor="account-email" className="text-sm font-bold text-foreground">{t.email}</label>
            <input id="account-email" value={email} readOnly
              className="mt-1.5 w-full rounded-md border border-input bg-muted px-3 py-2.5 text-sm text-muted-foreground" />
          </div>
          {error && <p className="text-sm font-bold text-destructive">{error}</p>}
          {notice && <p className="text-sm font-bold text-primary">{notice}</p>}
          <button type="button" onClick={handleSave} disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            <Save className="size-4" aria-hidden="true" /> {t.save}
          </button>
          <button type="button" onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-bold text-foreground hover:bg-accent">
            <LogOut className="size-4" aria-hidden="true" /> {t.signout}
          </button>
          <a href="/" onClick={(e) => { e.preventDefault(); window.location.assign("/"); }}
            className="block text-center text-sm text-muted-foreground hover:text-primary">{t.home}</a>
        </div>
      </div>
    </main>
  );
}

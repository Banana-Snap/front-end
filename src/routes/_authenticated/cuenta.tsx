import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { LogOut, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import instagram_logo from "@/assets/instagram_logo.png";
import { LanguageSelector, useLanguage, type Language } from "@/lib/language";
import { AccountStats } from "@/components/account-stats";
import { GlucoseCard } from "@/components/glucose-card";

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
  es: { docTitle: "Mi cuenta — BananaSnap", title: "Hola", subtitle: "Esta es tu cuenta de BananaSnap.", firstName: "Nombre", lastName: "Apellido", email: "Correo", save: "Guardar", saved: "Cambios guardados.", signout: "Cerrar sesión", home: "Volver al inicio" },
  en: { docTitle: "My account — BananaSnap", title: "Hi", subtitle: "This is your BananaSnap account.", firstName: "First name", lastName: "Last name", email: "Email", save: "Save", saved: "Changes saved.", signout: "Sign out", home: "Back to home" },
  it: { docTitle: "Il mio account — BananaSnap", title: "Ciao", subtitle: "Questo è il tuo account BananaSnap.", firstName: "Nome", lastName: "Cognome", email: "Email", save: "Salva", saved: "Modifiche salvate.", signout: "Esci", home: "Torna alla home" },
} satisfies Record<Language, Record<string, string>>;

function joinName(first?: string | null, last?: string | null) {
  return [first?.trim(), last?.trim()].filter(Boolean).join(" ");
}

function AccountPage() {
  const { language } = useLanguage();
  const t = copy[language];
  useEffect(() => { document.title = t.docTitle; }, [t.docTitle]);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  // first_name + last_name are the source of truth (same as the Flutter
  // profile); the database derives full_name from them.
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  // Name shown in the greeting: only changes once it is saved, not while typing.
  const [savedName, setSavedName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("email, full_name, first_name, last_name")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError) setError(profileError.message);
      setEmail(profile?.email ?? user.email ?? "");
      setFirstName(profile?.first_name ?? "");
      setLastName(profile?.last_name ?? "");
      setSavedName(joinName(profile?.first_name, profile?.last_name) || (profile?.full_name ?? ""));
    })();
  }, []);
  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error: updateError } = await supabase
        .from("users")
        .update({ first_name: firstName.trim(), last_name: lastName.trim(), updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (updateError) setError(updateError.message);
      else {
        setFirstName(firstName.trim());
        setLastName(lastName.trim());
        setSavedName(joinName(firstName, lastName));
        setNotice(t.saved);
      }
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
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <div className="mx-auto w-full max-w-md rounded-md border border-border bg-card p-8 shadow-lg">
          <img src={instagram_logo} alt="" aria-hidden="true" className="size-12 rounded-xl" />
          <h1 className="mt-5 text-3xl font-black text-foreground">{t.title}{savedName ? `, ${savedName}` : ""}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t.subtitle}</p>

          <form onSubmit={handleSave} className="mt-7 space-y-4">
            <div>
              <label htmlFor="account-first-name" className="text-sm font-bold text-foreground">{t.firstName}</label>
              <input id="account-first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name"
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary" />
            </div>
            <div>
              <label htmlFor="account-last-name" className="text-sm font-bold text-foreground">{t.lastName}</label>
              <input id="account-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name"
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary" />
            </div>
            <div>
              <label htmlFor="account-email" className="text-sm font-bold text-foreground">{t.email}</label>
              <input id="account-email" value={email} readOnly
                className="mt-1.5 w-full rounded-md border border-input bg-muted px-3 py-2.5 text-sm text-muted-foreground" />
            </div>
            {error && <p role="alert" className="text-sm font-bold text-destructive">{error}</p>}
            {notice && <p role="status" className="text-sm font-bold text-primary">{notice}</p>}
            <button type="submit" disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              <Save className="size-4" aria-hidden="true" /> {t.save}
            </button>
            <button type="button" onClick={handleSignOut}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-bold text-foreground hover:bg-accent">
              <LogOut className="size-4" aria-hidden="true" /> {t.signout}
            </button>
            <a href="/" className="block text-center text-sm text-muted-foreground hover:text-primary">{t.home}</a>
          </form>
        </div>
        {userId && <AccountStats userId={userId} language={language} />}
        {userId && <GlucoseCard language={language} />}
      </div>
    </main>
  );
}

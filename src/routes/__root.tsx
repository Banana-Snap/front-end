import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode } from "react";
import { ArrowLeft, Banana } from "lucide-react";
import { LanguageSelector, useLanguage } from "../lib/language";

import appCss from "../styles.css?url";
import sad_logo from '@/assets/sad_logo.svg';

function NotFoundComponent() {
  const { language } = useLanguage();
  const text = {
    es: ["Error 404", "Esta página no está en el menú", "El enlace que abriste no existe o cambió de lugar. Volvé a BananaSnap para seguir cuidando tu alimentación.", "Volver al inicio"],
    en: ["Error 404", "This page isn't on the menu", "The link you opened doesn't exist or has moved. Return to BananaSnap to keep taking care of your nutrition.", "Back to home"],
    it: ["Errore 404", "Questa pagina non è nel menu", "Il link che hai aperto non esiste o è stato spostato. Torna a BananaSnap per continuare a prenderti cura della tua alimentazione.", "Torna alla home"],
  }[language];
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-brand-soft px-6">
      <LanguageSelector className="absolute right-6 top-6" />
      <div className="max-w-lg text-center">
        <img src={sad_logo} alt="" aria-hidden="true" className="mx-auto size-16 rounded-xl" />
        <p className="mt-5 text-sm font-extrabold uppercase text-primary">{text[0]}</p>
        <h1 className="mt-2 text-4xl font-black text-foreground sm:text-6xl">{text[1]}</h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-7 text-muted-foreground">
          {text[2]}
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-extrabold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <ArrowLeft className="size-4" aria-hidden="true" /> {text[3]}
          </Link>
        </div>
      </div>
    </main>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const { language } = useLanguage();
  const text = {
    es: ["Esta página no cargó", "Algo salió mal. Podés intentar actualizar o volver al inicio.", "Intentar de nuevo", "Ir al inicio"],
    en: ["This page didn't load", "Something went wrong. Try refreshing or return home.", "Try again", "Go home"],
    it: ["Questa pagina non si è caricata", "Qualcosa è andato storto. Prova ad aggiornare o torna alla home.", "Riprova", "Vai alla home"],
  }[language];
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {text[0]}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {text[1]}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {text[2]}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {text[3]}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "BananaSnap" },
      { name: "description", content: "Nutrición simple y personalizada a partir de una foto." },
      { name: "author", content: "BananaSnap" },
      { property: "og:site_name", content: "BananaSnap" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700;800;900&display=swap",
      },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}

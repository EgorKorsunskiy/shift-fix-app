import { NavLink, Outlet } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useOnline } from "@/lib/useOnline";
import { cn } from "@/lib/cn";

const LANGUAGES = ["nl", "fr", "en"] as const;

export function Layout() {
  const { t, i18n } = useTranslation();
  const online = useOnline();

  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage ?? "en";
  }, [i18n.resolvedLanguage]);

  return (
    <div className="min-h-screen bg-slate-50 text-sm text-slate-900">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2"
      >
        {t("app.skip")}
      </a>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 md:px-6">
          <NavLink to="/" className="text-base font-semibold tracking-tight text-slate-900">
            {t("app.name")}
          </NavLink>
          <nav className="flex items-center gap-1" aria-label={t("app.name")}>
            <TopLink to="/">{t("nav.home")}</TopLink>
            <TopLink to="/workers">{t("nav.workers")}</TopLink>
          </nav>
          <div className="ml-auto flex items-center gap-1" role="group" aria-label={t("nav.language")}>
            {LANGUAGES.map((language) => {
              const active = (i18n.resolvedLanguage ?? "en").startsWith(language);
              return (
                <button
                  key={language}
                  type="button"
                  aria-pressed={active}
                  onClick={() => void i18n.changeLanguage(language)}
                  className={cn(
                    "min-h-11 min-w-11 rounded-md px-2 text-xs font-medium uppercase",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600",
                    active ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100",
                  )}
                >
                  {language}
                </button>
              );
            })}
          </div>
        </div>
      </header>
      {!online ? (
        <div className="bg-amber-50 px-4 py-2 text-center text-amber-700" role="status">
          {t("errors.offline")}
        </div>
      ) : null}
      <main id="content" className="mx-auto max-w-5xl space-y-4 px-4 py-4 md:px-6">
        <Outlet />
      </main>
    </div>
  );
}

function TopLink({ to, children }: { to: string; children: string }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        cn(
          "inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600",
          isActive ? "text-indigo-700" : "text-slate-500 hover:bg-slate-100",
        )
      }
    >
      {children}
    </NavLink>
  );
}

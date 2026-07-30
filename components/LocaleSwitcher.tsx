"use client";

import {useLocale, useTranslations} from "next-intl";
import {usePathname, useRouter} from "@/i18n/navigation";
import type {Locale} from "@/i18n/routing";

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("LocaleSwitcher");

  return (
    <div className="locale-switcher" aria-label={t("label")}>
      {(["fr", "en"] as const).map((nextLocale) => (
        <button
          type="button"
          key={nextLocale}
          className={locale === nextLocale ? "is-active" : ""}
          aria-pressed={locale === nextLocale}
          onClick={() => router.replace(pathname, {locale: nextLocale})}
        >
          {t(nextLocale)}
        </button>
      ))}
    </div>
  );
}

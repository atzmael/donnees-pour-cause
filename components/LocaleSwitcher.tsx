"use client";

import {useLocale, useTranslations} from "next-intl";
import {useRouter} from "next/navigation";

export function LocaleSwitcher() {
  const locale = useLocale();
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
          onClick={() => {
            document.cookie = `site-locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
            router.refresh();
          }}
        >
          {t(nextLocale)}
        </button>
      ))}
    </div>
  );
}

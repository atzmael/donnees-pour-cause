"use client";

import {useTranslations} from "next-intl";
import {Link} from "@/i18n/navigation";
import {LocaleSwitcher} from "@/components/LocaleSwitcher";
import { openAnalyticsPreferences } from "@/components/privacy/VercelInsightsConsent";

export function SiteFooter() {
  const t = useTranslations("Footer");
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <Link className="wordmark" href="/">
          <span className="wordmark-dot" /> données<span>/en cause</span>
        </Link>
        <a
          className="creadiv-credit"
          href="https://creadiv.fr"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("project")}
        </a>
        <Link href="/#projets">{t("back")}</Link>
      </div>
      <nav className="legal-links" aria-label={t("legalNav")}>
        <Link href="/mentions-legales">{t("legal")}</Link>
        <Link href="/confidentialite">{t("privacy")}</Link>
        <Link href="/cgu">{t("terms")}</Link>
        <a
          href="https://creativecommons.org/licenses/by/4.0/deed.fr"
          target="_blank"
          rel="license noopener noreferrer"
        >
          CC BY 4.0
        </a>
        <button type="button" onClick={openAnalyticsPreferences}>
          {t("preferences")}
        </button>
        <LocaleSwitcher />
      </nav>
    </footer>
  );
}

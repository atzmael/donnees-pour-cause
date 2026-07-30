"use client";

import {useTranslations} from "next-intl";
import Link from "next/link";
import {LocaleSwitcher} from "@/components/LocaleSwitcher";
import {Brand} from "@/components/Brand";

export function SiteFooter() {
  const t = useTranslations("Footer");
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <Brand />
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
        <LocaleSwitcher />
      </nav>
    </footer>
  );
}

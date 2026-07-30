"use client";

import Link from "next/link";
import { openAnalyticsPreferences } from "@/components/privacy/VercelInsightsConsent";

export function SiteFooter() {
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
          A creadiv project ↗
        </a>
        <Link href="/#projets">Retour aux projets ↑</Link>
      </div>
      <nav className="legal-links" aria-label="Informations légales">
        <Link href="/mentions-legales">Mentions légales</Link>
        <Link href="/confidentialite">Confidentialité</Link>
        <Link href="/cgu">CGU</Link>
        <a
          href="https://creativecommons.org/licenses/by/4.0/deed.fr"
          target="_blank"
          rel="license noopener noreferrer"
        >
          CC BY 4.0
        </a>
        <button type="button" onClick={openAnalyticsPreferences}>
          Gérer mes préférences
        </button>
      </nav>
    </footer>
  );
}

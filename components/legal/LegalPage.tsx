import type { ReactNode } from "react";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";

export function LegalPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="legal-page">
      <header className="story-header">
        <Link className="wordmark" href="/">
          <span className="wordmark-dot" /> données<span>/en cause</span>
        </Link>
        <Link className="back-link" href="/">← Retour à l’accueil</Link>
        <span>Informations légales</span>
      </header>
      <article className="legal-document">
        <p className="kicker">MISE À JOUR · 30 JUILLET 2026</p>
        <h1>{title}</h1>
        <p className="legal-lead">{description}</p>
        <div className="legal-content">{children}</div>
      </article>
      <SiteFooter />
    </main>
  );
}

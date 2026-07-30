import type { ReactNode } from "react";
import {useTranslations} from "next-intl";
import {Link} from "@/i18n/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import {Brand} from "@/components/Brand";

export function LegalPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const t = useTranslations("LegalShell");
  return (
    <main className="legal-page">
      <header className="story-header">
        <Brand />
        <Link className="back-link" href="/">{t("back")}</Link>
        <span>{t("label")}</span>
      </header>
      <article className="legal-document">
        <p className="kicker">{t("updated")}</p>
        <h1>{title}</h1>
        <p className="legal-lead">{description}</p>
        <div className="legal-content">{children}</div>
      </article>
      <SiteFooter />
    </main>
  );
}

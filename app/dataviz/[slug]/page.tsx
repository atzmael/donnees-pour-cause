import { notFound } from "next/navigation";
import type {Metadata} from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import {Brand} from "@/components/Brand";
import {ForestFiresDataviz} from "@/components/ForestFiresDataviz";
import { projects } from "../../projects";
import {getUserLocale} from "@/i18n/locale";
import {buildMetadata} from "@/lib/metadata";

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{slug: string}>;
}): Promise<Metadata> {
  const {slug} = await params;
  const project = projects.find((item) => item.slug === slug);
  if (!project) return {};
  const locale = await getUserLocale();

  return buildMetadata({
    locale,
    path: `/dataviz/${slug}`,
    title: `${project.title[locale]} — Données en cause`,
    description: project.description[locale],
    image: project.slug === "feux-de-foret" ? "/og-feux-de-foret-2026.png" : undefined,
    imageAlt:
      project.slug === "feux-de-foret"
        ? locale === "fr"
          ? "Quand la France prend feu — carte des incendies en France de 2006 à 2026"
          : "France on fire — a map of wildfires in France from 2006 to 2026"
        : undefined,
  });
}

export default async function DatavizPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = projects.find((item) => item.slug === slug);
  if (!project) notFound();
  const locale = await getUserLocale();

  if (project.slug === "feux-de-foret") {
    return <ForestFiresDataviz />;
  }

  return (
    <main className={`story story-${project.visual}`}>
      <header className="story-header">
        <Brand />
        <Link className="back-link" href="/">← Tous les projets</Link>
        <span>{project.modules.join(" + ")} · {project.format[locale]} · {project.year}</span>
      </header>

      <section className="story-intro">
        <p className="kicker">{project.tags[locale].join(" · ").toUpperCase()}</p>
        <h1>{project.title[locale]}</h1>
        <p>{project.description[locale]}</p>
      </section>

      <section className="dataviz-stage" aria-label={`Visualisation : ${project.title[locale]}`}>
        <div className="stage-grid" />
        <div className="stage-label">APERÇU DE LA DATAVIZ</div>
        <div className="big-stat"><strong>{project.stat[locale]}</strong><span>{project.statLabel[locale]}</span></div>

        {project.visual === "map" && (
          <div className="full-map"><i /><i /><i /><i /><b /><b /><span /></div>
        )}
        {project.visual === "bars" && (
          <div className="full-bars">
            {[48, 65, 57, 82, 71, 92, 77, 55, 68, 87, 74, 98].map((value, index) => (
              <i key={index} style={{ height: `${value}%` }}><span>{value}</span></i>
            ))}
          </div>
        )}
        {project.visual === "rings" && (
          <div className="full-rings"><div className="planet" /><i /><i /><i /><b /><b /><b /></div>
        )}
        {project.visual === "network" && (
          <div className="full-network">
            {Array.from({ length: 28 }, (_, index) => <i key={index} style={{ left: `${(index * 37) % 94}%`, top: `${12 + ((index * 53) % 78)}%` }} />)}
          </div>
        )}
      </section>

      <section className="story-caption">
        <p>Cette page est le canevas éditorial de la visualisation. Le composant interactif final viendra prendre toute la place dans cette scène.</p>
        <div><span>Source</span><strong>Données de démonstration</strong></div>
        <div><span>Format</span><strong>{project.format[locale]}</strong></div>
        <div><span>Type</span><strong>{project.modules.join(" + ")}</strong></div>
      </section>
      <SiteFooter />
    </main>
  );
}

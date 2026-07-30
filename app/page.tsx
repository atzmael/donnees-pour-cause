"use client";

import { useState } from "react";
import Image from "next/image";
import {useTranslations} from "next-intl";
import { Button, Card } from "@/components/ui";
import { SiteFooter } from "@/components/SiteFooter";
import {LocaleSwitcher} from "@/components/LocaleSwitcher";
import {Brand} from "@/components/Brand";
import { projects } from "./projects";

const filters = ["all", "tools", "dataviz"] as const;

export default function Home() {
  const t = useTranslations("Home");
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const visibleProjects = filter === "all"
    ? projects
    : projects.filter((project) =>
        project.modules.includes(filter === "tools" ? "Outil" : "Dataviz"),
      );

  return (
    <main>
      <header className="site-header">
        <Brand />
        <nav aria-label="Navigation principale">
          <a href="#projets">{t("projects")}</a>
          <a href="#a-propos">{t("about")}</a>
        </nav>
        <LocaleSwitcher />
      </header>

      <section className="intro">
        <div className="intro-copy">
          <p className="kicker">{t("kicker")}</p>
          <h1>{t("title1")}<br />{t("title2")}<br /><em>{t("title3")}</em></h1>
        </div>
        <div className="intro-note">
          <p>
            {t("intro")}
          </p>
          <a className="intro-explore" href="#projets">{t("explore")}</a>
        </div>
        <div className="intro-art">
          <Image
            className="hero-logo"
            src="/logo.png"
            alt="Données en cause"
            width={520}
            height={520}
            priority
          />
        </div>
      </section>

      <section className="collection" id="projets">
        <div className="collection-head">
          <div>
            <p className="kicker">{t("index")}</p>
            <h2>{t("collection")}</h2>
          </div>
          <p>{t("count", {count: visibleProjects.length})}</p>
        </div>

        <div className="filters" aria-label={t("filterLabel")}>
          {filters.map((item) => (
            <Button
              key={item}
              size="sm"
              selected={filter === item}
              onClick={() => setFilter(item)}
            >
              {t(item)}
            </Button>
          ))}
        </div>

        <div className="project-list">
          {visibleProjects.length === 0 && (
            <div className="empty-projects" role="status">
              <p className="kicker">{t("emptyKicker")}</p>
              <h3>{t("emptyTitle")}</h3>
              <p>{t("emptyText")}</p>
            </div>
          )}
          {visibleProjects.map((project, index) => (
            <Card className="project-row" href={`/dataviz/${project.slug}`} interactive key={project.slug}>
              <span className="project-index">{String(index + 1).padStart(2, "0")}</span>
              <div className={`project-preview preview-${project.visual}`}>
                <div className="preview-content">
                  {project.visual === "map" && <><i /><i /><i /><b /></>}
                  {project.visual === "bars" && [42, 67, 51, 86, 72, 96].map((value) => <i key={value} style={{ height: `${value}%` }} />)}
                  {project.visual === "rings" && <><i /><i /><i /><b /></>}
                  {project.visual === "network" && <><i /><i /><i /><i /><b /><b /></>}
                </div>
              </div>
              <div className="project-copy">
                <div className="project-modules" aria-label={`Type : ${project.modules.join(" et ")}`}>
                  {project.modules.map((module) => <span key={module}>{module}</span>)}
                </div>
                <div className="project-meta"><span>{project.format}</span><span>{project.year}</span></div>
                <h3>{project.title}</h3>
                <p>{project.description}</p>
                <div className="project-tags">{project.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
              </div>
              <span className="project-arrow">↗</span>
            </Card>
          ))}
        </div>
      </section>

      <section className="manifesto" id="a-propos">
        <p className="kicker">{t("aboutKicker")}</p>
        <p className="manifesto-text">
          {t("manifestoStart")}
          <em>{t("manifestoEmphasis")}</em>{t("manifestoEnd")}
        </p>
        <div className="manifesto-details">
          <p>Canvas · WebGL · Three.js · D3.js · Mapbox · APIs</p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

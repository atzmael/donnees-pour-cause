"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { projects } from "./projects";

const filters = ["Toutes", "Cartographie", "Charts", "Canvas", "3D"] as const;

export default function Home() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("Toutes");
  const visibleProjects = filter === "Toutes"
    ? projects
    : projects.filter((project) => project.format === filter);

  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="Index data, accueil">
          <span className="wordmark-dot" /> index<span>/data</span>
        </a>
        <nav aria-label="Navigation principale">
          <a href="#projets">Projets</a>
          <a href="#a-propos">À propos</a>
        </nav>
        <div className="issue">Paris · 2026</div>
      </header>

      <section className="intro">
        <div className="intro-number">N° 01</div>
        <div className="intro-copy">
          <p className="kicker">COLLECTION DE DATAVISUALISATIONS</p>
          <h1>Des données,<br />des formes,<br /><em>des histoires.</em></h1>
        </div>
        <div className="intro-note">
          <p>
            Un espace d’exploration où chaque page transforme
            un jeu de données en expérience visuelle singulière.
          </p>
          <span>↓ Explorer la collection</span>
        </div>
        <div className="intro-art" aria-hidden="true">
          <div className="sun" />
          <div className="mesh mesh-a" />
          <div className="mesh mesh-b" />
          <i className="orbit-point p1" /><i className="orbit-point p2" />
        </div>
      </section>

      <section className="collection" id="projets">
        <div className="collection-head">
          <div>
            <p className="kicker">INDEX DES PROJETS</p>
            <h2>La collection</h2>
          </div>
          <p>{String(visibleProjects.length).padStart(2, "0")} projets</p>
        </div>

        <div className="filters" aria-label="Filtrer les projets">
          {filters.map((item) => (
            <Button
              key={item}
              size="sm"
              selected={filter === item}
              onClick={() => setFilter(item)}
            >
              {item}
            </Button>
          ))}
        </div>

        <div className="project-list">
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
        <p className="kicker">À PROPOS DE L’INDEX</p>
        <p className="manifesto-text">
          Chaque projet part d’une question et choisit
          <em> la forme juste</em> pour y répondre.
        </p>
        <div className="manifesto-details">
          <p>Canvas · WebGL · Three.js · D3.js · Mapbox · APIs</p>
          <p>Conçu et développé à Paris.</p>
        </div>
      </section>

      <footer>
        <a className="wordmark" href="/"><span className="wordmark-dot" /> index<span>/data</span></a>
        <a
          className="creadiv-credit"
          href="https://creadiv.fr"
          target="_blank"
          rel="noopener noreferrer"
        >
          A creadiv project ↗
        </a>
        <a href="#projets">Retour en haut ↑</a>
      </footer>
    </main>
  );
}

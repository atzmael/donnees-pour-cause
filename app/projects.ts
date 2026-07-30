export type Project = {
  slug: string;
  title: string;
  description: string;
  format: "Cartographie" | "Charts" | "Canvas" | "3D";
  modules: ("Outil" | "Dataviz")[];
  year: string;
  tags: string[];
  visual: "map" | "bars" | "rings" | "network";
  stat: string;
  statLabel: string;
};

export const projects: Project[] = [
  {
    slug: "atlas-des-mobilites",
    title: "Atlas des mobilités",
    description: "Comment la métropole se déplace-t-elle au fil d’une journée ?",
    format: "Cartographie",
    modules: ["Outil", "Dataviz"],
    year: "2026",
    tags: ["Open data", "Temps réel"],
    visual: "map",
    stat: "4,2 M",
    statLabel: "déplacements observés",
  },
  {
    slug: "pouls-electrique",
    title: "Le pouls électrique",
    description: "Une semaine dans la consommation électrique française.",
    format: "Charts",
    modules: ["Dataviz"],
    year: "2026",
    tags: ["RTE", "Séries temporelles"],
    visual: "bars",
    stat: "48,7 GW",
    statLabel: "consommation moyenne",
  },
  {
    slug: "canopies-urbaines",
    title: "Canopées urbaines",
    description: "Mesurer l’ombre, la fraîcheur et la place du végétal en ville.",
    format: "Canvas",
    modules: ["Outil", "Dataviz"],
    year: "2025",
    tags: ["Climat", "Imagerie"],
    visual: "network",
    stat: "31 %",
    statLabel: "de couverture végétale",
  },
  {
    slug: "objets-en-orbite",
    title: "Objets en orbite",
    description: "Soixante-dix ans de satellites autour de la Terre.",
    format: "3D",
    modules: ["Outil"],
    year: "2025",
    tags: ["WebGL", "Espace"],
    visual: "rings",
    stat: "13 632",
    statLabel: "objets actuellement suivis",
  },
];

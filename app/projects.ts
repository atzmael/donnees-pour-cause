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
    slug: "feux-de-foret",
    title: "La France en feu",
    description:
      "Comment les incendies et les surfaces brûlées ont-ils évolué avec les températures depuis 2006 ?",
    format: "Cartographie",
    modules: ["Dataviz"],
    year: "2026",
    tags: ["Feux de forêt", "Climat", "Données publiques"],
    visual: "map",
    stat: "19 ans",
    statLabel: "d’évolution à explorer",
  },
];

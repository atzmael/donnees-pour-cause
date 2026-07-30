export type Project = {
  slug: string;
  title: string;
  description: string;
  format: "Cartographie" | "Charts" | "Canvas" | "3D";
  modules: ("Outil" | "Dataviz")[];
  year: string;
  tags: string[];
  visual: "map" | "bars" | "rings" | "network";
  socialImage?: string;
  stat: string;
  statLabel: string;
};

export const projects: Project[] = [
  {
    slug: "feux-de-foret",
    title: "La France en feu",
    description:
      "Comment les incendies et les surfaces brûlées ont-ils évolué en France depuis 2006 ?",
    format: "Cartographie",
    modules: ["Dataviz"],
    year: "2026",
    tags: ["Feux de forêt", "Climat", "Données publiques"],
    visual: "map",
    socialImage: "/og-feux-de-foret-2026.png",
    stat: "21 ans",
    statLabel: "d’évolution à explorer",
  },
];

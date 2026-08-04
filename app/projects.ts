export type Project = {
  slug: string;
  title: Record<"fr" | "en", string>;
  description: Record<"fr" | "en", string>;
  format: Record<"fr" | "en", "Cartographie" | "Mapping" | "Charts" | "Canvas" | "3D">;
  modules: ("Outil" | "Dataviz")[];
  year: string;
  tags: Record<"fr" | "en", string[]>;
  visual: "map" | "bars" | "rings" | "network";
  socialImage?: string;
  stat: Record<"fr" | "en", string>;
  statLabel: Record<"fr" | "en", string>;
};

export const projects: Project[] = [
  {
    slug: "feux-de-foret",
    title: {fr: "La France en feu", en: "France on fire"},
    description: {
      fr: "Comment les incendies et les surfaces brûlées ont-ils évolué en France depuis 2006 ?",
      en: "How have wildfires and burned areas changed across France since 2006?",
    },
    format: {fr: "Cartographie", en: "Mapping"},
    modules: ["Dataviz"],
    year: "2026",
    tags: {
      fr: ["Feux de forêt", "Climat", "Données publiques"],
      en: ["Wildfires", "Climate", "Open data"],
    },
    visual: "map",
    socialImage: "/og-feux-de-foret-2026.png",
    stat: {fr: "21 ans", en: "21 years"},
    statLabel: {fr: "d’évolution à explorer", en: "of change to explore"},
  },
  {
    slug: "veille-feu",
    title: {fr: "Veille feu", en: "Fire watch"},
    description: {
      fr: "Observer les détections thermiques, suivre leur évolution et comparer le territoire avant et après le feu.",
      en: "Observe thermal detections, follow their evolution and compare the territory before and after fire.",
    },
    format: {fr: "Cartographie", en: "Mapping"},
    modules: ["Outil"],
    year: "2026",
    tags: {
      fr: ["Satellite", "Feux de forêt", "Quasi temps réel"],
      en: ["Satellite", "Wildfires", "Near real time"],
    },
    visual: "map",
    stat: {fr: "24 h", en: "24 h"},
    statLabel: {fr: "d’observations à rejouer", en: "of observations to replay"},
  },
];

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

export const projects: Project[] = [];

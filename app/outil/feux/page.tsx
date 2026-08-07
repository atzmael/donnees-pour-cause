import type {Metadata} from "next";
import {FireObservatory} from "@/components/FireObservatory";
import {getUserLocale} from "@/i18n/locale";
import {buildMetadata} from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUserLocale();
  return buildMetadata({
    locale,
    path: "/outil/feux",
    title: "Veille feu : observatoire satellite",
    description: "Un prototype pour repérer les feux probables, suivre leurs observations et consulter la dernière vue Sentinel-2 disponible.",
  });
}

export default function FireObservatoryPage() {
  return <FireObservatory />;
}

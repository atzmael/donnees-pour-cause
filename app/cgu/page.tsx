import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import {getUserLocale} from "@/i18n/locale";
import {buildMetadata} from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUserLocale();
  return buildMetadata({
    locale,
    path: "/cgu",
    title: locale === "fr" ? "Conditions générales d’utilisation — Données en cause" : "Terms of use — Données en cause",
    description:
      locale === "fr"
        ? "Conditions encadrant l’accès et l’utilisation du site éditorial Données en cause."
        : "Terms governing access to and use of the Données en cause editorial website.",
  });
}

export default async function CguPage() {
  const locale = await getUserLocale();
  if (locale === "en") {
    return (
      <LegalPage title="Terms of use" description="These terms govern access to and use of the Données en cause editorial website.">
        <section><h2>1. Purpose</h2><p>Données en cause is an editorial directory of tools and visualizations designed to illuminate contemporary issues through documented data. It is neither a chart-creation platform nor a commercial service.</p></section>
        <section><h2>2. Acceptance</h2><p>Browsing the website implies acceptance of these terms. Visitors who do not accept them must stop using the website.</p></section>
        <section><h2>3. Website access</h2><p>Access is free of charge, excluding the visitor’s connection costs. The publisher may temporarily interrupt all or part of the website for maintenance, security, updates or force majeure.</p></section>
        <section><h2>4. Editorial scope</h2><p>Tools and visualizations are provided for information, understanding and debate. They rely on sources available at publication time and may involve limitations, approximations or methodological choices explained on each page.</p><p>The content is not legal, medical, financial or professional advice and must not be used as the sole basis for such decisions.</p></section>
        <section><h2>5. Permitted use</h2><p>Visitors agree not to disrupt the website, bypass security measures, attempt unauthorized access, perform abusive bulk extraction or use the website for unlawful purposes.</p></section>
        <section><h2>6. Licence and attribution</h2><p>Unless otherwise stated, original editorial content, tools and visualizations are available under the Creative Commons Attribution 4.0 International licence. Reuse must credit “Données en cause — Maël Maltete”, the source, the licence and any changes made.</p><p>Third-party content, trademarks and data remain subject to their respective licences. The website’s CC BY 4.0 licence grants no rights over such material.</p></section>
        <section><h2>7. External links</h2><p>The website may link to external sources or services. The publisher does not control their availability, security or content and cannot be held responsible for changes to them.</p></section>
        <section><h2>8. Liability</h2><p>The publisher takes reasonable care over content quality but does not guarantee completeness, permanent currency or the absence of errors. Errors may be reported to <a href="mailto:creadiv.tech+dpc@gmail.com">creadiv.tech+dpc@gmail.com</a>.</p></section>
        <section><h2>9. Changes to the terms</h2><p>These terms may be adapted as the website or applicable law changes. The version in force is the one published online on the consultation date.</p></section>
        <section><h2>10. Governing law</h2><p>These terms are governed by French law. Any dispute should first be addressed amicably with the publisher, without depriving visitors of any mandatory jurisdiction rules that protect them.</p></section>
      </LegalPage>
    );
  }
  return (
    <LegalPage
      title="Conditions générales d’utilisation"
      description="Les présentes conditions encadrent l’accès et l’utilisation du site éditorial Données en cause."
    >
      <section>
        <h2>1. Objet</h2>
        <p>
          Données en cause est un répertoire éditorial d’outils et de
          visualisations destiné à éclairer des enjeux contemporains à partir de
          données documentées. Le site ne constitue ni une plateforme de création
          de graphiques, ni un service marchand.
        </p>
      </section>

      <section>
        <h2>2. Acceptation</h2>
        <p>
          La consultation du site implique l’acceptation des présentes conditions.
          Si un visiteur ne les accepte pas, il doit cesser d’utiliser le site.
        </p>
      </section>

      <section>
        <h2>3. Accès au site</h2>
        <p>
          L’accès est libre et gratuit, hors coûts de connexion supportés par le
          visiteur. L’éditeur peut interrompre temporairement tout ou partie du
          site pour maintenance, sécurité, mise à jour ou en cas de force majeure.
        </p>
      </section>

      <section>
        <h2>4. Portée éditoriale</h2>
        <p>
          Les outils et visualisations sont proposés à des fins d’information,
          de compréhension et de débat. Ils reposent sur les sources disponibles
          à leur date de publication et peuvent comporter des limites,
          approximations ou choix méthodologiques explicités sur chaque page.
        </p>
        <p>
          Les contenus ne constituent pas un conseil juridique, médical,
          financier ou professionnel et ne doivent pas être utilisés comme seul
          fondement d’une décision de cette nature.
        </p>
      </section>

      <section>
        <h2>5. Utilisation autorisée</h2>
        <p>
          Le visiteur s’engage à ne pas perturber le fonctionnement du site,
          contourner ses mesures de sécurité, tenter un accès non autorisé,
          extraire massivement ses contenus de manière abusive ou utiliser le
          site à des fins illicites.
        </p>
      </section>

      <section>
        <h2>6. Licence et attribution</h2>
        <p>
          Sauf mention contraire, les contenus éditoriaux, outils et
          visualisations originales sont disponibles sous licence Creative
          Commons Attribution 4.0 International. Toute réutilisation doit
          mentionner « Données en cause — Maël Maltete », la source, la licence
          et les modifications réalisées.
        </p>
        <p>
          Les contenus, marques et données de tiers restent soumis à leurs
          licences respectives. La licence CC BY 4.0 du site ne transfère aucun
          droit sur ces éléments.
        </p>
      </section>

      <section>
        <h2>7. Liens externes</h2>
        <p>
          Le site peut renvoyer vers des sources ou services externes. L’éditeur
          ne contrôle pas leur disponibilité, leur sécurité ni leur contenu et
          ne peut être tenu responsable de leurs évolutions.
        </p>
      </section>

      <section>
        <h2>8. Responsabilité</h2>
        <p>
          L’éditeur apporte un soin raisonnable à la qualité des contenus mais ne
          garantit pas leur exhaustivité, leur actualité permanente ni l’absence
          d’erreur. Toute erreur peut être signalée à{" "}
          <a href="mailto:creadiv.tech+dpc@gmail.com">creadiv.tech+dpc@gmail.com</a>.
        </p>
      </section>

      <section>
        <h2>9. Modification des conditions</h2>
        <p>
          Les présentes conditions peuvent être adaptées aux évolutions du site
          ou du droit applicable. La version en vigueur est celle publiée en
          ligne à la date de consultation.
        </p>
      </section>

      <section>
        <h2>10. Droit applicable</h2>
        <p>
          Les présentes conditions sont soumises au droit français. Tout
          différend sera recherché en priorité par voie amiable auprès de
          l’éditeur, sans priver le visiteur des règles impératives de compétence
          dont il bénéficie.
        </p>
      </section>
    </LegalPage>
  );
}

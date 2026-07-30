import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Conditions générales d’utilisation — Données en cause",
};

export default function CguPage() {
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

import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Mentions légales — Données en cause",
};

export default function MentionsLegalesPage() {
  return (
    <LegalPage
      title="Mentions légales"
      description="Informations relatives à l’éditeur, à la publication et à l’hébergement du site Données en cause."
    >
      <section>
        <h2>Éditeur du site</h2>
        <p>
          Le site <strong>Données en cause</strong> est édité par Maël Maltete,
          entrepreneur individuel (EI) sous le régime de la micro-entreprise.
        </p>
        <dl>
          <div><dt>Adresse</dt><dd>73 rue de Malnoue, 93160 Noisy-le-Grand, France</dd></div>
          <div><dt>Immatriculation</dt><dd>RCS de Bobigny — Bobigny A 953 748 159</dd></div>
          <div><dt>Courriel</dt><dd><a href="mailto:creadiv.tech+dpc@gmail.com">creadiv.tech+dpc@gmail.com</a></dd></div>
        </dl>
        <p>Le contact avec l’éditeur s’effectue exclusivement par courrier électronique.</p>
      </section>

      <section>
        <h2>Direction de la publication</h2>
        <p>Le directeur de la publication est Maël Maltete.</p>
      </section>

      <section>
        <h2>Hébergement</h2>
        <p>Le site est hébergé par :</p>
        <address>
          Vercel Inc.<br />
          440 N Barranca Avenue #4133<br />
          Covina, CA 91723<br />
          États-Unis<br />
          Téléphone : +1 559-288-7060
        </address>
        <p>
          Site de l’hébergeur :{" "}
          <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">
            vercel.com
          </a>
        </p>
      </section>

      <section>
        <h2>Propriété intellectuelle et licence</h2>
        <p>
          Sauf indication contraire, les textes, analyses et visualisations
          originales publiés sur Données en cause sont proposés sous licence{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/deed.fr"
            target="_blank"
            rel="license noopener noreferrer"
          >
            Creative Commons Attribution 4.0 International (CC BY 4.0)
          </a>.
        </p>
        <p>
          Toute réutilisation doit attribuer clairement l’œuvre à « Données en
          cause — Maël Maltete », indiquer la source, fournir un lien vers la
          licence et signaler les modifications éventuelles.
        </p>
        <p>
          Cette licence ne s’applique pas aux marques, aux contenus de tiers, aux
          jeux de données externes ni aux éléments signalés sous une autre
          licence. Le code source n’est couvert que par la licence éventuellement
          indiquée dans son dépôt.
        </p>
      </section>

      <section>
        <h2>Sources et crédits</h2>
        <p>
          Les sources propres à chaque visualisation sont indiquées sur sa page.
          Les droits et conditions de réutilisation des producteurs de données
          demeurent applicables.
        </p>
        <p>
          Conception et développement :{" "}
          <a href="https://creadiv.fr" target="_blank" rel="noopener noreferrer">
            Creadiv
          </a>.
        </p>
      </section>
    </LegalPage>
  );
}

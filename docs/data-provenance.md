# Provenance des données — feux de forêt

## Incendies consolidés

Les années antérieures à l’année courante sont importées depuis l’export CSV de la
[BDIFF](https://bdiff.agriculture.gouv.fr/incendies). La surface source, exprimée en
mètres carrés, est convertie en hectares. Ces données sont présentées comme consolidées.

## Année courante

L’année courante est reconstruite depuis les périmètres brûlés MODIS publiés par
[EFFIS](https://forest-fire.emergency.copernicus.eu/applications/data-and-services).
Seuls les enregistrements de France métropolitaine dont `FIREDATE` appartient à
l’année courante sont retenus. La donnée est provisoire : un périmètre peut être
ajouté, corrigé ou fusionné après sa première détection.

Le champ `effisCutoffAt` du fichier généré correspond à la date la plus récente trouvée
dans `LASTUPDATE`, ou à défaut dans `FINALDATE` puis `FIREDATE`. `updatedAt` indique
uniquement l’heure à laquelle l’import a été exécuté.

## Évacuations et déplacements documentés

La série versionnée dans `public/data/human-impact.json` reprend les déplacements internes
provoqués par les feux de forêt et documentés par l’IDMC. Elle inclut notamment les
évacuations temporaires lorsqu’elles sont recensées par l’organisme.

Ces valeurs comptent des mouvements, pas nécessairement des personnes uniques : une même
personne peut être déplacée plusieurs fois. La couverture n’est pas exhaustive. Une année
absente est donc affichée « Pas de données » et jamais interprétée comme zéro. La série est
maintenue séparément de l’import horaire des incendies afin de préserver les bilans validés.

## Fréquence

Le workflow `update-forest-fire-data.yml` relance l’import chaque heure et ne crée un
commit sur `preprod` que si le fichier produit a réellement changé.

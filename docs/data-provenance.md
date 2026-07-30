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

## Jours de canicule

La série versionnée dans `public/data/heatwave-days.json` compte les jours appartenant à une
vague de chaleur nationale selon l’indicateur thermique national de Météo-France. Chaque
valeur est reliée à une publication officielle. Elle est maintenue séparément du script
d’import afin qu’une modification soit lisible et vérifiable dans l’historique Git.

La comparaison avec les surfaces brûlées et le nombre de feux met en évidence une
corrélation temporelle, pas une causalité. Les incendies dépendent aussi notamment de
la sécheresse des sols et de la végétation, du vent, de l’humidité, des départs de feu
et des politiques de prévention.

## Fréquence

Le workflow `update-forest-fire-data.yml` relance l’import chaque heure et ne crée un
commit sur `preprod` que si le fichier produit a réellement changé.

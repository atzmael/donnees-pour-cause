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

## Population potentiellement exposée

La série versionnée dans `public/data/population-exposure.json` est calculée en croisant les
périmètres brûlés EFFIS MODIS avec les carreaux de population 2021 de 1 km publiés par
l’Insee. Un habitant est compté lorsque le centre de son carreau de résidence se trouve dans
un périmètre brûlé. Il n’est compté qu’une fois par année, même si plusieurs feux recouvrent
le même carreau.

Cet indicateur estime une exposition géographique potentielle. Il ne signifie pas que toutes
les personnes ont été directement atteintes, évacuées ou exposées aux fumées. Les évacuations
documentées par l’IDMC sont conservées séparément dans le détail des années disponibles.
La couverture EFFIS utilisée commence en 2016 ; les années antérieures sont affichées sans
donnée plutôt qu’avec une valeur nulle.

## Fréquence

Le workflow `update-forest-fire-data.yml` relance l’import chaque heure et ne crée un
commit sur `preprod` que si le fichier produit a réellement changé.

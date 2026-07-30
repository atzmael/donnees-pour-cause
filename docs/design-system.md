# Mini design system

Le système volontairement réduit repose sur trois éléments : les couleurs
sémantiques, `Button` et `Card`.

## Couleurs

Les composants utilisent uniquement les variables définies dans
`app/globals.css`.

| Rôle | Variable | Valeur |
| --- | --- | --- |
| Primary | `--color-primary` | `#2E7D32` |
| Primary hover | `--color-primary-hover` | `#1B5E20` |
| Primary light | `--color-primary-light` | `#E8F5E9` |
| Secondary | `--color-secondary` | `#2E9F74` |
| Accent | `--color-accent` | `#8BC34A` |
| Text | `--color-text` | `#1F2937` |
| Text muted | `--color-text-muted` | `#6B7280` |
| Background | `--color-background` | `#FAFBF8` |
| Surface | `--color-surface` | `#FFFFFF` |
| Border | `--color-border` | `#E5E7EB` |

Les nouvelles interfaces ne doivent pas ajouter de couleurs hexadécimales
directement dans les composants. Une nouvelle couleur doit d’abord recevoir un
rôle explicite dans les tokens.

## Button

```tsx
import { Button } from "@/components/ui";

<Button variant="primary">Ouvrir</Button>
<Button variant="outline" size="sm">Filtrer</Button>
<Button variant="ghost">Annuler</Button>
```

Variantes : `primary`, `outline`, `ghost`.
Tailles : `sm`, `md`.
L’état `selected` est prévu pour les filtres et sélecteurs.

## Card

```tsx
import { Card } from "@/components/ui";

<Card>Contenu statique</Card>
<Card href="/dataviz/projet" interactive>
  Projet cliquable
</Card>
```

Une carte interactive doit toujours recevoir `interactive`. Une carte avec
`href` est rendue comme un lien accessible ; sans `href`, elle devient un
`article`.

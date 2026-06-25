# Mes Brouillons — Web

Site Astro statique. Vulgarisation scientifique : comprendre les mécanismes du vivant via des modèles et simulations interactives.

## Stack

- **Framework** : Astro (statique, pas de SSR)
- **JS simulations** : vanilla canvas, pas de librairie
- **Équations** : KaTeX server-side (`import katex from 'katex'` dans le frontmatter)
- **Fonts** : Inter (Google Fonts) + Georgia (serif système)
- **Déploiement** : `npm run build` → `dist/`

## Structure

```
src/
├── pages/
│   ├── index.astro                          # Page de garde (liste éditoriale)
│   └── simulations/
│       └── le-pari-de-la-sexualite.astro    # Template de référence
├── components/
│   └── PopulationSim.astro                  # Composant simulation (réutilisable)
├── layouts/
│   └── Layout.astro                         # Header / footer / head commun
└── styles/
    └── global.css                           # Variables CSS + styles de base
```

## Ajouter un article

1. Créer `src/pages/simulations/[slug].astro` en copiant `le-pari-de-la-sexualite.astro`
2. Créer `src/components/[NomSim].astro` en copiant `PopulationSim.astro`
3. Ajouter l'entrée dans `src/pages/index.astro` (section catégorie concernée)

## Page de garde (`index.astro`)

Liste éditoriale, zéro JS. Structure :

```
intro (titre + tagline + phrase)
catégorie ÉVOLUTION
  └── article cliquable (titre + description + flèche)
catégorie COLLECTIF   (vide pour l'instant)
catégorie ÉCOLOGIE    (vide)
catégorie INFORMATION (vide)
```

Pour ajouter un article dans une catégorie :

```astro
<li class="article-list__item">
  <a href="/simulations/[slug]" class="article-link">
    <div class="article-link__body">
      <span class="article-link__title">Titre de l'article</span>
      <span class="article-link__desc">Une phrase de description.</span>
    </div>
    <span class="article-link__arrow">→</span>
  </a>
</li>
```

## Template article (`le-pari-de-la-sexualite.astro`)

Structure fixe en 4 sections séparées par de l'espace (pas de labels visibles) :

### 1. Problème / Contexte
Texte pur. 2-3 paragraphes : la question biologique, pourquoi c'est intéressant. Finir par le lien Substack.

```astro
<a class="ext-link" href="https://mesbrouillons.substack.com/p/[slug]" target="_blank" rel="noopener">
  Lire l'article →
</a>
```

### 2. Simulation
Juste le composant, rien d'autre.

```astro
<section class="section section--sim">
  <PopulationSim />
</section>
```

### 3. Interprétation
Juste après la simulation. Trois sous-sections (h2) :
- **Lire la simulation** — comment décoder la représentation visuelle choisie
- **Ce que montre la simulation** — le mécanisme illustré
- **Effet des paramètres** — ce que chaque slider change et pourquoi

### 4. Modèle
Sous-sections :
- **[Nom du modèle]** — intro historique/conceptuelle, formulation classique avec équation
- **Application au [sujet]** — comment on l'adapte, équations spécifiques, bloc notation
- **Visualisation** — comment la représentation est construite
- **Paramètres** — tableau complet
- **Limites** — ce que le modèle ne capture pas

## KaTeX (équations)

Rendu server-side dans le frontmatter. Pas de CDN JS, juste le CSS.

```astro
---
import katex from 'katex';

const d = (tex: string) => katex.renderToString(tex, { displayMode: true,  throwOnError: false });
const m = (tex: string) => katex.renderToString(tex, { displayMode: false, throwOnError: false });

const eq1 = d(String.raw`\frac{a}{b} = c`);
const iX  = m('x^2');
---

<Fragment slot="head">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css" />
</Fragment>

<!-- Équation display (centrée) -->
<Fragment set:html={eq1} />

<!-- Inline dans un paragraphe -->
<p>La variable <Fragment set:html={iX} /> représente...</p>
```

**Règle importante** : ne jamais écrire de LaTeX directement dans le HTML Astro (`$$...$$`).
Astro interprète `<`, `{` et `}` comme du JSX et plante. Toujours passer par `String.raw` + `set:html`.

## Composant simulation (`PopulationSim.astro`)

Accepte une prop `preview` :
- `preview={false}` (défaut) → simulation complète avec play/pause et sliders
- `preview={true}` → animation en boucle uniquement, sans contrôles

```astro
<PopulationSim />               <!-- page dédiée -->
<PopulationSim preview={true} /> <!-- aperçu sur d'autres pages -->
```

**Multi-instance** : le composant est instance-safe. Plusieurs `<PopulationSim>` sur la même page fonctionnent indépendamment (pas d'ID globaux, querySelectorAll sur le container).

Pour créer un nouveau composant de simulation :
- Copier `PopulationSim.astro`
- Remplacer la logique de simulation dans la fonction `initInstance(container)`
- Garder la même structure HTML (`.psim`, `.psim__cv-a`, `.psim__cv-s`, etc.) ou adapter

## Charte graphique

```css
--color-black:      #0a0a0a
--color-white:      #ffffff
--color-red:        #d62828   /* accent uniquement */
--color-grey-light: #f2f2f2   /* fonds, bordures */
--color-grey-mid:   #b3b3b3   /* texte secondaire, labels */
--color-grey-dark:  #4a4a4a   /* corps de texte */

--font-serif: Georgia          /* titres h1/h2/h3, titres d'articles */
--font-sans:  Inter            /* UI, labels, navigation, corps */
--font-mono:  Courier New      /* code, équations pre */
```

Typo globale : `h1` 1.75rem · `h2` 1.25rem · corps 17px · ligne 1.6–1.8.

Différencier les courbes par style de ligne (pointillés, marqueurs) — jamais par couleur.

## Layout des pages articles

```css
.page {
  max-width: 840px;   /* plus large que le container standard (720px) */
  margin: 0 auto;
  padding: 0 1.5rem 6rem;
}

.section {
  margin-bottom: 4rem;  /* séparation par espace, pas par labels */
}

.section h2 {
  /* sous-titres de section : sans-serif uppercase petit */
  font-family: var(--font-sans);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-grey-dark);
  margin: 2.5rem 0 0.85rem;
}
```

## Layout du head (slot)

`Layout.astro` expose `<slot name="head" />` pour injecter des ressources page par page (KaTeX CSS, etc.) sans les charger partout.

```astro
<Layout title="...">
  <Fragment slot="head">
    <!-- ressources spécifiques à cette page -->
  </Fragment>
  <!-- contenu -->
</Layout>
```

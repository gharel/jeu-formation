# AGENTS.md : mini-jeux Skazy Formation

Consignes pour les agents de code (Claude Code, Codex, Copilot…) et pour les humains qui travaillent sur ce dépôt.

## Le projet

Un site statique de mini-jeux **projetés au vidéoprojecteur** pour casser la monotonie des formations sur ordinateur.

- L'animateur prépare le contenu avant la séance (mots, questions, défis, captures d'écran).
- Les participants répondent à l'oral, et l'animateur saisit ou valide leurs réponses.
- Chaque jeu a un écran d'accueil où l'on saisit les prénoms, avec une roue pour désigner quelqu'un.
- Il n'y a ni serveur ni framework ni étape de build : HTML, CSS et JavaScript natifs (ES modules).
- Le contenu de l'animateur est gardé dans le navigateur : localStorage pour le texte, IndexedDB pour les images.
- La charte graphique est celle de Skazy Formation (https://formation.skazy.nc).

## Commandes

| Commande                          | Rôle                                                                         |
| --------------------------------- | ---------------------------------------------------------------------------- |
| `npm install`                     | Installe les outils de développement **et les hooks git** (script `prepare`) |
| `npx playwright install chromium` | Installe le navigateur des tests e2e (une seule fois)                        |
| `npm run dev`                     | Serveur local sur http://localhost:4173                                      |
| `npm run check`                   | Lint + format + validation HTML + tests unitaires (**avant chaque commit**)  |
| `npm run test:e2e`                | Tests Playwright de bout en bout + accessibilité axe (**avant chaque push**) |
| `npm test`                        | Tests unitaires Vitest seuls                                                 |
| `npm run format`                  | Formate tout le code avec Prettier                                           |

Les pages ne s'ouvrent pas en double-cliquant sur le fichier (`file://`), car les ES modules exigent un serveur. Utiliser `npm run dev`.

## Structure

```
index.html                     Accueil : une carte par jeu (générée depuis assets/js/jeux.js)
assets/css/charte.css          Couleurs, police Georama, couleur de chaque jeu (data-couleur)
assets/css/base.css            Mise en page, bandeau, boutons, formulaires, dialogues
assets/css/composants.css      Accueil, participants, éditeur, roue, chrono, paliers, podium
assets/js/jeux.js              Liste des jeux (slug, titre, icône, couleur, accroche, durée)
assets/js/commun/
  cadre-jeu.js                 monterJeu() : accueil du jeu, préparation, partie, fin
  editeur-contenu.js           Éditeur généré à partir du schéma de contenu du jeu
  contenu.js                   Schéma : valeurs par défaut, nettoyage, validation, import/export
  participants.js              Liste des prénoms partagée entre les jeux
  roue.js · dialogues.js       Roue aléatoire (tirage équitable) et fenêtres de dialogue
  chrono.js · paliers.js       Compte à rebours ; chiffres 5 4 3 2 1 qui s'éteignent
  scores.js · points.js        Points de la partie ; bouton « Attribuer le point »
  stockage.js · images.js      Seuls accès à localStorage et à IndexedDB
  hasard.js · nombres.js       Hasard reproductible (?graine=) ; nombres au format français
  sons.js · ui.js              Bips Web Audio ; el(), raccourcis clavier, typographie
jeux/<slug>/
  index.html                   Page du jeu (même gabarit pour tous)
  jeu.js                       Affichage et déroulé : appelle monterJeu({ slug, schema, exemple, regles, demarrer })
  logique.js                   Règles du jeu, en fonctions pures, sans accès à la page
  exemple.js                   Schéma du contenu + contenu d'exemple prêt à jouer
  jeu.css                      Styles propres au jeu
tests/unit/                    Vitest (jsdom) : logique des jeux et modules communs
tests/e2e/                     Playwright : parcours complets, accessibilité, aucune erreur console
```

## Conventions de code

- **En français** : noms de fonctions et de variables métier (`lancerPartie`, `tirage`, `participants`), commentaires, textes affichés et messages de commit.
- **Pas de dépendance à l'exécution.** `package.json` ne contient que des outils de développement. Pas de CDN, pas de framework. La police est hébergée dans `assets/fonts/`.
- **La logique est séparée de l'affichage.** Les règles vont dans `logique.js`, en fonctions pures testées unitairement. `jeu.js` ne fait que construire la page et réagir aux clics.
- **Sécurité.** Tout texte saisi ou importé passe par `el()` ou `textContent`, jamais par `innerHTML`. Un JSON importé passe par `nettoyerContenu()`, qui ne garde que les clés et les types prévus par le schéma.
- **Stockage.** On passe toujours par `stockage.js` (localStorage, clés préfixées par `skazy-jeux:`) ou `images.js` (IndexedDB), jamais d'appel direct. Les erreurs de stockage ne doivent jamais faire planter un jeu.
- **Hasard.** On utilise `ctx.hasard` (ou `hasardDePage()`), pas `Math.random()` directement, pour que `?graine=N` rende les tests reproductibles.
- **Raccourcis clavier.** On passe par `ecouterClavier()` : il ignore les touches pendant la saisie et quand un dialogue est ouvert. Il faut retirer l'écoute dans la fonction de nettoyage renvoyée par `demarrer()`. Touches réservées : `R` (roue) et `F` (plein écran).
- **Minuteries.** Tout `setInterval`, chrono ou palier lancé par un jeu est arrêté dans la fonction de nettoyage, sinon il continue après « Quitter la partie ».
- **Accessibilité.** Le contraste respecte WCAG AA, tout se fait au clavier, les messages importants passent par `role="alert"` ou `ctx.annoncer()`, et les animations sont coupées si l'utilisateur a demandé à réduire les animations (`prefers-reduced-motion`).
- **Format** : Prettier (guillemets simples, 100 colonnes). Lint : ESLint `recommended` + `eqeqeq`, `prefer-const`.

## Charte graphique

- **Police** : Georama, de 400 à 900, avec des titres très gras (800–900).
- **Couleurs** : bleu nuit `#0E1027` (bandeau, texte fort), vert `#00AEA0` (accent principal). Chaque jeu a sa couleur (`data-couleur` sur `<body>`), qui définit `--accent`, `--accent-clair` et `--sur-accent`. Ne jamais écrire une couleur en dur hors de `charte.css`, sauf dans les SVG.
- **Contraste** : pas de texte blanc sur le vert, le jaune, le rose, l'orange ou le bleu clair. Sur ces fonds, le texte est en bleu nuit. Seuls `bleu-numerique` et `rouge` portent du texte blanc. Utiliser `var(--sur-accent)`.
- **Formes** : boutons en pilule (`--rayon-pilule`), cartes arrondies à 15px (`--rayon`), ombres douces.
- **Logo** : `assets/img/logo-skazy-formation-blanc.svg` sur fond sombre, `logo-skazy-formation.svg` sur fond clair. Ne pas le déformer ni le recolorer.
- **Ton** : motivant, simple, en vouvoiement pour l'animateur. Le typographe ajoute automatiquement les espaces fines avant `! ? ; :`.
- **Projection** : textes lisibles de loin. Vérifier en 1280×720 (vidéoprojecteur courant) et en 1920×1080.

## Ajouter un mini-jeu

1. Ajouter l'entrée dans `assets/js/jeux.js`, avec une couleur de `charte.css` pas encore utilisée.
2. Copier `jeux/motus/index.html` dans `jeux/<slug>/index.html`, puis adapter `<title>`, la description, `data-jeu`, `data-couleur` et le `<h1>` (le test `registre.test.js` vérifie leur cohérence).
3. Écrire `logique.js` et ses tests unitaires **d'abord**.
4. Écrire `exemple.js` : le schéma du contenu (voir l'en-tête de `contenu.js`) et un contenu d'exemple valide.
5. Écrire `jeu.js` : `monterJeu({ slug, schema, exemple, regles, demarrer })`. `demarrer(ctx)` reçoit :
   - `zone`, `elements`, `reglages`, `participants`, `scores`, `hasard`, `sons` ;
   - `choisirPrenoms()`, `designer()`, `quandDesigne()`, `annoncer()`, `confirmer()`, `terminer()`.
     Elle renvoie une fonction de nettoyage.
6. Écrire `tests/e2e/<slug>.spec.js` : une partie complète avec le contenu d'exemple, en réutilisant `tests/e2e/outils.js`.

## Tests : quoi tester et où

- **Unitaires** (`tests/unit/`) : toute règle de `logique.js` et toute fonction pure de `commun/`, y compris les cas limites (lettres en double, nombres au format français, ex æquo, tirage sans remise…).
- **e2e** (`tests/e2e/`) :
  - pour chaque jeu, une partie complète avec l'attribution d'au moins un point et l'écran de fin ;
  - la préparation du contenu avec enregistrement ;
  - aucune erreur dans la console (`surveillerErreurs`) ;
  - accessibilité sans violation grave ou critique (`verifierAccessibilite`).
- `accueil.spec.js` vérifie automatiquement, pour chaque jeu de `jeux.js` : le lien, l'écran d'accueil, la liste de prénoms partagée, l'éditeur masqué et l'accessibilité.

## Procédure obligatoire avant commit et push

À suivre **à chaque fois**, sans exception :

1. `npm run check` : il doit passer sans aucune erreur (lint, format, HTML, tests unitaires). En cas d'échec de format, lancer `npm run format`.
2. `npm run test:e2e` : il doit passer entièrement.
3. **Si l'interface a changé** : lancer `npm run dev`, ouvrir la page et jouer au moins une manche, en 1280×720 et en 1920×1080, au clavier et à la souris. Un test vert ne prouve pas que c'est beau ni lisible au vidéoprojecteur.
4. **Commit** au format Conventional Commits, avec une description en français :
   - `feat(motus): ajoute le clavier affiché`
   - `fix(roue): évite de tirer deux fois la même personne`
   - `test:`, `docs:`, `refactor:`, `style:`, `chore:`
   - Un commit = un changement cohérent.
5. **Push** seulement si `git remote -v` montre un dépôt distant et si les tests e2e viennent de passer. Il n'y a pas de dépôt distant pour l'instant : on commite en local.

Les hooks git le vérifient automatiquement (`simple-git-hooks`, installés par `npm install`) :

- `pre-commit` lance `npm run check` ;
- `pre-push` lance `npm run test:e2e`.

**Interdits :**

- `git commit --no-verify` ou `git push --no-verify` ;
- supprimer, ignorer (`.skip`) ou assouplir un test pour le faire passer.

Si un test échoue, on corrige la cause. Si le test lui-même est faux, on le corrige en expliquant pourquoi dans le commit.

## Définition de « terminé »

- Le comportement demandé fonctionne dans le navigateur, vérifié à l'œil (étape 3 ci-dessus).
- La logique nouvelle est couverte par des tests unitaires, et le parcours par un test e2e.
- `npm run check` et `npm run test:e2e` passent.
- Aucune erreur dans la console du navigateur.
- `AGENTS.md` et `README.md` sont à jour si une commande, une convention ou la structure change.

## À ne pas faire

- Ajouter un framework, un bundler ou une dépendance chargée à l'exécution sans accord explicite.
- Charger une ressource externe (CDN, Google Fonts, analytics) : le site doit fonctionner hors ligne en salle de formation.
- Envoyer des données à l'extérieur : prénoms et contenus restent dans le navigateur.
- Modifier le logo ou introduire des couleurs hors charte.
- Mettre un vrai minuteur (`setTimeout` long) dans un test : utiliser `vi.useFakeTimers()` en unitaire et des réglages courts en e2e.

# AGENTS.md : mini-jeux Skazy Formation

Consignes pour les agents de code (Claude Code, Codex, Copilot…) et pour les humains qui travaillent sur ce dépôt.

## Le projet

Un site statique de mini-jeux **projetés au vidéoprojecteur** pour casser la monotonie des formations sur ordinateur.

- L'animateur prépare le contenu avant la séance (mots, questions, défis, captures d'écran).
- Les participants répondent à l'oral, et l'animateur saisit ou valide leurs réponses.
- Chaque jeu a un écran d'accueil où l'on saisit les prénoms, avec une roue pour désigner quelqu'un.
- Il n'y a ni serveur ni framework ni étape de build : HTML, CSS et JavaScript natifs (ES modules).
- Le contenu de l'animateur est gardé dans le navigateur : localStorage pour le texte, IndexedDB pour les images.
- Des thématiques prêtes à jouer (IA, Google Docs, Google Sheets, Microsoft 365, Facebook, cybersécurité) se chargent dans tous les jeux depuis la page « Les contenus » ; l'animateur en crée, les modifie ou les supprime (gardées dans le navigateur). Le groupe, les contenus et les thématiques s'échangent en fichiers JSON.
- La charte graphique est celle de Skazy Formation (https://formation.skazy.nc).

## Commandes

| Commande                           | Rôle                                                                                |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| `npm install`                      | Installe les outils de développement **et les hooks git** (script `prepare`)        |
| `npx playwright install chromium`  | Installe le navigateur des tests e2e (une seule fois)                               |
| `npm run dev`                      | Serveur local sur http://localhost:4173 + ouverture du navigateur (`outils/dev.js`) |
| `npm run dev -- --sans-navigateur` | Même chose sans ouvrir le navigateur (agents, tests manuels)                        |
| `npm run check`                    | Lint + format + validation HTML + tests unitaires (**avant chaque commit**)         |
| `npm run test:e2e`                 | Tests Playwright de bout en bout + accessibilité axe (**avant chaque push**)        |
| `npm test`                         | Tests unitaires Vitest seuls                                                        |
| `npm run format`                   | Formate tout le code avec Prettier                                                  |
| `npm run vendor:fontawesome`       | Recopie Font Awesome Free dans `assets/vendor/fontawesome/` (après une mise à jour) |
| `npm run mot-de-passe`             | Calcule l'empreinte d'un nouveau mot de passe d'accès (à recopier dans `acces.js`)  |

Si `npm run dev` tourne déjà ailleurs (autre dossier, worktree), `npm run test:e2e` testerait ce serveur-là : lancez alors `PORT_E2E=4199 npm run test:e2e` (idem pour `git push`, dont le hook lance les e2e).

Les pages ne s'ouvrent pas en double-cliquant sur le fichier (`file://`), car les ES modules exigent un serveur. Utiliser `npm run dev`.

**Agents : arrêtez toujours le serveur que vous lancez en arrière-plan**, et vérifiez qu'aucun processus `serve` ne reste. Sinon le port 4173 reste pris et le `npm run dev` de l'utilisateur échoue. `npm run dev` refuse de démarrer si le port est occupé, plutôt que de partir sur un port au hasard.

## Structure

```
index.html                     Accueil : une carte par jeu (générée depuis assets/js/jeux.js), liens « Le groupe » et « Les contenus »
groupe/index.html              Page « Le groupe » : nom, prénoms, infos, plan de salle, scores, fichier JSON (assets/js/groupe.js)
contenus/index.html            Page « Les contenus » : thématiques (charger, créer, modifier, supprimer, JSON), jeu de données JSON, consultation et modification (assets/js/contenus.js)
contenus/thematiques/*.json    Une thématique prête à jouer par fichier (jeu de données)
assets/css/charte.css          Couleurs (et teintes ajoutées pour les jeux), police Georama, couleur de chaque jeu (data-couleur)
assets/css/base.css            Mise en page, signature (logo │ pastille Mini-jeux), bandeau, boutons, formulaires, dialogues
assets/css/composants.css      Accueil, participants, éditeur, roue, chrono, paliers, podium, illustrations (.ill-*), réponse posée sur la question (.case-reponse)
assets/img/                    favicon.svg (dé blanc sur dégradé orange : favicon et pastille de la signature), logos Skazy Formation
assets/js/jeux.js              Liste des jeux (slug, titre, icône, couleur, accroche, durée)
assets/js/thematiques.js       Liste des thématiques (slug, titre, icône) ; leur fichier est dans contenus/thematiques/
assets/js/commun/
  cadre-jeu.js                 monterJeu() : accueil du jeu, préparation, partie, fin
  editeur-contenu.js           Éditeur généré à partir du schéma de contenu du jeu
  contenu.js                   Schéma : valeurs par défaut, liste vide, nettoyage, validation, import/export, consultation
  jeux-de-donnees.js           Jeu de données (plusieurs jeux dans un fichier) : export, lecture, source de chaque contenu
  catalogue-thematiques.js     Thématiques livrées + celles de l'animateur (stockage) : liste, création, copie modifiée, suppression, export groupé, import
  fiche-thematique.js          Fenêtre « Créer / Modifier une thématique » : titre, description, icône, point de départ
  fichier-groupe.js            Le groupe en JSON : export lisible, import tolérant avec avertissements
  fichiers.js                  Téléchargement d'un JSON et nom du fichier (« skazy-groupe-mairie-2026-10-04.json »)
  participants.js              Liste des prénoms partagée entre les jeux (un homonyme est numéroté : « Marie 2 ») + une info par personne (passion, film…)
  groupe.js                    État partagé du groupe : nom, participants, infos, absences du jour, plan de salle, équipes (nettoyés à chaque changement)
  equipes.js                   Équipes, fonctions pures : nettoyage, répartition au hasard, placement, classement ; scores des équipes
  bloc-equipes.js              Bloc « Équipes » de la page Groupe : former au hasard, ajouter, renommer, changer d'équipe, supprimer
  bloc-participants.js         Bloc « Participants » de la page Groupe (ajout, infos, absences, retrait)
  bloc-joueurs.js · joueurs.js Bloc « Qui joue ? » de chaque jeu : tout le groupe, au clic, au hasard (tirage équitable)
  salle.js                     Plan de salle, fonctions pures : dispositions (U, classe, îlots, réunion), placement
  plan-salle.js                Plan affiché : places-boutons, toucher, glisser-déposer (pointer) ; fenêtre « Groupe »
  roue.js · dialogues.js       Roue aléatoire (tirage équitable) et fenêtres de dialogue (choisirGagnants : personnes, tout le monde, équipes)
  chrono.js                    Compte à rebours (ajuster() : pénalité ou temps rendu) ; creerMinuteur() = chrono affiché + bips de fin
  paliers.js                   Chiffres 5 4 3 2 1 qui s'éteignent (logique + affichage)
  manche-paliers.js            Manche Démarrer (rien avant) / Stop / Voir ou cacher la réponse / Bonne / Reprendre (Qui suis-je ?, Zoom mystère)
  scores.js · points.js        Points de la partie (personnes et équipes) ; bouton « Attribuer le point » (une personne, plusieurs, tout le monde ou une équipe)
  scores-groupe.js             Scores du groupe, tous jeux confondus : détail par jeu, correction, classement (fonctions pures)
  bloc-scores.js               Bloc « Scores » de la page Groupe : classement, − / + / total tapé, remise à zéro
  acces.js                     Mot de passe d'accès : empreinte PBKDF2 seule, écran de saisie, Verrouiller
  stockage.js · images.js      Seuls accès à localStorage et à IndexedDB
  hasard.js · nombres.js       Hasard reproductible (?graine=) ; nombres au format français
  reponses.js                  Réponse tapée comparée avec tolérance : accents, article, pluriel, fautes de frappe, variantes « / », un seul de ses mots
  illustration.js              Illustration SVG de chaque jeu : svg(), ombrer(), etoile(), creerIllustration() (états, réactions)
  sons.js                      Habillage sonore par jeu (Web Audio : notes, bruit filtré, fanfares)
  ui.js                        el(), icone(), raccourcis clavier, typographie
jeux/<slug>/
  index.html                   Page du jeu (même gabarit pour tous)
  jeu.js                       Affichage et déroulé : appelle monterJeu({ slug, schema, exemple, regles, demarrer })
  logique.js                   Règles du jeu, en fonctions pures, sans accès à la page
  exemple.js                   Schéma du contenu + contenu d'exemple prêt à jouer (+ `transfert` : import/export des images)
  jeu.css                      Styles propres au jeu (y compris les parties de son illustration)
  illustration.js              L'illustration du jeu, dessinée en SVG (une patate, un coffre, une cible…)
jeux/zoom-mystere/exemples/    Illustrations SVG du contenu d'exemple de Zoom mystère
assets/vendor/fontawesome/     Font Awesome Free (CSS + polices woff2 + licence), copié par npm run vendor:fontawesome
outils/dev.js                  Lance serve sur le port 4173 (refuse un port occupé) et ouvre le navigateur
outils/empreinte-mot-de-passe.js  Saisie masquée d'un nouveau mot de passe → sel + empreinte pour acces.js
tests/unit/                    Vitest (jsdom) : logique des jeux et modules communs
tests/e2e/                     Playwright : parcours complets, accessibilité, aucune erreur console
  outils.js                    ouvrirJeu (prépare le groupe dans le stockage), lancerPartie, pointsDe, verifierAccessibilite (axe + typographie + mise en page), verifierMiseEnPage…
  accueil.spec.js              Pour chaque jeu de jeux.js : lien, accueil, « Qui joue ? », éditeur masqué, axe ; écran de partie sans défiler en 1280 × 720 et 1920 × 1080
  contenu.spec.js              Export / import JSON d'un jeu, contenu d'exemple
  contenus.spec.js             Page Les contenus : thématique chargée, aperçu, export et import du jeu de données
  thematiques.spec.js          Thématiques : créer, modifier, retirer un jeu, charger, supprimer, rétablir, export groupé et import
  mobile.spec.js               Téléphone tactile : pas de plein écran, icônes centrées, buzzers au doigt, plan au doigt ; petit téléphone (360 px) : chaque jeu tient, grands nombres, mots entiers
  groupe.spec.js               Page Groupe : placement (toucher, glisser, ordre), îlots, fenêtre Groupe en partie, fichier JSON
  joueurs.spec.js              Qui joue ? : tout le groupe, au clic, au hasard ; absences ; retardataire ajouté depuis le jeu
  scores.spec.js               Scores du groupe : points de deux jeux additionnés, autre onglet suivi, corrections, remise à zéro
  equipes.spec.js              Équipes : formées au hasard, renommées, changées ; points d'équipe en partie, fin de partie, page Groupe, fichier JSON
```

## Conventions de code

- **En français** : noms de fonctions et de variables métier (`lancerPartie`, `tirage`, `participants`), commentaires, textes affichés et messages de commit.
- **Pas de dépendance à l'exécution.** `package.json` ne contient que des outils de développement. Pas de CDN, pas de framework. La police est hébergée dans `assets/fonts/`.
- **La logique est séparée de l'affichage.** Les règles vont dans `logique.js`, en fonctions pures testées unitairement. `jeu.js` ne fait que construire la page et réagir aux clics.
- **Sécurité.** Tout texte saisi ou importé passe par `el()` ou `textContent`, jamais par `innerHTML`. Un JSON importé passe par `nettoyerContenu()`, qui ne garde que les clés et les types prévus par le schéma.
- **Mot de passe d'accès.** Il n'est jamais écrit en clair : ni dans le code, ni dans les tests, ni dans un message de commit. Seule son empreinte est dans `acces.js`. Les tests e2e ouvrent les pages déverrouillées (`storageState` dans `playwright.config.js`) ; `acces.spec.js` teste l'écran sans le mot de passe.
- **Groupe.** Le nom, les prénoms, les infos, les absences, le plan et les scores passent par `groupe.js` (`creerGroupe()`), qui les garde cohérents avec la liste. Le prénom sert d'identifiant (unique, sans tenir compte des majuscules) : un homonyme reçoit un numéro (« Marie 2 ») par `ajouterPrenoms()`, qui dit aussi quel prénom a été retenu. Un fichier importé passe par `lireImportGroupe()` puis `groupe.remplacer()`. Un jeu ne voit que les joueurs choisis dans « Qui joue ? » (`ctx.participants`), parmi les présents ; jamais d'accès direct aux clés `participants`, `infos-participants`, `nom-groupe`, `plan-salle`, `scores-groupe`, `equipes` ou `scores-equipes`. Un jeu donne ses points par `ctx.scores.ajouter()`, ou `ctx.scores.ajouterATous()` pour plusieurs personnes à la fois (une seule écriture) : ils vont aussi dans les scores du groupe (`groupe.ajouterPoints()`, relus dans le stockage avant chaque écriture), gardés d'un jeu à l'autre. Quand l'animateur choisit qui a marqué, passer par `ctx.choisirGagnants()` (personnes, tout le monde, équipes en jeu : `ctx.equipes`) puis `ctx.scores.ajouterGagnants(gagnants, n)` : une équipe choisie marque une fois, et chacun de ses membres aussi. `decrireGagnants(ctx, gagnants)` (`points.js`) les nomme (« Les Bleus et Ana »). Toute nouvelle page à publier doit être ajoutée à `.github/workflows/publier.yml` et à `validate:html`, avec la balise `<meta name="robots" content="noindex, nofollow" />`, le titre « Page · Mini-jeux · Skazy Formation », la signature du bandeau et le pied de page de la mention de droits (`registre.test.js` le vérifie).
- **Contenus et thématiques.** Le contenu d'un jeu est rangé sous `cleContenu(slug)` ; un jeu de données (thématique ou import) passe par `lireJeuDeDonnees()` puis `contenuDepuisDonnees()` (nettoyage avec le schéma du jeu, réglages de l'animateur gardés). La source affichée (« Google Sheets ») est notée par `noterSource()` et oubliée dès que l'animateur enregistre un contenu modifié. Les thématiques de l'animateur passent par `catalogue-thematiques.js` (clé `thematiques`) : une thématique créée a un slug `perso-…`, une thématique livrée modifiée est une copie sous son propre slug (le fichier livré n'est jamais réécrit), une thématique livrée supprimée est seulement masquée. Une thématique ne garde que les questions des jeux sans image (ni réglages, ni Zoom mystère) ; tout import passe par `lireImportThematiques()` puis `associerImport()`, et le contenu de chaque jeu par `nettoyerContenu()`.
- **Stockage.** On passe toujours par `stockage.js` (localStorage, clés préfixées par `skazy-jeux:`) ou `images.js` (IndexedDB), jamais d'appel direct. Les erreurs de stockage ne doivent jamais faire planter un jeu.
- **Hasard.** On utilise `ctx.hasard` (ou `hasardDePage()`), pas `Math.random()` directement, pour que `?graine=N` rende les tests reproductibles.
- **Raccourcis clavier.** On passe par `ecouterClavier()` : il ignore les touches pendant la saisie et quand un dialogue est ouvert. Il faut retirer l'écoute dans la fonction de nettoyage renvoyée par `demarrer()`. Touches réservées : `R` (roue) et `F` (plein écran). Tout ce qui se fait au clavier doit aussi se faire au doigt (un téléphone n'a pas de clavier) : un bouton à l'écran pour chaque touche. Les aides sur les touches vont dans un `.raccourci` (ligne d'aide) ou un `.aide-clavier` (« (Entrée) » dans un bouton) : `base.css` les masque sur téléphone, comme le bouton Plein écran.
- **Minuteries.** Tout `setInterval`, chrono ou palier lancé par un jeu est arrêté dans la fonction de nettoyage, sinon il continue après « Quitter la partie ».
- **Performance.** Les jeux tournent souvent sur un PC de salle modeste. Un coup joué met à jour les éléments existants (classes, texte) au lieu de tout recréer avec `remplir()` : un élément recréé rejoue son animation CSS. On ne lit pas `offsetWidth` ou `getBoundingClientRect()` au milieu des modifications du DOM : `animer()` relance une animation sans forcer la mise en page. On anime `transform` et `opacity`, pas une ombre (`box-shadow`) ni une propriété de mise en page (`width`, `top`…) ; un `filter` (ombre portée, flou) est recalculé à chaque image si ce qu'il contient bouge. Les sons se jouent une fois l'écran construit. La sortie audio s'ouvre au lancement de la partie et à l'affichage de la roue (`preparerSon()`, appelé par `cadre-jeu.js` et `dialogues.js`) : l'ouvrir au premier son pouvait figer la page plusieurs secondes. Un signal inaudible la garde ensuite ouverte : après 30 s de silence, Chrome l'endort, et le son suivant partait en retard.
- **Accessibilité.** Le contraste respecte WCAG AA, tout se fait au clavier, les messages importants passent par `role="alert"` ou `ctx.annoncer()`, et les animations sont coupées si l'utilisateur a demandé à réduire les animations (`prefers-reduced-motion`).
- **Sons** : tous générés par `sons.js` (Web Audio), sans fichier audio. Chaque jeu a son espace (`sons.motus`, `sons.pyramide`, `sons.duel`…). On **évoque** l'ambiance des jeux télévisés, on ne reproduit jamais leurs jingles (droits d'auteur). Le bouton Son coupe tout : passer par `audio()` de `sons.js`, qui respecte ce choix.
- **Illustrations.** Chaque jeu a son illustration, dessinée en SVG dans `jeux/<slug>/illustration.js` avec `creerIllustration()` de `illustration.js` (seule exception : la patate de Patate chaude, en CSS). Même style partout : aplats de la charte (classes `.ill-*` de `composants.css`), une ombre (`ombrer()`) et un reflet, l'ombre portée commune. Elle est décorative (`aria-hidden`), réagit à la partie (`etat('ouvert')`, `reagir('hop' | 'secousse' | 'fete')`) et se place à côté du contenu plutôt qu'au-dessus : l'écran de partie doit tenir en 1280 × 720 sans défiler.
- **Pas d'emoji** dans l'interface : uniquement des icônes Font Awesome Free (style solid ou regular) via `icone('nom')` de `ui.js`, décoratives (`aria-hidden`) : le texte du bouton ou du message doit suffire. `tests/unit/icones.test.js` refuse tout emoji et toute icône inexistante. Une `<option>` ne peut pas contenir d'icône : texte seul.
- **Format** : Prettier (guillemets simples, 100 colonnes). Lint : ESLint `recommended` + `eqeqeq`, `prefer-const`.

## Charte graphique

- **Police** : Georama, de 400 à 900, avec des titres très gras (800–900).
- **Couleurs** : bleu nuit `#0E1027` (bandeau, texte fort), vert `#00AEA0` (accent principal). Chaque jeu a sa couleur (`data-couleur` sur `<body>`), qui définit `--accent`, `--accent-clair` et `--sur-accent`. Ne jamais écrire une couleur en dur hors de `charte.css`, sauf dans les SVG.
- **Teintes des jeux** : en plus des couleurs de la charte, cinq teintes dans le même esprit, ajoutées pour les jeux suivants : `caramel`, `sapin`, `anis`, `ardoise`, `prune`. Une nouvelle teinte se déclare dans `charte.css` (avec sa version `-clair` et `--sur-accent`, contraste AA vérifié) et dans `registre.test.js`.
- **Contraste** : pas de texte blanc sur le vert, le jaune, le rose, l'orange, le bleu clair, le caramel ou l'anis. Sur ces fonds, le texte est en bleu nuit. Seuls `bleu-numerique`, `rouge`, `sapin`, `ardoise` et `prune` portent du texte blanc. Utiliser `var(--sur-accent)`.
- **Formes** : boutons en pilule (`--rayon-pilule`), cartes arrondies à 15px (`--rayon`), ombres douces.
- **Logo** : `assets/img/logo-skazy-formation-blanc.svg` sur fond sombre, `logo-skazy-formation.svg` sur fond clair. Ne pas le déformer ni le recolorer.
- **Signature et titres** : chaque outil Skazy Formation a sa couleur de l'arc-en-ciel, dans cet ordre : Quiz rouge, Mini-jeux orange, Vigie jaune, Atelier d’exercices IA vert, Comprendre l'IA bleu, Prompthèque violet. Le favicon (pictogramme blanc sur un dégradé de cette couleur ; ici le dé sur l'orange `#ffa839` → `#ec5900`) sert aussi de pastille dans le bandeau : logo Skazy Formation, filet, pastille, nom de l'outil. Titre d'onglet : « Page · Nom · Skazy Formation » (« Motus numérique · Mini-jeux · Skazy Formation » ; l'accueil : « Mini-jeux · Skazy Formation »). Cet orange n'apparaît que dans le favicon et la pastille : l'accent reste le vert de la charte et la couleur de chaque jeu. La signature (`.signature` de `base.css`, filet `--filet-sombre`) se règle par sa taille de police : logo de 36 px de haut, pastille de 28 px et nom de 17 px dans le bandeau, en plus grand dans le héros de l'accueil. Dans le bandeau des pages, la maison (« Accueil ») à gauche ramène aux mini-jeux ; à droite, la signature, dont seul le logo est un lien : il mène au site https://formation.skazy.nc dans un nouvel onglet (la partie en cours reste ouverte), comme celui de l'accueil. Sous 1200 px de large, le nom « Mini-jeux » s'efface (la pastille reste) pour que le titre et les boutons tiennent sur une ligne.
- **Ton** : motivant, simple, en vouvoiement pour l'animateur. `el()` et `remplir()` ajoutent automatiquement une espace insécable avant `! ? ; :` et dans les guillemets « » (aussi dans `placeholder`, `title`, `aria-label`), après un nombre suivi d'un mot ou de `%` (« 3 participants », « 1 000 000 ») et avant le point médian « · » : pas de `textContent` pour un texte qui peut contenir cette ponctuation ou un nombre. Dans le HTML, écrire `&nbsp;?`. L'espace fine (U+202F) ne se voit pas dans Georama : ne pas l'utiliser, ni le trait d'union insécable (U+2011), absent de la police (« a-t-il » reçoit un liant invisible, U+2060, pour ne pas se couper aux tirets). `verifierAccessibilite` contrôle la typographie de chaque écran testé.
- **Retours à la ligne** : un titre (`h1`–`h3`, `label`, `legend`) s'équilibre sur ses lignes (`text-wrap: balance`), un paragraphe ne finit pas sur un mot seul (`text-wrap: pretty`). Un `.bouton` s'écrit comme une phrase (`inline-block`, pas de flex) : son libellé, un compte ou l'aide « (Entrée) » se suivent sur des lignes équilibrées au lieu de former des colonnes. Une icône ajoutée par `el()` après du texte reçoit `icone--apres` (écart à gauche). Un bouton qui doit empiler deux lignes (Mémoire vive) remet `display: inline-flex` lui-même. Une suite de lettres (Motus, Batterie faible) rapetisse ses cases pour que le mot le plus long tienne sur une ligne, plutôt que de laisser une lettre seule dessous.
- **Projection** : textes lisibles de loin. Vérifier en 1280×720 (vidéoprojecteur courant) et en 1920×1080, et sur téléphone (360 et 390 px de large) : pas de défilement horizontal, aucun texte hors de son badge ou de son bouton, même avec un grand nombre (`verifierMiseEnPage`).
- **Respiration** : un écran de jeu est très aéré au vidéoprojecteur et un peu aéré sur téléphone. Ses écarts passent par les jetons de `.ecran-jeu` (`composants.css`) : `--air` entre deux blocs, `--air-serre` entre éléments voisins, `--case-v` / `--case-h` dans une case de texte. Ils grandissent avec la hauteur de l'écran (une police peut faire de même : `clamp(1.1rem, min(1.8vw, 3.1vh), 1.75rem)`) ; chaque état d'une partie tient quand même en 1280 × 720 sans défiler, le plus haut compris (`accueil.spec.js` le vérifie à l'ouverture de la partie).
- **Listes de choix** : un `<select class="champ__controle">` prend l'allure commune (pilule, chevron dessiné, survol) ; pas de liste sans cette classe.

## Ajouter une thématique

1. Ajouter l'entrée dans `assets/js/thematiques.js` (slug, titre, icône Font Awesome). L'icône doit être dans `ICONES_THEMATIQUE` (`catalogue-thematiques.js`), le choix d'icône des thématiques de l'animateur. Une thématique créée sur la page « Les contenus » puis exportée (bouton « JSON ») donne un bon point de départ.
2. Écrire `contenus/thematiques/<slug>.json` : `format: 'skazy-jeux-donnees'`, `version: 1`, le même `titre`, une `description`, et dans `jeux` le contenu de chaque jeu sans image (`{ elements: […] }`, sans `reglages` : ceux de l'animateur sont gardés). Chaque élément a toutes les clés de son schéma (`jeux/<slug>/exemple.js`), dans l'ordre, `""` pour un champ facultatif vide.
3. Des faits stables et sûrs seulement (années, limites documentées), rien qui change chaque année (prix, nombre d'utilisateurs). Typographie : ’ « » …, et une espace ordinaire avant ? ! ; : (le site la rend insécable).
   Niveau initiation, centré sur le thème (ses outils, son vocabulaire de tous les jours) plutôt que sur la culture générale autour : des mots courts et simples pour Motus, Pyramide, Batterie faible, Bingo et Mémoire vive, des énigmes simples, des réponses sans article (« Mot de passe », pas « Le mot de passe ») et aucune question qui souffle sa réponse.
4. `tests/unit/thematiques.test.js` vérifie le fichier : contenu complet et valide pour chaque jeu, rien de perdu au nettoyage, typographie, pas de doublon.

Un nouveau mini-jeu sans image doit être ajouté à chaque thématique : le test le signale.

## Ajouter un mini-jeu

1. Ajouter l'entrée dans `assets/js/jeux.js`, avec une couleur de `charte.css` pas encore utilisée (sinon, ajouter une teinte : voir la charte graphique).
2. Copier `jeux/motus/index.html` dans `jeux/<slug>/index.html`, puis adapter `<title>` (« Nom du jeu · Mini-jeux · Skazy Formation »), la description, `data-jeu`, `data-couleur` et le `<h1>` (le test `registre.test.js` vérifie leur cohérence).
3. Écrire `logique.js` et ses tests unitaires **d'abord**.
4. Écrire `exemple.js` : le schéma du contenu (voir l'en-tête de `contenu.js`) et un contenu d'exemple valide. Chaque champ à saisir a un `exemple` affiché en placeholder (un tableau pour une liste : une suggestion par ligne), jamais une valeur pré-remplie ; `contenu-vide.test.js` le vérifie.
5. Écrire `jeu.js` : `monterJeu({ slug, schema, exemple, regles, demarrer })`. `demarrer(ctx)` reçoit :
   - `zone`, `elements`, `reglages`, `participants`, `scores`, `hasard`, `sons` ;
   - `choisirPrenoms()`, `designer()`, `quandDesigne()`, `annoncer()`, `confirmer()`, `terminer()`.
     Elle renvoie une fonction de nettoyage.
6. Écrire `illustration.js` : l'illustration du jeu (voir la convention « Illustrations »), et la faire réagir dans `jeu.js`.
7. Écrire `tests/e2e/<slug>.spec.js` : une partie complète avec le contenu d'exemple, en réutilisant `tests/e2e/outils.js`.
8. Ajouter son contenu à chaque thématique (voir « Ajouter une thématique ») : `thematiques.test.js` le réclame.

## Tests : quoi tester et où

- **Unitaires** (`tests/unit/`) : toute règle de `logique.js` et toute fonction pure de `commun/`, y compris les cas limites (lettres en double, nombres au format français, ex æquo, tirage sans remise…).
- **e2e** (`tests/e2e/`) :
  - pour chaque jeu, une partie complète avec l'attribution d'au moins un point et l'écran de fin ;
  - la préparation du contenu avec enregistrement ;
  - aucune erreur dans la console (`surveillerErreurs`) ;
  - accessibilité sans violation grave ou critique (`verifierAccessibilite`), qui vérifie aussi la mise en page : aucun texte hors de son cadre, aucun nombre coupé dans un champ, aucune icône seule décentrée dans son bouton (sa marge `.icone` est à retirer), aucun mot très court seul sur la ligne d'un bouton ou d'un titre (`verifierMiseEnPage`, à appeler seule sur téléphone).
- `accueil.spec.js` vérifie automatiquement, pour chaque jeu de `jeux.js` : le lien, l'écran d'accueil, la liste de prénoms partagée, l'éditeur masqué, l'accessibilité, et que l'écran de partie tient sans défiler en 1280 × 720 et 1920 × 1080.
- **Jeu à minuterie** : `page.clock.install()` avant d'ouvrir la page, puis `page.clock.pauseAt()` fige le temps ; `page.clock.runFor()` le fait avancer d'un coup (pas d'attente réelle). axe-core a besoin de ses minuteries : relâcher l'horloge (`page.clock.resume()`) le temps de `verifierAccessibilite`, à un moment où aucun chrono du jeu ne tourne (voir `coffre-fort.spec.js`).
- **Expressions régulières et typographie** : le site met une espace insécable avant `: ! ?`, dans les guillemets et après un nombre suivi d'un mot. Une chaîne passée à `getByText` est normalisée, pas une expression régulière : écrire `\s` (`/3\serreurs\s:\sla manche/`).
- **Dans les tests e2e, cherchez les textes dans `#cadre`** : `page.locator('#cadre').getByText(…)`. La zone `#annonces` (lecteurs d'écran) répète certains messages, et `page.getByText` trouverait alors deux éléments selon le timing (test instable).

## Procédure obligatoire avant commit et push

À suivre **à chaque fois**, sans exception :

1. `npm run check` : il doit passer sans aucune erreur (lint, format, HTML, tests unitaires). En cas d'échec de format, lancer `npm run format`.
2. `npm run test:e2e` : il doit passer entièrement. Vérifiez le **code de sortie** de la commande de test elle-même. N'enchaînez jamais `… | grep … && git commit` : `grep` réussit même quand des tests échouent.
3. **Si l'interface a changé** : lancer `npm run dev`, ouvrir la page et jouer au moins une manche, en 1280×720 et en 1920×1080, au clavier et à la souris. Un test vert ne prouve pas que c'est beau ni lisible au vidéoprojecteur.
4. **Commit** au format Conventional Commits, avec une description en français :
   - `feat(motus): ajoute le clavier affiché`
   - `fix(roue): évite de tirer deux fois la même personne`
   - `test:`, `docs:`, `refactor:`, `style:`, `chore:`
   - Un commit = un changement cohérent.
5. **Push** sur `main` seulement si les tests e2e viennent de passer. Le dépôt distant est https://github.com/gharel/jeu-formation. Chaque push sur `main` lance [.github/workflows/publier.yml](.github/workflows/publier.yml) : GitHub relance `npm run check` et `npm run test:e2e`, puis **publie le site** sur https://gharel.github.io/jeu-formation/ si tout passe. Un push sur `main` est donc une mise en ligne : vérifiez ensuite que l'action GitHub est verte.

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
- Utiliser des emojis dans l’interface (icônes Font Awesome à la place).
- Charger une ressource externe (CDN, Google Fonts, analytics) : le site doit fonctionner hors ligne en salle de formation.
- Envoyer des données à l'extérieur : prénoms et contenus restent dans le navigateur.
- Modifier le logo ou introduire des couleurs hors charte.
- Mettre un vrai minuteur (`setTimeout` long) dans un test : utiliser `vi.useFakeTimers()` en unitaire et des réglages courts en e2e.

# Mini-jeux Skazy Formation

Des mini-jeux à projeter pour réveiller une séance de formation numérique.
Le bouton « Un jeu au hasard » de l'accueil fait tourner une roue pour choisir le jeu.
L'animateur prépare le contenu, les participants jouent à l'oral, l'animateur valide.
Chaque jeu dure de 5 à 15 minutes.

## Les jeux

| Jeu               | Principe                                                                                                                             | À préparer                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| Motus numérique   | Deviner 5 mots en 6 essais, lettres colorées                                                                                         | 5 mots (+ définitions)                 |
| Instant défi      | La roue tire un défi éclair (« 30 secondes pour trouver… »), chrono                                                                  | Les fins des défis                     |
| Le Juste Chiffre  | « C'est plus ! », « C'est moins ! », minuteur réglable (30 s)                                                                        | Questions à réponse chiffrée           |
| Debout ou assis ? | Vrai = debout, faux = assis (ou main levée), mode survie                                                                             | Affirmations vrai/faux                 |
| Le Bon Ordre      | Remettre dans l'ordre les étapes d'une procédure, 3 essais                                                                           | Procédures de 3 à 7 étapes             |
| Qui suis-je ?     | Indices progressifs (le premier au démarrage), points qui fondent 5 4 3 2 1, Stop, « Voir la réponse » en cas de doute               | Mystères + 3 à 5 indices               |
| Zoom mystère      | Capture très zoomée, cachée jusqu'au démarrage, qui se dévoile, 5 4 3 2 1, Stop, « Voir la réponse » en cas de doute                 | Captures collées (Ctrl+V) ou importées |
| Duel buzzer       | Deux joueurs, touches A et L ou buzzers à l'écran (tactile), le plus rapide répond                                                   | Questions + réponses                   |
| Pyramide          | Par deux, faire deviner un mot en 1, 2, 3 ou 4 mots d'indice : 4, 3, 2 ou 1 point                                                    | Une liste de mots                      |
| Batterie faible   | Proposer des lettres ; chaque erreur vide la batterie                                                                                | Mots ou courtes expressions            |
| Patate chaude     | Une consigne « Citez… », une patate qui brûle au bout d'un temps caché, on la passe                                                  | Consignes (+ idées de réponses)        |
| Mémoire vive      | Retrouver les paires (« Ctrl + Z » et « Annuler ») ; de 8 à 24 cartes au choix                                                       | Paires de cartes (+ explication)       |
| Bingo             | Chacun remplit sa grille ; le jeu tire les mots : « Ligne ! », puis « Bingo ! »                                                      | Mots (définitions facultatives)        |
| Le Coffre-fort    | Des énigmes pour ouvrir les serrures avant la fin du chrono ; erreurs et indices coûtent du temps ; un seul mot de la réponse suffit | Énigmes, réponses, indices             |
| Top 5             | Trouver les 5 réponses cachées, de la plus attendue (5 points) à la moins (1 point) ; un seul mot de la réponse suffit               | Questions « Citez… » + 5 réponses      |

« Voir la réponse » (Qui suis-je ?, Zoom mystère, Duel buzzer) pose la réponse à la place de la question, ou sur l'image, sans rien déplacer : « Cacher la réponse », au même endroit, la retire aussitôt (Espace aussi dans Qui suis-je ? et Zoom mystère). Réponse cachée, la manche peut reprendre ; dans Duel buzzer, elle se cache d'elle-même quand la main passe à l'adversaire.

Pour attribuer des points, un clic sur un prénom suffit ; « Tout le monde » les donne à tous les joueurs d'un coup, « Plusieurs personnes » permet d'en cocher plusieurs, et une équipe (voir la page Le groupe) se choisit d'un clic. Les réponses tapées (Top 5, Le Coffre-fort) tolèrent majuscules, accents, article, pluriel, petites fautes de frappe, et un seul mot de la réponse suffit (« passe » pour « Mot de passe ») ; un mot commun à plusieurs réponses du Top 5 (« Google ») fait demander de préciser, sans compter d'erreur.

La page **Le groupe** (bouton sur l'accueil) rassemble les participants :

- leurs **prénoms**, avec une **info** facultative sur chacun : sa passion, son film ou son dessert préféré… Deux personnes du même prénom ? La deuxième reçoit un numéro (« Marie 2 »), qui la distingue partout : points, roue, plan, infos (on peut aussi écrire « Marie D. ») ;
- un **plan de salle** pour retenir qui est assis où : en U, salle de classe, îlots ou réunion. Le plan prévoit autant de places que de participants (12 au plus), et l'on peut en saisir jusqu'à 30. On place chacun en touchant une place, en faisant glisser son prénom (souris ou doigt), ou d'un coup avec « Placer dans l'ordre » ou « Mélanger » ;
- des **équipes** : formées au hasard parmi les présents (de 2 à 8 équipes, de même taille à une personne près) ou à la main, et renommées (« Les Bleus »). Un clic sur une personne la change d'équipe. En partie, la fenêtre « Qui a trouvé ? » propose chaque équipe : ses points vont à l'équipe (une fois) et à chacun de ses membres. Le tableau de la partie montre les points des équipes, et la fin de partie leur classement ;
- les **scores** : les points gagnés dans tous les jeux s'additionnent d'un jeu à l'autre (et d'un jour à l'autre), avec le classement des équipes, celui des participants et le détail par jeu (« Motus numérique : 3 · Pyramide : 2 »). On corrige un score avec − et + ou en tapant le total, et « Remettre les scores à zéro » repart de rien. Chaque jeu garde son propre tableau des points pendant la partie ; en fin de partie, un lien mène aux scores du groupe. Quitter une partie en cours ne retire pas les points déjà gagnés.

Tout le groupe s'**exporte en un fichier JSON** (bouton « Exporter le groupe ») : son nom (facultatif, « Google Sheets, mairie »), les prénoms, les infos, les absences, la disposition de la salle, les places, les équipes et les points. « Importer un groupe… » le recharge, pour reprendre une formation sur plusieurs jours ou préparer le groupe à l'avance. Le fichier se lit et s'écrit à la main :

```json
{
  "format": "skazy-jeux-groupe",
  "version": 1,
  "groupe": {
    "nom": "Google Sheets, mairie",
    "salle": { "disposition": "ilots", "nombreDePlaces": 8, "parIlot": 4 },
    "participants": [
      {
        "prenom": "Ana",
        "info": { "theme": "dessert", "texte": "le tiramisu" },
        "place": 1,
        "points": { "motus": 3, "pyramide": 2 }
      },
      { "prenom": "Bob", "absent": true },
      "Chloé"
    ],
    "equipes": [{ "nom": "Les Bleus", "membres": ["Ana", "Chloé"], "points": { "motus": 2 } }]
  }
}
```

`disposition` : `u`, `classe`, `ilots` ou `cercle` (réunion). `nombreDePlaces: null` : la salle suit la taille du groupe. `place` : le numéro affiché sur le plan. `theme` de l'info : `passion`, `loisir`, `film`, `musique`, `dessert`, `plat`, `voyage`, `animal` ou `autre` (une info en simple texte prend le thème « Autre »). `points` : les points par jeu (le slug du jeu, `correction` pour une correction à la main), ou un simple nombre, pour une personne comme pour une équipe. `equipes` est facultatif ; chaque membre est un prénom du groupe, dans une seule équipe. À l'import, ce qui ne peut pas s'appliquer (doublon, place inexistante ou déjà prise, membre inconnu) est signalé.

Une personne absente un jour se marque d'un clic sur la page Groupe : elle reste dans le groupe et sur le plan, mais ne joue pas et la roue ne la tire pas. Pendant une partie, le bouton **Groupe** du bandeau réaffiche le plan, les prénoms et les infos, et la roue indique la place de la personne désignée.

Sur l'écran d'accueil de chaque jeu, on peut :

- **choisir qui joue** (bloc « Qui joue ? ») : tout le groupe (par défaut), au clic sur les prénoms, ou au hasard (un nombre de joueurs, en tirant d'abord ceux qui n'ont pas encore été tirés). Le choix n'est pas mémorisé : chaque jeu repart de « Tout le groupe ». Un retardataire s'ajoute au groupe sans quitter le jeu (« Ajouter quelqu'un ») ;
- **faire tourner la roue** pour désigner quelqu'un, avec la touche `R` ou le bouton « Désigner » ;
- **préparer le contenu**, avec les réponses masquées pour pouvoir le faire écran projeté. Un contenu d'exemple permet de jouer tout de suite ; « Partir d'une liste vide » (ou « Vider la liste ») le remplace par des champs vides, où les exemples restent affichés en grisé, sans rien à effacer. Le contenu s'exporte et s'importe en JSON pour le réutiliser ou le partager.

La page **Les contenus** (bouton sur l'accueil, ou « Charger une thématique » dans chaque jeu) rassemble les questions de tous les jeux :

- **6 thématiques prêtes à jouer**, chargées en un clic dans les 14 jeux sans image (Zoom mystère garde ses captures) : **Initiation à l'IA**, **Google Docs**, **Google Sheets**, **Microsoft 365**, **Facebook** et **Cybersécurité**. Les réglages de l'animateur (durées, points…) sont conservés. « Revenir aux exemples » remet le contenu livré avec les jeux ;
- **vos propres thématiques** : « Créer une thématique » (titre, description, icône) part des contenus actuels, des exemples, d'une copie d'une thématique ou de questions vides ; ses questions se modifient ensuite jeu par jeu dans la consultation (« Modifier », « Retirer », « Ajouter à la thématique »), sans toucher aux jeux tant qu'on ne la charge pas. Une thématique livrée se modifie de la même façon (« Rétablir l'originale » annule) ou se supprime (« Rétablir les thématiques supprimées » la fait revenir). Tout est gardé dans ce navigateur ;
- **les thématiques en JSON** : « JSON » sur une carte exporte une thématique, « Exporter toutes les thématiques » les écrit toutes dans un seul fichier, et « Importer des thématiques… » les recharge : le fichier groupé, ou plusieurs fichiers choisis d'un coup (une thématique déjà présente, de même nom ou de même identifiant, est remplacée ; les autres s'ajoutent) ;
- **un jeu de données JSON** : « Exporter tous les contenus » écrit les questions des 15 jeux dans un seul fichier (avec un titre), « Importer un jeu de données… » le recharge. L'export d'un seul jeu s'importe aussi ici, et un jeu de données s'importe aussi dans un seul jeu (il en prend sa part) ;
- **la consultation** des questions de chaque jeu, réponses floutées tant qu'on ne les affiche pas, et l'aperçu d'une thématique avant de la charger. Le bouton **Modifier** ouvre sur place l'éditeur du jeu (le même que dans le jeu) pour changer ses questions sans quitter la page : celles du jeu (contenus actuels) ou celles de la thématique affichée.

Dans chaque jeu, une étiquette indique la thématique chargée (« Google Sheets ») ; elle disparaît dès que l'animateur retouche et enregistre le contenu. Les thématiques livrées sont des fichiers JSON dans `contenus/thematiques/` : pour en ajouter une au site, voir [AGENTS.md](AGENTS.md).

Fichier de toutes les thématiques (« Exporter toutes les thématiques ») :

```json
{
  "format": "skazy-jeux-thematiques",
  "version": 1,
  "exporteLe": "2026-10-05T08:00:00.000Z",
  "thematiques": [
    {
      "slug": "perso-excel-debutant",
      "titre": "Excel débutant",
      "description": "Les formules et les graphiques.",
      "icone": "table-cells",
      "jeux": { "motus": { "elements": [{ "mot": "CELLULE", "definition": "" }] } }
    }
  ]
}
```

Une thématique seule (bouton « JSON ») est un jeu de données, avec en plus son `slug` et son `icone` : elle s'importe aussi dans « Importer un jeu de données… ».

La touche `F` passe en plein écran (bouton masqué sur téléphone, où il ne sert à rien). Chaque jeu a son illustration, dessinée aux couleurs de la charte, qui réagit à la partie : la flèche se plante dans la cible, le téléphone transpire quand la batterie faiblit, la porte du coffre s'ouvre… Chaque jeu a aussi son habillage sonore façon jeu télévisé : notes des lettres de Motus, cloche des étages de Pyramide, gong du « Stop », buzzers du duel, tic-tac de la patate, cliquetis des serrures, cliquetis de la roue, fanfares et applaudissements. Ce sont des sons originaux générés par le navigateur, sans fichier ni droits d'auteur. Le bouton Son du bandeau les coupe.
Les icônes viennent de Font Awesome Free, hébergé dans le projet (fonctionne hors ligne).

Chaque outil Skazy Formation a sa couleur de l'arc-en-ciel, dans cet ordre : Quiz rouge, Mini-jeux orange, Vigie jaune, Atelier d’exercices IA vert, Comprendre l'IA bleu, Prompthèque violet. Le favicon (un dé blanc sur un dégradé orange) sert aussi de pastille dans le bandeau : logo Skazy Formation, filet, pastille, « Mini-jeux ». Titre d'onglet : « Page · Mini-jeux · Skazy Formation » (« Motus numérique · Mini-jeux · Skazy Formation »).

## Utiliser les jeux

En ligne : **https://gharel.github.io/jeu-formation/**

Le site est 100 % statique : il suffit de copier `index.html`, `assets/`, `jeux/`, `groupe/` et `contenus/` sur n'importe quel hébergement web (sous-dossier accepté).
Il fonctionne hors ligne une fois chargé : aucune ressource externe.

Un **mot de passe** est demandé à la première visite, sur l'accueil comme sur chaque jeu. Le navigateur s'en souvient ensuite ; le bouton « Verrouiller l'accès sur cet ordinateur », en bas de l'accueil, le fait redemander. Pour le changer : `npm run mot-de-passe`, puis recopier le sel et l'empreinte affichés dans `assets/js/commun/acces.js`. C'est une protection dissuasive : le site reste statique et ses fichiers publics.

### Déploiement sur GitHub Pages

Chaque push sur `main` lance l'action [Vérifier puis publier sur GitHub Pages](.github/workflows/publier.yml) :
GitHub relance tous les tests (lint, format, HTML, unitaires, e2e et accessibilité), puis publie `index.html`, `assets/`, `jeux/`, `groupe/` et `contenus/` si tout passe.
On peut aussi la relancer à la main depuis l'onglet **Actions** du dépôt (« Run workflow »).

Réglage à faire une seule fois : **Settings → Pages → Build and deployment → Source : GitHub Actions**.

En local :

```bash
npm install
npm run dev
```

Le navigateur s'ouvre sur http://localhost:4173 (Ctrl+C dans le terminal pour arrêter).
Si le port 4173 est déjà pris, un message l'indique : le site tourne sans doute déjà dans un autre terminal.
Pour ne pas ouvrir le navigateur : `npm run dev -- --sans-navigateur`.

## Développer

Lire **[AGENTS.md](AGENTS.md)**. Il décrit la structure, les conventions, la charte graphique et la procédure obligatoire avant chaque commit et chaque push.

```bash
npx playwright install chromium   # une fois, pour les tests e2e
npm run check                     # lint + format + HTML + tests unitaires
npm run test:e2e                  # parcours complets + accessibilité
```

Les hooks git lancent `check` avant chaque commit et `test:e2e` avant chaque push.

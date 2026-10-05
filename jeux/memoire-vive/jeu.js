import { monterJeu } from '../../assets/js/commun/cadre-jeu.js';
import {
  el,
  remplir,
  icone,
  animer,
  focaliser,
  ecouterClavier,
  typographier,
} from '../../assets/js/commun/ui.js';
import { lire, ecrire } from '../../assets/js/commun/stockage.js';
import { schema, exemple } from './exemple.js';
import {
  nombresPossibles,
  nombreParDefaut,
  disposition,
  repere,
  distribuer,
  joueurSuivant,
  creerPartie,
} from './logique.js';
import { creerIllustrationMemoire } from './illustration.js';

/** Le dernier nombre de cartes choisi, proposé de nouveau à la partie suivante. */
const CLE_NOMBRE = 'memoire-vive:cartes';

/** Aide « (Espace) » d'un bouton : inutile sur téléphone, où elle est masquée (base.css). */
const aideClavier = (touche) => el('span', { class: 'aide-clavier' }, ` (${touche})`);

/** Durée approximative d'une partie, en minutes. */
const dureeEstimee = (nombre) => Math.max(2, Math.round(nombre / 3));

function demarrer(ctx) {
  const paires = ctx.elements;
  // Raccourcis du moment : Entrée (action principale) et Espace (cacher les cartes)
  let touches = {};
  const retirerClavier = ecouterClavier({
    Entrée: () => touches.entree?.(),
    Espace: () => touches.espace?.(),
  });
  let joueur = null;
  let rafraichirTour = null;
  // La barrette de mémoire vive : une puce s'allume par quart de paires trouvées
  const illustration = creerIllustrationMemoire();

  // La roue du bandeau désigne qui joue
  ctx.quandDesigne((prenom) => {
    joueur = prenom;
    rafraichirTour?.();
  });

  // ---------- Combien de cartes ? ----------
  function afficherChoix() {
    const possibles = nombresPossibles(paires.length);
    const parDefaut = nombreParDefaut(paires.length, lire(CLE_NOMBRE));
    const titre = el('h3', { class: 'panneau__texte' }, 'Combien de cartes ?');
    touches = { entree: () => commencer(parDefaut) };
    remplir(
      ctx.zone,
      el(
        'div',
        { class: 'panneau memoire-choix' },
        illustration.element,
        el('p', { class: 'panneau__surtitre' }, `${paires.length} paires préparées`),
        titre,
        el(
          'p',
          { class: 'memoire-choix__aide' },
          'Les paires sont tirées au hasard parmi les vôtres. Plus il y a de cartes, plus la partie est longue.',
        ),
        el(
          'div',
          { class: 'memoire-choix__options' },
          possibles.map((n) =>
            el(
              'button',
              {
                type: 'button',
                class: `bouton bouton--grand memoire-choix__option${n === parDefaut ? ' bouton--principal' : ''}`,
                onclick: () => commencer(n),
              },
              el('span', { class: 'memoire-choix__nombre' }, `${n} cartes`),
              el(
                'span',
                { class: 'memoire-choix__detail' },
                `${n / 2} paires · environ ${dureeEstimee(n)} min`,
              ),
            ),
          ),
        ),
        el('p', { class: 'raccourci' }, el('kbd', {}, 'Entrée'), ` : ${parDefaut} cartes`),
      ),
    );
    focaliser(titre);
  }

  // ---------- La partie ----------
  function commencer(nombre) {
    ecrire(CLE_NOMBRE, nombre);
    const { paires: choisies, cartes } = distribuer(paires, nombre, ctx.hasard);
    const partie = creerPartie(cartes);
    const { colonnes, lignes } = disposition(nombre);
    const participants = ctx.participants;
    joueur = participants.length
      ? participants[Math.floor(ctx.hasard() * participants.length)]
      : null;
    let coups = 0;
    illustration.progression(0, partie.nombreDePaires);

    const tour = el('p', { class: 'au-tour-de memoire__tour' });
    const compteur = el('p', { class: 'memoire__compteur' });
    const actions = el('div', { class: 'memoire__actions' });
    const message = el('p', { class: 'memoire__message', 'aria-live': 'polite' });
    const explication = el('p', { class: 'memoire__explication' });
    const raccourci = el('p', { class: 'raccourci' });
    const grille = el('div', {
      class: 'memoire__grille',
      style: `--colonnes: ${colonnes}; --lignes: ${lignes}`,
      'aria-label': `${nombre} cartes : colonnes A à ${String.fromCharCode(64 + colonnes)}, lignes 1 à ${lignes}`,
      role: 'group',
    });
    const plateau = el(
      'div',
      { class: 'panneau memoire', tabindex: '-1' },
      el(
        'div',
        { class: 'memoire__entete' },
        el('div', { class: 'memoire__infos' }, illustration.element, tour, compteur),
        actions,
      ),
      el('div', { class: 'memoire__messages' }, message, explication),
      grille,
      raccourci,
    );

    const faces = cartes.map(() =>
      el('span', { class: 'carte-memoire__face', 'aria-hidden': 'true' }),
    );
    const boutons = cartes.map((carte, i) =>
      el(
        'button',
        {
          type: 'button',
          class: `carte-memoire carte-memoire--${carte.face}`,
          dataset: { index: String(i) },
          onclick: (e) => retourner(i, e),
        },
        el(
          'span',
          { class: 'carte-memoire__interieur' },
          el('span', { class: 'carte-memoire__dos', 'aria-hidden': 'true' }, repere(i, colonnes)),
          faces[i],
        ),
      ),
    );
    // L'état dessiné de chaque carte : à chaque clic, seules celles qui changent sont retouchées
    const dessinees = cartes.map(() => '');
    remplir(grille, boutons);

    // Flèches du clavier : on se déplace de carte en carte, comme sur la grille projetée
    grille.addEventListener('keydown', (e) => {
      const i = Number(e.target.closest?.('.carte-memoire')?.dataset.index);
      const deplacement = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -colonnes, ArrowDown: colonnes }[
        e.key
      ];
      if (Number.isNaN(i) || deplacement === undefined) return;
      const cible = boutons[i + deplacement];
      if (!cible) return;
      e.preventDefault();
      cible.focus();
    });

    rafraichirTour = () => {
      tour.hidden = !joueur || partie.phase === 'finie';
      remplir(tour, icone('hand-pointer'), `Au tour de ${joueur}`);
    };

    function dessinerCartes() {
      const visibles = partie.visibles;
      boutons.forEach((bouton, i) => {
        const { texte } = cartes[i];
        const trouvee = partie.estTrouvee(i);
        const visible = trouvee || visibles.includes(i);
        const ratee = partie.phase === 'ratee' && visibles.includes(i);
        const etat = `${visible}|${trouvee}|${ratee}`;
        if (etat === dessinees[i]) return;
        dessinees[i] = etat;
        const rep = repere(i, colonnes);
        bouton.classList.toggle('carte-memoire--visible', visible);
        bouton.classList.toggle('carte-memoire--trouvee', trouvee);
        bouton.classList.toggle('carte-memoire--ratee', ratee);
        bouton.setAttribute('aria-disabled', String(visible));
        // Le texte n'est dans la page que si la carte est retournée
        if (visible) {
          remplir(
            faces[i],
            trouvee ? el('span', { class: 'carte-memoire__coche' }, icone('check')) : null,
            el('span', { class: 'carte-memoire__texte' }, texte),
          );
        } else {
          remplir(faces[i]);
        }
        let nom = `Carte ${rep}, face cachée`;
        if (visible) nom = `Carte ${rep} : ${texte}${trouvee ? ', paire trouvée' : ''}`;
        bouton.setAttribute('aria-label', typographier(nom));
      });
    }

    // Les boutons et l'aide ne changent qu'entre trois étapes : en jeu, cartes ratées, fin
    let etapeDessinee = null;
    function dessinerCommandes() {
      remplir(
        compteur,
        `${partie.pairesTrouvees} paire${partie.pairesTrouvees > 1 ? 's' : ''} sur ${partie.nombreDePaires}`,
      );
      rafraichirTour();
      const etape = partie.phase === 'finie' || partie.phase === 'ratee' ? partie.phase : 'jeu';
      if (etape === etapeDessinee) return;
      etapeDessinee = etape;
      if (partie.phase === 'finie') {
        touches = { entree: terminer };
        remplir(
          actions,
          el(
            'button',
            { type: 'button', class: 'bouton bouton--sombre', onclick: terminer },
            'Voir le classement',
            aideClavier('Entrée'),
          ),
        );
        remplir(raccourci, el('kbd', {}, 'Entrée'), ' : voir le classement');
        return;
      }
      if (partie.phase === 'ratee') {
        touches = { espace: cacher };
        remplir(
          actions,
          el(
            'button',
            {
              type: 'button',
              class: 'bouton bouton--principal',
              onclick: () => {
                cacher();
                plateau.focus();
              },
            },
            icone('eye-slash'),
            'Cacher les cartes',
            aideClavier('Espace'),
          ),
        );
        remplir(
          raccourci,
          el('kbd', {}, 'Espace'),
          ' : cacher les cartes · ou retournez directement la carte suivante',
        );
        return;
      }
      touches = {};
      remplir(actions);
      remplir(
        raccourci,
        'Annoncez une carte par son repère (« B3 ») : cliquez-la, ou choisissez-la avec les flèches et Entrée.',
      );
    }

    function dessiner() {
      dessinerCartes();
      dessinerCommandes();
    }

    function retourner(i, evenement) {
      // Au clic, le focus revient au plateau (Espace garde son sens) ; au clavier, il reste là
      if (evenement?.detail > 0) plateau.focus();
      const resultat = partie.retourner(i);
      if (!resultat) return;
      remplir(explication);
      if (resultat === 'premiere') {
        remplir(message, 'Et la seconde carte ?');
      } else if (resultat === 'paire') {
        coups += 1;
        trouverPaire(cartes[i].paire);
      } else {
        coups += 1;
        joueur = joueurSuivant(participants, joueur);
        remplir(
          message,
          icone('eye'),
          `Pas de paire : mémorisez-les bien !${joueur ? ` Au tour de ${joueur}.` : ''}`,
        );
      }
      dessiner();
      // Les animations et les sons une fois la page à jour
      if (resultat !== 'premiere') animer(message, 'apparition');
      ctx.sons.memoire.retourner();
      if (resultat === 'ratee') ctx.sons.memoire.ratee();
      if (resultat === 'paire') {
        const finie = partie.phase === 'finie';
        illustration.reagir(finie ? 'fete' : 'hop');
        // Dernière paire : la fanfare seule (elle couvrirait la cloche)
        if (finie) ctx.sons.fanfare(3);
        else ctx.sons.memoire.paire();
      }
    }

    function trouverPaire(rang) {
      illustration.progression(partie.pairesTrouvees, partie.nombreDePaires);
      if (joueur) ctx.scores.ajouter(joueur, 1);
      const fini = partie.phase === 'finie';
      let texte = joueur ? `Paire trouvée par ${joueur} : 1 point !` : 'Paire trouvée !';
      if (!fini && joueur) texte += ` ${joueur} rejoue.`;
      if (fini) texte = `${texte} Toutes les paires sont trouvées, en ${coups} coups.`;
      remplir(message, icone('circle-check'), texte);
      remplir(explication, choisies[rang].explication || '');
      ctx.annoncer(`${texte} ${choisies[rang].explication || ''}`);
    }

    function cacher() {
      if (!partie.cacher()) return;
      remplir(message, joueur ? `À ${joueur} de jouer.` : 'À vous de jouer.');
      dessiner();
    }

    function terminer() {
      touches = {};
      ctx.terminer({
        message: `${partie.nombreDePaires} paires trouvées en ${coups} coups.`,
      });
    }

    remplir(ctx.zone, plateau);
    remplir(message, joueur ? `${joueur} commence !` : 'Qui commence ? Annoncez une carte.');
    dessiner();
    plateau.focus();
  }

  afficherChoix();
  return () => retirerClavier();
}

monterJeu({
  slug: 'memoire-vive',
  schema,
  exemple,
  regles: [
    'Avant la séance, préparez des paires de cartes qui vont ensemble : « Ctrl + Z » et « Annuler », « PDF » et son sens…',
    'Au lancement, choisissez le nombre de cartes : de 8 à 24, selon le temps dont vous disposez.',
    'À son tour, le joueur annonce deux cartes par leur repère (« B3 et D1 ») : vous les retournez.',
    'Une paire ? 1 point, et il rejoue. Sinon, tout le monde les mémorise, elles se cachent, et c’est au suivant.',
  ],
  demarrer,
});

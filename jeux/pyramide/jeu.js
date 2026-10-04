import { monterJeu } from '../../assets/js/commun/cadre-jeu.js';
import {
  el,
  remplir,
  icone,
  animer,
  focaliser,
  ecouterClavier,
} from '../../assets/js/commun/ui.js';
import { schema, exemple } from './exemple.js';
import { INDICES_MAX, pointsPourIndices, creerMot, roles, tirerBinome } from './logique.js';

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const ordinal = (n) => (n === 1 ? '1er' : `${n}e`);

function demarrer(ctx) {
  const mots = ctx.elements.map((e) => e.mot.trim());
  const { motsParBinome } = ctx.reglages;
  const avecPrenoms = ctx.participants.length >= 2;
  const dejaJoue = new Set();
  let index = 0;
  // Binôme en cours ([prénom, prénom], null sans prénoms) et rang de son mot (0, 1…)
  let binome = null;
  let rang = 0;
  // Raccourcis du moment : Entrée (trouvé) et Espace (raté, afficher, continuer)
  let touches = {};
  const retirerClavier = ecouterClavier({
    Espace: () => touches.espace?.(),
    Entrée: () => touches.entree?.(),
  });

  // ---------- Choix du binôme ----------
  function afficherChoix() {
    touches = {};
    const titre = el('h3', { class: 'panneau__texte' }, 'Quel binôme joue ?');
    const erreur = el('p', { class: 'pyramide__erreur', role: 'alert' });
    const selecteur = (id) =>
      el(
        'select',
        { id, class: 'champ__controle' },
        ctx.participants.map((p) => el('option', { value: p }, p)),
      );
    const maitre = selecteur('pyramide-maitre');
    const devineur = selecteur('pyramide-devineur');
    const tirer = () => {
      [maitre.value, devineur.value] = tirerBinome(ctx.participants, dejaJoue, ctx.hasard);
      remplir(erreur);
    };
    tirer();

    const commencer = () => {
      if (maitre.value === devineur.value) {
        remplir(erreur, 'Choisissez deux personnes différentes.');
        return;
      }
      binome = [maitre.value, devineur.value];
      for (const prenom of binome) dejaJoue.add(prenom);
      rang = 0;
      afficherMot();
    };

    const restants = mots.length - index;
    remplir(
      ctx.zone,
      el(
        'div',
        { class: 'panneau pyramide-choix' },
        el(
          'p',
          { class: 'panneau__surtitre' },
          `${pluriel(restants, 'mot')} à faire deviner · ${motsParBinome} par binôme`,
        ),
        titre,
        el(
          'div',
          { class: 'pyramide__choix' },
          el(
            'div',
            { class: 'champ' },
            el('label', { for: 'pyramide-maitre', class: 'champ__libelle' }, 'Fait deviner'),
            maitre,
          ),
          el(
            'div',
            { class: 'champ' },
            el(
              'label',
              { for: 'pyramide-devineur', class: 'champ__libelle' },
              'Devine, dos à l’écran',
            ),
            devineur,
          ),
          el(
            'button',
            {
              type: 'button',
              class: 'bouton',
              onclick: () => {
                tirer();
                ctx.sons.ding();
              },
            },
            icone('dice'),
            'Tirer au sort',
          ),
        ),
        erreur,
        el('p', { class: 'champ__aide' }, 'Les rôles s’inversent à chaque mot.'),
        el(
          'div',
          { class: 'actions-jeu' },
          el(
            'button',
            { type: 'button', class: 'bouton bouton--principal bouton--grand', onclick: commencer },
            'C’est parti !',
          ),
        ),
      ),
    );
    focaliser(titre);
  }

  // ---------- Un mot à faire deviner ----------
  function afficherMot() {
    const mot = mots[index];
    const partie = creerMot();
    const { maitre, devineur } = binome ? roles(binome, rang) : { maitre: null, devineur: null };
    const dernierDuBinome = rang + 1 >= motsParBinome;
    const dernier = index === mots.length - 1;

    const carton = el('div', { class: 'pyramide__carton' });
    const consigne = el('p', { class: 'pyramide__consigne' });
    const etages = el('ol', {
      class: 'pyramide__etages',
      'aria-label': 'Points selon le nombre de mots d’indice',
    });
    const resultat = el('div', { class: 'pyramide__resultat', hidden: true });
    const actions = el('div', { class: 'actions-jeu' });
    const raccourci = el('p', { class: 'raccourci' });
    const panneau = el(
      'div',
      { class: 'panneau pyramide', tabindex: '-1' },
      el(
        'div',
        { class: 'pyramide__entete' },
        el('p', { class: 'panneau__surtitre' }, `Mot ${index + 1} sur ${mots.length}`),
        el('p', { class: 'au-tour-de' }, texteDuo()),
      ),
      el(
        'div',
        { class: 'pyramide__plateau' },
        el('div', { class: 'pyramide__infos' }, carton, consigne, resultat),
        etages,
      ),
      actions,
      raccourci,
    );

    function texteDuo() {
      // Le texte dans un seul span : l'écart de la pastille (flex) ne s'ajoute pas aux espaces
      if (maitre) {
        return [
          icone('comments'),
          el('span', {}, el('strong', {}, maitre), ' fait deviner à ', el('strong', {}, devineur)),
        ];
      }
      if (rang % 2 === 1) return [icone('arrows-rotate'), el('span', {}, 'On inverse les rôles !')];
      return [
        icone('user-group'),
        el(
          'span',
          {},
          index === 0
            ? 'Par deux : l’un fait deviner, l’autre devine.'
            : 'Au binôme suivant : l’un fait deviner, l’autre devine.',
        ),
      ];
    }

    function bouton(contenu, classe, action) {
      return el(
        'button',
        {
          type: 'button',
          class: `bouton bouton--grand ${classe}`,
          onclick: () => {
            action();
            // Le focus quitte le bouton : Entrée et Espace gardent toujours le même sens
            if (partie.phase !== 'fini') panneau.focus();
          },
        },
        contenu,
      );
    }

    function dessinerCarton() {
      carton.classList.toggle('pyramide__carton--cache', partie.phase === 'cache');
      if (partie.phase === 'cache') {
        remplir(
          carton,
          el(
            'p',
            { class: 'pyramide__alerte' },
            icone('eye-slash'),
            devineur ? `${devineur}, dos à l’écran !` : 'La personne qui devine : dos à l’écran !',
          ),
          el(
            'p',
            { class: 'pyramide__alerte-aide' },
            maitre
              ? `Seuls ${maitre} et le public doivent voir le mot. Chut, on ne souffle pas !`
              : 'Seuls la personne qui fait deviner et le public doivent voir le mot. Chut, on ne souffle pas !',
          ),
        );
        return;
      }
      remplir(
        carton,
        el('p', { class: 'pyramide__carton-titre' }, 'Mot à faire deviner'),
        el('p', { class: 'pyramide__mot' }, mot),
      );
    }

    function etatEtage(numero) {
      const { phase, indice, issue } = partie;
      if (phase === 'cache' || numero > indice) return 'a-venir';
      if (numero < indice) return 'passe';
      if (phase === 'jeu') return 'courant';
      return { trouve: 'gagne', rate: 'passe', faute: 'faute' }[issue];
    }

    const ETATS = { courant: 'en cours', passe: 'raté', gagne: 'trouvé', faute: 'faute' };

    function dessinerEtages() {
      remplir(
        etages,
        Array.from({ length: INDICES_MAX }, (_, i) => {
          const numero = i + 1;
          const etat = etatEtage(numero);
          return el(
            'li',
            {
              class: `pyramide__etage pyramide__etage--${numero} pyramide__etage--${etat}`,
              'aria-current': etat === 'courant' ? 'step' : null,
            },
            el('span', { class: 'pyramide__nombre' }, pluriel(numero, 'mot')),
            el('span', { class: 'pyramide__points' }, pluriel(pointsPourIndices(numero), 'point')),
            ETATS[etat] ? el('span', { class: 'visuellement-cache' }, ` (${ETATS[etat]})`) : null,
          );
        }),
      );
    }

    function dessinerActions() {
      if (partie.phase === 'cache') {
        touches = { espace: afficher };
        remplir(consigne);
        remplir(actions, bouton([icone('eye'), 'Afficher le mot'], 'bouton--principal', afficher));
        remplir(raccourci, el('kbd', {}, 'Espace'), ' : afficher le mot');
        return;
      }
      if (partie.phase === 'jeu') {
        const { indice, points } = partie;
        touches = { entree: trouver, espace: rater };
        remplir(consigne, `${ordinal(indice)} mot d’indice : ${pluriel(points, 'point')} en jeu`);
        remplir(
          actions,
          bouton(
            [icone('check'), `Trouvé ! ${pluriel(points, 'point')}`],
            'bouton--succes',
            trouver,
          ),
          bouton(
            [icone('xmark'), indice < INDICES_MAX ? 'Raté : indice suivant' : 'Raté : mot perdu'],
            '',
            rater,
          ),
          bouton([icone('ban'), 'Faute'], 'bouton--discret', faute),
        );
        remplir(
          raccourci,
          el('kbd', {}, 'Entrée'),
          ' : trouvé · ',
          el('kbd', {}, 'Espace'),
          ' : raté',
        );
        return;
      }
      touches = { espace: continuer, entree: continuer };
      remplir(consigne);
      let libelle = ['Mot suivant', icone('arrow-right', { classe: 'icone--apres' })];
      if (dernier) libelle = 'Voir le classement';
      else if (dernierDuBinome)
        libelle = ['Binôme suivant', icone('arrow-right', { classe: 'icone--apres' })];
      remplir(actions, bouton(libelle, 'bouton--sombre', continuer));
      remplir(raccourci, el('kbd', {}, 'Espace'), ' : continuer');
    }

    function dessiner() {
      dessinerCarton();
      dessinerEtages();
      dessinerActions();
    }

    function afficher() {
      if (!partie.afficher()) return;
      ctx.sons.pyramide.etage(1);
      dessiner();
      animer(carton, 'apparition');
      ctx.annoncer(`Mot à faire deviner : ${mot}. 1er mot d’indice : 4 points en jeu.`);
    }

    function trouver() {
      const points = partie.trouver();
      if (points === null) return;
      if (binome) {
        ctx.scores.ajouter(maitre, points);
        ctx.scores.ajouter(devineur, points);
      }
      ctx.sons.pyramide.trouve(points);
      conclure();
    }

    function rater() {
      const issue = partie.rater();
      if (issue === null) return;
      if (issue === 'perdu') {
        ctx.sons.pyramide.perdu();
        conclure();
        return;
      }
      ctx.sons.pyramide.etage(partie.indice);
      dessiner();
      animer(etages.children[partie.indice - 1], 'apparition');
      ctx.annoncer(
        `Raté. ${ordinal(partie.indice)} mot d’indice : ${pluriel(partie.points, 'point')} en jeu.`,
      );
    }

    function faute() {
      if (!partie.faute()) return;
      ctx.sons.pyramide.faute();
      conclure();
    }

    function conclure() {
      dessiner();
      const { issue, indice, points } = partie;
      const verdict = el(
        'p',
        { class: 'pyramide__verdict' },
        {
          trouve: [icone('face-grin-stars'), `Trouvé en ${pluriel(indice, 'mot')} d’indice !`],
          rate: [icone('hourglass-end'), `Pas trouvé en ${INDICES_MAX} mots…`],
          faute: [icone('ban'), 'Faute : le mot est perdu.'],
        }[issue],
      );
      let gain = null;
      if (issue === 'trouve') {
        gain = el(
          'p',
          { class: 'pyramide__gain' },
          icone('check'),
          maitre
            ? `+${pluriel(points, 'point')} pour ${maitre} et ${devineur}`
            : `+${pluriel(points, 'point')} pour le binôme`,
        );
      }
      remplir(
        resultat,
        verdict,
        gain,
        el(
          'p',
          { class: 'pyramide__retour' },
          devineur ? `${devineur}, vous pouvez vous retourner !` : 'On peut se retourner !',
        ),
      );
      resultat.hidden = false;
      animer(resultat, 'apparition');
      ctx.annoncer(`${verdict.textContent} Le mot était : ${mot}.`);
      focaliser(verdict);
    }

    function continuer() {
      touches = {};
      if (dernier) {
        ctx.terminer({ message: 'Tous les mots de la pyramide ont été joués.' });
        return;
      }
      index += 1;
      if (!dernierDuBinome) {
        rang += 1;
        afficherMot();
        return;
      }
      rang = 0;
      if (avecPrenoms) afficherChoix();
      else afficherMot();
    }

    remplir(ctx.zone, panneau);
    dessiner();
    panneau.focus();
  }

  if (avecPrenoms) afficherChoix();
  else afficherMot();
  return () => retirerClavier();
}

monterJeu({
  slug: 'pyramide',
  schema,
  exemple,
  regles: [
    'Avant la séance, préparez une liste de mots à faire deviner. Les indices, ce sont les joueurs qui les trouvent !',
    'On joue par deux : l’un voit le mot et le fait deviner, l’autre se met dos à l’écran. Les rôles s’inversent à chaque mot.',
    'Un seul mot d’indice à la fois, puis une réponse. Raté ? Un autre mot d’indice, jusqu’à 4. Trouvé en 1 mot : 4 points, en 2 : 3 points, en 3 : 2 points, en 4 : 1 point.',
    'Faute si l’indice est de la même famille que le mot, en contient plusieurs ou s’accompagne d’un geste : le mot est perdu. Et le public ne souffle pas !',
  ],
  demarrer,
});

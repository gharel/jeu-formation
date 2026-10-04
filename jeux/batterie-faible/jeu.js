import { monterJeu } from '../../assets/js/commun/cadre-jeu.js';
import { el, remplir, icone, animer, focaliser } from '../../assets/js/commun/ui.js';
import { creerBoutonPoints } from '../../assets/js/commun/points.js';
import { lire, ecrire } from '../../assets/js/commun/stockage.js';
import { schema, exemple } from './exemple.js';
import { creerIllustrationBatterie } from './illustration.js';
import {
  decouper,
  etatInitial,
  jouerLettre,
  proposerMot,
  estDecouvert,
  batterieVide,
} from './logique.js';

const RANGEES_CLAVIER = ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN'];

function creerBatterie(crans) {
  const segments = el('div', { class: 'batterie__segments' });
  const libelle = el('p', { class: 'batterie__libelle' });
  const element = el(
    'div',
    { class: 'batterie', role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': String(crans) },
    el('div', { class: 'batterie__corps' }, segments, el('span', { class: 'batterie__borne' })),
    libelle,
  );
  return {
    element,
    afficher(restants) {
      const niveau = restants / crans;
      const etat = niveau > 0.5 ? 'pleine' : niveau > 0.25 ? 'moyenne' : 'faible';
      remplir(
        segments,
        Array.from({ length: crans }, (_, i) =>
          el('span', { class: `batterie__cran${i < restants ? ` batterie__cran--${etat}` : ''}` }),
        ),
      );
      element.setAttribute('aria-valuenow', String(restants));
      element.setAttribute(
        'aria-label',
        `Batterie : ${restants} cran${restants > 1 ? 's' : ''} sur ${crans}`,
      );
      remplir(
        libelle,
        icone(restants ? 'battery-half' : 'battery-empty'),
        restants ? `Batterie : ${restants} / ${crans}` : 'Batterie à plat',
      );
    },
  };
}

function demarrer(ctx) {
  const { crans } = ctx.reglages;
  const mots = ctx.elements;
  let index = 0;
  let auTourDe = null;
  let rafraichirTour = null;

  ctx.quandDesigne((prenom) => {
    auTourDe = prenom;
    rafraichirTour?.();
  });

  function afficherMot() {
    const { mot, theme, definition } = mots[index];
    const cases = decouper(mot);
    let etat = etatInitial();
    let fini = false;

    const tour = el('p', { class: 'au-tour-de', hidden: true });
    rafraichirTour = () => {
      tour.hidden = !auTourDe || fini;
      remplir(tour, icone('microphone'), `Au tour de ${auTourDe}`);
    };
    rafraichirTour();

    const affichageMot = el('div', {
      class: 'lettres__mot',
      role: 'group',
      'aria-label': 'Mot à découvrir',
    });
    const batterie = creerBatterie(crans);
    // Le téléphone suit sa batterie : il sourit, transpire, puis s'éteint
    const illustration = creerIllustrationBatterie();
    const ratees = el('p', { class: 'lettres__ratees' });
    const message = el('p', { class: 'lettres__message', 'aria-live': 'polite' });
    const clavier = el('div', { class: 'lettres__clavier', 'aria-label': 'Clavier' });
    const saisie = el('input', {
      id: 'lettres-saisie',
      class: 'champ__controle lettres__saisie',
      type: 'text',
      autocomplete: 'off',
      autocapitalize: 'characters',
      spellcheck: 'false',
      'aria-describedby': 'lettres-aide',
    });
    const saisieMot = el('input', {
      id: 'lettres-mot',
      class: 'champ__controle',
      type: 'text',
      autocomplete: 'off',
      spellcheck: 'false',
    });
    const formulaireMot = el(
      'form',
      { class: 'lettres__formulaire-mot' },
      el(
        'label',
        { for: 'lettres-mot', class: 'champ__libelle' },
        'Quelqu’un pense avoir trouvé le mot entier ?',
      ),
      el(
        'div',
        { class: 'champ__ligne' },
        saisieMot,
        el('button', { type: 'submit', class: 'bouton' }, 'Proposer'),
      ),
    );
    const commandes = el(
      'div',
      { class: 'lettres__commandes' },
      el('label', { for: 'lettres-saisie', class: 'champ__libelle' }, 'Lettre proposée'),
      saisie,
      el(
        'p',
        { id: 'lettres-aide', class: 'champ__aide' },
        'Tapez la lettre dite à l’oral, ou cliquez-la ci-dessous. É, È, Ê se jouent avec E.',
      ),
      clavier,
      formulaireMot,
    );
    const resultat = el('div', { class: 'lettres__resultat', hidden: true });

    function dessinerMot(revele = false) {
      remplir(
        affichageMot,
        cases.map((c) => {
          if (!c.lettre) {
            return el(
              'span',
              { class: c.affichage === ' ' ? 'lettres__espace' : 'lettres__signe' },
              c.affichage === ' ' ? '' : c.affichage,
            );
          }
          const trouvee = etat.proposees.includes(c.lettre);
          return el(
            'span',
            {
              class: `lettres__case${trouvee ? ' lettres__case--trouvee' : ''}${revele && !trouvee ? ' lettres__case--manquante' : ''}`,
            },
            trouvee || revele ? c.affichage : '',
          );
        }),
      );
      const visibles = cases.map((c) =>
        !c.lettre ? c.affichage : etat.proposees.includes(c.lettre) || revele ? c.affichage : '_',
      );
      affichageMot.setAttribute('aria-label', `Mot à découvrir : ${visibles.join(' ')}`);
    }

    function dessinerClavier() {
      remplir(
        clavier,
        RANGEES_CLAVIER.map((rangee) =>
          el(
            'div',
            { class: 'lettres__rangee' },
            [...rangee].map((lettre) => {
              const jouee = etat.proposees.includes(lettre);
              const bonne = jouee && cases.some((c) => c.lettre === lettre);
              return el(
                'button',
                {
                  type: 'button',
                  class: `lettres__touche${jouee ? (bonne ? ' lettres__touche--bonne' : ' lettres__touche--mauvaise') : ''}`,
                  disabled: jouee || fini,
                  'aria-label': jouee ? `${lettre}, déjà proposée` : lettre,
                  onclick: () => {
                    jouer(lettre);
                    saisie.focus();
                  },
                },
                lettre,
              );
            }),
          ),
        ),
      );
    }

    function dessinerEtat() {
      batterie.afficher(Math.max(0, crans - etat.erreurs));
      illustration.niveau(crans - etat.erreurs, crans);
      const fausses = etat.proposees.filter((l) => !cases.some((c) => c.lettre === l));
      remplir(ratees, fausses.length ? `Lettres absentes : ${fausses.join(' ')}` : '');
      dessinerClavier();
    }

    function verifierFin() {
      if (estDecouvert(cases, etat)) conclure(true);
      else if (batterieVide(etat, crans)) conclure(false);
    }

    function jouer(saisieLettre) {
      if (fini) return;
      const coup = jouerLettre(cases, etat, saisieLettre);
      if (coup.resultat === 'invalide') return;
      if (coup.resultat === 'deja') {
        remplir(message, `« ${coup.lettre} » a déjà été proposée.`);
        animer(message, 'secousse');
        return;
      }
      etat = coup.etat;
      illustration.reagir(coup.resultat === 'bonne' ? 'hop' : 'secousse');
      if (coup.resultat === 'bonne') {
        ctx.sons.batterie.lettre(coup.occurrences);
        remplir(message, `Oui ! ${coup.occurrences} « ${coup.lettre} »`);
      } else {
        ctx.sons.batterie.cran();
        remplir(message, `Pas de « ${coup.lettre} » : un cran de batterie en moins.`);
        animer(batterie.element, 'secousse');
      }
      dessinerMot();
      dessinerEtat();
      verifierFin();
    }

    function conclure(trouve) {
      fini = true;
      rafraichirTour();
      commandes.hidden = true;
      remplir(message);
      dessinerMot(!trouve);
      dessinerEtat();
      illustration.reagir(trouve ? 'fete' : 'secousse');
      if (trouve) ctx.sons.fanfare(3);
      else ctx.sons.batterie.aPlat();
      const dernier = index === mots.length - 1;
      const titre = el(
        'p',
        { class: 'lettres__verdict' },
        trouve
          ? [icone('face-grin-stars'), 'Mot découvert !']
          : [icone('battery-empty'), 'Batterie à plat !'],
      );
      remplir(
        resultat,
        titre,
        el(
          'div',
          { class: 'reponse-revelee' },
          el('p', { class: 'reponse-revelee__valeur' }, mot.toUpperCase()),
          definition ? el('p', {}, definition) : null,
        ),
        el(
          'div',
          { class: 'actions-jeu' },
          trouve ? creerBoutonPoints(ctx, { titre: 'Qui a trouvé le mot ?' }) : null,
          el(
            'button',
            {
              type: 'button',
              class: 'bouton bouton--sombre bouton--grand',
              onclick: () => {
                if (dernier) {
                  ctx.terminer({ message: 'Tous les mots ont été découverts.' });
                  return;
                }
                index += 1;
                afficherMot();
              },
            },
            dernier ? 'Voir le classement' : ['Mot suivant', icone('arrow-right')],
          ),
        ),
      );
      resultat.hidden = false;
      animer(resultat, 'apparition');
      ctx.annoncer(`${trouve ? 'Mot découvert' : 'Batterie à plat'} : ${mot}`);
      focaliser(titre);
    }

    saisie.addEventListener('input', () => {
      const valeur = saisie.value;
      saisie.value = '';
      if (valeur) jouer(valeur.slice(-1));
    });
    formulaireMot.addEventListener('submit', (e) => {
      e.preventDefault();
      if (fini || !saisieMot.value.trim()) return;
      const essai = proposerMot(cases, etat, saisieMot.value);
      etat = essai.etat;
      saisieMot.value = '';
      if (essai.juste) {
        dessinerMot();
        conclure(true);
        return;
      }
      ctx.sons.batterie.cran();
      remplir(message, 'Ce n’est pas le bon mot : un cran de batterie en moins.');
      animer(batterie.element, 'secousse');
      dessinerEtat();
      verifierFin();
    });

    remplir(
      ctx.zone,
      el(
        'div',
        { class: 'panneau lettres' },
        el(
          'div',
          { class: 'lettres__entete' },
          el('p', { class: 'panneau__surtitre' }, `Mot ${index + 1} sur ${mots.length}`),
          theme ? el('p', { class: 'lettres__theme' }, `Thème : ${theme}`) : null,
          tour,
        ),
        affichageMot,
        el(
          'div',
          { class: 'lettres__colonnes' },
          el(
            'div',
            { class: 'lettres__gauche' },
            el('div', { class: 'lettres__jauge' }, illustration.element, batterie.element),
            ratees,
            message,
          ),
          el('div', { class: 'lettres__droite' }, commandes, resultat),
        ),
      ),
    );
    dessinerMot();
    dessinerEtat();
    saisie.focus();
  }

  afficherMot();
}

// Le jeu s'appelait « lettre-a-lettre » : on récupère un contenu déjà préparé sous l'ancien nom.
if (lire('batterie-faible:contenu') === null && lire('lettre-a-lettre:contenu') !== null) {
  ecrire('batterie-faible:contenu', lire('lettre-a-lettre:contenu'));
}

monterJeu({
  slug: 'batterie-faible',
  schema,
  exemple,
  regles: [
    'Avant la séance, préparez des mots ou courtes expressions du numérique.',
    'Les participants proposent des lettres à l’oral : vous les tapez ou les cliquez.',
    'Chaque lettre absente vide un cran de la batterie. Batterie à plat : le mot est révélé.',
    'Celui ou celle qui découvre le mot (lettre par lettre ou d’un coup) gagne 1 point.',
  ],
  demarrer,
});

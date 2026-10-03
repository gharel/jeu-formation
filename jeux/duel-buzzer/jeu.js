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
import { creerDuel, autre, tirerDuellistes, TOUCHES } from './logique.js';

const COTES = ['gauche', 'droite'];

function demarrer(ctx) {
  const { pointsVictoire } = ctx.reglages;
  const questions = ctx.elements;
  const avecPrenoms = ctx.participants.length >= 2;
  let indexQuestion = 0;
  let retirerClavier = null;

  const restantes = () => questions.length - indexQuestion;
  const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

  // ---------- Choix des duellistes ----------
  function afficherChoix() {
    retirerClavier?.();
    retirerClavier = null;
    const titre = el('h3', { class: 'panneau__texte' }, 'Qui s’affronte ?');
    const erreur = el('p', { class: 'duel__erreur', role: 'alert' });
    const selecteurs = {};
    let choix = el(
      'p',
      {},
      'Sans prénoms enregistrés, les joueurs s’appellent « Gauche » et « Droite ».',
    );

    if (avecPrenoms) {
      for (const cote of COTES) {
        selecteurs[cote] = el(
          'select',
          { id: `duel-${cote}`, class: 'champ__controle' },
          ctx.participants.map((p) => el('option', { value: p }, p)),
        );
      }
      const tirer = () => {
        const [g, d] = tirerDuellistes(ctx.participants, ctx.hasard);
        selecteurs.gauche.value = g;
        selecteurs.droite.value = d;
        erreur.textContent = '';
      };
      tirer();
      choix = el(
        'div',
        { class: 'duel__choix' },
        el(
          'div',
          { class: 'champ' },
          el('label', { for: 'duel-gauche', class: 'champ__libelle' }, 'À gauche, touche A'),
          selecteurs.gauche,
        ),
        el('span', { class: 'duel__contre', 'aria-hidden': 'true' }, 'VS'),
        el(
          'div',
          { class: 'champ' },
          el('label', { for: 'duel-droite', class: 'champ__libelle' }, 'À droite, touche L'),
          selecteurs.droite,
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
      );
    }

    const commencer = el(
      'button',
      {
        type: 'button',
        class: 'bouton bouton--principal bouton--grand',
        onclick: () => {
          const noms = avecPrenoms
            ? { gauche: selecteurs.gauche.value, droite: selecteurs.droite.value }
            : { gauche: 'Gauche', droite: 'Droite' };
          if (noms.gauche === noms.droite) {
            erreur.textContent = 'Choisissez deux personnes différentes.';
            return;
          }
          afficherDuel(noms);
        },
      },
      'Commencer le duel',
    );

    remplir(
      ctx.zone,
      el(
        'div',
        { class: 'panneau duel-choix' },
        el(
          'p',
          { class: 'panneau__surtitre' },
          `${pluriel(restantes(), 'question')} · ${pluriel(pointsVictoire, 'point')} pour gagner`,
        ),
        titre,
        choix,
        erreur,
        el(
          'p',
          { class: 'champ__aide' },
          'Les deux joueurs viennent au clavier : touche A à gauche, touche L à droite.',
        ),
        el('div', { class: 'actions-jeu' }, commencer),
      ),
    );
    focaliser(titre);
  }

  // ---------- Duel ----------
  function afficherDuel(noms) {
    const duel = creerDuel({ pointsVictoire });
    const cotes = {};
    for (const cote of COTES) {
      const points = el('ol', { class: 'duel__points' });
      const bloc = el(
        'div',
        { class: `duel__joueur duel__joueur--${cote}` },
        el('kbd', { class: 'duel__touche' }, TOUCHES[cote].toUpperCase()),
        el('p', { class: 'duel__nom' }, noms[cote]),
        points,
      );
      cotes[cote] = { bloc, points };
    }

    const surtitre = el('p', { class: 'panneau__surtitre' });
    const question = el('p', { class: 'duel__question' });
    const statut = el('p', { class: 'duel__statut', 'aria-live': 'assertive' });
    const reponse = el('div', { class: 'reponse-revelee duel__reponse', hidden: true });
    const actions = el('div', { class: 'actions-jeu' });
    const plateau = el(
      'div',
      { class: 'duel', tabindex: '-1' },
      cotes.gauche.bloc,
      el('div', { class: 'duel__centre' }, surtitre, question, statut, reponse, actions),
      cotes.droite.bloc,
    );
    let actionEntree = null;

    function bouton(texte, classe, action) {
      return el(
        'button',
        {
          type: 'button',
          class: `bouton bouton--grand ${classe}`,
          onclick: () => {
            action();
            // Le focus revient au plateau : A, L, Entrée et Retour arrière restent actifs
            plateau.focus();
          },
        },
        texte,
      );
    }

    function dessinerPoints() {
      const p = duel.points;
      for (const cote of COTES) {
        remplir(
          cotes[cote].points,
          Array.from({ length: pointsVictoire }, (_, i) =>
            el('li', { class: `duel__point${i < p[cote] ? ' duel__point--gagne' : ''}` }),
          ),
        );
        cotes[cote].points.setAttribute(
          'aria-label',
          `Points de ${noms[cote]} : ${p[cote]} sur ${pointsVictoire}`,
        );
        cotes[cote].bloc.classList.toggle('duel__joueur--main', duel.main === cote);
      }
    }

    function montrerReponse() {
      remplir(
        reponse,
        el('p', { class: 'panneau__surtitre' }, 'Réponse'),
        el('p', { class: 'reponse-revelee__valeur' }, questions[indexQuestion].reponse),
      );
      reponse.hidden = false;
    }

    function dessiner() {
      dessinerPoints();
      surtitre.textContent = `Question ${indexQuestion + 1} sur ${questions.length}`;
      if (duel.phase === 'attente') {
        remplir(question, 'Mains sur les buzzers… Prêts ?');
        question.classList.add('duel__question--attente');
        remplir(statut, '');
        reponse.hidden = true;
        actionEntree = afficherQuestion;
        remplir(
          actions,
          bouton('Afficher la question (Entrée)', 'bouton--principal', afficherQuestion),
        );
      } else if (duel.phase === 'ouvert') {
        remplir(question, questions[indexQuestion].question);
        question.classList.remove('duel__question--attente');
        remplir(statut, 'À vos buzzers ! Touche A ou touche L');
        actionEntree = null;
        remplir(actions, bouton('Personne ne sait', 'bouton--discret', passer));
      } else if (duel.phase === 'buzze') {
        remplir(statut, `${noms[duel.main]} répond !`);
        actionEntree = () => valider(true);
        remplir(
          actions,
          bouton([icone('check'), 'Bonne (Entrée)'], 'bouton--succes', () => valider(true)),
          bouton([icone('xmark'), 'Mauvaise (Retour arrière)'], 'bouton--danger', () =>
            valider(false),
          ),
          bouton([icone('eye'), 'Voir la réponse'], 'bouton--discret', montrerReponse),
        );
      } else {
        dessinerFin();
      }
    }

    function dessinerFin() {
      montrerReponse();
      const derniere = indexQuestion >= questions.length - 1;
      if (duel.vainqueur) {
        const gagnant = noms[duel.vainqueur];
        remplir(statut, icone('trophy'), `${gagnant} gagne le duel !`);
        cotes[duel.vainqueur].bloc.classList.add('duel__joueur--vainqueur');
        ctx.sons.duel.victoire();
        actionEntree = null;
        remplir(
          actions,
          derniere
            ? null
            : bouton('Nouveau duel', 'bouton--principal', () => {
                indexQuestion += 1;
                afficherChoix();
              }),
          bouton('Voir le classement', 'bouton--sombre', () =>
            ctx.terminer({ message: `${gagnant} remporte le dernier duel !` }),
          ),
        );
        return;
      }
      const suite = derniere
        ? () => ctx.terminer({ message: 'Toutes les questions ont été posées.' })
        : () => {
            indexQuestion += 1;
            duel.preparer();
            dessiner();
          };
      actionEntree = suite;
      remplir(
        actions,
        bouton(
          derniere ? 'Voir le classement' : 'Question suivante (Entrée)',
          'bouton--sombre',
          suite,
        ),
      );
    }

    function afficherQuestion() {
      if (!duel.ouvrir()) return;
      dessiner();
      animer(question, 'apparition');
    }

    function buzz(cote) {
      if (!duel.buzzer(cote)) return;
      ctx.sons.duel.buzz(cote);
      dessiner();
      animer(cotes[cote].bloc, 'duel__joueur--buzz');
    }

    function valider(bonne) {
      const cote = duel.main;
      const issue = duel.valider(bonne);
      if (issue === null) return;
      if (issue === 'point') {
        // La victoire a sa propre fanfare (dessinerFin)
        if (!duel.vainqueur) ctx.sons.duel.bonne();
        if (ctx.participants.includes(noms[cote])) ctx.scores.ajouter(noms[cote], 1);
      } else {
        ctx.sons.duel.mauvaise();
      }
      dessiner();
      if (issue === 'main-adverse') remplir(statut, `Raté ! ${noms[autre(cote)]} peut répondre`);
      if (issue === 'personne') remplir(statut, 'Raté des deux côtés : pas de point.');
    }

    function passer() {
      duel.passer();
      remplir(statut, 'Personne ne sait : pas de point.');
      dessinerFin();
    }

    retirerClavier?.();
    retirerClavier = ecouterClavier({
      [TOUCHES.gauche]: () => buzz('gauche'),
      [TOUCHES.droite]: () => buzz('droite'),
      Entrée: () => actionEntree?.(),
      Retour: () => valider(false),
    });

    remplir(ctx.zone, plateau);
    dessiner();
    plateau.focus();
  }

  afficherChoix();
  return () => retirerClavier?.();
}

monterJeu({
  slug: 'duel-buzzer',
  schema,
  exemple,
  regles: [
    'Avant la séance, préparez des questions courtes avec leur réponse.',
    'Choisissez deux participants (ou tirez-les au sort). Ils viennent au clavier : A à gauche, L à droite.',
    'Affichez la question : le premier qui appuie sur sa touche répond. Pas de faux départ possible !',
    'Bonne réponse : 1 point. Mauvaise : la main passe à l’adversaire. Le premier à 3 points gagne.',
  ],
  demarrer,
});

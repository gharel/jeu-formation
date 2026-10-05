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
import { creerIllustrationDuel } from './illustration.js';

const COTES = ['gauche', 'droite'];

/** Aide « (Entrée) » d'un bouton : inutile sur téléphone, où elle est masquée (base.css). */
const aideClavier = (touche) => el('span', { class: 'aide-clavier' }, ` (${touche})`);

function demarrer(ctx) {
  const { pointsVictoire } = ctx.reglages;
  const questions = ctx.elements;
  const avecPrenoms = ctx.participants.length >= 2;
  let indexQuestion = 0;
  let retirerClavier = null;
  // Le buzzer du plateau : il s'enfonce quand quelqu'un buzze
  const illustration = creerIllustrationDuel();

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
        illustration.element,
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
          'Pour buzzer : touche A à gauche, touche L à droite, ou le gros bouton de son côté de l’écran (souris ou écran tactile).',
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
      const touche = TOUCHES[cote].toUpperCase();
      // Les pastilles sont créées une fois : un point gagné colore la sienne
      const pastilles = Array.from({ length: pointsVictoire }, () =>
        el('li', { class: 'duel__point' }),
      );
      const points = el('ol', { class: 'duel__points' }, pastilles);
      // Buzzer à l'écran, pour la souris et le tactile (sur téléphone, pas de touche A ni L).
      // Il réagit dès l'appui (pointerdown) : le plus rapide gagne, pas celui qui relâche.
      // Le clic qui suit (ou Entrée sur le bouton) est refusé par la logique : déjà buzzé.
      const buzzer = el(
        'button',
        {
          type: 'button',
          class: 'duel__buzzer',
          'aria-label': `Buzzer de ${noms[cote]} (touche ${touche})`,
          'aria-keyshortcuts': touche,
          onpointerdown: (e) => {
            if (e.button === 0) buzz(cote);
          },
          onclick: () => {
            buzz(cote);
            // Le focus revient au plateau : Entrée et Retour arrière restent actifs
            plateau.focus();
          },
        },
        el('span', { class: 'duel__touche', 'aria-hidden': 'true' }, touche),
      );
      const bloc = el(
        'div',
        { class: `duel__joueur duel__joueur--${cote}` },
        buzzer,
        el('p', { class: 'duel__nom' }, noms[cote]),
        points,
      );
      cotes[cote] = { bloc, points, pastilles };
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
      el(
        'div',
        { class: 'duel__centre' },
        illustration.element,
        surtitre,
        question,
        statut,
        reponse,
        actions,
      ),
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
        cotes[cote].pastilles.forEach((pastille, i) => {
          pastille.classList.toggle('duel__point--gagne', i < p[cote]);
        });
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

    /** `message` : le statut à afficher si la main passe à l'adversaire (sinon « X répond ! »). */
    function dessiner(message = null) {
      dessinerPoints();
      illustration.etat(duel.phase === 'buzze' ? 'buzze' : null);
      // Les buzzers s'allument quand la question s'affiche
      plateau.classList.toggle('duel--ouvert', duel.phase === 'ouvert');
      surtitre.textContent = `Question ${indexQuestion + 1} sur ${questions.length}`;
      if (duel.phase === 'attente') {
        remplir(question, 'Mains sur les buzzers… Prêts ?');
        question.classList.add('duel__question--attente');
        remplir(statut, '');
        reponse.hidden = true;
        actionEntree = afficherQuestion;
        remplir(
          actions,
          bouton(
            ['Afficher la question', aideClavier('Entrée')],
            'bouton--principal',
            afficherQuestion,
          ),
        );
      } else if (duel.phase === 'ouvert') {
        remplir(question, questions[indexQuestion].question);
        question.classList.remove('duel__question--attente');
        remplir(statut, 'À vos buzzers !', el('span', { class: 'aide-clavier' }, ' Touche A ou L'));
        actionEntree = null;
        remplir(actions, bouton('Personne ne sait', 'bouton--discret', passer));
      } else if (duel.phase === 'buzze') {
        remplir(statut, message ?? `${noms[duel.main]} répond !`);
        actionEntree = () => valider(true);
        remplir(
          actions,
          bouton([icone('check'), 'Bonne', aideClavier('Entrée')], 'bouton--succes', () =>
            valider(true),
          ),
          bouton(
            [icone('xmark'), 'Mauvaise', aideClavier('Retour arrière')],
            'bouton--danger',
            () => valider(false),
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
        // La fanfare une fois l'écran construit
        ctx.sons.duel.victoire();
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
          derniere ? 'Voir le classement' : ['Question suivante', aideClavier('Entrée')],
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
      dessiner();
      animer(cotes[cote].bloc, 'duel__joueur--buzz');
      ctx.sons.duel.buzz(cote);
    }

    function valider(bonne) {
      const cote = duel.main;
      const issue = duel.valider(bonne);
      if (issue === null) return;
      if (issue === 'point' && ctx.participants.includes(noms[cote])) {
        ctx.scores.ajouter(noms[cote], 1);
      }
      dessiner(issue === 'main-adverse' ? `Raté ! ${noms[autre(cote)]} peut répondre` : null);
      if (issue === 'personne') remplir(statut, 'Raté des deux côtés : pas de point.');
      // L'illustration et le son une fois le plateau à jour (la victoire a sa propre fanfare,
      // jouée par dessinerFin)
      illustration.reagir(issue === 'point' ? 'fete' : 'secousse');
      if (issue !== 'point') ctx.sons.duel.mauvaise();
      else if (!duel.vainqueur) ctx.sons.duel.bonne();
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
    'Choisissez deux participants (ou tirez-les au sort). Pour buzzer : touche A à gauche, L à droite, ou leur buzzer à l’écran (souris, écran tactile).',
    'Affichez la question : le premier qui buzze répond. Pas de faux départ possible !',
    'Bonne réponse : 1 point. Mauvaise : la main passe à l’adversaire. Le premier à 3 points gagne.',
  ],
  demarrer,
});

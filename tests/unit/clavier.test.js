import { describe, it, expect, vi, afterEach } from 'vitest';
import { ecouterClavier, aideTouches } from '../../assets/js/commun/ui.js';

let retirer = null;

afterEach(() => {
  retirer?.();
  retirer = null;
  document.body.replaceChildren();
});

/** Appuie sur une touche ; renvoie l'événement pour lire defaultPrevented. */
function appuyer(touche, { cible = document.body, ...options } = {}) {
  const evenement = new KeyboardEvent('keydown', {
    key: touche,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  cible.dispatchEvent(evenement);
  return evenement;
}

describe('ecouterClavier : rôles', () => {
  it('suivant répond à Espace et à la flèche droite', () => {
    const suivant = vi.fn();
    retirer = ecouterClavier({ suivant });
    appuyer(' ');
    appuyer('ArrowRight');
    expect(suivant).toHaveBeenCalledTimes(2);
  });

  it('valider répond à Entrée seulement, erreur à Retour arrière, pause à P', () => {
    const actions = { suivant: vi.fn(), valider: vi.fn(), erreur: vi.fn(), pause: vi.fn() };
    retirer = ecouterClavier(actions);
    appuyer('Enter');
    expect(actions.valider).toHaveBeenCalledTimes(1);
    expect(actions.suivant).not.toHaveBeenCalled();
    appuyer('Backspace');
    expect(actions.erreur).toHaveBeenCalledTimes(1);
    appuyer('p');
    appuyer('P');
    expect(actions.pause).toHaveBeenCalledTimes(2);
  });

  it('Entrée n’avance pas quand seul suivant est déclaré', () => {
    const suivant = vi.fn();
    retirer = ecouterClavier({ suivant });
    const evenement = appuyer('Enter');
    expect(suivant).not.toHaveBeenCalled();
    expect(evenement.defaultPrevented).toBe(false);
  });

  it('une touche nommée reste possible, et l’emporte sur son rôle', () => {
    const r = vi.fn();
    const espace = vi.fn();
    const suivant = vi.fn();
    retirer = ecouterClavier({ r, Espace: espace, suivant });
    appuyer('r');
    appuyer(' ');
    appuyer('ArrowRight');
    expect(r).toHaveBeenCalledTimes(1);
    expect(espace).toHaveBeenCalledTimes(1);
    expect(suivant).toHaveBeenCalledTimes(1);
  });

  it('retire l’écoute', () => {
    const suivant = vi.fn();
    ecouterClavier({ suivant })();
    appuyer(' ');
    expect(suivant).not.toHaveBeenCalled();
  });

  it('empêche l’action par défaut de la touche prise (pas de défilement avec Espace)', () => {
    retirer = ecouterClavier({ suivant: vi.fn() });
    expect(appuyer(' ').defaultPrevented).toBe(true);
  });
});

describe('ecouterClavier : touches ignorées', () => {
  it('dans un champ de saisie : rien ne part (Entrée, Espace, flèche, Retour arrière)', () => {
    const actions = { suivant: vi.fn(), valider: vi.fn(), erreur: vi.fn(), pause: vi.fn() };
    retirer = ecouterClavier(actions);
    const champ = document.body.appendChild(document.createElement('input'));
    const zone = document.body.appendChild(document.createElement('textarea'));
    for (const cible of [champ, zone]) {
      for (const touche of [' ', 'ArrowRight', 'Enter', 'Backspace', 'p']) {
        const evenement = appuyer(touche, { cible });
        expect(evenement.defaultPrevented).toBe(false);
      }
    }
    for (const action of Object.values(actions)) expect(action).not.toHaveBeenCalled();
  });

  it('une fenêtre de dialogue ouverte garde les touches', () => {
    const suivant = vi.fn();
    retirer = ecouterClavier({ suivant, valider: suivant, erreur: suivant });
    const dialogue = document.body.appendChild(document.createElement('dialog'));
    dialogue.setAttribute('open', '');
    appuyer(' ');
    appuyer('ArrowRight');
    appuyer('Enter');
    appuyer('Backspace');
    expect(suivant).not.toHaveBeenCalled();
  });

  it('la répétition d’une touche maintenue et Ctrl / Alt / Cmd sont ignorés', () => {
    const suivant = vi.fn();
    retirer = ecouterClavier({ suivant });
    appuyer(' ', { repeat: true });
    appuyer('ArrowRight', { ctrlKey: true });
    appuyer('ArrowRight', { altKey: true });
    appuyer('ArrowRight', { metaKey: true });
    expect(suivant).not.toHaveBeenCalled();
  });

  it('la flèche déjà prise par un autre écouteur (defaultPrevented) est ignorée', () => {
    const suivant = vi.fn();
    retirer = ecouterClavier({ suivant });
    const grille = document.body.appendChild(document.createElement('div'));
    grille.addEventListener('keydown', (e) => e.preventDefault());
    appuyer('ArrowRight', { cible: grille });
    expect(suivant).not.toHaveBeenCalled();
  });

  it('la flèche droite est laissée aux curseurs, listes, onglets et boutons radio', () => {
    const suivant = vi.fn();
    retirer = ecouterClavier({ suivant });
    const intrus = [
      document.createElement('select'),
      Object.assign(document.createElement('input'), { type: 'range' }),
      Object.assign(document.createElement('input'), { type: 'radio' }),
      Object.assign(document.createElement('div'), { tabIndex: 0 }),
      Object.assign(document.createElement('div'), { tabIndex: 0 }),
    ];
    intrus[3].setAttribute('role', 'spinbutton');
    intrus[4].setAttribute('role', 'slider');
    for (const cible of intrus) {
      document.body.append(cible);
      appuyer('ArrowRight', { cible });
    }
    expect(suivant).not.toHaveBeenCalled();
  });

  it('sur un bouton : Espace et Entrée restent au bouton, → et Retour arrière servent', () => {
    const actions = { suivant: vi.fn(), valider: vi.fn(), erreur: vi.fn() };
    retirer = ecouterClavier(actions);
    const bouton = document.body.appendChild(document.createElement('button'));
    appuyer(' ', { cible: bouton });
    appuyer('Enter', { cible: bouton });
    expect(actions.suivant).not.toHaveBeenCalled();
    expect(actions.valider).not.toHaveBeenCalled();
    appuyer('ArrowRight', { cible: bouton });
    appuyer('Backspace', { cible: bouton });
    expect(actions.suivant).toHaveBeenCalledTimes(1);
    expect(actions.erreur).toHaveBeenCalledTimes(1);
  });
});

describe('aideTouches', () => {
  it('écrit la ligne d’aide avec les touches de chaque rôle', () => {
    const ligne = aideTouches([
      ['suivant', 'mot suivant'],
      ['valider', 'trouvé'],
      ['erreur', 'raté'],
    ]);
    expect(ligne.className).toBe('raccourci');
    expect([...ligne.querySelectorAll('kbd')].map((k) => k.textContent)).toEqual([
      'Espace',
      '→',
      'Entrée',
      'Retour arrière',
    ]);
    expect(ligne.textContent.replaceAll(' ', ' ')).toBe(
      'Espace ou → : mot suivant · Entrée : trouvé · Retour arrière : raté',
    );
  });

  it('remplit une ligne existante, et la cache quand il n’y a rien à dire', () => {
    const ligne = document.createElement('p');
    expect(aideTouches([['pause', 'pause']], ligne)).toBe(ligne);
    expect(ligne.hidden).toBe(false);
    aideTouches([], ligne);
    expect(ligne.hidden).toBe(true);
    expect(ligne.textContent).toBe('');
  });

  it('affiche telle quelle une touche qui n’est pas un rôle', () => {
    const ligne = aideTouches([['R', 'la roue']]);
    expect(ligne.querySelector('kbd').textContent).toBe('R');
  });
});

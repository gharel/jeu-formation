import { describe, it, expect } from 'vitest';
import {
  normaliserReponse,
  distanceEdition,
  fautesPermises,
  variantes,
  reponseAffichee,
  trouverReponse,
  estBonneReponse,
} from '../../assets/js/commun/reponses.js';

describe('réponses tapées par l’animateur', () => {
  it('ignore majuscules, accents, espaces et ponctuation', () => {
    expect(normaliserReponse('  Échap ! ')).toBe('echap');
    expect(normaliserReponse('Ctrl + S')).toBe(normaliserReponse('ctrl+s'));
    expect(normaliserReponse('Cœur')).toBe('coeur');
    expect(normaliserReponse('.PDF')).toBe('pdf');
    expect(normaliserReponse('1 989')).toBe('1989');
  });

  it('retire un article en tête, s’il reste un mot après', () => {
    expect(normaliserReponse('Le cloud')).toBe('cloud');
    expect(normaliserReponse('l’arobase')).toBe('arobase');
    expect(normaliserReponse('La corbeille')).toBe(normaliserReponse('corbeille'));
    expect(normaliserReponse('de la mémoire')).toBe('memoire');
    expect(normaliserReponse('Une souris')).toBe('souri');
    expect(normaliserReponse('Le')).toBe('le');
  });

  it('confond singulier et pluriel', () => {
    expect(normaliserReponse('Les mots de passe')).toBe(normaliserReponse('mot de passe'));
    expect(normaliserReponse('jeux')).toBe(normaliserReponse('jeu'));
    // Les mots courts restent tels quels
    expect(normaliserReponse('os')).toBe('os');
  });

  it('mesure la distance d’édition', () => {
    expect(distanceEdition('chat', 'chat')).toBe(0);
    expect(distanceEdition('chat', 'chats')).toBe(1);
    expect(distanceEdition('instagram', 'instagran')).toBe(1);
    expect(distanceEdition('', 'abc')).toBe(3);
    expect(distanceEdition('kitten', 'sitting')).toBe(3);
  });

  it('pardonne les fautes de frappe selon la longueur, jamais dans un nombre', () => {
    expect(fautesPermises('wifi')).toBe(0);
    expect(fautesPermises('souris')).toBe(1);
    expect(fautesPermises('navigateur')).toBe(2);
    expect(fautesPermises('1989')).toBe(0);
    expect(fautesPermises('ctrl1')).toBe(0);
  });

  it('découpe les variantes sur « / » entouré d’espaces', () => {
    expect(variantes('X / Twitter')).toEqual(['X', 'Twitter']);
    expect(variantes('TCP/IP')).toEqual(['TCP/IP']);
    expect(variantes(' Échap  /  Esc / ')).toEqual(['Échap', 'Esc']);
    expect(variantes('')).toEqual([]);
    expect(reponseAffichee('Google Chrome / Chrome')).toBe('Google Chrome');
    expect(reponseAffichee(null)).toBe('');
  });

  it('reconnaît une bonne réponse et ses variantes', () => {
    expect(estBonneReponse('esc', 'Échap / Esc / Escape')).toBe(true);
    expect(estBonneReponse('la touche echap', 'Échap')).toBe(false);
    expect(estBonneReponse('Corbeil', 'La corbeille')).toBe(false);
    expect(estBonneReponse('corbeile', 'La corbeille')).toBe(true);
    expect(estBonneReponse('1998', '1989')).toBe(false);
    expect(estBonneReponse('1989', '1989')).toBe(true);
    expect(estBonneReponse('', 'Wi-Fi')).toBe(false);
    expect(estBonneReponse('wifi', 'Wi-Fi')).toBe(true);
  });

  it('trouve la réponse la plus proche, l’exacte d’abord', () => {
    const reponses = ['Facebook', 'Instagram', 'TikTok', 'LinkedIn', 'X / Twitter'];
    expect(trouverReponse('instagram', reponses)).toBe(1);
    expect(trouverReponse('Instagrame', reponses)).toBe(1);
    expect(trouverReponse('twitter', reponses)).toBe(4);
    expect(trouverReponse('x', reponses)).toBe(4);
    expect(trouverReponse('Snapchat', reponses)).toBe(-1);
    expect(trouverReponse('   ', reponses)).toBe(-1);
    // Une correspondance exacte gagne sur une réponse voisine à une faute près
    expect(trouverReponse('partage', ['Partager', 'Partage'])).toBe(1);
    expect(trouverReponse('partager', ['Partager', 'Partage'])).toBe(0);
    expect(trouverReponse('tableur', ['Tableau', 'Tableur'])).toBe(1);
  });
});

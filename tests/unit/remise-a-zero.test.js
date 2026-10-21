import { describe, it, expect, vi, beforeEach } from 'vitest';
import { partiesAVider, decrireParties, viderTout } from '../../assets/js/commun/remise-a-zero.js';
import { lire, ecrire } from '../../assets/js/commun/stockage.js';

function groupeFactice() {
  return { remplacer: vi.fn(), changerEquipes: vi.fn(), reinitialiserScores: vi.fn() };
}

describe('nouvelle formation : tout vider', () => {
  beforeEach(() => localStorage.clear());

  it('vide les équipes et les scores avec les joueurs', () => {
    expect(partiesAVider(['joueurs'])).toEqual(['joueurs', 'equipes', 'scores']);
    expect(partiesAVider(['contenus', 'scores'])).toEqual(['scores', 'contenus']);
    expect(partiesAVider([])).toEqual([]);
    expect(decrireParties(['equipes', 'scores', 'contenus'])).toBe(
      'les équipes, les scores et les contenus des jeux',
    );
    expect(decrireParties(['scores'])).toBe('les scores');
  });

  it('vide le groupe d’un coup, sans toucher aux contenus', async () => {
    const groupe = groupeFactice();
    ecrire('motus:contenu', { elements: [] });
    ecrire('mode-jeu', 'equipes');
    ecrire('joueurs-tires', ['ana']);
    expect(await viderTout(groupe, ['joueurs'])).toEqual(['joueurs', 'equipes', 'scores']);
    expect(groupe.remplacer).toHaveBeenCalledWith({});
    expect(lire('joueurs-tires')).toEqual([]);
    expect(lire('mode-jeu')).toBeNull();
    expect(lire('motus:contenu')).toEqual({ elements: [] });
  });

  it('vide seulement les scores, ou seulement les équipes', async () => {
    const groupe = groupeFactice();
    await viderTout(groupe, ['scores']);
    expect(groupe.reinitialiserScores).toHaveBeenCalled();
    expect(groupe.changerEquipes).not.toHaveBeenCalled();
    expect(groupe.remplacer).not.toHaveBeenCalled();
    await viderTout(groupe, ['equipes']);
    expect(groupe.changerEquipes).toHaveBeenCalledWith([]);
  });

  it('remet les contenus d’exemple, minuteurs et sources compris, et garde le reste', async () => {
    const groupe = groupeFactice();
    ecrire('motus:contenu', { elements: [] });
    ecrire('motus:lancement', { tempsManche: 30 });
    ecrire('sources-contenus', { motus: 'Google Sheets' });
    ecrire('thematiques', [{ slug: 'perso-1' }]);
    ecrire('son', false);
    await viderTout(groupe, ['contenus']);
    expect(lire('motus:contenu')).toBeNull();
    expect(lire('motus:lancement')).toBeNull();
    expect(lire('sources-contenus').motus).toBeUndefined();
    expect(lire('thematiques')).toEqual([{ slug: 'perso-1' }]);
    expect(lire('son')).toBe(false);
    expect(groupe.remplacer).not.toHaveBeenCalled();
  });
});

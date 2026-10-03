import { defineConfig, devices } from '@playwright/test';
import { EMPREINTE, CLE_ACCES } from './assets/js/commun/acces.js';

// PORT_E2E=4199 npm run test:e2e : pour tester un worktree quand npm run dev occupe déjà 4173
const PORT = Number(process.env.PORT_E2E) || 4173;

// Les pages s'ouvrent déverrouillées, comme après la saisie du mot de passe (voir acces.spec.js)
const deverrouille = {
  cookies: [],
  origins: [
    {
      origin: `http://localhost:${PORT}`,
      localStorage: [{ name: `skazy-jeux:${CLE_ACCES}`, value: JSON.stringify(EMPREINTE) }],
    },
  ],
};

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    storageState: deverrouille,
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
  ],
  webServer: {
    command: `npx serve -l ${PORT} .`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});

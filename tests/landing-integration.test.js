import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const landingHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');

describe('landing page integration', () => {
  it('loads the main dashboard preview eagerly', () => {
    expect(landingHtml).toMatch(/dashboard-preview\.png[^>]+loading="eager"[^>]+fetchpriority="high"/);
  });

  it('does not force menu-toggle focus when closing navigation', () => {
    expect(landingHtml).not.toMatch(/^\s*menuToggle\.focus\(\);/m);
    expect(landingHtml).toContain('if (restoreFocus) menuToggle.focus();');
  });

  it('does not claim Turf.js', () => {
    expect(landingHtml).not.toContain('Turf.js');
  });

  it('does not depend on remote web fonts', () => {
    expect(landingHtml).not.toContain('fonts.googleapis.com');
    expect(landingHtml).not.toContain('fonts.gstatic.com');
  });
});

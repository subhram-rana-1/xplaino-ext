// src/content/utils/portalRoot.ts
// Shared portal container for components that render outside Shadow DOM
// so injected CSS variables are scoped and don't override page :root theme

export const PORTAL_ROOT_ID = 'xplaino-portal-root';

export function getOrCreatePortalContainer(): HTMLElement {
  let el = document.getElementById(PORTAL_ROOT_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = PORTAL_ROOT_ID;
    document.body.appendChild(el);
  }
  return el;
}

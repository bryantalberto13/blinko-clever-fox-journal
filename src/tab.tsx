import { render } from 'preact';
import { CheckInsPage } from './CheckInsPage';
import { CSS } from './styles';

/**
 * Blinko has no page/menu hook for plugins, so we do two things:
 *  1. push an item into the (observable) baseStore.routerList that the sidebar renders from;
 *  2. while the URL is /?path=checkins, mount our page inside Blinko's `.layout-container`,
 *     hiding whatever Blinko rendered there (the home feed, which the unknown path falls back to).
 */
export const ROUTE = 'checkins';
const ROOT_ID = 'cf-root';
const STYLE_ID = 'cf-style';
const HIDDEN_ATTR = 'data-cf-hidden';

let timer: number | undefined;
let root: HTMLElement | null = null;

const isActive = () => location.pathname === '/' && new URLSearchParams(location.search).get('path') === ROUTE;

function mount(container: HTMLElement) {
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }
  if (!root) {
    root = document.createElement('div');
    root.id = ROOT_ID;
    render(<CheckInsPage />, root);
  }
  if (root.parentElement !== container) container.appendChild(root);
  for (const el of Array.from(container.children) as HTMLElement[]) {
    if (el !== root && !el.hasAttribute(HIDDEN_ATTR)) {
      el.setAttribute(HIDDEN_ATTR, el.style.display || '-');
      el.style.display = 'none';
    }
  }
}

function unmount() {
  document.querySelectorAll<HTMLElement>(`[${HIDDEN_ATTR}]`).forEach(el => {
    const prev = el.getAttribute(HIDDEN_ATTR);
    el.style.display = prev && prev !== '-' ? prev : '';
    el.removeAttribute(HIDDEN_ATTR);
  });
  if (root) {
    render(null, root); // unmount so the next visit starts fresh
    root.remove();
    root = null;
  }
}

function sync() {
  const container = document.querySelector<HTMLElement>('.layout-container');
  if (isActive() && container) mount(container);
  else if (root || document.querySelector(`[${HIDDEN_ATTR}]`)) unmount();
}

export function installTab(title: string) {
  const base: any = window.Blinko.store.baseStore;
  if (!base.routerList.some((r: any) => r.title === ROUTE)) {
    const at = base.routerList.findIndex((r: any) => r.title === 'todo') + 1 || 3;
    base.routerList.splice(at, 0, {
      title: ROUTE,
      href: `/?path=${ROUTE}`,
      shallow: true,
      icon: 'solar:notebook-linear',
    });
  }
  // Sidebar labels go through t(title): give it a readable string.
  const i18n = window.Blinko.i18n;
  for (const lng of new Set(['en', i18n.language, ...(i18n.languages ?? [])])) {
    if (lng) i18n.addResourceBundle(lng, 'translation', { [ROUTE]: title }, true, true);
  }
  // SPA navigation doesn't reload the page, so poll cheaply.
  timer = window.setInterval(sync, 250);
  sync();
}

export function uninstallTab() {
  if (timer) window.clearInterval(timer);
  unmount();
  document.getElementById(STYLE_ID)?.remove();
  const base: any = window.Blinko.store.baseStore;
  const i = base.routerList.findIndex((r: any) => r.title === ROUTE);
  if (i >= 0) base.routerList.splice(i, 1);
}

import { render } from 'preact';
import type { FunctionComponent } from 'preact';
import { CheckInsPage } from './CheckInsPage';
import { GuidedJournal } from './GuidedJournal';
import { GuidedExploration } from './GuidedExploration';
import { CSS } from './styles';

/**
 * Blinko has no page/menu hook for plugins, so for each tab we do two things:
 *  1. push an item into the (observable) baseStore.routerList that the sidebar renders from;
 *  2. while the URL is /?path=<route>, mount our page inside Blinko's `.layout-container`,
 *     hiding whatever Blinko rendered there (the home feed, which an unknown path falls back to).
 */
export interface TabDef {
  route: string;
  title: string;
  icon: string;
  Component: FunctionComponent;
}

export const TABS: TabDef[] = [
  { route: 'checkins', title: 'Personal Check Ins', icon: 'solar:notebook-linear', Component: CheckInsPage },
  { route: 'guidedjournal', title: 'Guided Journal', icon: 'solar:pen-new-square-linear', Component: GuidedJournal },
  { route: 'exploration', title: 'Guided Exploration', icon: 'solar:compass-linear', Component: GuidedExploration },
];

const ROOT_ID = 'cf-root';
const STYLE_ID = 'cf-style';
const HIDDEN_ATTR = 'data-cf-hidden';

let timer: number | undefined;
let root: HTMLElement | null = null;
let mountedRoute: string | null = null;

const activeRoute = (): string | null => {
  if (location.pathname !== '/') return null;
  const path = new URLSearchParams(location.search).get('path');
  return TABS.some(t => t.route === path) ? path : null;
};

function unmountRoot() {
  if (root) {
    render(null, root); // unmount so the next visit starts fresh
    root.remove();
    root = null;
  }
  mountedRoute = null;
}

function restoreHidden() {
  document.querySelectorAll<HTMLElement>(`[${HIDDEN_ATTR}]`).forEach(el => {
    const prev = el.getAttribute(HIDDEN_ATTR);
    el.style.display = prev && prev !== '-' ? prev : '';
    el.removeAttribute(HIDDEN_ATTR);
  });
}

function mount(tab: TabDef, container: HTMLElement) {
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }
  if (root && mountedRoute !== tab.route) unmountRoot(); // switched tabs
  if (!root) {
    root = document.createElement('div');
    root.id = ROOT_ID;
    mountedRoute = tab.route;
    render(<tab.Component />, root);
  }
  if (root.parentElement !== container) container.appendChild(root);
  for (const el of Array.from(container.children) as HTMLElement[]) {
    if (el !== root && !el.hasAttribute(HIDDEN_ATTR)) {
      el.setAttribute(HIDDEN_ATTR, el.style.display || '-');
      el.style.display = 'none';
    }
  }
}

function sync() {
  const container = document.querySelector<HTMLElement>('.layout-container');
  const route = activeRoute();
  const tab = TABS.find(t => t.route === route);
  if (tab && container) mount(tab, container);
  else if (root || document.querySelector(`[${HIDDEN_ATTR}]`)) {
    restoreHidden();
    unmountRoot();
  }
}

export function installTabs() {
  const base: any = window.Blinko.store.baseStore;
  let at = base.routerList.findIndex((r: any) => r.title === 'todo') + 1 || 3;
  for (const t of TABS) {
    if (base.routerList.some((r: any) => r.title === t.route)) { at++; continue; }
    base.routerList.splice(at++, 0, { title: t.route, href: `/?path=${t.route}`, shallow: true, icon: t.icon });
  }
  // Sidebar labels go through t(title): give each a readable string.
  const i18n = window.Blinko.i18n;
  const strings = Object.fromEntries(TABS.map(t => [t.route, t.title]));
  for (const lng of new Set(['en', i18n.language, ...(i18n.languages ?? [])])) {
    if (lng) i18n.addResourceBundle(lng, 'translation', strings, true, true);
  }
  // SPA navigation doesn't reload the page, so poll cheaply.
  timer = window.setInterval(sync, 250);
  sync();
}

export function uninstallTabs() {
  if (timer) window.clearInterval(timer);
  restoreHidden();
  unmountRoot();
  document.getElementById(STYLE_ID)?.remove();
  const base: any = window.Blinko.store.baseStore;
  for (const t of TABS) {
    const i = base.routerList.findIndex((r: any) => r.title === t.route);
    if (i >= 0) base.routerList.splice(i, 1);
  }
}

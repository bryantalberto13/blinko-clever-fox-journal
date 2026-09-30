/** @jsxImportSource preact */
/// <reference types="systemjs" />
/// <reference types="blinko" />

import { render } from 'preact/compat';
import { JournalForm } from './JournalForm';
import { InsightsPanel } from './InsightsPanel';
import type { BasePlugin } from 'blinko';
import plugin from '../plugin.json';
import en from './locales/en.json';

const MORNING_ICON = "<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M12 2v2'/><path d='m4.93 4.93 1.41 1.41'/><path d='M20 12h2'/><path d='m19.07 4.93-1.41 1.41'/><path d='M15.947 12.65a4 4 0 0 0-5.925-4.128'/><path d='M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z'/><path d='M2 12h2'/></svg>";
const INSIGHTS_ICON = "<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M3 3v16a2 2 0 0 0 2 2h16'/><path d='m19 9-5 5-4-4-3 3'/></svg>";
const EVENING_ICON = "<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z'/></svg>";

/**
 * Clever Fox Journal — structured AM/PM journaling plugin for Blinko.
 *
 * - Toolbar buttons open a form modal (no raw markdown typing needed)
 * - Entries are auto-tagged #journal/morning or #journal/evening plus a per-day tag
 * - A persistent "Top 3 Weekly Goals" card is edited each morning and referenced each evening
 */
System.register([], (exports) => ({
  execute: () => {
    exports('default', class Plugin implements BasePlugin {
      constructor() {
        Object.assign(this, plugin);
      }

      withSettingPanel = false;

      renderJournalContent(mode: 'morning' | 'evening', toolbarName: string) {
        const container = document.createElement('div');
        container.setAttribute('data-plugin', 'clever-fox-journal');
        render(
          <JournalForm
            mode={mode}
            onDone={() => {
              window.Blinko.closeToolBarContent(toolbarName);
            }}
          />,
          container
        );
        return container;
      }

      async init() {
        this.initI18n();

        window.Blinko.addToolBarIcon({
          name: 'clever-fox-morning-journal',
          icon: MORNING_ICON,
          placement: 'top',
          tooltip: 'Morning Journal',
          content: () => this.renderJournalContent('morning', 'clever-fox-morning-journal')
        });

        window.Blinko.addToolBarIcon({
          name: 'clever-fox-evening-journal',
          icon: EVENING_ICON,
          placement: 'top',
          tooltip: 'Evening Journal',
          content: () => this.renderJournalContent('evening', 'clever-fox-evening-journal')
        });

        window.Blinko.addToolBarIcon({
          name: 'clever-fox-journal-insights',
          icon: INSIGHTS_ICON,
          placement: 'top',
          tooltip: 'Journal Insights',
          maxWidth: 640,
          content: () => {
            const container = document.createElement('div');
            container.setAttribute('data-plugin', 'clever-fox-journal');
            render(<InsightsPanel />, container);
            return container;
          }
        });
      }

      initI18n() {
        window.Blinko.i18n.addResourceBundle('en', 'translation', en);
      }

      destroy() {
        console.log('Clever Fox Journal plugin destroyed');
      }
    });
  }
}));

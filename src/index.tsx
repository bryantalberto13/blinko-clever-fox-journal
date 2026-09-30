/** @jsxImportSource preact */
/// <reference types="systemjs" />
/// <reference types="blinko" />

import type { BasePlugin } from 'blinko';
import plugin from '../plugin.json';
import { installTabs, uninstallTabs } from './tab';

/**
 * Clever Fox Journal — three sidebar tabs:
 * Personal Check Ins (guided AM/PM check-ins, history, trend analysis, weekly report),
 * Guided Journal (fresh AI journaling prompts) and Guided Exploration (framework-based questions).
 */
System.register([], (exports) => ({
  execute: () => {
    exports('default', class Plugin implements BasePlugin {
      constructor() {
        Object.assign(this, plugin);
      }

      withSettingPanel = false;

      async init() {
        installTabs();
      }

      destroy() {
        uninstallTabs();
      }
    });
  }
}));

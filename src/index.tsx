/** @jsxImportSource preact */
/// <reference types="systemjs" />
/// <reference types="blinko" />

import type { BasePlugin } from 'blinko';
import plugin from '../plugin.json';
import { installTab, uninstallTab } from './tab';

/**
 * Clever Fox Journal — a "Personal Check Ins" tab in Blinko's sidebar:
 * guided morning/evening check-ins (mood, energy, goals), history, AI trend analysis and weekly report.
 */
System.register([], (exports) => ({
  execute: () => {
    exports('default', class Plugin implements BasePlugin {
      constructor() {
        Object.assign(this, plugin);
      }

      withSettingPanel = false;

      async init() {
        installTab('Personal Check Ins');
      }

      destroy() {
        uninstallTab();
      }
    });
  }
}));

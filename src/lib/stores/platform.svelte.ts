import { browser } from '$app/environment';
import type { ActivePlatform } from '$lib/types';

const STORAGE_KEY = 'tsumestats_active_platform';

function createPlatformStore() {
  let activePlatform = $state<ActivePlatform>('101weiqi');

  function init() {
    if (!browser) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === '101weiqi' || stored === 'tsumegohero') {
        activePlatform = stored;
      }
    } catch (e) {
      console.error('Failed to load active platform from localStorage', e);
    }
  }

  function setPlatform(platform: ActivePlatform) {
    activePlatform = platform;
    if (browser) {
      try {
        localStorage.setItem(STORAGE_KEY, platform);
      } catch (e) {
        console.error('Failed to save active platform to localStorage', e);
      }
    }
  }

  return {
    get activePlatform() { return activePlatform; },
    init,
    setPlatform
  };
}

export const platformStore = createPlatformStore();

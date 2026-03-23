import { lazy, ComponentType } from 'react';

/**
 * A wrapper around React.lazy that attempts to reload the page once if a chunk fails to load.
 * This is useful for PWA/SPA updates where old chunks might be deleted from the server.
 */
export const lazyWithRetry = (
  componentImport: () => Promise<{ default: ComponentType<any> }>,
  name: string
) => {
  return lazy(async () => {
    const storageKey = `page-has-been-force-refreshed-${name}`;
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.localStorage.getItem(storageKey) || 'false'
    );

    try {
      const component = await componentImport();
      window.localStorage.setItem(storageKey, 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        window.localStorage.setItem(storageKey, 'true');
        window.location.reload();
        // Return a promise that never resolves to prevent rendering while reloading
        return new Promise(() => {});
      }
      throw error;
    }
  });
};

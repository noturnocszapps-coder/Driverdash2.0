import React from 'react';

export function lazyWithRetry<T extends React.ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  name = 'chunk'
) {
  return React.lazy(async () => {
    try {
      return await importer();
    } catch (error: any) {
      const message = String(error?.message || '');

      const isChunkError =
        message.includes('Failed to fetch dynamically imported module') ||
        message.includes('Importing a module script failed') ||
        message.includes('Loading chunk') ||
        message.includes('ChunkLoadError');

      if (isChunkError) {
        const alreadyRetried = sessionStorage.getItem(`lazy-retry-${name}`);

        if (!alreadyRetried) {
          sessionStorage.setItem(`lazy-retry-${name}`, 'true');
          window.location.reload();
          return new Promise(() => {});
        }
      }

      throw error;
    }
  });
}
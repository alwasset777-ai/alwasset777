import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { MediaItem } from '@alwasset/shared/api/contract';
import { makeApiClient } from '@alwasset/shared/api/channels';
import { AlWassetApp } from '@alwasset/shared/ui/App';
import '@alwasset/shared/ui/styles.css';

declare global {
  interface Window {
    alwasset: {
      invoke(channel: string, ...args: unknown[]): Promise<unknown>;
      pathForFile(file: File): string;
    };
  }
}

const invoke = (channel: string, ...args: unknown[]) => window.alwasset.invoke(channel, ...args);
const api = makeApiClient('desktop', invoke);

// Médias : les fichiers sont lus directement sur le disque du Mac.
api.media.add = async (entity, entityId, files) => {
  if (!files) return (await invoke('api:media.pick', entity, entityId)) as MediaItem[];
  const paths = files.map((f) => window.alwasset.pathForFile(f)).filter(Boolean);
  return (await invoke('api:media.importPaths', entity, entityId, paths)) as MediaItem[];
};
api.media.src = async (sha) => `alw-media://m/${sha}`;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AlWassetApp api={api} />
  </StrictMode>,
);

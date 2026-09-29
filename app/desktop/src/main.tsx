import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { makeApiClient } from '@alwasset/shared/api/channels';
import { AlWassetApp } from '@alwasset/shared/ui/App';
import '@alwasset/shared/ui/styles.css';

declare global {
  interface Window {
    alwasset: { invoke(channel: string, ...args: unknown[]): Promise<unknown> };
  }
}

const api = makeApiClient('desktop', (channel, ...args) => window.alwasset.invoke(channel, ...args));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AlWassetApp api={api} />
  </StrictMode>,
);

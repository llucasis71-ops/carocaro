import { useSyncExternalStore } from 'react';

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

/** Returns [path segments, query params] from the hash, e.g. #/app/fase/3?x=1 */
export function useRoute(): { parts: string[]; query: URLSearchParams } {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  const raw = hash.replace(/^#\/?/, '');
  const [path, qs] = raw.split('?');
  return { parts: path.split('/').filter(Boolean), query: new URLSearchParams(qs ?? '') };
}

export function navigate(path: string, replace = false) {
  const h = '#' + (path.startsWith('/') ? path : '/' + path);
  if (replace) {
    history.replaceState(null, '', h);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = h;
  }
  window.scrollTo(0, 0);
}

export function back(fallback = '/app') {
  if (history.length > 1) history.back();
  else navigate(fallback);
}

import { useEffect, useState } from 'react';

/** Minimal hash router: #/, #/new, #/b/<id>, #/catalog. */
export type Route =
  { page: 'buildings' } | { page: 'new' } | { page: 'building'; id: string } | { page: 'catalog' };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '');
  const building = path.match(/^\/b\/([0-9a-f-]{36})$/i);
  if (building) return { page: 'building', id: building[1] };
  if (path === '/new') return { page: 'new' };
  if (path === '/catalog') return { page: 'catalog' };
  return { page: 'buildings' };
}

export const navigate = (path: string) => {
  window.location.hash = path;
};

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

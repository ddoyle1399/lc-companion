/**
 * Deprecated. Navigation is now a sidebar rendered globally by
 * `app/layout.tsx` via `components/sidebar.tsx`. This file is a no-op
 * so the 15 pages that still import <Nav /> do not need to be touched
 * in the same change. Each `<Nav />` invocation renders nothing.
 *
 * Follow-up: remove the import + invocation from each page; this file
 * can then be deleted.
 */
export default function Nav() {
  return null;
}

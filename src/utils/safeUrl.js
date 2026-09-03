// Property links (Facebook, Instagram, Google Maps) are free-text fields the
// broker types into the dashboard, and the RLS policy lets any authenticated
// user write them. React renders an href verbatim, so a stored `javascript:`
// URL would execute on click for every visitor. Allow only real web links.
const SAFE_PROTOCOLS = ['http:', 'https:'];

/**
 * @param {string | null | undefined} value
 * @returns {boolean}
 */
export function isSafeUrl(value) {
  if (!value) return false;
  try {
    return SAFE_PROTOCOLS.includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

/**
 * Returns the URL when it is a plain http(s) link, otherwise the fallback.
 * @param {string | null | undefined} value
 * @param {string | null} [fallback]
 * @returns {string | null}
 */
export function safeUrl(value, fallback = null) {
  return isSafeUrl(value) ? value : fallback;
}

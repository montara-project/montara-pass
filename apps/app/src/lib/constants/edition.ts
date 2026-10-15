/**
 * Community Edition (VITE_EDITION=community): one self-hosted user, so no sign-up
 * and no sharing. Its server has neither endpoint. Inlined at build time, so
 * the branches it guards drop out of the bundle.
 */
export const COMMUNITY = import.meta.env.VITE_EDITION === 'community'

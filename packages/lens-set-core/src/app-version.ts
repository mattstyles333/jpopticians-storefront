/**
 * Framework-independent app version.
 *
 * The original lens-set project imported `package.json` directly and relied on
 * Vite's JSON import support. That is not framework-independent, so the version
 * is a plain constant here. The lens-config version field is a load-time value
 * used to tag customisation drafts, exactly like the original behaviour.
 */
export const appVersion = '5.1.0';

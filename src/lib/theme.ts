// Única fuente del modo día/noche. "auto" sigue al teléfono; "light" y "dark"
// lo fijan. El tema se aplica como data-theme en <html> (ver globals.css) y la
// preferencia vive solo en este aparato (localStorage).

export type ThemeMode = 'auto' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

const KEY = 'finanzas_theme';
const HINT_KEY = 'finanzas_theme_hint';
const EVENT = 'app-theme';

// Corre en <head> antes de pintar (sin parpadeo) y se queda escuchando el modo
// del teléfono mientras la app esté en "auto". También revisa al volver a la app:
// en segundo plano el teléfono puede cambiar de modo sin avisar.
export const themeScript = `(function(){var m=matchMedia('(prefers-color-scheme: dark)');function a(){var t=null;try{t=localStorage.getItem('${KEY}')}catch(e){}document.documentElement.dataset.theme=t==='dark'||(t!=='light'&&m.matches)?'dark':'light'}function u(){a();dispatchEvent(new Event('${EVENT}'))}a();m.addEventListener('change',u);document.addEventListener('visibilitychange',function(){if(!document.hidden)u()})})()`;

export function getThemeMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {}
  return 'auto';
}

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function setThemeMode(mode: ThemeMode) {
  try {
    if (mode === 'auto') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, mode);
  } catch {}
  const dark = mode === 'dark' || (mode === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  window.dispatchEvent(new Event(EVENT));
}

export function onThemeChange(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

// El aviso "ya no sigue al teléfono" sale solo la primera vez que se toca el botón.
export function takeThemeHint(): boolean {
  try {
    if (localStorage.getItem(HINT_KEY)) return false;
    localStorage.setItem(HINT_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

type CategoryHue = 'amber' | 'blue' | 'sky' | 'stone' | 'purple' | 'green' | 'rose' | 'gray';

const CATEGORY_HUES: Record<string, CategoryHue> = {
  Comida: 'amber',
  Pasajes: 'blue',
  Taxi: 'sky',
  Casa: 'stone',
  'Salidas / Ocio': 'purple',
  Salud: 'green',
  Ropa: 'rose',
  Otros: 'gray',
};

const FALLBACK_HUES: CategoryHue[] = ['amber', 'blue', 'sky', 'purple', 'green', 'rose', 'stone', 'gray'];

function hueForCategory(category: string): CategoryHue {
  const known = CATEGORY_HUES[category];
  if (known) return known;
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  return FALLBACK_HUES[hash % FALLBACK_HUES.length];
}

const BADGE_CLASSES: Record<CategoryHue, string> = {
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  sky: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  stone: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  rose: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  gray: 'bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-300',
};

const BAR_CLASSES: Record<CategoryHue, string> = {
  amber: 'bg-amber-400 dark:bg-amber-500',
  blue: 'bg-blue-400 dark:bg-blue-500',
  sky: 'bg-sky-400 dark:bg-sky-500',
  stone: 'bg-stone-400 dark:bg-stone-500',
  purple: 'bg-purple-400 dark:bg-purple-500',
  green: 'bg-green-400 dark:bg-green-500',
  rose: 'bg-rose-400 dark:bg-rose-500',
  gray: 'bg-gray-400 dark:bg-gray-500',
};

export function categoryBadgeClass(category: string): string {
  return BADGE_CLASSES[hueForCategory(category)];
}

export function categoryBarClass(category: string): string {
  return BAR_CLASSES[hueForCategory(category)];
}

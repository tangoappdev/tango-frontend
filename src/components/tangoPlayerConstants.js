export const API_BASE_URL = '/api';

export const CATEGORIES = {
  TRADITIONAL_GOLDEN_AGE: "Traditional (Golden Age)",
  CONTEMPORARY_TRADITIONAL: "Contemporary Traditional",
  ALTERNATIVE: "Alternative / Alternativo"
};

export const TANDA_SEQUENCES = {
  '2 Tangos, 1 Vals, 2 Tangos, 1 Milonga': ['Tango', 'Tango', 'Vals', 'Tango', 'Tango', 'Milonga'],
  '3 Tangos, 1 Vals, 3 Tangos, 1 Milonga': ['Tango', 'Tango', 'Tango', 'Vals', 'Tango', 'Tango', 'Tango', 'Milonga'],
};

export const JUST_MODE_OPTIONS = [
  { value: 'tango', label: 'Just Tango' },
  { value: 'vals', label: 'Just Vals' },
  { value: 'milonga', label: 'Just Milonga' },
];

export const TANDA_ORDER_OPTIONS = Object.keys(TANDA_SEQUENCES).map(key => ({ value: key, label: key }));
export const ORCHESTRA_TYPE_OPTIONS = Object.values(CATEGORIES).map(cat => ({ value: cat, label: cat }));
export const TANDA_LENGTH_OPTIONS = [3, 4];
export const FREESTYLE_FETCH_BATCH_SIZE = 6;
export const PLAYLIST_REFILL_THRESHOLD = 5;
export const MIN_SAME_TANDA_GAP = 15;
export const MIN_SAME_ORCHESTRA_GAP = 7;

export const initialSettings = {
  activeMode: '2 Tangos, 1 Vals, 2 Tangos, 1 Milonga',
  categoryFilter: CATEGORIES.TRADITIONAL_GOLDEN_AGE,
  tandaLength: 4,
  cortinas: true,
};

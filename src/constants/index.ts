export const LEVELS = [
  { value: 'empty', label: 'Empty', percent: 0 },
  { value: '1/4', label: '1/4', percent: 25 },
  { value: 'half', label: 'Half', percent: 50 },
  { value: '3/4', label: '3/4', percent: 75 },
  { value: 'almost_full', label: 'Almost Full', percent: 90 },
  { value: 'full', label: 'Full', percent: 100 },
];

// Must match the backend's ProductBase.category pattern exactly (lowercase) —
// these are stored on Product rows and validated server-side on create.
export const CATEGORIES = [
  'spirits',
  'beer',
  'wine',
  'soda',
  'mixer',
  'water',
  'juice',
  'other',
];

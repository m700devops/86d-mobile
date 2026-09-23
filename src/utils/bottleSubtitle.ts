// The small line under a bottle's headline. The headline is the brand
// (Sprite, Gatorade, Tito's); this decides what goes underneath it.
//
// The vision scan returns name "Original" for a base product by design —
// that's what lets product matching key on it — so "Original" is never
// something a person should see. When there's no real variant name to show,
// this falls back to the scanned product_type ("Vodka") instead, and shows
// nothing at all rather than the word "Original".

export interface SubtitleSource {
  brand?: string | null;
  name?: string | null;
  productType?: string | null;
}

export const bottleSubtitle = (bottle: SubtitleSource): string => {
  if (!bottle.brand) return '';

  const name = (bottle.name ?? '').trim();
  if (name && name.toLowerCase() !== 'original') return name;

  return (bottle.productType ?? '').trim();
};

// Every way the same product barcode can be written, so two reads of one code
// compare equal. Mirrors barcode_variants in 86d-api helpers.py: the server
// looks codes up the same way, so a bottle found there is found here too.
//
// A phone reads one printed code differently by format and platform — iOS
// reports a 12-digit UPC-A as a 13-digit EAN-13 with a leading 0, a GTIN can be
// padded to 14, and small cans carry an 8-digit UPC-E that stands for a
// 12-digit UPC-A. Anything that isn't 6-14 digits (a Code 128 shelf tag) is
// only ever itself.

const upceToUpca = (code: string): string | null => {
  if (code.length !== 8 || (code[0] !== '0' && code[0] !== '1')) return null;
  const ns = code[0];
  const x = code.slice(1, 7);
  const check = code[7];
  const last = x[5];
  let body: string;
  if (last === '0' || last === '1' || last === '2') body = x.slice(0, 2) + last + '0000' + x.slice(2, 5);
  else if (last === '3') body = x.slice(0, 3) + '00000' + x.slice(3, 5);
  else if (last === '4') body = x.slice(0, 4) + '00000' + x[4];
  else body = x.slice(0, 5) + '0000' + last;
  return ns + body + check;
};

// The 8-digit UPC-E codes that write out as this 12-digit UPC-A, so a can
// registered by its UPC-E is found when its UPC-A is read, not only the reverse.
// Each candidate is kept only if it expands back exactly.
const upcaToUpces = (upca: string): string[] => {
  if (upca.length !== 12 || (upca[0] !== '0' && upca[0] !== '1')) return [];
  const ns = upca[0], m = upca.slice(1, 6), p = upca.slice(6, 11), check = upca[11];
  const candidates = [
    ns + m.slice(0, 2) + p.slice(2, 5) + m[2] + check,
    ns + m.slice(0, 3) + p.slice(3, 5) + '3' + check,
    ns + m.slice(0, 4) + p[4] + '4' + check,
    ns + m.slice(0, 5) + p[4] + check,
  ];
  return candidates.filter(c => upceToUpca(c) === upca);
};

const stripZeros = (s: string): string => s.replace(/^0+/, '') || '0';

export const barcodeVariants = (code?: string | null): string[] => {
  const raw = (code ?? '').trim();
  if (!raw) return [];
  const digits = raw.replace(/\D/g, '');
  if (digits !== raw.replace(/[ -]/g, '') || digits.length < 6 || digits.length > 14) return [raw];
  const cores = new Set([stripZeros(digits)]);
  const expanded = upceToUpca(digits);
  if (expanded) cores.add(stripZeros(expanded));
  const out = new Set([raw, digits]);
  cores.forEach(core => {
    [8, 12, 13, 14].forEach(width => {
      if (core.length <= width) out.add(core.padStart(width, '0'));
    });
  });
  Array.from(out).forEach(form => upcaToUpces(form).forEach(e => out.add(e)));
  return Array.from(out);
};

// Whether a product stored with `stored` is the one `scanned` names. One-sided,
// exactly as the server looks it up: the stored code must be one of the scanned
// code's forms. Comparing both sides' forms would let a seeded product's
// made-up 11-digit code (every seed carries one) answer to a real scan that
// merely zero-pads to it.
export const barcodeFinds = (stored?: string | null, scanned?: string | null): boolean =>
  !!stored && barcodeVariants(scanned).includes(stored);

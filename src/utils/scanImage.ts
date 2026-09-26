import { ImageManipulator, SaveFormat, manipulateAsync, type ImageRef } from 'expo-image-manipulator';

// The part of a scan photo the AI sees, as fractions of the frame.
//
// The viewfinder's corner guides (CameraScan `styles.centerZone`) sit at 27–73%
// across and 27–63% down. The whole frame used to be sent, so on a back-bar shelf
// the bottle being counted was a small patch surrounded by its neighbours. This
// keeps the guides plus a WIDE margin — a close-up label can run well past them,
// and a cut-off brand name costs more than a neighbour left in — and drops the
// outer strip, which is where the next bottles on the shelf are. The server's
// prompt separately says to read only the container nearest the centre.
//
// The gain is detail, not just framing: gpt-4o scales every image to 768px on its
// short side whatever is sent, so the only way to put more of its pixels on the
// label is to send less of everything else.
//
// These are fractions of the PHOTO because expo-camera crops each iOS photo to
// exactly what the preview showed, and the image manipulator applies the photo's
// orientation before any crop — so screen fractions and photo fractions agree.
// Checked in expo-camera's own code (ios/Current): the preview fills the camera
// view (resizeAspectFill, frame = the view's bounds) and each photo is cut to
// the view's shape, centred — using the SCREEN's orientation, which is why this
// holds however the phone is tilted, and only while the app is portrait-locked
// (app.json). A landscape screen would need this re-checked.
//
// CameraScan dims everything outside this on the viewfinder (SCAN_MASK_BANDS),
// so the bright window is exactly what the AI gets. Without it, the first
// version of this crop cut 44% of the picture on screen with no sign: a label
// low on a bottle, shot from close up, could lose just the strip naming its
// variant ("Reposado") and be counted as the plain bottle. Change the crop here
// and the dimming follows.
//
// 5% off the top, 8% off the bottom and each side: the owner halved the first
// cut (10% / 16% / 12% each side) once it was visible on screen. It keeps 73% of
// the picture, and the label reaches the AI about 1.2x sharper than the whole
// frame (the width is what counts: 1 / 0.84).
export const SCAN_CROP = { left: 0.08, right: 0.92, top: 0.05, bottom: 0.92 };

type Pct = `${number}%`;
const pct = (fraction: number): Pct => `${+(fraction * 100).toFixed(3)}%`;

// The four dimmed bands around the SCAN_CROP window, as fractions of the camera
// view — which ARE fractions of the photo (see above): full-width bands above
// and below, and one down each side between them.
export const SCAN_MASK_BANDS: { top: Pct; left: Pct; width: Pct; height: Pct }[] = [
  { top: pct(0), left: pct(0), width: pct(1), height: pct(SCAN_CROP.top) },
  { top: pct(SCAN_CROP.bottom), left: pct(0), width: pct(1), height: pct(1 - SCAN_CROP.bottom) },
  { top: pct(SCAN_CROP.top), left: pct(0), width: pct(SCAN_CROP.left), height: pct(SCAN_CROP.bottom - SCAN_CROP.top) },
  { top: pct(SCAN_CROP.top), left: pct(SCAN_CROP.right), width: pct(1 - SCAN_CROP.right), height: pct(SCAN_CROP.bottom - SCAN_CROP.top) },
];

// Width of the uploaded image. 800 matched what the model actually reads (see
// above) before cropping and still does; never upscaled.
export const SCAN_IMAGE_WIDTH = 800;

// JPEG quality of the upload. It was 0.65 on top of a 0.5 capture; label text
// is thin, high-contrast edges — exactly what JPEG blurs first. The upload grows
// by roughly half, to low hundreds of KB.
export const SCAN_JPEG_QUALITY = 0.8;

export type CropRect = { originX: number; originY: number; width: number; height: number };

/** The SCAN_CROP rectangle for an image of this size, in whole pixels, always inside it. */
export const scanCropRect = (width: number, height: number): CropRect => {
  const originX = Math.max(0, Math.floor(width * SCAN_CROP.left));
  const originY = Math.max(0, Math.floor(height * SCAN_CROP.top));
  return {
    originX,
    originY,
    width: Math.max(1, Math.min(width - originX, Math.floor(width * (SCAN_CROP.right - SCAN_CROP.left)))),
    height: Math.max(1, Math.min(height - originY, Math.floor(height * (SCAN_CROP.bottom - SCAN_CROP.top)))),
  };
};

/**
 * A scan photo made ready for /scans/analyze: cropped to the aimed-at area,
 * shrunk to SCAN_IMAGE_WIDTH, JPEG, base64. Used by the live scan and by the
 * background re-identification of saved photos, so both send the same thing.
 *
 * If cropping fails for any reason the whole frame is sent instead, exactly as
 * before — a scan must never fail because of the crop. Returns null only when
 * the photo can't be read at all.
 */
export const prepareScanImage = async (uri: string): Promise<string | null> => {
  let source: ImageRef | null = null;
  let prepared: ImageRef | null = null;
  try {
    source = await ImageManipulator.manipulate(uri).renderAsync();
    const rect = scanCropRect(source.width, source.height);
    prepared = await ImageManipulator.manipulate(source)
      .crop(rect)
      .resize({ width: Math.min(SCAN_IMAGE_WIDTH, rect.width) })
      .renderAsync();
    const saved = await prepared.saveAsync({ compress: SCAN_JPEG_QUALITY, format: SaveFormat.JPEG, base64: true });
    if (saved.base64) return saved.base64;
  } catch (e) {
    console.warn('Scan crop failed, sending the whole frame:', e);
  } finally {
    // Decoded full-size photos are tens of MB of native memory; don't wait for GC.
    source?.release();
    prepared?.release();
  }
  const whole = await manipulateAsync(
    uri,
    [{ resize: { width: SCAN_IMAGE_WIDTH } }],
    { compress: SCAN_JPEG_QUALITY, format: SaveFormat.JPEG, base64: true }
  );
  return whole.base64 ?? null;
};

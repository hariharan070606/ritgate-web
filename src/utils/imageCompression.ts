// Downscales and re-encodes an image so visitor photos upload quickly and stay
// small in storage. Works on both a data/blob URL (camera capture) and a File
// (gallery upload). Returns a JPEG data URL. If anything goes wrong it resolves
// with the original source so a capture is never lost to a compression failure.

interface CompressOptions {
  maxDimension?: number; // longest edge, px
  quality?: number; // 0–1 JPEG quality
}

const DEFAULTS: Required<CompressOptions> = { maxDimension: 800, quality: 0.8 };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function compressImageSrc(
  src: string,
  options: CompressOptions = {},
): Promise<string> {
  const { maxDimension, quality } = { ...DEFAULTS, ...options };
  try {
    const img = await loadImage(src);
    const { width, height } = img;
    if (!width || !height) return src;

    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const targetW = Math.round(width * scale);
    const targetH = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return src;
    ctx.drawImage(img, 0, 0, targetW, targetH);

    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return src;
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Guards against a picked file that decodes to nothing (corrupt/renamed file).
export async function isDecodableImage(src: string): Promise<boolean> {
  try {
    const img = await loadImage(src);
    return !!(img.width && img.height);
  } catch {
    return false;
  }
}

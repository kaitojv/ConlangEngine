/**
 * Utilities for validating, compressing, and resizing wiki image attachments.
 * Protects local storage and Supabase sync payloads from quota exhaustion.
 */

export const DEFAULT_MAX_IMAGE_MB = 2.0;
export const DEFAULT_MAX_DIMENSION = 1280;
export const DEFAULT_COMPRESSION_QUALITY = 0.82;

/**
 * Format bytes into human-readable string (e.g. "1.4 MB", "420 KB")
 */
export function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validates file size against a maximum megabytes limit.
 * @param {number} sizeInBytes 
 * @param {number} maxMB 
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validateFileSize(sizeInBytes, maxMB = DEFAULT_MAX_IMAGE_MB) {
    const maxBytes = maxMB * 1024 * 1024;
    if (sizeInBytes > maxBytes) {
        return {
            valid: false,
            error: `Image size (${formatBytes(sizeInBytes)}) exceeds the maximum allowed limit of ${maxMB} MB.`
        };
    }
    return { valid: true, error: null };
}

/**
 * Reads a File or Blob into a base64 Data URL.
 */
export function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
    });
}

/**
 * Loads an image from a Data URL or URL into an HTMLImageElement.
 */
export function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(new Error('Failed to load image into canvas: ' + err));
        img.src = src;
    });
}

/**
 * Resizes and compresses an image via an off-screen Canvas.
 * Automatically converts heavy formats (like high-res PNGs or uncompressed JPEGs)
 * into optimized WebP or JPEG.
 *
 * @param {File|Blob|string} imageSource - File object, Blob, or base64 data URL.
 * @param {Object} options
 * @param {number} [options.maxMB=2.0] - Hard upper limit in megabytes.
 * @param {number} [options.maxDimension=1280] - Maximum width or height.
 * @param {number} [options.quality=0.82] - Compression quality (0 to 1).
 * @returns {Promise<{ ok: boolean, dataUrl?: string, width?: number, height?: number, sizeBytes?: number, error?: string }>}
 */
export async function compressAndValidateImage(imageSource, options = {}) {
    const maxMB = options.maxMB || DEFAULT_MAX_IMAGE_MB;
    const maxDimension = options.maxDimension || DEFAULT_MAX_DIMENSION;
    const quality = options.quality !== undefined ? options.quality : DEFAULT_COMPRESSION_QUALITY;
    const maxBytes = maxMB * 1024 * 1024;

    try {
        let srcUrl;
        let initialSizeBytes = 0;

        if (typeof imageSource === 'string') {
            srcUrl = imageSource;
            // Rough estimation of base64 size
            initialSizeBytes = Math.round((imageSource.length * 3) / 4);
        } else if (imageSource instanceof Blob || (typeof File !== 'undefined' && imageSource instanceof File)) {
            initialSizeBytes = imageSource.size;
            srcUrl = await readFileAsDataURL(imageSource);
        } else {
            return { ok: false, error: 'Invalid image source provided.' };
        }

        // If it's an SVG data URI or SVG string, keep vector crispness if under limit
        if (typeof srcUrl === 'string' && srcUrl.startsWith('data:image/svg+xml')) {
            if (initialSizeBytes > maxBytes) {
                return {
                    ok: false,
                    error: `SVG image (${formatBytes(initialSizeBytes)}) exceeds the maximum allowed limit of ${maxMB} MB.`
                };
            }
            return {
                ok: true,
                dataUrl: srcUrl,
                width: '100%',
                height: 'auto',
                sizeBytes: initialSizeBytes
            };
        }

        // In node / non-browser test environments without document.createElement
        if (typeof document === 'undefined' || !document.createElement) {
            const validation = validateFileSize(initialSizeBytes, maxMB);
            if (!validation.valid) {
                return { ok: false, error: validation.error };
            }
            return { ok: true, dataUrl: srcUrl, sizeBytes: initialSizeBytes };
        }

        const img = await loadImage(srcUrl);

        let targetWidth = img.naturalWidth || img.width;
        let targetHeight = img.naturalHeight || img.height;

        // Downscale proportionally if width or height exceeds maxDimension
        if (targetWidth > maxDimension || targetHeight > maxDimension) {
            if (targetWidth > targetHeight) {
                targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
                targetWidth = maxDimension;
            } else {
                targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
                targetHeight = maxDimension;
            }
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            // Fallback to original if canvas context unavailable
            const validation = validateFileSize(initialSizeBytes, maxMB);
            if (!validation.valid) return { ok: false, error: validation.error };
            return { ok: true, dataUrl: srcUrl, width: targetWidth, height: targetHeight, sizeBytes: initialSizeBytes };
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Try webp first, fallback to jpeg if webp unsupported
        let compressedDataUrl = canvas.toDataURL('image/webp', quality);
        if (!compressedDataUrl.startsWith('data:image/webp')) {
            compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        // Calculate compressed size
        const compressedSizeBytes = Math.round((compressedDataUrl.length * 3) / 4);

        if (compressedSizeBytes > maxBytes) {
            // Try one more aggressive compression pass
            const aggressiveDataUrl = canvas.toDataURL('image/jpeg', 0.65);
            const aggressiveSize = Math.round((aggressiveDataUrl.length * 3) / 4);

            if (aggressiveSize > maxBytes) {
                return {
                    ok: false,
                    error: `Compressed image (${formatBytes(aggressiveSize)}) still exceeds the limit of ${maxMB} MB. Please use a smaller or lower resolution image.`
                };
            }

            return {
                ok: true,
                dataUrl: aggressiveDataUrl,
                width: targetWidth,
                height: targetHeight,
                sizeBytes: aggressiveSize
            };
        }

        return {
            ok: true,
            dataUrl: compressedDataUrl,
            width: targetWidth,
            height: targetHeight,
            sizeBytes: compressedSizeBytes
        };

    } catch (err) {
        return {
            ok: false,
            error: err.message || 'An error occurred while processing the image.'
        };
    }
}

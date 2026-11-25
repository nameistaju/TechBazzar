// server/utils/imageSecurity.js
// Validates uploaded image buffers using magic bytes and header dimensions (PNG, JPEG, WebP only; rejects SVG).

export function validateImageUpload(base64Input, { maxBytes = 5 * 1024 * 1024, minDim = 16, maxDim = 4096 } = {}) {
  if (!base64Input || typeof base64Input !== 'string') {
    return { valid: false, error: 'Image data is required' };
  }

  let rawBase64 = base64Input.trim();
  const dataUriMatch = rawBase64.match(/^data:([a-zA-Z0-9.+\/-]+);base64,(.+)$/);
  if (dataUriMatch) {
    const declaredMime = dataUriMatch[1].toLowerCase();
    if (declaredMime.includes('svg')) {
      return { valid: false, error: 'SVG uploads are not allowed for security reasons. Use PNG, JPEG, or WebP.' };
    }
    rawBase64 = dataUriMatch[2];
  } else if (rawBase64.toLowerCase().includes('<svg')) {
    return { valid: false, error: 'SVG uploads are not allowed.' };
  }

  const buffer = Buffer.from(rawBase64, 'base64');
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'Empty or invalid base64 image payload' };
  }
  if (buffer.length > maxBytes) {
    return { valid: false, error: `Image exceeds maximum size of ${Math.round(maxBytes / (1024 * 1024))} MB` };
  }

  // Detect format strictly from magic bytes
  let format = null;
  let ext = null;
  let width = 0;
  let height = 0;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 24 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    format = 'image/png';
    ext = 'png';
    width = buffer.readUInt32BE(16);
    height = buffer.readUInt32BE(20);
  }
  // JPEG: FF D8 FF
  else if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    format = 'image/jpeg';
    ext = 'jpg';
    const dims = parseJpegDimensions(buffer);
    width = dims.width;
    height = dims.height;
  }
  // WebP: RIFF....WEBP
  else if (
    buffer.length >= 30 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    format = 'image/webp';
    ext = 'webp';
    const dims = parseWebpDimensions(buffer);
    width = dims.width;
    height = dims.height;
  } else {
    return { valid: false, error: 'Unsupported or corrupted image file. Only valid PNG, JPEG, and WebP are allowed.' };
  }

  if (width < minDim || height < minDim || width > maxDim || height > maxDim) {
    return {
      valid: false,
      error: `Image dimensions (${width}x${height}) out of allowed bounds (${minDim}x${minDim} to ${maxDim}x${maxDim}).`
    };
  }

  return { valid: true, buffer, format, ext, width, height };
}

function parseJpegDimensions(buf) {
  let offset = 2;
  while (offset + 4 < buf.length) {
    if (buf[offset] !== 0xff) break;
    const marker = buf[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const len = buf.readUInt16BE(offset + 2);
    // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      if (offset + 9 <= buf.length) {
        return {
          height: buf.readUInt16BE(offset + 5),
          width: buf.readUInt16BE(offset + 7)
        };
      }
      break;
    }
    if (len < 2) break;
    offset += 2 + len;
  }
  return { width: 0, height: 0 };
}

function parseWebpDimensions(buf) {
  const chunk = buf.toString('ascii', 12, 16);
  if (chunk === 'VP8 ' && buf.length >= 30) {
    return {
      width: buf.readUInt16LE(26) & 0x3fff,
      height: buf.readUInt16LE(28) & 0x3fff
    };
  }
  if (chunk === 'VP8L' && buf.length >= 25) {
    const bits = buf.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1
    };
  }
  if (chunk === 'VP8X' && buf.length >= 30) {
    return {
      width: (buf[24] | (buf[25] << 8) | (buf[26] << 16)) + 1,
      height: (buf[27] | (buf[28] << 8) | (buf[29] << 16)) + 1
    };
  }
  return { width: 0, height: 0 };
}

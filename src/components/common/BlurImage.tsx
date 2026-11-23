import React, { useState, useEffect, useRef } from 'react';

interface BlurImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  blurHash?: string;
  fallbackIcon?: React.ReactNode;
}

// Wolt Base83 alphabet for BlurHash decoding
const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~';

function decode83(str: string): number {
  let value = 0;
  for (let i = 0; i < str.length; i++) {
    const digit = DIGITS.indexOf(str[i]);
    if (digit === -1) return 0;
    value = value * 83 + digit;
  }
  return value;
}

function sRGBToLinear(value: number): number {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearTosRGB(value: number): number {
  const v = Math.max(0, Math.min(1, value));
  return v <= 0.0031308
    ? Math.round(v * 12.92 * 255 + 0.5)
    : Math.round((1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255 + 0.5);
}

/**
 * Fast client-side 32x32 BlurHash decoder with 0 external dependencies
 */
function decodeBlurHash(blurHash: string, width = 32, height = 32): Uint8ClampedArray | null {
  if (!blurHash || blurHash.length < 6) return null;
  try {
    const sizeFlag = decode83(blurHash[0]);
    const numY = Math.floor(sizeFlag / 9) + 1;
    const numX = (sizeFlag % 9) + 1;
    const quantisedMax = decode83(blurHash[1]);
    const maxVal = (quantisedMax + 1) / 166;
    const colors: [number, number, number][] = new Array(numX * numY);

    const avgColor = decode83(blurHash.substring(2, 6));
    colors[0] = [
      sRGBToLinear((avgColor >> 16) & 255),
      sRGBToLinear((avgColor >> 8) & 255),
      sRGBToLinear(avgColor & 255),
    ];

    for (let i = 1; i < numX * numY; i++) {
      if (4 + i * 2 + 2 > blurHash.length) break;
      const val = decode83(blurHash.substring(4 + i * 2, 6 + i * 2));
      const r = Math.floor(val / (19 * 19));
      const g = Math.floor(val / 19) % 19;
      const b = val % 19;
      colors[i] = [
        Math.sign(r - 9) * Math.pow(Math.abs(r - 9) / 9, 2) * maxVal,
        Math.sign(g - 9) * Math.pow(Math.abs(g - 9) / 9, 2) * maxVal,
        Math.sign(b - 9) * Math.pow(Math.abs(b - 9) / 9, 2) * maxVal,
      ];
    }

    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0;
        let g = 0;
        let b = 0;
        for (let j = 0; j < numY; j++) {
          for (let i = 0; i < numX; i++) {
            const color = colors[i + j * numX] || [0, 0, 0];
            const basis = Math.cos((Math.PI * x * i) / width) * Math.cos((Math.PI * y * j) / height);
            r += color[0] * basis;
            g += color[1] * basis;
            b += color[2] * basis;
          }
        }
        const idx = 4 * (x + y * width);
        pixels[idx] = linearTosRGB(r);
        pixels[idx + 1] = linearTosRGB(g);
        pixels[idx + 2] = linearTosRGB(b);
        pixels[idx + 3] = 255;
      }
    }
    return pixels;
  } catch {
    return null;
  }
}

// Default brand neon-emerald + charcoal ambient blurHash
const DEFAULT_BRAND_BLURHASH = 'L14.7}of00of~qof00of00of~qof';

export const BlurImage: React.FC<BlurImageProps> = ({
  src,
  alt = '',
  className = '',
  blurHash = DEFAULT_BRAND_BLURHASH,
  fallbackIcon,
  ...rest
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pixels = decodeBlurHash(blurHash, 32, 32);
    if (pixels) {
      const imgData = ctx.createImageData(32, 32);
      imgData.data.set(pixels);
      ctx.putImageData(imgData, 0, 0);
    }
  }, [blurHash, src]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* 1. Underlying BlurHash Canvas Placeholder (Instant ambient render) */}
      {!hasError && (
        <canvas
          ref={canvasRef}
          width={32}
          height={32}
          aria-hidden="true"
          className={`absolute inset-0 w-full h-full object-cover filter blur-[2px] scale-110 transition-opacity duration-300 pointer-events-none ${
            isLoaded ? 'opacity-0' : 'opacity-100'
          }`}
        />
      )}

      {/* 2. Fallback on Error */}
      {hasError ? (
        <div className="absolute inset-0 w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-500">
          {fallbackIcon || <span className="text-xs font-bold">Image</span>}
        </div>
      ) : (
        /* 3. Real Image: Progressive Cross-Fade on Load */
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ease-out ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          {...rest}
        />
      )}
    </div>
  );
};

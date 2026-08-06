/**
 * lib/media/image-service.ts
 *
 * Production Reusable Media Engine & Image Optimization Service.
 * Formats cover images, gallery arrays, CDN optimization, and Next.js image compatibility.
 */

export interface FormattedImageGallery {
  primary: string;
  gallery: string[];
  thumbnail: string;
  hover: string;
}

export class ImageService {
  /**
   * Ensures image URL uses HTTPS and valid protocol.
   */
  static normalizeUrl(url?: string | null): string {
    if (!url || !url.trim()) return "/placeholder.png";
    const trimmed = url.trim();
    if (trimmed.startsWith("//")) return `https:${trimmed}`;
    if (!trimmed.startsWith("http")) return `https://${trimmed}`;
    return trimmed;
  }

  /**
   * Formats raw image inputs into a structured gallery object.
   */
  static formatGallery(
    primaryImage?: string | null,
    imagesArray?: string[] | null,
    variantsImages?: string[]
  ): FormattedImageGallery {
    const list: string[] = [];

    if (primaryImage) {
      list.push(this.normalizeUrl(primaryImage));
    }

    if (Array.isArray(imagesArray)) {
      imagesArray.forEach((img) => {
        const norm = this.normalizeUrl(img);
        if (!list.includes(norm)) list.push(norm);
      });
    }

    if (Array.isArray(variantsImages)) {
      variantsImages.forEach((img) => {
        const norm = this.normalizeUrl(img);
        if (!list.includes(norm)) list.push(norm);
      });
    }

    const unique = list.filter((url) => url !== "/placeholder.png");
    const primary = unique[0] || "/placeholder.png";
    const hover = unique[1] || primary;

    return {
      primary,
      gallery: unique.length > 0 ? unique : [primary],
      thumbnail: primary,
      hover,
    };
  }

  /**
   * Optimizes Printful or Cloudinary CDN image URLs by adding dimensions & quality parameters.
   */
  static optimizeCdnUrl(url: string, width = 800, quality = 80): string {
    const norm = this.normalizeUrl(url);
    if (norm.includes("printful.com") || norm.includes("s3.amazonaws.com")) {
      return norm; // Printful S3 CDN handles original resolution safely
    }
    if (norm.includes("cloudinary.com")) {
      return norm.replace("/upload/", `/upload/w_${width},q_${quality},f_auto/`);
    }
    return norm;
  }
}

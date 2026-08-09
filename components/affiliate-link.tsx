"use client";

import { ReactNode } from "react";

type AffiliateLinkProps = {
  productId: string;
  href: string;
  children: ReactNode;
  className?: string;
};

export function AffiliateLink({
  productId,
  href,
  children,
  className,
}: AffiliateLinkProps) {
  const handleClick = () => {
    // Fire and forget click tracking
    fetch(`/api/products/${productId}/click`, {
      method: "POST",
    }).catch((error) => {
      console.error("[analytics] Failed to track click:", error);
    });
  };

  return (
    <a
      className={className}
      href={href}
      onClick={handleClick}
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
    </a>
  );
}

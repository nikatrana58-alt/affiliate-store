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
      rel="noopener noreferrer sponsored"
      target="_blank"
    >
      {children}
      {className?.includes("buy-amazon-button") && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      )}
    </a>
  );
}

const badgeMap = [
  {
    className: "badge-trending",
    label: "Editor's Pick",
    match: "trending",
  },
  {
    className: "badge-bestseller",
    label: "Luxury Choice",
    match: "bestseller",
  },
  {
    className: "badge-premium",
    label: "RA2Z Exclusive",
    match: "premium",
  },
  {
    className: "badge-top-rated",
    label: "Limited Edition",
    match: "top rated",
  },
];

type ProductBadgeProps = {
  badge: string | null;
};

export function ProductBadge({ badge }: ProductBadgeProps) {
  if (!badge) return null;

  const normalizedBadge = badge.toLowerCase();
  const badgeConfig = badgeMap.find(({ match }) => normalizedBadge.includes(match));

  return (
    <strong className={`product-badge ${badgeConfig?.className ?? "badge-default"}`}>
      {badgeConfig?.label ?? badge}
    </strong>
  );
}

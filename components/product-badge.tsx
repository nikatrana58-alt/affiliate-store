const badgeMap = [
  {
    className: "badge-trending",
    label: "Trending",
    match: "trending",
  },
  {
    className: "badge-bestseller",
    label: "Bestseller",
    match: "bestseller",
  },
  {
    className: "badge-premium",
    label: "Premium Pick",
    match: "premium",
  },
  {
    className: "badge-top-rated",
    label: "Top Rated",
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

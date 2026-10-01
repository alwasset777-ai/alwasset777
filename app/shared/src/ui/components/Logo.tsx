export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="10" fill="#c8102e" />
      <path d="M10 24 24 12l14 12v13a1 1 0 0 1-1 1H27v-9h-6v9H11a1 1 0 0 1-1-1z" fill="#fff" />
      <text x="24" y="44.5" textAnchor="middle" fontSize="7" fontWeight="700" fill="#fff" fontFamily="Inter, sans-serif">777</text>
    </svg>
  );
}

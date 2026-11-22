interface Props {
  size?: 'sm' | 'md';
}

export default function ExplicitBadge({ size = 'sm' }: Props) {
  return (
    <span
      className={`explicit-badge${size === 'md' ? ' explicit-badge-md' : ''}`}
      title="Содержит нецензурную лексику (18+)"
      aria-label="Содержит нецензурную лексику"
    >
      E
    </span>
  );
}

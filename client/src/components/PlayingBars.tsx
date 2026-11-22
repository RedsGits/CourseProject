interface Props {
  active?: boolean;
}

export default function PlayingBars({ active = true }: Props) {
  return (
    <span
      className={`playing-bars${active ? ' is-active' : ''}`}
      aria-hidden="true"
    >
      <span />
      <span />
      <span />
    </span>
  );
}

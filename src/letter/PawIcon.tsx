/** A small paw (four toes and a pad) that takes the text's colour. Drawn, not an emoji, so it renders the same everywhere (including the saved picture). */
export function PawIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="0.9em"
      height="0.9em"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      style={{ verticalAlign: '-0.08em' }}
    >
      <ellipse cx="4.6" cy="11" rx="2.1" ry="2.9" transform="rotate(-24 4.6 11)" />
      <ellipse cx="9" cy="6.2" rx="2.2" ry="3.1" transform="rotate(-8 9 6.2)" />
      <ellipse cx="15" cy="6.2" rx="2.2" ry="3.1" transform="rotate(8 15 6.2)" />
      <ellipse cx="19.4" cy="11" rx="2.1" ry="2.9" transform="rotate(24 19.4 11)" />
      <path d="M12 11.2c-3.2 0-6.2 3.6-6.2 6.3 0 1.9 1.4 2.9 3.2 2.9 1.2 0 2-.5 3-.5s1.8.5 3 .5c1.8 0 3.2-1 3.2-2.9 0-2.7-3-6.3-6.2-6.3Z" />
    </svg>
  );
}

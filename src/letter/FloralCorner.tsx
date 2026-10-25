type FloralCornerProps = { className?: string };

/** The rose-and-fern corner ornament. Placed top-left; turned half a circle for the opposite corner. */
export function FloralCorner({ className }: FloralCornerProps) {
  return (
    <img
      className={className}
      src={`${import.meta.env.BASE_URL}img/floral-corner.webp`}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
    />
  );
}

import { cn } from "@/lib/utils";

/** Crisp inline-SVG Doodle Dash mark — a pencil drawing a happy squiggle. */
export function LogoMark({
  className,
  size = 40,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span
      className={cn(
        "relative inline-grid place-items-center rounded-xl bg-grad shadow-soft",
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        width={size * 0.62}
        height={size * 0.62}
        viewBox="0 0 32 32"
        fill="none"
        className="drop-shadow-sm"
      >
        {/* squiggle stroke drawn by the pencil */}
        <path
          d="M3 24 Q 8 14, 13 20 T 23 18"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.95"
        />
        {/* pencil tip */}
        <path
          d="M20 11 L27 4 L29 6 L22 13 Z"
          fill="white"
        />
        <path d="M20 11 L22 13 L19 14 Z" fill="white" opacity="0.7" />
      </svg>
    </span>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={compact ? 34 : 42} />
      {!compact && (
        <span className="text-lg font-extrabold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
          Doodle <span className="text-grad">Dash</span>
        </span>
      )}
    </div>
  );
}

export default Logo;

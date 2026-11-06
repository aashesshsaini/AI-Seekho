import Image from "next/image";
import clsx from "clsx";

/**
 * 3D book mockup built from the exact approved cover (rendered from page 1
 * of the v4 Reader Edition). The cover itself is never redrawn or altered.
 */
export function BookMockup({
  src = "/images/product/cover.webp",
  priority = false,
  className,
  sizes = "(min-width: 1024px) 380px, 70vw",
}: {
  src?: string;
  priority?: boolean;
  className?: string;
  sizes?: string;
}) {
  return (
    <div className={clsx("group relative mx-auto aspect-[1323/1871] w-full [perspective:1800px]", className)}>
      {/* soft floor shadow */}
      <div aria-hidden className="absolute -bottom-6 left-[8%] right-[2%] h-10 rounded-[50%] bg-black/70 blur-2xl" />
      <div
        className="relative h-full w-full transition-transform duration-700 ease-[var(--ease-out-soft)] [transform-style:preserve-3d] [transform:rotateY(-24deg)_rotateX(5deg)] group-hover:[transform:rotateY(-14deg)_rotateX(3deg)]"
      >
        {/* page block (right edge) */}
        <div
          aria-hidden
          className="absolute right-0 top-[1.2%] h-[97.6%] w-[34px] origin-right [transform:rotateY(90deg)_translateX(17px)_translateZ(-1px)]"
          style={{
            background:
              "repeating-linear-gradient(90deg, #e9ecf4 0px, #e9ecf4 1px, #c9cedc 1px, #c9cedc 2px), linear-gradient(90deg, #f3f5fa, #cfd4e2)",
            backgroundBlendMode: "multiply",
          }}
        />
        {/* back cover hint */}
        <div aria-hidden className="absolute inset-0 rounded-[3px] bg-ink-950 [transform:translateZ(-34px)]" />
        {/* front cover */}
        <div className="absolute inset-0 overflow-hidden rounded-[3px] shadow-[var(--shadow-book)]">
          <Image
            src={src}
            alt="AI SE SMART KAAM — The Practical AI Playbook, book cover"
            fill
            preload={priority}
            fetchPriority={priority ? "high" : undefined}
            loading={priority ? "eager" : "lazy"}
            sizes={sizes}
            className="object-cover"
          />
          {/* spine crease + light sweep (overlay only; cover unchanged) */}
          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-[7%] bg-gradient-to-r from-black/45 via-white/[0.07] to-transparent" />
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.05] to-white/[0.12]" />
        </div>
      </div>
    </div>
  );
}

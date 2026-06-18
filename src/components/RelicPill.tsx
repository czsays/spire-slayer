import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { Relic } from "@/data/gameState";

export default function RelicPill({ relic }: { relic: Relic }) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (hovered && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      let top = rect.bottom + 6;
      if (top + 80 > window.innerHeight) top = rect.top - 80;
      const left = Math.min(rect.left, window.innerWidth - 224 - 8);
      setPos({ top, left });
    }
  }, [hovered]);

  return (
    <>
      <span
        ref={ref}
        className="text-[10px] text-foreground bg-secondary px-1.5 py-0.5 rounded cursor-help hover:bg-muted-foreground/20 hover:ring-1 hover:ring-muted-foreground/40 transition-all"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {relic.name}
      </span>
      {hovered && pos && createPortal(
        <div
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-[9999] w-56 rounded-lg border border-border bg-card shadow-xl shadow-black/40 p-3 pointer-events-none animate-in fade-in-0 zoom-in-95 duration-150"
        >
          <p className="font-display text-xs font-semibold text-foreground">{relic.name}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{relic.description}</p>
        </div>,
        document.body
      )}
    </>
  );
}

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { AppPotion } from "@/hooks/useGameState";

export default function PotionPill({ potion }: { potion: AppPotion }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (showTooltip && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const tooltipWidth = 224; // w-56 = 14rem = 224px
      const tooltipHeight = 140; // estimate (name + description + status badge)

      let top = rect.bottom + 6;
      if (top + tooltipHeight > window.innerHeight) {
        top = rect.top - tooltipHeight - 6;
      }
      if (top < 8) top = 8;

      let left = rect.left;
      if (left + tooltipWidth > window.innerWidth) {
        left = window.innerWidth - tooltipWidth - 8;
      }
      if (left < 8) left = 8;

      setPos({ top, left });
    }
  }, [showTooltip]);

  const handleShow = () => setShowTooltip(true);
  const handleHide = () => setShowTooltip(false);

  return (
    <>
      <span
        ref={ref}
        tabIndex={0}
        className={cn(
          "text-[10px] px-1.5 py-0.5 rounded cursor-help transition-all truncate max-w-[10rem]",
          "hover:ring-1 hover:ring-muted-foreground/40",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
          potion.can_use
            ? "text-foreground bg-secondary hover:bg-muted-foreground/20"
            : "text-muted-foreground bg-transparent border border-dashed border-muted-foreground/40"
        )}
        onMouseEnter={handleShow}
        onMouseLeave={handleHide}
        onFocus={handleShow}
        onBlur={handleHide}
      >
        {potion.name}
      </span>
      {showTooltip &&
        pos &&
        createPortal(
          <div
            style={{ top: pos.top, left: pos.left }}
            className="fixed z-[9999] w-56 rounded-lg border border-border bg-card shadow-xl shadow-black/40 p-3 pointer-events-none animate-in fade-in-0 zoom-in-95 duration-150"
          >
            <p className="font-display text-xs font-semibold text-foreground">
              {potion.name}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {potion.description}
            </p>
            <p className="mt-2">
              {potion.can_use ? (
                <span className="text-[10px] font-semibold text-emerald-400">
                  Ready to use
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-red-400">
                  Cannot use now
                </span>
              )}
            </p>
          </div>,
          document.body
        )}
    </>
  );
}

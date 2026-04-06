import type { Relic } from "@/data/gameState";
import RelicPill from "@/components/RelicPill";

interface RelicListProps {
  relics: Relic[];
}

export default function RelicList({ relics }: RelicListProps) {
  if (relics.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
        Relics:
      </span>
      {relics.map((r) => (
        <RelicPill key={r.id} relic={r} />
      ))}
    </div>
  );
}

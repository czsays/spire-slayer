export default function MenuView() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
      <span className="font-display text-xs font-bold text-muted-foreground uppercase tracking-wide">
        Main Menu
      </span>
      <p className="text-[11px] text-muted-foreground">No active run</p>
    </div>
  );
}

export type PlayerClass = "ironclad" | "silent" | "defect" | "necrobinder" | "regent";

interface EnergyIconProps {
  size?: number;
  playerClass?: PlayerClass;
}

const classConfig: Record<PlayerClass, { fill: string; stroke: string; shape: "circle" | "hexagon" | "diamond" | "triangle" | "square" }> = {
  ironclad: { fill: "hsl(0, 70%, 50%)", stroke: "hsl(0, 80%, 65%)", shape: "circle" },
  silent: { fill: "hsl(145, 55%, 42%)", stroke: "hsl(145, 65%, 58%)", shape: "diamond" },
  defect: { fill: "hsl(210, 70%, 50%)", stroke: "hsl(210, 80%, 65%)", shape: "square" },
  necrobinder: { fill: "hsl(330, 80%, 55%)", stroke: "hsl(330, 90%, 70%)", shape: "hexagon" },
  regent: { fill: "hsl(45, 80%, 55%)", stroke: "hsl(45, 90%, 70%)", shape: "triangle" },
};

const shapes: Record<string, string> = {
  circle: "", // uses <circle> element
  hexagon: "12,2 22,7 22,17 12,22 2,17 2,7",
  diamond: "12,1 23,12 12,23 1,12",
  triangle: "12,2 23,21 1,21",
  square: "3,3 21,3 21,21 3,21",
};

export default function EnergyIcon({ size = 9, playerClass = "necrobinder" }: EnergyIconProps) {
  const config = classConfig[playerClass];

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
      {config.shape === "circle" ? (
        <circle cx="12" cy="12" r="10" fill={config.fill} stroke={config.stroke} strokeWidth="1.5" />
      ) : (
        <polygon points={shapes[config.shape]} fill={config.fill} stroke={config.stroke} strokeWidth="1.5" />
      )}
    </svg>
  );
}

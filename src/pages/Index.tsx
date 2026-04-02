import DeckTracker from "@/components/DeckTracker";
import EnemyOverlay from "@/components/EnemyOverlay";
import { sampleGameState } from "@/data/gameState";
import gameScreenshot from "@/assets/game-screenshot.png";

const Index = () => {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <DeckTracker />
      <div className="flex-1 relative overflow-hidden">
        <img
          src={gameScreenshot}
          alt="Slay the Spire 2 gameplay"
          className="w-full h-full object-cover"
        />
        <EnemyOverlay enemies={sampleGameState.enemies} />
      </div>
    </div>
  );
};

export default Index;

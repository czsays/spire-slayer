import DeckTracker from "@/components/DeckTracker";

const Index = () => {
  return (
    <div className="flex h-screen w-full bg-transparent">
      <div className="w-[400px] flex-shrink-0 h-full">
        <DeckTracker />
      </div>
      {/* Transparent tooltip overflow area */}
      <div className="flex-1" />
    </div>
  );
};

export default Index;

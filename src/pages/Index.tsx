import { useState, useRef, useEffect } from "react";
import DeckTracker from "@/components/DeckTracker";
import gameScreenshot from "@/assets/game-screenshot.jpg";

const Index = () => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgHeight, setImgHeight] = useState<number | null>(null);

  useEffect(() => {
    const updateHeight = () => {
      if (imgRef.current) {
        // Get the actual rendered height of the image (with object-contain)
        const container = imgRef.current.parentElement;
        if (!container) return;
        const containerW = container.clientWidth;
        const containerH = container.clientHeight;
        const natW = imgRef.current.naturalWidth || 1;
        const natH = imgRef.current.naturalHeight || 1;
        const scale = Math.min(containerW / natW, containerH / natH);
        setImgHeight(Math.floor(natH * scale));
      }
    };

    const img = imgRef.current;
    if (img?.complete) updateHeight();
    img?.addEventListener("load", updateHeight);
    window.addEventListener("resize", updateHeight);
    return () => {
      img?.removeEventListener("load", updateHeight);
      window.removeEventListener("resize", updateHeight);
    };
  }, []);

  return (
    <div className="flex h-screen w-full bg-black">
      <div
        className="flex-shrink-0"
        style={imgHeight ? { height: imgHeight, alignSelf: "center" } : { height: "100%" }}
      >
        <DeckTracker />
      </div>
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <img
          ref={imgRef}
          src={gameScreenshot}
          alt="Slay the Spire 2 gameplay"
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
};

export default Index;

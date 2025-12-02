import React, { useState, useEffect, useRef } from "react";

interface DrawerProps {
  children: React.ReactNode;
  isOpen?: boolean;
  onStateChange?: (state: "closed" | "half") => void;
  onClose?: () => void;
}

const MobileDrawer: React.FC<DrawerProps> = ({
  children,
  isOpen = false,
  onStateChange,
  onClose,
}) => {
  const [drawerState, setDrawerState] = useState<"closed" | "half">("closed");
  const [translateY, setTranslateY] = useState(0);

  
  const snapPoints = {
    closed: 100,
    peek: 79,
    half: 0,
  };

  
  useEffect(() => {
    if (isOpen && drawerState === "closed") {
      setDrawerState("half");
    } else if (!isOpen && drawerState !== "closed") {
      setDrawerState("closed");
    }
  }, [isOpen, drawerState]);

  
  useEffect(() => {
    setTranslateY(snapPoints[drawerState]);
    onStateChange?.(drawerState);
  }, [drawerState, onStateChange]);

  
  const prevDrawerStateRef = useRef(drawerState);
  useEffect(() => {
    if (
      drawerState === "closed" &&
      prevDrawerStateRef.current !== "closed" &&
      onClose
    ) {
      onClose();
    }
    prevDrawerStateRef.current = drawerState;
  }, [drawerState, onClose]);

  
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    const touchY = e.touches[0].clientY;
    const deltaY = touchY - startY;

    if (deltaY > 50) {
      
      setDrawerState("closed");
      setIsDragging(false);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  
  if (drawerState === "closed" && !isOpen) {
    return null;
  }

  return (
    <>
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-999 ${
          drawerState === "half" ? "opacity-10" : "opacity-0"
        }`}
        onClick={() => setDrawerState("closed")}
      />

      {/* Drawer */}
      <div
        className={`fixed left-0 right-0 bottom-0 bg-white shadow-lg z-999 transition-transform duration-300 ease-out`}
        style={{
          transform: `translateY(${translateY}vh)`,
          height: `calc(60vh)`,
          paddingBottom: "70px",
          borderTopLeftRadius: "16px",
          borderTopRightRadius: "16px",
          marginBottom: "env(safe-area-inset-bottom, 24px)",
        }}
      >
        <div
          className="flex justify-center items-center py-3 cursor-pointer h-[28px] touch-pan-y"
          onClick={() => setDrawerState("closed")}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        <div
          className="px-6 w-fullbg-yellow-100"
          style={{
            height: `calc(100% - 28px)`,
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
};

export default MobileDrawer;

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

  // 스냅 포인트 정의 (vh 단위)
  const snapPoints = {
    closed: 100, // 완전히 닫힌 상태
    peek: 79, // 살짝 보이는 상태
    half: 0, // 반 정도 열린 상태
  };

  // 초기 상태 설정
  useEffect(() => {
    if (isOpen && drawerState === "closed") {
      setDrawerState("half");
    } else if (!isOpen && drawerState !== "closed") {
      setDrawerState("closed");
    }
  }, [isOpen, drawerState]);

  // 상태 변경시 translateY 업데이트
  useEffect(() => {
    setTranslateY(snapPoints[drawerState]);
    onStateChange?.(drawerState);
  }, [drawerState, onStateChange]);

  // 드로어가 닫힐 때 onClose 호출 (별도 useEffect)
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

  // 터치 이벤트 핸들러
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
      // 50px 이상 아래로 드래그하면 닫기
      setDrawerState("closed");
      setIsDragging(false);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // 드로어가 완전히 닫혀있고 열리지 않을 때만 렌더링하지 않음
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
          paddingBottom: "70px", // 모바일 하단 안전 영역
          borderTopLeftRadius: "16px",
          borderTopRightRadius: "16px",
          marginBottom: "env(safe-area-inset-bottom, 24px)", // 모바일 하단 안전 영역
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
            height: `calc(100% - 28px)`, // 50px는 상단 헤더 높이
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
};

export default MobileDrawer;

import React, { useState, useRef, useEffect } from "react";

interface DrawerProps {
  children: React.ReactNode;
  isOpen?: boolean;
  onStateChange?: (state: "closed" | "half") => void;
}

const MobileDrawer: React.FC<DrawerProps> = ({
  children,
  isOpen = false,
  onStateChange,
}) => {
  const [drawerState, setDrawerState] = useState<"closed" | "half">("closed");
  const [translateY, setTranslateY] = useState(0);

  const drawerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

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
    }
  }, [drawerState, isOpen]);

  // 상태 변경시 translateY 업데이트
  useEffect(() => {
    setTranslateY(snapPoints[drawerState]);
    onStateChange?.(drawerState);
  }, [drawerState, onStateChange]);

  if (drawerState === "closed") {
    return null; // 드로어가 닫혀있으면 아무것도 렌더링하지 않음
  }

  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-30 transition-opacity duration-300 z-999 opacity-5`}
        onClick={() => setDrawerState("closed")}
      />

      {/* Drawer */}
      <div
        className={`fixed left-0 right-0 bottom-0 bg-white shadow-lg z-999 transition-transform duration-300 ease-in ease-out `}
        style={{
          transform: `translateY(${translateY}vh)`,
          height: `calc(60vh)`,
          paddingBottom: "70px", // 모바일 하단 안전 영역
          borderTopLeftRadius: "16px",
          borderTopRightRadius: "16px",
          marginBottom: "env(safe-area-inset-bottom, 24px)", // 모바일 하단 안전 영역
        }}
      >
        <div className="flex justify-center items-center py-3 cursor-pointer h-[28px]">
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

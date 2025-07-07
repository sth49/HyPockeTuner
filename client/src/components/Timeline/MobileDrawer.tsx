import React, { useState, useRef, useEffect } from "react";

interface DrawerProps {
  children: React.ReactNode;
  isOpen?: boolean;
  onStateChange?: (state: "closed" | "peek" | "half" | "full") => void;
}

const MobileDrawer: React.FC<DrawerProps> = ({
  children,
  isOpen = false,
  onStateChange,
}) => {
  const [drawerState, setDrawerState] = useState<
    "closed" | "peek" | "half" | "full"
  >("closed");
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [translateY, setTranslateY] = useState(0);

  const drawerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // 스냅 포인트 정의 (vh 단위)
  const snapPoints = {
    closed: 100, // 완전히 닫힌 상태
    peek: 79, // 살짝 보이는 상태
    half: 50, // 반 정도 열린 상태
    full: 10, // 거의 전체 화면
  };

  // 초기 상태 설정
  useEffect(() => {
    if (isOpen && drawerState === "closed") {
      setDrawerState("peek");
    }
  }, [isOpen]);

  // 상태 변경시 translateY 업데이트
  useEffect(() => {
    setTranslateY(snapPoints[drawerState]);
    onStateChange?.(drawerState);
  }, [drawerState, onStateChange]);

  // 가장 가까운 스냅 포인트 찾기
  const findNearestSnapPoint = (
    currentTranslateY: number
  ): keyof typeof snapPoints => {
    let nearest: keyof typeof snapPoints = "closed";
    let minDistance = Math.abs(currentTranslateY - snapPoints.closed);

    Object.entries(snapPoints).forEach(([state, point]) => {
      const distance = Math.abs(currentTranslateY - point);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = state as keyof typeof snapPoints;
      }
    });

    return nearest;
  };

  // 터치 시작
  const handleTouchStart = (e: React.TouchEvent) => {
    if (drawerState === "closed") return;

    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
  };

  // 터치 이동
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - startY;
    const newTranslateY =
      snapPoints[drawerState] + (deltaY / window.innerHeight) * 100;

    // 드래그 범위 제한
    const clampedTranslateY = Math.max(
      snapPoints.full,
      Math.min(snapPoints.closed, newTranslateY)
    );
    setTranslateY(clampedTranslateY);
    setCurrentY(touch.clientY);
  };

  // 터치 종료
  const handleTouchEnd = () => {
    if (!isDragging) return;

    setIsDragging(false);

    // 속도 계산 (간단한 버전)
    const velocity = currentY - startY;
    let targetState: keyof typeof snapPoints;

    // 빠른 스와이프 감지
    if (Math.abs(velocity) > 50) {
      if (velocity > 0) {
        // 아래로 스와이프 - 닫는 방향
        switch (drawerState) {
          case "full":
            targetState = "half";
            break;
          case "half":
            targetState = "peek";
            break;
          case "peek":
            targetState = "closed";
            break;
          default:
            targetState = "closed";
        }
      } else {
        // 위로 스와이프 - 여는 방향
        switch (drawerState) {
          case "closed":
            targetState = "peek";
            break;
          case "peek":
            targetState = "half";
            break;
          case "half":
            targetState = "full";
            break;
          default:
            targetState = "full";
        }
      }
    } else {
      // 가장 가까운 스냅 포인트로 이동
      targetState = findNearestSnapPoint(translateY);
    }

    setDrawerState(targetState);
  };

  // 마우스 이벤트 (데스크톱 테스트용)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (drawerState === "closed") return;

    setIsDragging(true);
    setStartY(e.clientY);
    setCurrentY(e.clientY);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const deltaY = e.clientY - startY;
    const newTranslateY =
      snapPoints[drawerState] + (deltaY / window.innerHeight) * 100;
    const clampedTranslateY = Math.max(
      snapPoints.full,
      Math.min(snapPoints.closed, newTranslateY)
    );

    setTranslateY(clampedTranslateY);
    setCurrentY(e.clientY);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    handleTouchEnd();
  };

  // 마우스 이벤트 리스너
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, startY, drawerState]);

  // 핸들 클릭으로 상태 변경
  const handleHandleClick = () => {
    if (drawerState === "closed") {
      setDrawerState("peek");
    } else if (drawerState === "peek") {
      setDrawerState("half");
    } else if (drawerState === "half") {
      setDrawerState("full");
    } else {
      setDrawerState("peek");
    }
  };
  if (drawerState === "closed") {
    return null; // 드로어가 닫혀있으면 아무것도 렌더링하지 않음
  }

  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-30 transition-opacity duration-300 z-999 opacity-5`}
        onClick={() => setDrawerState("closed")}
        style={{
          // 서서히 나타나는 효과
          transition: isDragging ? "none" : "opacity 3s ease-in-out",
          // pointerEvents: drawerState === "closed" ? "none" : "auto",
        }}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed left-0 right-0 bottom-0 bg-white shadow-lg z-999 transition-transform duration-300 ease-out ${
          isDragging ? "" : "duration-300"
        }`}
        style={{
          transform: `translateY(${translateY}vh)`,
          height: `calc(100vh - 45px)`,
          paddingBottom: "90px", // 모바일 하단 안전 영역
          borderTopLeftRadius: "16px",
          borderTopRightRadius: "16px",
          marginBottom: "env(safe-area-inset-bottom, 24px)", // 모바일 하단 안전 영역
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        {/* 드래그 핸들 */}
        <div
          className="flex justify-center items-center py-3 cursor-pointer"
          onClick={handleHandleClick}
        >
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* 콘텐츠 영역 */}
        <div
          ref={contentRef}
          className="px-6 pb-6 h-full overflow-y-auto"
          style={{
            paddingBottom: "env(safe-area-inset-bottom, 24px)",
            height: "calc(100% - 40px)", // 핸들 영역 제외
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
};

export default MobileDrawer;

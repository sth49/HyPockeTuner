/* eslint-disable react-hooks/rules-of-hooks */
import React, { useEffect, useRef, useState } from "react";
import { Group } from "@visx/group";
import { scaleLinear } from "@visx/scale";
import { ParentSize } from "@visx/responsive";
import { BAND_COLORS } from "../../constants/timelineLayout";

interface MiniMapProps {
  data: any[];
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  onScrollChange: (scrollRatio: number) => void;
}

const gray = "oklch(87.2% 0.01 258.338)";

const MiniMapContent = ({
  data,
  width,
  height,
  scrollTop,
  scrollHeight,
  clientHeight,
  onScrollChange,
}: MiniMapProps & { width: number; height: number }) => {
  const rafRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 🔧 개선된 드래그 상태 관리
  const dragStartMouseY = useRef(0); // 절대 마우스 좌표
  const dragStartViewportTop = useRef(0); // 드래그 시작 시 뷰포트 위치
  const currentMouseY = useRef(0); // 현재 마우스 좌표 (디버깅용)
  const svgRef = useRef<SVGSVGElement>(null);

  const margin = { top: 5, right: 0, bottom: 10, left: 0 };
  const innerWidth = width - margin.left - margin.right;
  const barHeight = 10;
  const innerHeight = barHeight * data.length;

  const maxIndex = data.length;

  const xScale = scaleLinear({
    domain: [0, 1],
    range: [0, innerWidth],
  });

  const yScale = scaleLinear({
    domain: [0, Math.max(maxIndex, 0)],
    range: [0, innerHeight],
  });

  const viewportTop = (scrollTop / scrollHeight) * innerHeight;
  const viewportHeight = (clientHeight / scrollHeight) * innerHeight;

  const handleTouchStart = (e: React.TouchEvent<SVGRectElement>) => {
    setIsDragging(true);

    const touchY = e.touches[0].clientY;

    dragStartMouseY.current = touchY;
    dragStartViewportTop.current = viewportTop;
    currentMouseY.current = touchY;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;

    const currentTouchY = e.touches[0].clientY;
    currentMouseY.current = currentTouchY;

    // 🔧 핵심 개선: 절대 좌표 기반 드래그 거리 계산
    const dragDistance = currentTouchY - dragStartMouseY.current;

    // 🔧 새로운 뷰포트 위치 = 시작 뷰포트 위치 + 드래그 거리
    const newViewportTop = dragStartViewportTop.current + dragDistance;

    // 🔧 경계 체크 및 스크롤 비율 계산
    const clampedViewportTop = Math.max(
      0,
      Math.min(innerHeight - viewportHeight, newViewportTop)
    );
    const nextScrollRatio = clampedViewportTop / (innerHeight - viewportHeight);

    onScrollChange(nextScrollRatio);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleMouseDown = (e: React.MouseEvent<SVGRectElement>) => {
    setIsDragging(true);

    const mouseY = e.clientY;

    // 🔧 절대 좌표 저장 (화면 기준)
    dragStartMouseY.current = mouseY;
    dragStartViewportTop.current = viewportTop;
    currentMouseY.current = mouseY;
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const currentMouseYPos = e.clientY;
    currentMouseY.current = currentMouseYPos;

    const dragDistance = currentMouseYPos - dragStartMouseY.current;

    const newViewportTop = dragStartViewportTop.current + dragDistance;

    const clampedViewportTop = Math.max(
      0,
      Math.min(innerHeight - viewportHeight, newViewportTop)
    );
    const nextScrollRatio = clampedViewportTop / (innerHeight - viewportHeight);

    onScrollChange(nextScrollRatio);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleTouchEnd);
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, innerHeight, viewportHeight]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handleMiniMapClick = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const y = event.clientY - rect.top - margin.top;
    const clickRatio = Math.max(0, Math.min(1, y / innerHeight));

    onScrollChange(clickRatio);
  };

  if (!data || data.length === 0 || width <= 0 || height <= 0) {
    console.log("MiniMap: No data or invalid dimensions");
    return null;
  }

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      onClick={handleMiniMapClick}
      style={{
        cursor: "pointer",
        zIndex: 999,
      }}
    >
      <Group left={margin.left} top={margin.top}>
        {data.map((d, i) => {
          const barWidth = xScale(1) - xScale(0);
          const barX = xScale(0);
          const yPosition = yScale(i);
          const rectWidth = (barWidth - 20) / 3;
          // const rectHeight = barHeight / 3;

          return (
            <g key={`bar-group-${d.bracket}-${i}`}>
              {d.nodes.map((node: any, j: number) => {
                const color =
                  node.bracket > 0
                    ? node.data.type !== "user" &&
                      BAND_COLORS.BAND[node.bracket % BAND_COLORS.BAND.length]
                    : node.bracket === -1
                    ? "oklch(92% 0.004 286.32)"
                    : node.bracket === -2
                    ? "white"
                    : "white";

                const rectX =
                  d.direction === "ltr"
                    ? barX + j * rectWidth + 10
                    : width - (barX + (d.nodes.length - j) * rectWidth + 10);
                // const rectY =
                //   d.direction === "ltr"
                //     ? yPosition + rectHeight * (d.nodes.length - j - 1)
                //     : d.nodes.length !== 3
                //     ? yPosition + rectHeight * (j + 1)
                //     : yPosition + rectHeight * j;

                return (
                  <rect
                    key={`bar-${d.bracket}-${i}-${j}`}
                    x={rectX}
                    y={yPosition}
                    width={(barWidth - 20) / 3}
                    height={barHeight}
                    fill={color}
                    strokeWidth={1}
                  />
                );
              })}
              {d.verticalLink && (
                <g>
                  <rect
                    x={10}
                    y={yPosition - 2}
                    width={barWidth - 20}
                    height={4}
                    fill={"white"}
                  />
                  <rect
                    x={
                      d.direction === "ltr"
                        ? width - (10 + (barWidth - 20) / 3)
                        : 10
                    }
                    y={yPosition - 2}
                    width={(barWidth - 20) / 3}
                    height={4}
                    fill={
                      d.verticalLink.bracket > 0
                        ? d.verticalLink.data.type !== "user" &&
                          BAND_COLORS.BAND[
                            d.verticalLink.bracket % BAND_COLORS.BAND.length
                          ]
                        : d.verticalLink.bracket === -1
                        ? "oklch(92% 0.004 286.32)"
                        : d.verticalLink.bracket === -2
                        ? "white"
                        : "white"
                    }
                  />
                </g>
              )}
            </g>
          );
        })}

        <rect
          x={5}
          y={viewportTop}
          width={innerWidth - 10}
          height={viewportHeight > 60 ? viewportHeight : 60}
          fill="rgba(0, 0, 0, 0.1)"
          strokeWidth={2}
          style={{ cursor: "grab" }}
          onTouchStart={handleTouchStart}
          onMouseDown={handleMouseDown}
        />
      </Group>
    </svg>
  );
};

const MiniMap = ({
  data,
  scrollTop,
  scrollHeight,
  clientHeight,
  onScrollChange,
}: MiniMapProps) => {
  return (
    <div className="w-full h-full">
      <ParentSize>
        {({ width, height }) => (
          <MiniMapContent
            data={data}
            width={Math.min(width, 60)}
            height={height}
            scrollTop={scrollTop}
            scrollHeight={scrollHeight}
            clientHeight={clientHeight}
            onScrollChange={onScrollChange}
          />
        )}
      </ParentSize>
    </div>
  );
};

export default MiniMap;

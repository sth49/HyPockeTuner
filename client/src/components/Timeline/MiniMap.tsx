/* eslint-disable react-hooks/rules-of-hooks */
import React, { useEffect, useRef, useState } from "react";
import { ParentSize } from "@visx/responsive";
import MiniBand from "./MiniBand";

interface MiniMapProps {
  data: any[];
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  onScrollChange: (scrollRatio: number) => void;
  searchType?: string; // Optional prop for search type
  isCurrentFocusedLink: (
    rowIndex: number,
    linkIndex: number,
    isVertical: boolean
  ) => boolean;
}

const MiniMapContent = ({
  data,
  width,
  height,
  scrollTop,
  scrollHeight,
  clientHeight,
  onScrollChange,
  searchType,
  isCurrentFocusedLink, // Function to check if the link is currently focused
}: MiniMapProps & { width: number; height: number }) => {
  const rafRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 🔧 개선된 드래그 상태 관리
  const dragStartMouseY = useRef(0);
  const dragStartViewportTop = useRef(0);
  const currentMouseY = useRef(0);
  const svgRef = useRef<SVGSVGElement>(null);

  const margin = { top: 7, right: 7, bottom: 7, left: 7 };
  const innerWidth = width - margin.left - margin.right;
  const availableHeight = height - margin.top - margin.bottom;

  // 🔧 실제 밴드 크기 (원본 크기)
  const ORIGINAL_BAND_WIDTH = 80;
  const ORIGINAL_BAND_HEIGHT = 60;
  const ORIGINAL_ASPECT_RATIO = ORIGINAL_BAND_WIDTH / ORIGINAL_BAND_HEIGHT;

  // 🔧 기본 크기 계산 (고정 크기)
  const baseBandWidth = innerWidth * 0.15;
  const baseBandHeight = baseBandWidth / ORIGINAL_ASPECT_RATIO;
  const baseLinkWidth = (innerWidth - baseBandWidth * 3) / 2; // 가로 링크 너비
  const baseLinkHeight = 8; // 🔧 세로 링크의 고정 높이

  // console.log("Base sizes:", {
  //   bandWidth: baseBandWidth,
  //   bandHeight: baseBandHeight,
  //   linkWidth: baseLinkWidth,
  //   linkHeight: baseLinkHeight,
  // });

  // 🔧 전체 높이 계산 함수
  const calculateTotalHeight = (bandHeight: number, linkHeight: number) => {
    // 각 행의 밴드 높이 + 세로 링크들의 높이
    const bandTotalHeight = bandHeight * data.length;

    // 세로 링크가 있는 행의 개수 계산
    const verticalLinkCount = data.filter((row) => row.verticalLink).length;
    const linkTotalHeight = linkHeight * verticalLinkCount;

    return bandTotalHeight + linkTotalHeight;
  };

  // 🔧 크기 결정 로직
  const calculateFinalSizes = () => {
    const naturalHeight = calculateTotalHeight(baseBandHeight, baseLinkHeight);

    if (naturalHeight <= availableHeight) {
      // 🔧 높이가 충분하면 고정 크기 사용
      // console.log(
      //   "Using fixed sizes - natural height:",
      //   naturalHeight,
      //   "available:",
      //   availableHeight
      // );
      return {
        bandWidth: baseBandWidth,
        bandHeight: baseBandHeight,
        linkWidth: baseLinkWidth,
        linkHeight: baseLinkHeight,
        totalHeight: naturalHeight,
        isScaled: false,
      };
    } else {
      // 🔧 높이가 부족하면 비례적으로 축소
      const scaleFactor = availableHeight / naturalHeight;
      // console.log(
      //   "Scaling down - scale factor:",
      //   scaleFactor,
      //   "natural:",
      //   naturalHeight,
      //   "available:",
      //   availableHeight
      // );

      return {
        bandWidth: (innerWidth - baseLinkWidth * scaleFactor * 2) / 3,
        bandHeight: baseBandHeight * scaleFactor,
        linkWidth: baseLinkWidth * scaleFactor,
        linkHeight: baseLinkHeight * scaleFactor,
        totalHeight: availableHeight,
        isScaled: true,
      };
    }
  };

  const {
    bandWidth,
    bandHeight,
    linkWidth,
    linkHeight,
    totalHeight: innerHeight,
  } = calculateFinalSizes();

  const size = {
    bandWidth,
    bandHeight,
    linkWidth,
    linkHeight, // 세로 링크용 높이 추가
  };

  // console.log(
  //   "Final sizes:",
  //   size,
  //   "innerHeight:",
  //   innerHeight,
  //   "isScaled:",
  //   isScaled
  // );

  const viewportTop = (scrollTop / scrollHeight) * innerHeight;
  const viewportHeight = (clientHeight / scrollHeight) * innerHeight;
  // console.log(
  //   "Viewport top:",
  //   viewportTop,
  //   "Viewport height:",
  //   viewportHeight,
  //   "Scroll top:",
  //   scrollTop,
  //   "Scroll height:",
  //   scrollHeight,
  //   "Client height:",
  //   clientHeight
  // );
  // console.log("Viewport height:", viewportHeight);

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

    const dragDistance = currentTouchY - dragStartMouseY.current;
    const newViewportTop = dragStartViewportTop.current + dragDistance;

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
    <div
      className="w-full h-full relative "
      style={{ position: "relative", overflow: "hidden" }}
    >
      <div
        className="w-full z-1 p-[7px]"
        style={{
          height: `${innerHeight + margin.top + margin.bottom}px`,
          maxHeight: "100%",
          overflow: "hidden",
        }}
      >
        {data.map((row, reversedIndex) => (
          <React.Fragment key={row.rowIndex}>
            {row.verticalLink && (
              <div
                className="flex w-full"
                style={{
                  height: `${linkHeight}px`,
                  justifyContent:
                    row.direction === "ltr" ? "flex-end" : "flex-start",
                }}
              >
                {/* <div
                  className="flex items-center justify-center"
                  style={{
                    width: `${bandWidth}px`,
                    height: `${linkHeight}px`,
                    backgroundColor: "red",
                  }}
                ></div> */}
                <MiniBand
                  {...row.verticalLink}
                  isVertical={true}
                  dir={row.direction}
                  sizes={size}
                  searchType={searchType} // Pass the searchType prop"
                  isCurrentFocusedLink={isCurrentFocusedLink(
                    row.rowIndex,
                    -1,
                    true
                  )} // Check if this link is currently focused
                />
              </div>
            )}
            <div
              data-row-index={reversedIndex}
              style={{
                height: `${bandHeight}px`,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <div
                className="flex flex-row items-center w-full"
                style={{
                  justifyContent:
                    row.direction === "ltr" ? "flex-start" : "flex-end",
                }}
              >
                {row.nodes.map((node: any, index: number) => (
                  <React.Fragment key={index}>
                    <div>
                      <MiniBand
                        {...node}
                        isVertical={undefined}
                        dir={row.direction}
                        sizes={size}
                      />
                    </div>
                    <div>
                      {index < row.horizontalLinks.length && (
                        <div>
                          <MiniBand
                            {...row.horizontalLinks[index]}
                            isVertical={false}
                            dir={row.direction}
                            sizes={size}
                            searchType={searchType} // Pass the searchType prop
                            isCurrentFocusedLink={isCurrentFocusedLink(
                              row.rowIndex,
                              index,
                              false
                            )} // Check if this link is currently focused
                          />
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>

      <svg
        ref={svgRef}
        width={width}
        height={innerHeight + 60}
        onClick={handleMiniMapClick}
        style={{
          cursor: "pointer",
          position: "absolute",
          top: margin.top,
          left: 0,
          zIndex: 999,
        }}
      >
        <rect
          x={7}
          y={viewportTop}
          width={innerWidth}
          height={viewportHeight > 60 ? viewportHeight : 60}
          fill="rgba(0, 0, 0, 0.1)"
          strokeWidth={2}
          style={{ cursor: "grab" }}
          onTouchStart={handleTouchStart}
          onMouseDown={handleMouseDown}
        />
      </svg>
    </div>
  );
};

const MiniMap = ({
  data,
  scrollTop,
  scrollHeight,
  clientHeight,
  onScrollChange,
  searchType,
  isCurrentFocusedLink,
}: MiniMapProps) => {
  return (
    <div className="w-full h-full">
      <ParentSize>
        {({ width, height }: { width: number; height: number }) => (
          <MiniMapContent
            data={data}
            width={Math.min(width, 60)}
            height={height - 75}
            scrollTop={scrollTop}
            scrollHeight={scrollHeight}
            clientHeight={clientHeight}
            onScrollChange={onScrollChange}
            searchType={searchType} // Pass the searchType prop
            isCurrentFocusedLink={isCurrentFocusedLink} // Pass the isCurrentFocusedLink prop
          />
        )}
      </ParentSize>
    </div>
  );
};

export default MiniMap;

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState, useRef } from "react";
import Band from "./Band";

import { LAYOUT_CONFIG } from "../../constants/timelineLayout";
import Legend from "../common/Legend";
import { useResponsiveSize } from "../../hooks/useResponsiveSize";
import { mergeNodesAndLinks } from "../../utils/mergeUtils";
import { createZigzagLayout } from "../../utils/nodeLinkLayoutUtils";
import { useGraphData } from "./hooks/useGraphData";
import MiniMap from "./MiniMap";
import MobileDrawer from "./MobileDrawer";
import { BandProps } from "./types";
import { format } from "date-fns";
import { formatting } from "../../utils/utils";
import LinkDetail from "./LinkDetail";
import NodeDetail from "./NodeDetail";

const Timeline: React.FC = () => {
  const [graphData, pendingData] = useGraphData();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isCollapse, setIsCollapse] = useState(true);

  const [scrollTop, setScrollTop] = useState(0);
  const [scrollHeight, setScrollHeight] = useState(0);
  const [clientHeight, setClientHeight] = useState(0);

  const sizes = useResponsiveSize();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<BandProps | null>(null);

  const zigzagRows = useMemo(() => {
    return createZigzagLayout(
      mergeNodesAndLinks(graphData, pendingData, "individual", isCollapse),
      LAYOUT_CONFIG.NODES_PER_ROW
    );
  }, [graphData, isCollapse, pendingData]);

  const reversedRows = useMemo(() => {
    return [...zigzagRows].reverse();
  }, [zigzagRows]);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateContainerWidth = () => {
      if (containerRef.current) {
        sizes.setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateContainerWidth();
    window.addEventListener("resize", updateContainerWidth);

    return () => {
      window.removeEventListener("resize", updateContainerWidth);
    };
  }, [containerRef, sizes]);

  // 스크롤 이벤트 핸들러 추가
  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        setScrollTop(scrollTop);
        setScrollHeight(scrollHeight);
        setClientHeight(clientHeight);
      }
    };

    const contentElement = containerRef.current;
    if (contentElement) {
      contentElement.addEventListener("scroll", handleScroll);
      // 초기 값 설정 (약간의 지연을 두어 DOM이 완전히 렌더링된 후 실행)
      setTimeout(handleScroll, 100);

      return () => {
        contentElement.removeEventListener("scroll", handleScroll);
      };
    }
  }, [reversedRows]); // reversedRows가 변경될 때도 재계산

  // 미니맵에서 스크롤 위치 변경 핸들러
  const handleMiniMapScroll = (scrollRatio: number) => {
    if (containerRef.current) {
      const maxScrollTop =
        containerRef.current.scrollHeight - containerRef.current.clientHeight;
      const newScrollTop = maxScrollTop * scrollRatio;
      requestAnimationFrame(() => {
        containerRef.current!.scrollTop = newScrollTop;
      });
    }
  };

  // 노드 클릭 핸들러
  const handleNodeClick = (nodeData: BandProps) => {
    console.log("Node clicked:", nodeData);
    setSelectedNode(nodeData);
    setDrawerOpen(true);
  };

  // Drawer 상태 변경 핸들러
  const handleDrawerStateChange = (
    state: "closed" | "peek" | "half" | "full"
  ) => {
    if (state === "closed") {
      setDrawerOpen(false);
    }
  };

  return (
    <div className="flex flex-end flex-col bg-white h-full overflow-y-hidden relative">
      <div className="absolute bg-white right-0 w-full h-[30px] z-999 flex items-center justify-between pl-2 pr-2">
        <label className="label">
          <input
            className="checkbox checkbox-sm rounded-sm"
            type="checkbox"
            checked={isCollapse}
            onChange={(e) => setIsCollapse(e.target.checked)}
          />
          <p className="text-xs text-gray-600 ">Collapse by Non-Improvers</p>
        </label>

        <Legend width={50} />
      </div>
      <div
        className="absolute top-[30px] left-0 w-[60px] z-999"
        style={{ height: `calc(100% - 170px)` }}
      >
        <MiniMap
          data={reversedRows}
          scrollTop={scrollTop}
          scrollHeight={scrollHeight}
          clientHeight={clientHeight}
          onScrollChange={handleMiniMapScroll}
        />
      </div>
      <div
        // ref={contentRef}
        className="overflow-y-auto pt-[35px] p-[10px] ml-[60px] relative"
        ref={containerRef}
      >
        {reversedRows.map((row) => (
          <React.Fragment key={row.rowIndex}>
            {row.verticalLink && (
              <div
                className="flex w-full mb-0"
                style={{
                  justifyContent:
                    row.direction === "ltr" ? "flex-end" : "flex-start",
                }}
                onClick={() => {
                  if (row.verticalLink) {
                    handleNodeClick(row.verticalLink);
                  }
                }}
              >
                <Band
                  {...row.verticalLink}
                  sizes={sizes}
                  isVertical={true}
                  dir={row.direction}
                  isCollapse={isCollapse}
                  // mergeType={"all"}
                />
              </div>
            )}

            <div
              className="flex flex-row items-center w-full"
              style={{
                justifyContent:
                  row.direction === "ltr" ? "flex-start" : "flex-end",
              }}
            >
              {row.nodes.map((node: any, index: number) => (
                <React.Fragment key={index}>
                  <div onClick={() => handleNodeClick(node)}>
                    <Band
                      {...node}
                      sizes={sizes}
                      isVertical={undefined}
                      dir={row.direction}
                      isCollapse={isCollapse}
                      // mergeType={mergeType}
                    />
                  </div>
                  <div>
                    {index < row.horizontalLinks.length && (
                      <div
                        onClick={() =>
                          handleNodeClick(row.horizontalLinks[index])
                        }
                      >
                        <Band
                          {...row.horizontalLinks[index]}
                          isVertical={false}
                          sizes={sizes}
                          dir={row.direction}
                          isCollapse={isCollapse}
                          // mergeType={mergeType}
                        />
                      </div>
                    )}
                  </div>
                </React.Fragment>
              ))}
            </div>
          </React.Fragment>
        ))}
      </div>
      {/* Mobile Drawer */}
      <MobileDrawer isOpen={drawerOpen} onStateChange={handleDrawerStateChange}>
        <div className="space-y-4">
          {selectedNode && selectedNode.type === "node" ? (
            <NodeDetail data={selectedNode} />
          ) : selectedNode && selectedNode.type === "link" ? (
            <LinkDetail data={selectedNode} />
          ) : (
            <div className="text-center py-8 text-gray-500">
              노드를 선택해주세요
            </div>
          )}
        </div>
      </MobileDrawer>
    </div>
  );
};

export default Timeline;

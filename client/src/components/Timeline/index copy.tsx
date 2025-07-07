/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState, useRef } from "react";
import Band from "./Band";

import { LAYOUT_CONFIG } from "../../constants/timelineLayout";
import Legend from "../common/Legend";
import { useResponsiveSize } from "../../hooks/useResponsiveSize";
import { mergeNodesAndLinks } from "../../utils/mergeUtils";
import { createZigzagLayout } from "../../utils/nodeLinkLayout";
import { useGraphData } from "./hooks/useGraphData";
import MiniMap from "./MiniMap";
import { CustomSelect } from "../CustomSelect";

const Overview: React.FC = () => {
  const [graphData, pendingData] = useGraphData();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [mergeType, setMergeType] = useState("individual");
  const [isShowBest, setIsShowBest] = useState(true);

  // 스크롤 상태 추가
  const contentRef = useRef<HTMLDivElement | null>(null); // 스크롤 가능한 콘텐츠 참조 추가
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollHeight, setScrollHeight] = useState(0);
  const [clientHeight, setClientHeight] = useState(0);

  const sizes = useResponsiveSize(isShowBest);

  const zigzagRows = useMemo(() => {
    return createZigzagLayout(
      mergeNodesAndLinks(graphData, pendingData, mergeType, isShowBest),
      LAYOUT_CONFIG.NODES_PER_ROW
    );
  }, [graphData, isShowBest, mergeType]);

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
      if (contentRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
        setScrollTop(scrollTop);
        setScrollHeight(scrollHeight);
        setClientHeight(clientHeight);
      }
    };

    const contentElement = contentRef.current;
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
    if (contentRef.current) {
      const maxScrollTop =
        contentRef.current.scrollHeight - contentRef.current.clientHeight;
      const newScrollTop = maxScrollTop * scrollRatio;
      requestAnimationFrame(() => {
        contentRef.current!.scrollTop = newScrollTop;
      });
    }
  };

  return (
    <div
      className="flex flex-end flex-col bg-white h-full pt-[70px] ml-[60px] overflow-y-hidden "
      ref={containerRef}
    >
      <div className="absolute top-[65px] left-0 w-full h-[45px] bg-base-100 z-999 flex items-center justify-center gap-3 border-b-[0.5px] border-b-[#e0e0e0]">
        <p className="text-xs font-semibold" style={{ fontSize: "0.8rem" }}>
          Group by
        </p>
        <CustomSelect
          options={[
            { value: "individual", label: "Individual" },
            { value: "round", label: "Round" },
            { value: "bracket", label: "Bracket" },
            { value: "all", label: "All" },
          ]}
          minHeight="30px"
          // style={{ minHeihgt: "30px" }}
          className="w-[100px] text-xs"
          value={{
            value: mergeType,
            label: mergeType.charAt(0).toUpperCase() + mergeType.slice(1),
          }}
          onChange={(e: { value: string; label: string } | null) => {
            if (e) setMergeType(e.value);
          }}
        />
        <p className="text-xs font-semibold" style={{ fontSize: "0.8rem" }}>
          Show
        </p>
        <CustomSelect
          options={[
            { value: "records", label: "Records" },
            { value: "records-collapsed", label: "Records by collapsing" },
          ]}
          minHeight="30px"
          className="w-[100px] text-xs"
          isDisabled={mergeType !== "individual"}
          value={{
            value: isShowBest ? "records" : "records-collapsed",
            label: isShowBest ? "Records" : "Records by collapsing",
          }}
          onChange={(e: { value: string; label: string } | null) => {
            if (e && e.value === "records") {
              setIsShowBest(true);
            }
            if (e && e.value === "records-collapsed") {
              setIsShowBest(false);
            }
          }}
        />
        {/* {["individual", "round", "bracket", "all"].map((type, i) => (
            <button
              key={type}
              className={`join-item btn btn-sm p-0 pr-1 pl-1 ${
                mergeType === type ? "btn-primary" : ""
              }`}
              style={{
                color:
                  mergeType === type ? "#fff" : "oklch(55.1% 0.027 264.364)",
              }}
              onClick={() => setMergeType(type)}
            >
              {i + 1 + "." + type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))} */}
        {/* <form className="flex items-centerjustify-center">
          <label
            id="aria-label"
            htmlFor="aria-example-input"
            className="text-xs mr-1"
          >
            Show best
          </label>
          <input
            type="checkbox"
            checked={isShowBest}
            className="checkbox checkbox-primary checkbox-xs text-white rounded-[3px]"
            onChange={(e) => {
              if (e.target.checked) {
                setIsShowBest(true);
              } else {
                setIsShowBest(false);
              }
            }}
          />
        </form> */}
      </div>
      <div className="absolute top-[105px] right-0 w-[full] h-[30px] z-999 flex items-center justify-end pr-2">
        <Legend />
      </div>
      <div
        className="absolute top-[105px] left-0 w-[60px] bg-red-200"
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
        ref={contentRef}
        className="overflow-y-auto p-[10px] "
        style={{ height: `calc(100vh - 180px)` }}
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
              >
                <Band
                  {...row.verticalLink}
                  sizes={sizes}
                  isVertical={true}
                  dir={row.direction}
                  isShowBest={true}
                  mergeType={mergeType}
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
                  <Band
                    {...node}
                    sizes={sizes}
                    isVertical={undefined}
                    dir={row.direction}
                    isShowBest={true}
                    mergeType={mergeType}
                  />
                  {index < row.horizontalLinks.length && (
                    <Band
                      {...row.horizontalLinks[index]}
                      isVertical={false}
                      sizes={sizes}
                      dir={row.direction}
                      isShowBest={true}
                      mergeType={mergeType}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default Overview;

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
import MobileDrawer from "./MobileDrawer";
import { BandProps } from "./types";
import LinkDetail from "./LinkDetail";
import NodeDetail from "./NodeDetail";
import { timelineIcons } from "../../utils/icon";
import { FaChevronUp, FaChevronDown } from "react-icons/fa";
import { MdHelpOutline } from "react-icons/md";

const EventTitle = {
  addCondition: "Condition Addition",
  editCondition: "Condition Edit",
  visibility: "System Access",
  push: "Push Notification",
  redefineExperiment: "Experiment Redefinition",
  narrowConfigspace: "Space Narrowing",
  addUserTrial: "User Trial Addition",
  experimentPause: "Experiment Pause",
  experimentResume: "Experiment Resume",
};

const Timeline: React.FC = () => {
  const [graphData, pendingData] = useGraphData();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const accordionRef = useRef<HTMLDivElement | null>(null);
  const [isCollapse, setIsCollapse] = useState(true);

  const [scrollTop, setScrollTop] = useState(0);
  const [scrollHeight, setScrollHeight] = useState(0);
  const [clientHeight, setClientHeight] = useState(0);

  const sizes = useResponsiveSize();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<BandProps | null>(null);

  const [searchType, setSearchType] = useState("");
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);

  // Help modal state
  const [showHelp, setShowHelp] = useState(false);
  const [accordionHeight, setAccordionHeight] = useState(0);

  const zigzagRows = useMemo(() => {
    return createZigzagLayout(
      mergeNodesAndLinks(graphData, pendingData, "individual", isCollapse),
      LAYOUT_CONFIG.NODES_PER_ROW
    );
  }, [graphData, isCollapse, pendingData]);

  const allEvents = useMemo(() => {
    type EventType =
      | "visibility"
      | "push"
      | "addUserTrial"
      | "addCondition"
      | "narrowConfigspace"
      | "redefineExperiment"
      | "editCondition"
      | "experimentPause"
      | "experimentResume"
      | "launchImmediatelyExp";

    const events: Record<EventType, any[]> = {
      visibility: [],
      push: [],
      narrowConfigspace: [],
      addUserTrial: [],
      addCondition: [],
      redefineExperiment: [],
      editCondition: [],
      experimentPause: [],
      experimentResume: [],
      launchImmediatelyExp: [],
    };

    zigzagRows.forEach((row) => {
      row.horizontalLinks.forEach((link) => {
        if (
          link.type &&
          link.data &&
          "events" in link.data &&
          Array.isArray((link.data as { events?: unknown[] }).events)
        ) {
          link.data.events.forEach((event: any) => {
            if (
              event.type &&
              Object.prototype.hasOwnProperty.call(events, event.type)
            ) {
              events[event.type as EventType].push(event);
            } else {
              console.warn("Unknown event type:", event.type);
            }
          });
        }
      });

      if (
        row.verticalLink &&
        row.verticalLink.data &&
        "events" in row.verticalLink.data &&
        Array.isArray((row.verticalLink.data as { events?: unknown[] }).events)
      ) {
        row.verticalLink.data.events.forEach((event: any) => {
          if (
            event.type &&
            typeof event.type === "string" &&
            event.type in events
          ) {
            events[event.type as EventType].push(event);
          } else {
            console.warn("Unknown event type:", event.type);
          }
        });
      }
    });

    // 모든 이벤트를 수집한 후 최근 이벤트 순으로 정렬
    (Object.keys(events) as EventType[]).forEach((key) => {
      events[key].sort((a, b) => {
        return (b.time ?? 0) - (a.time ?? 0);
      });
    });

    return events;
  }, [zigzagRows]);

  // 검색 타입에 해당하는 링크들의 위치 정보를 구하는 함수
  const searchResults = useMemo(() => {
    if (!searchType) return [];

    const results: {
      rowIndex: number;
      linkIndex: number;
      numOfData?: number;
      isVertical: boolean;
      element?: HTMLElement;
      time: number | null;
    }[] = [];

    zigzagRows.forEach((row) => {
      // 수직 링크 확인
      if (
        row.verticalLink &&
        row.verticalLink.data &&
        "events" in row.verticalLink.data &&
        Array.isArray((row.verticalLink.data as { events?: unknown[] }).events)
      ) {
        const hasTargetEvent = (
          row.verticalLink.data as { events: any[] }
        ).events.some((event: any) => event.type === searchType);
        if (hasTargetEvent) {
          results.push({
            rowIndex: row.rowIndex,
            linkIndex: -1, // 수직 링크는 -1로 표시
            numOfData: (row.verticalLink.data as { events: any[] }).events.find(
              (event: any) => event.type === searchType
            )?.data.length,
            isVertical: true,
            time:
              (row.verticalLink.data as { events: any[] }).events.find(
                (event: any) => event.type === searchType
              )?.time ?? null,
          });
        }
      }

      // 수평 링크들 확인
      row.horizontalLinks.forEach((link, linkIndex) => {
        if (
          link.data &&
          "events" in link.data &&
          Array.isArray((link.data as { events?: unknown[] }).events)
        ) {
          const hasTargetEvent = (link.data as { events: any[] }).events.some(
            (event: any) => event.type === searchType
          );
          if (hasTargetEvent) {
            results.push({
              rowIndex: row.rowIndex,
              linkIndex,
              numOfData: (link.data as { events: any[] }).events.find(
                (event: any) => event.type === searchType
              )?.data.length,
              isVertical: false,
              time:
                (link.data as { events: any[] }).events.find(
                  (event: any) => event.type === searchType
                )?.time ?? null,
            });
          }
        }
      });
    });

    results.sort((a, b) => {
      // 시간 기준으로 정렬 (내림차순)
      const timeA = a.time ?? 0;
      const timeB = b.time ?? 0;
      return timeB - timeA;
    });

    return results;
  }, [zigzagRows, searchType]);

  const reversedRows = useMemo(() => {
    return [...zigzagRows].reverse();
  }, [zigzagRows]);

  // 현재 포커스된 검색 결과의 정보를 가져오는 함수
  const getCurrentFocusedResult = () => {
    if (!searchType || searchResults.length === 0) return null;
    return searchResults[currentSearchIndex];
  };

  // 특정 링크가 현재 포커스된 검색 결과인지 확인하는 함수
  const isCurrentFocusedLink = (
    rowIndex: number,
    linkIndex: number,
    isVertical: boolean
  ) => {
    const focusedResult = getCurrentFocusedResult();
    if (!focusedResult) return false;

    return (
      focusedResult.rowIndex === rowIndex &&
      focusedResult.linkIndex === linkIndex &&
      focusedResult.isVertical === isVertical
    );
  };

  // 검색 결과로 스크롤하는 함수
  const scrollToSearchResult = (index: number) => {
    if (!containerRef.current || searchResults.length === 0) return;

    const result = searchResults[index];
    if (!result) return;

    // 역순으로 된 행에서의 실제 인덱스 계산
    const reversedRowIndex = zigzagRows.length - 1 - result.rowIndex;

    // 해당 행의 요소를 찾기
    const rowElements =
      containerRef.current.querySelectorAll("[data-row-index]");
    const targetRowElement = Array.from(rowElements).find(
      (el) => el.getAttribute("data-row-index") === reversedRowIndex.toString()
    );

    if (targetRowElement) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const targetRect = targetRowElement.getBoundingClientRect();
      const scrollTop =
        targetRect.top -
        containerRect.top +
        containerRef.current.scrollTop -
        100; // 100px 여백

      containerRef.current.scrollTo({
        top: Math.max(0, scrollTop),
        behavior: "smooth",
      });
    }
  };

  // 검색 타입 변경 시 첫 번째 결과로 이동
  useEffect(() => {
    if (searchType && searchResults.length > 0) {
      setCurrentSearchIndex(0);
      setTimeout(() => scrollToSearchResult(0), 100); // DOM 업데이트 후 스크롤
    } else {
      setCurrentSearchIndex(0);
    }
  }, [searchType, searchResults.length]);

  // 이전/다음 검색 결과로 이동
  const navigateSearchResults = (direction: "prev" | "next") => {
    if (searchResults.length === 0) return;

    let newIndex = currentSearchIndex;
    if (direction === "prev") {
      newIndex =
        currentSearchIndex > 0
          ? currentSearchIndex - 1
          : searchResults.length - 1;
    } else {
      newIndex =
        currentSearchIndex < searchResults.length - 1
          ? currentSearchIndex + 1
          : 0;
    }

    setCurrentSearchIndex(newIndex);
    setTimeout(() => scrollToSearchResult(newIndex), 50);
  };

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

  // 아코디언 높이 측정
  useEffect(() => {
    if (showHelp && accordionRef.current) {
      // 실제 컨텐츠 높이를 즉시 측정하되, max-h-[400px]로 제한
      const contentHeight = accordionRef.current.scrollHeight;
      const maxHeight = 400;
      const height = Math.min(contentHeight, maxHeight);
      setAccordionHeight(height);
    } else {
      setAccordionHeight(0);
    }
  }, [showHelp]);

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
      setTimeout(handleScroll, 100);

      return () => {
        contentElement.removeEventListener("scroll", handleScroll);
      };
    }
  }, [reversedRows]);

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
    const isCollapseNode =
      nodeData.type === "node" &&
      nodeData.data &&
      (nodeData.data.type === "merged" ||
        nodeData.data.type === "start" ||
        nodeData.data.type === "pseudo");
    if (isCollapseNode) {
      return;
    }
    setSelectedNode(nodeData);
    setDrawerOpen(true);
  };

  const handleLinkClick = (linkData: BandProps) => {
    // Type guard to check if linkData is a LinkProps and has events
    const isLinkWithEvents =
      linkData.type === "link" &&
      linkData.data &&
      Array.isArray((linkData.data as { events?: unknown[] }).events);

    if (
      !isLinkWithEvents ||
      ((linkData.data as { events?: unknown[] }).events?.length ?? 0) === 0
    ) {
      return;
    }

    setSelectedNode(linkData);
    setDrawerOpen(true);
  };

  // 드로어 닫기 핸들러
  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedNode(null);
  };

  return (
    <div className="flex flex-end flex-col bg-white h-full overflow-y-hidden relative">
      <div
        className="bg-base-100 w-full h-[45px] z-999 flex items-center
         p-2 justify-center gap-1 relative
      "
      >
        <div className="flex items-center gap-1">
          {Object.entries(allEvents).map(([key, value]) => {
            if (value.length === 0) return null;
            if (!timelineIcons[key as keyof typeof timelineIcons]) return null;
            const Icon = timelineIcons[key as keyof typeof timelineIcons];
            return (
              <button
                key={key}
                className={`btn btn-sm p-1 ${
                  searchType === key ? "btn-accent" : ""
                }`}
                style={{
                  color:
                    searchType === key ? "#fff" : "oklch(70.7% 0.022 261.325)",
                }}
                onClick={() => {
                  if (searchType === key) {
                    setSearchType("");
                  } else {
                    setSearchType(key);
                  }
                }}
              >
                <Icon size={12} />
                <p className="text-xs">
                  {/* {allEvents[key as keyof typeof allEvents].length || 0} */}
                  {allEvents[key as keyof typeof allEvents].reduce(
                    (total, event) => {
                      return (
                        total +
                        (event.data ? Object.keys(event.data).length : 1)
                      );
                    },
                    0
                  )}
                </p>
              </button>
            );
          })}
        </div>
        {/* Help Icon - Always positioned at the right end */}
        <button
          className="btn btn-sm p-1 btn-ghost absolute right-2"
          onClick={() => setShowHelp(!showHelp)}
          title="Event Types Help"
        >
          <MdHelpOutline size={18} className="text-gray-600" />
        </button>
      </div>

      {/* Help Accordion */}
      <div
        ref={accordionRef}
        className={`bg-base-100 w-full z-[1000] overflow-hidden transition-all duration-300 ease-in-out ${
          showHelp ? "max-h-[400px]" : "max-h-0"
        }`}
      >
        <div className="p-2 border-t border-gray-200">
          {/* <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Event Types Guide</h3>
          </div> */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {Object.entries(EventTitle).map(([key, title]) => {
              const Icon = timelineIcons[key as keyof typeof timelineIcons];
              return (
                <div key={key} className="flex items-center gap-2">
                  <div>
                    {Icon && (
                      <div className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center bg-white">
                        <Icon size={14} />
                      </div>
                    )}
                  </div>
                  <p className="text-xs">{title}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white w-full h-[30px] z-999 flex items-center justify-between pl-2 pr-2">
        {searchType ? (
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center justify-center gap-2">
              {(() => {
                const Icon = timelineIcons[searchType];
                return Icon ? <Icon size={18} /> : null;
              })()}
              <p className="text-sm">
                {EventTitle[searchType as keyof typeof EventTitle] ||
                  searchType.charAt(0).toUpperCase() + searchType.slice(1)}
              </p>
            </div>

            <p className="text-sm">
              {searchResults.length > 0
                ? `
                  ${searchResults[currentSearchIndex]?.numOfData || 0}
                  highlighted
                  out of ${allEvents[
                    searchType as keyof typeof allEvents
                  ].reduce((total, event) => {
                    return (
                      total + (event.data ? Object.keys(event.data).length : 1)
                    );
                  }, 0)} `
                : "0/0"}
            </p>

            <div className="flex items-center justify-center gap-2 mr-2">
              <button
                className="btn btn-xs rounded-[100px]"
                onClick={() => navigateSearchResults("prev")}
                disabled={searchResults.length === 0}
              >
                <FaChevronUp />
              </button>
              <button
                className="btn btn-xs rounded-2xl"
                onClick={() => navigateSearchResults("next")}
                disabled={searchResults.length === 0}
              >
                <FaChevronDown />
              </button>
            </div>
          </div>
        ) : (
          <>
            <label className="label">
              <input
                className="checkbox checkbox-sm rounded-sm"
                type="checkbox"
                checked={isCollapse}
                onChange={(e) => setIsCollapse(e.target.checked)}
              />
              <p className="text-xs text-gray-500 ">Collapse Non-Improvers </p>
            </label>
            <Legend width={50} />
          </>
        )}
      </div>
      <div
        className="transition-all duration-300 absolute justify-between flex w-full overflow-hidden"
        style={{
          top: `${accordionHeight}px`,
          height: `calc(100% - ${accordionHeight}px)`,
        }}
      >
        <div
          className="left-0 transition-all duration-300 relative"
          style={{
            top: `75px`,
            width: `60px`,
          }}
        >
          <MiniMap
            data={reversedRows}
            scrollTop={scrollTop}
            scrollHeight={scrollHeight}
            clientHeight={clientHeight}
            onScrollChange={handleMiniMapScroll}
            searchType={searchType}
            isCurrentFocusedLink={isCurrentFocusedLink}
            isCollapse={isCollapse}
          />
        </div>
        <div
          className="overflow-y-auto p-[10px] relative absolute w-full transition-all duration-300"
          style={{
            top: `75px`,
            width: `calc(100% - 60px)`,
          }}
          ref={containerRef}
        >
          {reversedRows.map((row, reversedIndex) => (
            <React.Fragment key={row.rowIndex}>
              <div data-row-index={reversedIndex}>
                {row.verticalLink && (
                  <div
                    className="flex w-full mb-0"
                    style={{
                      justifyContent:
                        row.direction === "ltr" ? "flex-end" : "flex-start",
                    }}
                    onClick={() => {
                      if (row.verticalLink) {
                        handleLinkClick(row.verticalLink);
                      }
                    }}
                  >
                    <Band
                      {...row.verticalLink}
                      sizes={sizes}
                      isVertical={true}
                      dir={row.direction}
                      isCollapse={isCollapse}
                      highlightEventType={
                        isCurrentFocusedLink(row.rowIndex, -1, true)
                          ? searchType
                          : ""
                      }
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
                          highlightEventType=""
                        />
                      </div>
                      <div>
                        {index < row.horizontalLinks.length && (
                          <div
                            onClick={() =>
                              handleLinkClick(row.horizontalLinks[index])
                            }
                          >
                            <Band
                              {...row.horizontalLinks[index]}
                              isVertical={false}
                              sizes={sizes}
                              dir={row.direction}
                              isCollapse={isCollapse}
                              highlightEventType={
                                isCurrentFocusedLink(row.rowIndex, index, false)
                                  ? searchType
                                  : ""
                              }
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
      </div>

      <MobileDrawer isOpen={drawerOpen} onClose={handleCloseDrawer}>
        {selectedNode && selectedNode.type === "node" ? (
          <NodeDetail data={selectedNode} />
        ) : selectedNode && selectedNode.type === "link" ? (
          <LinkDetail data={selectedNode} />
        ) : (
          <div className="text-center py-8">
            <p>Select a node or link to view details</p>
          </div>
        )}
      </MobileDrawer>
    </div>
  );
};

export default Timeline;

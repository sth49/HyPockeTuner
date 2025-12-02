import { useState } from "react";
import { BAND_PADDING, LAYOUT_CONFIG } from "../constants/timelineLayout";

export const useResponsiveSize = () => {
  const [containerWidth, setContainerWidth] = useState(0);

  const bandWidth = LAYOUT_CONFIG.NODES_PER_ROW === 3 ? 80 : 80;
  const bandHeight = 60;

  const nodeWidth = bandWidth - BAND_PADDING * 2;
  const nodeHeight = bandHeight - BAND_PADDING * 2;

  const calculateLinkWidth = (width: number): number => {
    if (!width) return bandWidth * 2;

    const totalNodeWidth = LAYOUT_CONFIG.NODES_PER_ROW * bandWidth;
    const totalLinkWidth = width - 20 - totalNodeWidth;
    const linkWidth = totalLinkWidth / LAYOUT_CONFIG.LINKS_PER_ROW;

    return linkWidth;
  };

  const linkWidth = calculateLinkWidth(containerWidth);
  const eventWidth = (linkWidth + BAND_PADDING * 2) / 3.5;

  const gap = (linkWidth - eventWidth * 3 - 10 + 40) / 2;

  return {
    bandWidth,
    bandHeight,
    nodeWidth,
    nodeHeight,
    linkWidth,
    linkHeight: nodeHeight,
    eventWidth,
    gap,
    setContainerWidth,
  };
};

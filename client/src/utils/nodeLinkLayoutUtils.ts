// import { BandProps, LayoutRow } from

import { BandProps, LayoutRow } from "../components/Timeline/types";

export const createZigzagLayout = (
  data: BandProps[],
  nodesPerRow: number
): LayoutRow[] => {
  if (!data || data.length === 0) return [];

  const sortedData = [...data];
  const nodesWithOrder: { item: BandProps; originalIndex: number }[] = [];
  const linksWithOrder: { item: BandProps; originalIndex: number }[] = [];

  // 노드와 링크 분리
  sortedData.forEach((item, i) => {
    if (item.type === "link") {
      linksWithOrder.push({ item, originalIndex: i });
    } else {
      nodesWithOrder.push({ item, originalIndex: i });
    }
  });

  // 지그재그 행 구성
  const rows: LayoutRow[] = [];
  const rowSize = nodesPerRow;

  for (
    let rowIndex = 0;
    rowIndex < Math.ceil(nodesWithOrder.length / rowSize);
    rowIndex++
  ) {
    const isEvenRow = rowIndex % 2 === 0;
    const startIdx = rowIndex * rowSize;
    const endIdx = Math.min(startIdx + rowSize, nodesWithOrder.length);
    const rowNodesWithOrder = nodesWithOrder.slice(startIdx, endIdx);

    const horizontalLinks: any[] = [];
    let verticalLink = null;

    // 각 노드 뒤에 오는 링크 찾기
    rowNodesWithOrder.forEach((node, i) => {
      const nodeOriginalIndex = node.originalIndex;
      const nextLink = linksWithOrder.find(
        (link) => link.originalIndex === nodeOriginalIndex + 1
      );

      if (nextLink) {
        // 행의 마지막 노드인 경우 (수직 링크)
        if (
          i === rowNodesWithOrder.length - 1 &&
          rowIndex < Math.ceil(nodesWithOrder.length / rowSize) - 1
        ) {
          verticalLink = {
            ...nextLink.item,
            isVertical: true,
            isLeftToRight: !isEvenRow,
          };
        }
        // 행 내부 노드인 경우 (수평 링크)
        else if (i < rowNodesWithOrder.length - 1) {
          horizontalLinks.push({
            ...nextLink.item,
            isVertical: false,
          });
        }
      }
    });

    // 행의 방향에 따라 노드와 링크 순서 조정
    const finalNodes = isEvenRow
      ? rowNodesWithOrder.map((n) => n.item)
      : [...rowNodesWithOrder].reverse().map((n) => n.item);

    const finalHorizontalLinks = !isEvenRow
      ? [...horizontalLinks].reverse()
      : horizontalLinks;

    rows.push({
      rowIndex,
      nodes: finalNodes,
      horizontalLinks: finalHorizontalLinks,
      verticalLink,
      direction: isEvenRow ? "ltr" : "rtl",
    });
  }

  return rows;
};

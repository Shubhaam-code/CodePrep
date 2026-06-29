/**
 * CompanyGrid.jsx
 *
 * A virtualised grid wrapper for company cards.
 *
 * Strategy:
 *  - ≤ 100 items  →  regular CSS grid (no virtualisation overhead).
 *  - > 100 items  →  @tanstack/react-virtual row virtualiser:
 *      • Only the visible rows + `overscan` rows are rendered.
 *      • For a viewport showing ~3 rows of 4 cards that's ≈ 12 DOM nodes
 *        regardless of whether the total is 100 or 10 000.
 *
 * The grid is always 1 / sm:2 / lg:3 / xl:4 columns — we detect the
 * current column count by reading a hidden sentinel's offsetWidth and
 * dividing the container width. We fall back to 4 columns for SSR / before
 * the first paint.
 *
 * No framer-motion is used here — the card entrance animation is handled
 * inside CompanyChip on first mount via a CSS animation declared in index.css.
 */
import { useMemo, useRef, useCallback, useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CompanyChip } from './CompanyChip';
import { getTopTags } from '../../utils/companyUtils';

// Threshold: use virtualiser only above this count.
const VIRTUALISE_THRESHOLD = 100;

// Approximate card height in pixels (used by the virtualiser for scroll math).
const CARD_HEIGHT   = 252;
const ROW_GAP       = 16; // gap-4 = 1rem = 16px

// ─── Helper: compute column count from container width ───────────────────────
function getColCount(containerWidth) {
  if (containerWidth >= 1280) return 4; // xl
  if (containerWidth >= 1024) return 3; // lg
  if (containerWidth >= 640)  return 2; // sm
  return 1;
}

// ─── Regular grid (< 100 items) ──────────────────────────────────────────────
function RegularGrid({ items, solvedMap }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((company) => {
        const name = company.name ?? company;
        const qCount = Number(company.questionCount) || 0;
        const topTagsJson = JSON.stringify(getTopTags(name, company.topTags));
        const solved = solvedMap.get(name.toLowerCase()) ?? 0;
        return (
          <CompanyChip
            key={name}
            name={name}
            questionCount={qCount}
            topTagsJson={topTagsJson}
            solvedCount={solved}
          />
        );
      })}
    </div>
  );
}

// ─── Virtualised grid (> 100 items) ──────────────────────────────────────────
function VirtualGrid({ items, solvedMap }) {
  const containerRef = useRef(null);
  const [colCount, setColCount] = useState(4);

  // Observe container width and recompute column count.
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setColCount(getColCount(entry.contentRect.width));
    });
    ro.observe(containerRef.current);
    // Set immediately on mount.
    setColCount(getColCount(containerRef.current.offsetWidth));
    return () => ro.disconnect();
  }, []);

  // Slice items into rows of `colCount`.
  const rows = useMemo(() => {
    const result = [];
    for (let i = 0; i < items.length; i += colCount) {
      result.push(items.slice(i, i + colCount));
    }
    return result;
  }, [items, colCount]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => document.documentElement, // window scroll
    estimateSize: () => CARD_HEIGHT + ROW_GAP,
    overscan: 3,
  });

  const totalHeight = rowVirtualizer.getTotalSize();
  const virtualRows = rowVirtualizer.getVirtualItems();

  return (
    <div ref={containerRef} style={{ position: 'relative', height: totalHeight }}>
      {virtualRows.map((virtualRow) => {
        const rowItems = rows[virtualRow.index];
        return (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={rowVirtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
              display: 'grid',
              gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
              gap: ROW_GAP,
              paddingBottom: ROW_GAP,
            }}
          >
            {rowItems.map((company) => {
              const name     = company.name ?? company;
              const qCount   = Number(company.questionCount) || 0;
              const topTagsJson = JSON.stringify(getTopTags(name, company.topTags));
              const solved   = solvedMap.get(name.toLowerCase()) ?? 0;
              return (
                <CompanyChip
                  key={name}
                  name={name}
                  questionCount={qCount}
                  topTagsJson={topTagsJson}
                  solvedCount={solved}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────
/**
 * @param {object[]} items     - filtered + sorted company objects
 * @param {Map}      solvedMap - Map<companyKey, solvedCount> for O(1) lookup
 */
export function CompanyGrid({ items, solvedMap }) {
  const useVirtual = items.length > VIRTUALISE_THRESHOLD;
  return useVirtual
    ? <VirtualGrid items={items} solvedMap={solvedMap} />
    : <RegularGrid items={items} solvedMap={solvedMap} />;
}

import { useEffect, useState, type RefObject } from "react";

// Must match .p7-grid's grid-auto-rows and the vertical spacing between cards.
const ROW_UNIT_PX = 4;
const CARD_GAP_PX = 16;

// Masonry by row-spanning: each card spans as many thin grid rows as its
// height needs, so auto-placement packs cards up under shorter neighbours
// instead of leaving each row as tall as its tallest card. Cards never move in
// the DOM, which matters here — re-parenting a card would remount its WebGL
// view.
export function useMasonrySpan(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const height = el.getBoundingClientRect().height;
      el.style.gridRowEnd = `span ${Math.ceil((height + CARD_GAP_PX) / ROW_UNIT_PX)}`;
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
}

export interface ScrollOverflow {
  canScrollUp: boolean;
  canScrollDown: boolean;
  // Cards starting entirely below the visible area.
  hiddenBelow: number;
}

// Tracks what's out of view in a scroll box so the UI can say so — a grid
// clipped at a card boundary otherwise looks like it simply ends there.
export function useScrollOverflow(
  ref: RefObject<HTMLElement | null>,
  deps: unknown[]
): ScrollOverflow {
  const [state, setState] = useState<ScrollOverflow>({
    canScrollUp: false,
    canScrollDown: false,
    hiddenBelow: 0,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const scrollable = el.scrollHeight > el.clientHeight + 1;
      const bottom = el.scrollTop + el.clientHeight;
      const boxTop = el.getBoundingClientRect().top - el.scrollTop;
      let hiddenBelow = 0;
      if (scrollable) {
        for (const child of Array.from(el.children)) {
          const top = child.getBoundingClientRect().top - boxTop;
          if (top >= bottom - 1) hiddenBelow += 1;
        }
      }
      const next = {
        canScrollUp: scrollable && el.scrollTop > 1,
        canScrollDown: scrollable && bottom < el.scrollHeight - 1,
        hiddenBelow,
      };
      setState((prev) =>
        prev.canScrollUp === next.canScrollUp &&
        prev.canScrollDown === next.canScrollDown &&
        prev.hiddenBelow === next.hiddenBelow
          ? prev
          : next
      );
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, deps);

  return state;
}

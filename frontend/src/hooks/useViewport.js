import { useRef, useCallback } from 'react';

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 10;
export const BASE_CELL_SIZE = 40;


export function useViewport(onViewportChange) {
  const zoom   = useRef(1);
  const offset = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const lastMouse    = useRef({ x: 0, y: 0 });
  const mouseDownPos = useRef(null);
  const didDrag      = useRef(false);

  const getCellSize = useCallback(() => BASE_CELL_SIZE * zoom.current, []);

  const screenToCell = useCallback((screenX, screenY, rect) => {
    const cs = getCellSize();
    return {
      x: Math.floor((screenX - rect.left - offset.current.x) / cs),
      y: Math.floor((screenY - rect.top  - offset.current.y) / cs),
    };
  }, [getCellSize]);

  const getVisibleRange = useCallback((w, h) => {
    const cs = getCellSize();
    return {
      x1: Math.floor(-offset.current.x / cs) - 1,
      y1: Math.floor(-offset.current.y / cs) - 1,
      x2: Math.ceil((w - offset.current.x) / cs) + 1,
      y2: Math.ceil((h - offset.current.y) / cs) + 1,
    };
  }, [getCellSize]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();

    if (e.ctrlKey) {
      const rect   = e.currentTarget.getBoundingClientRect();
      const factor = 1 - Math.min(Math.max(e.deltaY * 0.008, -0.15), 0.15);
      const prev   = zoom.current;
      const next   = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev * factor));
      const ratio  = next / prev;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      zoom.current     = next;
      offset.current   = {
        x: mx - ratio * (mx - offset.current.x),
        y: my - ratio * (my - offset.current.y),
      };
    } else {
      offset.current = {
        x: offset.current.x - e.deltaX,
        y: offset.current.y - e.deltaY,
      };
    }

    onViewportChange?.();
  }, [onViewportChange]);

  const startPan = useCallback((e) => {
    if (e.button !== 0) return;
    isPanningRef.current = true;
    didDrag.current      = false;
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
    lastMouse.current    = { x: e.clientX, y: e.clientY };
  }, []);

  const doPan = useCallback((e) => {
    if (!isPanningRef.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };

    if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
      const moved = mouseDownPos.current
        ? Math.hypot(e.clientX - mouseDownPos.current.x, e.clientY - mouseDownPos.current.y)
        : 0;
      if (moved > 4) didDrag.current = true;
    }

    offset.current = { x: offset.current.x + dx, y: offset.current.y + dy };
    onViewportChange?.();
  }, [onViewportChange]);

  const endPan = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  return {
    zoom,
    offset,
    getCellSize,
    isPanningRef,
    didDrag,
    mouseDownPos,
    screenToCell,
    getVisibleRange,
    handleWheel,
    startPan,
    doPan,
    endPan,
  };
}

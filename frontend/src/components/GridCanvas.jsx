import { useRef, useEffect, useState, useCallback } from 'react';
import { useViewport } from '../hooks/useViewport.js';
import { useSocket } from '../hooks/useSocket.js';

const API_URL       = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const FETCH_DEBOUNCE_MS = 150;
const BG_COLOR      = '#0f0f13';
const GRID_COLOR    = 'rgba(255,255,255,0.07)';
const HOVER_EMPTY   = 'rgba(255,255,255,0.11)';
const HOVER_BORDER  = 'rgba(255,255,255,0.32)';
const HOVER_OWN     = 'rgba(255,255,255,0.18)';

export default function GridCanvas({ user }) {
  const canvasRef  = useRef(null);
  const rafRef     = useRef(null);
  const cellsRef   = useRef({});
  const hoverRef   = useRef(null);
  const clickAnim  = useRef({});
  const dirtyRef   = useRef(true);

  const fetchTimerRef = useRef(null);
  const lastRangeRef  = useRef(null);
  const lastMouseRef  = useRef({ x: 0, y: 0 });

  const [cursorStyle,  setCursorStyle]  = useState('default');
  const [zoomDisplay,  setZoomDisplay]  = useState(100);
  const [tooltip,      setTooltip]      = useState(null);
  const [initialCenterSet, setInitialCenterSet] = useState(false);

  const markDirty = useCallback(() => { dirtyRef.current = true; }, []);

  const vp = useViewport(markDirty);
  const { zoom, offset, getCellSize, isPanningRef, didDrag,
          screenToCell, getVisibleRange,
          handleWheel, startPan, doPan, endPan } = vp;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width  = canvas.offsetWidth  * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
      dirtyRef.current = true;
    };
    resize();
    const obs = new ResizeObserver(resize);
    obs.observe(canvas);
    return () => obs.disconnect();
  }, []);

  const fetchCells = useCallback(async (range) => {
    const { x1, y1, x2, y2 } = range;
    try {
      const headers = {};
      if (user?.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }
      
      const res = await fetch(
        `${API_URL}/api/cells?x1=${x1}&y1=${y1}&x2=${x2}&y2=${y2}`,
        { headers }
      );
      if (!res.ok) return;
      const data = await res.json();
      data.forEach((cell) => {
        cellsRef.current[`${cell.x},${cell.y}`] = cell;
      });
      dirtyRef.current = true;
    } catch (err) {
      console.error('fetchCells:', err);
    }
  }, [user]);

  const scheduleFetch = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    clearTimeout(fetchTimerRef.current);
    fetchTimerRef.current = setTimeout(() => {
      const range = getVisibleRange(canvas.offsetWidth, canvas.offsetHeight);
      const last  = lastRangeRef.current;
      if (last &&
          last.x1 === range.x1 && last.y1 === range.y1 &&
          last.x2 === range.x2 && last.y2 === range.y2) return;
      lastRangeRef.current = range;
      fetchCells(range);
    }, FETCH_DEBOUNCE_MS);
  }, [getVisibleRange, fetchCells]);

  const centerViewportOnUserTerritory = useCallback(async () => {
    if (!user?.token || initialCenterSet) return;
    
    try {
      const res = await fetch(`${API_URL}/api/user-cells`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      
      if (!res.ok) return;
      
      const data = await res.json();
      
      if (data.center) {
        setTimeout(() => {
          const canvas = canvasRef.current;
          if (canvas) {
            const cellSize = getCellSize();
            offset.current.x = (canvas.offsetWidth / 2) - (data.center.x * cellSize);
            offset.current.y = (canvas.offsetHeight / 2) - (data.center.y * cellSize);
            dirtyRef.current = true;
            
            data.cells.forEach((cell) => {
              cellsRef.current[`${cell.x},${cell.y}`] = cell;
            });
            
            setTimeout(() => {
              const canvas = canvasRef.current;
              if (!canvas) return;
              const range = getVisibleRange(canvas.offsetWidth, canvas.offsetHeight);
              fetchCells(range);
            }, 50);
          }
        }, 100);
      }
      
      setInitialCenterSet(true);
    } catch (err) {
      console.error('centerViewportOnUserTerritory:', err);
      setInitialCenterSet(true);
    }
  }, [user, initialCenterSet, getCellSize, getVisibleRange, fetchCells, offset]);

  useEffect(() => { scheduleFetch(); }, [scheduleFetch]);

  useEffect(() => {
    if (user?.token && !initialCenterSet) {
      setTimeout(() => {
        centerViewportOnUserTerritory();
      }, 0);
    }
  }, [user?.token, initialCenterSet, centerViewportOnUserTerritory]);

  useEffect(() => {
    setTimeout(() => {
      setInitialCenterSet(false);
    }, 0);
  }, [user?.userId]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e) => {
      const prevZoom = zoom.current;
      handleWheel(e);
      const newZoom = zoom.current;
      setZoomDisplay(Math.round(newZoom * 100));
      
      if (e.ctrlKey && newZoom < prevZoom) {
        scheduleFetch();
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [handleWheel, zoom, scheduleFetch]);

  const updateCursorAndTooltip = useCallback((clientX, clientY) => {
    if (isPanningRef.current) {
      setCursorStyle('grabbing');
      setTooltip(null);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const { x, y } = screenToCell(clientX, clientY, rect);
    const cell = cellsRef.current[`${x},${y}`];

    if (!cell) {
      setCursorStyle('pointer');
      setTooltip(null);
    } else if (cell.ownerId === user?.userId) {
      setCursorStyle('pointer');
      setTooltip({
        screenX: clientX,
        screenY: clientY,
        email: 'You',
        color: cell.color,
        isOwn: true,
      });
    } else {
      setCursorStyle('default');
      setTooltip({
        screenX: clientX,
        screenY: clientY,
        email: cell.ownerEmail || cell.ownerId,
        color: cell.color,
        isOwn: false,
      });
    }
  }, [isPanningRef, screenToCell, user]);

  const handleCellUpdated = useCallback((data) => {
    cellsRef.current[`${data.x},${data.y}`] = data;
    clickAnim.current[`${data.x},${data.y}`] = 0;
    dirtyRef.current = true;
    updateCursorAndTooltip(lastMouseRef.current.x, lastMouseRef.current.y);
  }, [updateCursorAndTooltip]);

  const handleCellRemoved = useCallback(({ x, y }) => {
    delete cellsRef.current[`${x},${y}`];
    dirtyRef.current = true;
    updateCursorAndTooltip(lastMouseRef.current.x, lastMouseRef.current.y);
  }, [updateCursorAndTooltip]);

  const { claimCell, unclaimCell } = useSocket({
    onCellUpdated:  handleCellUpdated,
    onCellRemoved:  handleCellRemoved,
    onClaimError:   null,
    onLeaderboardUpdate: null,
    enabled: Boolean(user),
    token: user?.token,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);

      for (const key in clickAnim.current) {
        clickAnim.current[key] = Math.min(1, clickAnim.current[key] + 0.07);
        if (clickAnim.current[key] >= 1) delete clickAnim.current[key];
        dirtyRef.current = true;
      }

      if (!dirtyRef.current) return;
      dirtyRef.current = false;

      const dpr = devicePixelRatio;
      const W   = canvas.width;
      const H   = canvas.height;
      const ctx = canvas.getContext('2d');
      const cs  = getCellSize();
      const ox  = offset.current.x * dpr;
      const oy  = offset.current.y * dpr;
      const csd = cs * dpr;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, W, H);

      const x1 = Math.floor(-offset.current.x / cs) - 1;
      const y1 = Math.floor(-offset.current.y / cs) - 1;
      const x2 = Math.ceil((W / dpr - offset.current.x) / cs) + 1;
      const y2 = Math.ceil((H / dpr - offset.current.y) / cs) + 1;

      const gap    = Math.max(dpr, csd * 0.03);
      const inner  = csd - gap;
      const radius = csd > 16 ? Math.min(4 * dpr, csd * 0.1) : 1;

      const roundRect = (x, y, w, h, r) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      };

      for (let cy = y1; cy <= y2; cy++) {
        for (let cx = x1; cx <= x2; cx++) {
          const px  = ox + cx * csd;
          const py  = oy + cy * csd;
          const key = `${cx},${cy}`;
          const cell    = cellsRef.current[key];
          const isHover = hoverRef.current?.x === cx && hoverRef.current?.y === cy;
          const animT   = clickAnim.current[key] ?? 1;
          const isOwn   = cell?.ownerId === user?.userId;

          if (cell) {
            const popScale     = 1 + 0.28 * Math.max(0, 1 - animT);
            const scaledInner  = inner * popScale;
            const scaledOff    = (csd - scaledInner) / 2;

            roundRect(px + scaledOff, py + scaledOff, scaledInner, scaledInner, radius);
            ctx.fillStyle = cell.color;
            ctx.fill();

            if (isHover && isOwn) {
              ctx.fillStyle = HOVER_OWN;
              ctx.fill();
            }

            if (isOwn) {
              ctx.save();
              ctx.shadowColor = cell.color;
              ctx.shadowBlur  = csd * 0.3;
              ctx.fill();
              ctx.restore();
            }

            ctx.strokeStyle = isHover && isOwn
              ? 'rgba(255,255,255,0.5)'
              : 'rgba(0,0,0,0.22)';
            ctx.lineWidth = dpr;
            ctx.stroke();

          } else {
            roundRect(px + gap / 2, py + gap / 2, inner, inner, radius);

            if (isHover) {
              ctx.fillStyle   = HOVER_EMPTY;
              ctx.fill();
              ctx.strokeStyle = HOVER_BORDER;
              ctx.lineWidth   = dpr;
              ctx.stroke();
            } else {
              ctx.strokeStyle = GRID_COLOR;
              ctx.lineWidth   = dpr;
              ctx.stroke();
            }
          }

          if (cs >= 100) {
            ctx.fillStyle    = cell ? 'rgba(0,0,0,0.32)' : 'rgba(255,255,255,0.16)';
            ctx.font         = `${Math.max(9, csd * 0.15)}px monospace`;
            ctx.textAlign    = 'right';
            ctx.textBaseline = 'bottom';
            ctx.fillText(`${cx},${cy}`, px + csd - gap - 2, py + csd - 2);
          }
        }
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [getCellSize, offset, user]);

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    startPan(e);
    setCursorStyle('grabbing');
    setTooltip(null);
  }, [startPan]);

  const onMouseMove = useCallback((e) => {
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    doPan(e);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cell = screenToCell(e.clientX, e.clientY, rect);
    const prev = hoverRef.current;
    if (!prev || prev.x !== cell.x || prev.y !== cell.y) {
      hoverRef.current = cell;
      dirtyRef.current = true;
    }

    updateCursorAndTooltip(e.clientX, e.clientY);
    scheduleFetch();
  }, [doPan, screenToCell, updateCursorAndTooltip, scheduleFetch]);

  const onMouseUp = useCallback((e) => {
    endPan();
    setZoomDisplay(Math.round(zoom.current * 100));
    updateCursorAndTooltip(e.clientX, e.clientY);

    if (didDrag.current || !user) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const { x, y } = screenToCell(e.clientX, e.clientY, rect);
    const key  = `${x},${y}`;
    const cell = cellsRef.current[key];

    if (!cell) {
      claimCell(x, y);
    } else if (cell.ownerId === user.userId) {
      unclaimCell(x, y);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endPan, user, screenToCell, claimCell, unclaimCell, updateCursorAndTooltip]);

  const onMouseLeave = useCallback(() => {
    endPan();
    setCursorStyle('default');
    setTooltip(null);
    hoverRef.current = null;
    dirtyRef.current = true;
  }, [endPan]);

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: BG_COLOR }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ cursor: cursorStyle }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      />

      {tooltip && (
        <div
          className="pointer-events-none select-none fixed z-50"
          style={{
            left: tooltip.screenX + 14,
            top:  tooltip.screenY - 36,
          }}
        >
          <div
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-mono shadow-xl"
            style={{
              background: 'rgba(15,15,20,0.92)',
              border: `1px solid ${tooltip.color}55`,
              backdropFilter: 'blur(6px)',
              boxShadow: `0 0 12px ${tooltip.color}33`,
              color: tooltip.isOwn ? tooltip.color : 'white',
            }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: tooltip.color }}
            />
            {tooltip.isOwn ? (
              <span className="font-semibold">You</span>
            ) : (
              tooltip.email
            )}
          </div>
        </div>
      )}

      <div className="absolute bottom-4 right-4 text-xs text-white/25 font-mono pointer-events-none select-none">
        {zoomDisplay}%
      </div>

      {user && (
        <div className="absolute bottom-4 left-4 flex items-center gap-2 pointer-events-none select-none">
          <div
            className="w-3 h-3 rounded-full ring-2 ring-white/20"
            style={{ backgroundColor: user.color }}
          />
          <span className="text-xs text-white/35 font-mono hidden sm:inline">
            {user.email}
          </span>
          <span className="text-xs text-white/35 font-mono sm:hidden">
            {user.email.split('@')[0]}
          </span>
        </div>
      )}

      <div className="absolute top-4 left-4 right-20 text-xs text-white/20 pointer-events-none select-none">
        <div className="hidden sm:block text-center">
          scroll to pan · pinch / ctrl+scroll to zoom · click to claim · click own cell to unclaim
        </div>
        <div className="block sm:hidden text-left">
          tap to claim · drag to pan
        </div>
      </div>
    </div>
  );
}

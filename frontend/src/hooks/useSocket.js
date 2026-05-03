import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

let socketInstance = null;
let currentToken = null;

function getSocket(token) {
  if (!socketInstance || currentToken !== token) {
    if (socketInstance) {
      socketInstance.disconnect();
    }
    
    currentToken = token;
    socketInstance = io(SOCKET_URL, {
      autoConnect: false,
      auth: {
        token: token
      }
    });
  }
  return socketInstance;
}

export function useSocket({ onCellUpdated, onCellRemoved, onClaimError, onLeaderboardUpdate, enabled = true, token }) {
  const handlersRef = useRef({ onCellUpdated, onCellRemoved, onClaimError, onLeaderboardUpdate });

  useEffect(() => {
    handlersRef.current = { onCellUpdated, onCellRemoved, onClaimError, onLeaderboardUpdate };
  });

  useEffect(() => {
    if (!enabled || !token) {
      return;
    }

    const socket = getSocket(token);

    const handleCellUpdated = (data) => {
      handlersRef.current.onCellUpdated?.(data);
    };
    const handleCellRemoved = (data) => {
      handlersRef.current.onCellRemoved?.(data);
    };
    const handleClaimError = (data) => {
      handlersRef.current.onClaimError?.(data);
    };
    const handleLeaderboardUpdate = (data) => {
      handlersRef.current.onLeaderboardUpdate?.(data);
    };

    socket.on('cell_updated', handleCellUpdated);
    socket.on('cell_removed', handleCellRemoved);
    socket.on('claim_error',  handleClaimError);
    socket.on('leaderboard_update', handleLeaderboardUpdate);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off('cell_updated', handleCellUpdated);
      socket.off('cell_removed', handleCellRemoved);
      socket.off('claim_error',  handleClaimError);
      socket.off('leaderboard_update', handleLeaderboardUpdate);
    };
  }, [enabled, token]);

  const claimCell = useCallback((x, y) => {
    const socket = getSocket(token);
    if (socket.connected) socket.emit('claim_cell', { x, y });
  }, [token]);

  const unclaimCell = useCallback((x, y) => {
    const socket = getSocket(token);
    if (socket.connected) socket.emit('unclaim_cell', { x, y });
  }, [token]);

  return { claimCell, unclaimCell };
}

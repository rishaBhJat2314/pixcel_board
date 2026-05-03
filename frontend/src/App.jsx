import { useState, useEffect, useCallback } from 'react';
import GridCanvas from './components/GridCanvas.jsx';
import EmailModal from './components/EmailModal.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import { useSocket } from './hooks/useSocket.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function App() {
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);

  const handleLeaderboardUpdate = useCallback(({ ranked }) => {
    setLeaderboard(ranked || []);
  }, []);

  useSocket({
    onCellUpdated: null,
    onCellRemoved: null, 
    onClaimError: null,
    onLeaderboardUpdate: handleLeaderboardUpdate,
    enabled: Boolean(user),
    token: user?.token,
  });

  useEffect(() => {
    if (!user?.token) return;
    
    const fetchInitial = async () => {
      try {
        const res = await fetch(`${API_URL}/api/leaderboard`, { 
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        
        if (!res.ok) {
          console.error('HTTP request failed:', res.status, res.statusText);
          return;
        }
        
        const data = await res.json();
        
        const fullRanked = [...(data.top || [])];
        if (data.currentUser && !data.top?.some(e => e.userId === data.currentUser.userId)) {
          fullRanked.push(data.currentUser);
        }
        
        setLeaderboard(fullRanked);
      } catch (err) {
        console.error('Initial leaderboard fetch error:', err);
      }
    };
    
    fetchInitial();
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    
    const initAuth = async () => {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        if (isMounted) setChecked(true);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/me`, { 
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data?.userId && isMounted) {
            setUser({ ...data, token });
          } else {
            localStorage.removeItem('authToken');
          }
        } else {
          localStorage.removeItem('authToken');
        }
      } catch (error) {
        localStorage.removeItem('authToken');
        console.error('Error validating token:', error);
      }
      
      if (isMounted) setChecked(true);
    };

    initAuth();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRegistered = (userData) => {
    localStorage.setItem('authToken', userData.token);
    setUser(userData);
  };

  if (!checked) {
    return (
      <div className="w-screen h-screen bg-[#0f0f13] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#0f0f13]">
      {!user && <EmailModal onSuccess={handleRegistered} />}
      <GridCanvas user={user} />
      {user && <Leaderboard user={user} leaderboard={leaderboard} />}
    </div>
  );
}
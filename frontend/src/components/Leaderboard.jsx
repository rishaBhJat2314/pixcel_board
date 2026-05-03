import { useState, useMemo } from 'react';

function Medal({ rank, allEntries }) {
  const tiedEntries = allEntries?.filter(e => e.rank === rank) || [];
  const hasTies = tiedEntries.length > 1;
  
  if (rank === 1) return <span title={hasTies ? `1st (tied with ${tiedEntries.length - 1} others)` : "1st"}>🥇</span>;
  if (rank === 2) return <span title={hasTies ? `2nd (tied with ${tiedEntries.length - 1} others)` : "2nd"}>🥈</span>;
  if (rank === 3) return <span title={hasTies ? `3rd (tied with ${tiedEntries.length - 1} others)` : "3rd"}>🥉</span>;
  return (
    <span 
      className="text-white/80 font-mono text-sm w-4 text-right font-bold"
      title={hasTies ? `#${rank} (tied with ${tiedEntries.length - 1} others)` : `#${rank}`}
    >
      {rank}
    </span>
  );
}

function LeaderboardEntry({ entry, isCurrentUser, showAtTop = false, allEntries = [] }) {
  const tiedEntries = allEntries.filter(e => e.rank === entry.rank);
  const hasTies = tiedEntries.length > 1;
  
  return (
    <div
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-500 ease-out ${
        isCurrentUser
          ? showAtTop 
            ? 'bg-white/[0.15] ring-1 ring-white/25 border border-white/30'
            : 'bg-white/[0.12] ring-1 ring-white/20'
          : 'bg-white/[0.06] hover:bg-white/[0.08]'
      } ${hasTies ? 'border-l-2 border-l-yellow-500/50' : ''}`}
      style={{
        transform: 'translateY(0)',
        opacity: 1,
      }}
    >
      <div className="w-6 flex-shrink-0 flex justify-center">
        {showAtTop ? (
          <span 
            className="text-white/80 font-mono text-sm w-4 text-right font-bold"
            title={hasTies ? `#${entry.rank} (tied with ${tiedEntries.length - 1} others)` : `#${entry.rank}`}
          >
            #{entry.rank}
          </span>
        ) : (
          <Medal rank={entry.rank} count={entry.count} allEntries={allEntries} />
        )}
      </div>

      <div
        className="w-3 h-3 rounded-full flex-shrink-0 transition-all duration-300"
        style={{
          backgroundColor: entry.color,
          boxShadow: isCurrentUser ? `0 0 8px ${entry.color}aa` : 'none',
        }}
      />

      <span
        className={`flex-1 truncate text-sm font-mono transition-all duration-300 ${
          showAtTop ? 'font-medium' : ''
        }`}
        style={{ 
          color: isCurrentUser ? entry.color : 'rgba(255,255,255,0.75)' 
        }}
        title={entry.email}
      >
        {entry.email}
        {isCurrentUser && (
          <span className="ml-1.5 text-xs font-bold text-white/60">(you)</span>
        )}
        {hasTies && !isCurrentUser && (
          <span className="ml-1.5 text-xs text-yellow-400/60">(tied)</span>
        )}
      </span>

      <span className="text-sm font-mono text-white/60 flex-shrink-0 tabular-nums font-medium transition-all duration-300">
        {entry.count.toLocaleString()}
      </span>
    </div>
  );
}

export default function Leaderboard({ user, leaderboard }) {
  const [open, setOpen] = useState(false);

  const displayData = useMemo(() => {
    if (leaderboard.length === 0) {
      return { topEntries: [], currentUser: null, currentUserInTop: false, showUserAtTop: false };
    }

    const uniqueRanks = [...new Set(leaderboard.map(e => e.rank))].sort((a, b) => a - b);
    const topRanks = uniqueRanks.slice(0, 3);
    const topEntries = leaderboard.filter(e => topRanks.includes(e.rank));
    
    const currentUser = leaderboard.find(e => e.userId === user?.userId);
    const currentUserInTop = currentUser ? topEntries.some(e => e.userId === currentUser.userId) : false;
    
    return {
      topEntries,
      currentUser,
      currentUserInTop,
      showUserAtTop: currentUser && !currentUserInTop,
      actualTopCount: topEntries.length
    };
  }, [leaderboard, user]);

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        className="absolute top-4 right-4 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-white/50 hover:text-white/80 transition-colors select-none"
        style={{ 
          background: 'rgba(255,255,255,0.05)', 
          border: '1px solid rgba(255,255,255,0.08)' 
        }}
        title="Leaderboard"
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
          <rect x="1" y="8" width="3" height="7" rx="1" />
          <rect x="6" y="4" width="3" height="11" rx="1" />
          <rect x="11" y="1" width="3" height="14" rx="1" />
        </svg>
        Board
        {leaderboard.length > 0 && (
          <span className="ml-1 text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">
            {leaderboard.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute top-12 right-4 z-40 w-72 rounded-xl overflow-hidden"
          style={{
            background: 'rgba(13,13,18,0.96)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            maxHeight: 'calc(100vh - 80px)',
          }}
        >
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/70 tracking-wide uppercase">
                Leaderboard (Top {displayData.actualTopCount > 3 ? `${displayData.actualTopCount}` : '3'})
              </span>
              <button
                onClick={() => setOpen(false)}
                className="text-white/25 hover:text-white/60 transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>

          <div className="px-3 py-3" style={{ minHeight: '200px' }}>
            {leaderboard.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-white/20 text-xs mb-2">No cells claimed yet</p>
                <p className="text-white/15 text-[10px]">Be the first to claim a cell!</p>
              </div>
            ) : (
              <div className="space-y-1">
                <div 
                  className={`transition-all duration-500 ease-out overflow-hidden ${
                    displayData.showUserAtTop ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  {displayData.currentUser && (
                    <>
                      <LeaderboardEntry 
                        entry={displayData.currentUser}
                        isCurrentUser={true}
                        showAtTop={true}
                        allEntries={leaderboard}
                      />
                      
                      <div className="flex items-center gap-2 py-2 transition-all duration-300">
                        <div className="flex-1 h-px bg-white/10"></div>
                        <span className="text-xs text-white/30 font-mono">
                          TOP {displayData.actualTopCount > 3 ? displayData.actualTopCount : '3'}
                        </span>
                        <div className="flex-1 h-px bg-white/10"></div>
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-1">
                  {displayData.topEntries.map((entry, index) => (
                    <div
                      key={entry.userId}
                      className="transition-all duration-500 ease-out"
                      style={{
                        transform: `translateY(0)`,
                        transitionDelay: `${index * 50}ms`
                      }}
                    >
                      <LeaderboardEntry 
                        entry={entry}
                        isCurrentUser={entry.userId === user?.userId}
                        showAtTop={false}
                        allEntries={leaderboard}
                      />
                    </div>
                  ))}
                </div>

                {displayData.topEntries.length < 3 && (
                  <div className="space-y-1">
                    {Array.from({ length: 3 - displayData.topEntries.length }).map((_, index) => (
                      <div
                        key={`empty-${index}`}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.03] border border-dashed border-white/10 transition-all duration-300"
                      >
                        <div className="w-6 flex-shrink-0 flex justify-center">
                          <span className="text-white/20 font-mono text-sm">—</span>
                        </div>
                        <div className="w-3 h-3 rounded-full flex-shrink-0 bg-white/10"></div>
                        <span className="flex-1 text-sm font-mono text-white/20 italic">
                          Claim cells to rank here
                        </span>
                        <span className="text-sm font-mono text-white/20">—</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-4 py-2 border-t border-white/[0.06] text-[10px] text-white/20 font-mono text-right">
            top {displayData.actualTopCount > 3 ? displayData.actualTopCount : '3'} · live updates
          </div>
        </div>
      )}
    </>
  );
}
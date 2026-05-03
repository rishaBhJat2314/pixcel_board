import Cell from '../models/Cell.js';
import User from '../models/User.js';

export async function getLeaderboard(req, res) {
  const authHeader = req.headers.authorization;
  const requestingUserId = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  try {
    const counts = await Cell.aggregate([
      { $group: { _id: '$ownerId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    if (counts.length === 0) {
      return res.json({ top: [], currentUser: null });
    }

    const ownerIds = counts.map((c) => c._id);
    const users = await User.find({ userId: { $in: ownerIds } }, 'userId email color').lean();
    const userMap = {};
    users.forEach((u) => { userMap[u.userId] = u; });

    const sortedCounts = counts.sort((a, b) => {
      if (a.count !== b.count) {
        return b.count - a.count;
      }
      return a._id.localeCompare(b._id);
    });

    const ranked = [];
    let currentRank = 1;
    let uniqueScores = [];
    
    for (let i = 0; i < sortedCounts.length; i++) {
      const c = sortedCounts[i];
      
      if (!uniqueScores.includes(c.count)) {
        uniqueScores.push(c.count);
        currentRank = uniqueScores.length;
      }
      
      ranked.push({
        rank: currentRank,
        userId: c._id,
        email: userMap[c._id]?.email || c._id,
        color: userMap[c._id]?.color || '#888',
        count: c.count,
      });
    }

    const top3 = ranked.slice(0, 3);

    let currentUser = null;
    if (requestingUserId) {
      const entry = ranked.find((r) => r.userId === requestingUserId);
      if (entry) {
        currentUser = entry;
      }
    }

    return res.json({ top: top3, currentUser });
  } catch (err) {
    console.error('leaderboard error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

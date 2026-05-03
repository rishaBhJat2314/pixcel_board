import Cell from '../models/Cell.js';
import User from '../models/User.js';

export async function broadcastLeaderboard(io) {
  try {
    const counts = await Cell.aggregate([
      { $group: { _id: '$ownerId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    if (counts.length === 0) {
      io.emit('leaderboard_update', { ranked: [] });
      return;
    }

    const ownerIds = counts.map((c) => c._id);
    const users = await User.find(
      { userId: { $in: ownerIds } },
      'userId email color'
    ).lean();

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

    io.emit('leaderboard_update', { ranked });
  } catch (err) {
    console.error('broadcastLeaderboard error:', err);
  }
}

export function initSocket(io) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) return next(new Error('Unauthorized: no token provided'));

    try {
      const user = await User.findOne({ userId: token }).lean();
      if (!user) return next(new Error('Unauthorized: user not found'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Auth error'));
    }
  });

  io.on('connection', (socket) => {
    broadcastLeaderboard(io);

    socket.on('claim_cell', async ({ x, y }) => {
      if (typeof x !== 'number' || typeof y !== 'number') {
        socket.emit('claim_error', { x, y, reason: 'Invalid coordinates' });
        return;
      }

      try {
        const cell = await Cell.create({
          x,
          y,
          ownerId: socket.user.userId,
          color:   socket.user.color,
        });

        io.emit('cell_updated', {
          x:          cell.x,
          y:          cell.y,
          color:      cell.color,
          ownerId:    cell.ownerId,
          ownerEmail: socket.user.email,
        });

        broadcastLeaderboard(io);
      } catch (err) {
        if (err.code === 11000) {
          socket.emit('claim_error', { x, y, reason: 'Cell already claimed' });
        } else {
          console.error('claim_cell error:', err);
          socket.emit('claim_error', { x, y, reason: 'Server error' });
        }
      }
    });

    socket.on('unclaim_cell', async ({ x, y }) => {
      if (typeof x !== 'number' || typeof y !== 'number') {
        socket.emit('claim_error', { x, y, reason: 'Invalid coordinates' });
        return;
      }

      try {
        const result = await Cell.deleteOne({
          x,
          y,
          ownerId: socket.user.userId,
        });

        if (result.deletedCount === 0) {
          socket.emit('claim_error', { x, y, reason: 'Not your cell or already unclaimed' });
          return;
        }

        io.emit('cell_removed', { x, y });

        broadcastLeaderboard(io);
      } catch (err) {
        console.error('unclaim_cell error:', err);
        socket.emit('claim_error', { x, y, reason: 'Server error' });
      }
    });
  });
}

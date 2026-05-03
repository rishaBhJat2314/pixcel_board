import Cell from '../models/Cell.js';
import User from '../models/User.js';

export async function getCells(req, res) {
  const { x1, y1, x2, y2 } = req.query;

  if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) {
    return res.status(400).json({ error: 'x1, y1, x2, y2 are required' });
  }

  const nx1 = parseInt(x1, 10);
  const ny1 = parseInt(y1, 10);
  const nx2 = parseInt(x2, 10);
  const ny2 = parseInt(y2, 10);

  if ([nx1, ny1, nx2, ny2].some(isNaN)) {
    return res.status(400).json({ error: 'Coordinates must be integers' });
  }

  const MAX_RANGE = 2000;
  if (Math.abs(nx2 - nx1) > MAX_RANGE || Math.abs(ny2 - ny1) > MAX_RANGE) {
    return res.status(400).json({ error: 'Requested range too large' });
  }

  try {
    const cells = await Cell.find({
      x: { $gte: Math.min(nx1, nx2), $lte: Math.max(nx1, nx2) },
      y: { $gte: Math.min(ny1, ny2), $lte: Math.max(ny1, ny2) },
    }).lean();

    const ownerIds = [...new Set(cells.map((c) => c.ownerId))];
    const users = await User.find({ userId: { $in: ownerIds } }, 'userId email').lean();
    const emailMap = {};
    users.forEach((u) => { emailMap[u.userId] = u.email; });

    const result = cells.map((c) => ({
      x: c.x,
      y: c.y,
      color: c.color,
      ownerId: c.ownerId,
      ownerEmail: emailMap[c.ownerId] || '',
    }));

    return res.json(result);
  } catch (err) {
    console.error('getCells error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export async function getUserCells(req, res) {
  const authHeader = req.headers.authorization;
  const userId = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const cells = await Cell.find({ ownerId: userId }).lean();
    
    if (cells.length === 0) {
      return res.json({ cells: [], center: null });
    }

    const xs = cells.map(c => c.x);
    const ys = cells.map(c => c.y);
    const centerX = Math.round((Math.min(...xs) + Math.max(...xs)) / 2);
    const centerY = Math.round((Math.min(...ys) + Math.max(...ys)) / 2);

    const result = cells.map((c) => ({
      x: c.x,
      y: c.y,
      color: c.color,
      ownerId: c.ownerId,
    }));

    return res.json({ 
      cells: result, 
      center: { x: centerX, y: centerY },
      count: cells.length 
    });
  } catch (err) {
    console.error('getUserCells error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

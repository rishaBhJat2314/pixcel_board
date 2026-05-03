import { Router } from 'express';
import { getCells, getUserCells } from '../controllers/cellController.js';
import { getLeaderboard } from '../controllers/leaderboardController.js';

const router = Router();

router.get('/cells', getCells);
router.get('/user-cells', getUserCells);
router.get('/leaderboard', getLeaderboard);

export default router;

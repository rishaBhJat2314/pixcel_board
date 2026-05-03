import { Router } from 'express';
import { registerUser, getMe } from '../controllers/userController.js';

const router = Router();

router.post('/register', registerUser);
router.get('/me', getMe);

export default router;

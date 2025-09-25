import { Router } from 'express';
import { getPendingOrders } from '../controllers/orders.controller.js';
import { verifyJWT } from '../middleware/auth.js';

const router = Router();

router.get('/pending', verifyJWT, getPendingOrders);

export default router;
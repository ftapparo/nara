import express from 'express';
import * as BotController from '../controllers/BotController';

const router = express.Router();

router.get('/bot/chat', BotController.getBotChat);

export default router;

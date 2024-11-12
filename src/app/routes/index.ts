// src/app/routes/index.ts
import express from 'express';
import botRoutes from './BotRoutes';
import fipeRoutes from './FipeRoutes';
import firebirdRoutes from './FirebirdRoutes';

const router = express.Router();

// Inclui as rotas específicas do Bot
router.use('/bot', botRoutes);

// Inclui as rotas específicas do Fipe
router.use('/fipe', fipeRoutes);

// Inclui as rotas específicas do Firebird
router.use('/firebird', firebirdRoutes);

export default router;

import express from 'express';
import * as FirebirdController from '../controllers/FirebirdController';

const router = express.Router();

// Exemplo de rota para buscar usuário pelo CPF
router.get('/user/:cpf', FirebirdController.getUserByCPF);

export default router;

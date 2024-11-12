// controllers/vehicleController.ts
import { Request, Response } from 'express';
import * as BotService from '../services/BotService';

export async function getBotChat(req: Request, res: Response) {
    try {

        const chatList = BotService.getChatList();
        res.json(chatList);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar mensagens' });
    }
}

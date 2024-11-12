// src/app/controllers/FirebirdController.ts
import { Request, Response } from 'express';
import * as FirebirdService from '../services/FirebirdService';

export const getUserByCPF = async (req: Request, res: Response) => {
    const cpf = req.params.cpf;

    try {
        const user = await FirebirdService.findUserByCPF(cpf);
        if (user) {
            res.status(200).json(user);
        } else {
            res.status(404).json({ message: 'CPF não encontrado.' });
        }
    } catch (error) {
        console.error('Erro ao consultar o CPF:', error);
        res.status(500).json({ message: 'Erro ao consultar o CPF no banco de dados.' });
    }
};

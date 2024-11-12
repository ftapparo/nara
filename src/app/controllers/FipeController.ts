// controllers/vehicleController.ts
import { Request, Response } from 'express';
import * as vehicleService from '../services/FipeService';

export async function getVehicleBrands(req: Request, res: Response) {
    try {
        const brands = await vehicleService.fetchVehicleBrands();

        console.log('marcas', brands);

        res.json(brands);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar marcas de veículos' });
    }
}

export async function getVehicleModels(req: Request, res: Response) {
    const brandId = String(req.query.brandId) || '1';
    try {
        const models = await vehicleService.fetchVehicleModels(brandId);
        res.json(models);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar modelos de veículos' });
    }
}

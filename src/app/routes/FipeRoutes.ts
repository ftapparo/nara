import express from 'express';
import * as FipeController from '../controllers/FipeController';

const router = express.Router();

router.get('/fipe/marcas', FipeController.getVehicleBrands);
router.get('/fipe/modelos', FipeController.getVehicleModels);

export default router;

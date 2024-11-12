import express from 'express';
import ora from 'ora';
import { initializeBot, getChatList } from './app/services/BotService';
import { getVehicleBrands, getVehicleModels } from './app/controllers/FipeController';
import routes from './app/routes';


const app = express();
const PORT = 3000;

app.use(express.json());

// Usa as rotas centralizadas
app.use('/api', routes);


// Função para iniciar o servidor Express com animação
const startExpressServer = async () => {
    const spinner = ora('Iniciando servidor Express...').start();

    return new Promise<void>((resolve, reject) => {
        app.listen(PORT, (err?: Error) => {
            if (err) {
                spinner.fail('Erro ao iniciar o servidor Express.');
                reject(err);
            } else {
                spinner.succeed(`Servidor Express rodando na porta ${PORT}`);
                resolve();
            }
        });
    });
};

// Função principal para iniciar o servidor e o bot
const startServer = async () => {
    try {
        await startExpressServer();
        await initializeBot();
    } catch (error) {
        console.error('Erro ao iniciar o servidor ou o bot:', error);
    }
};

startServer();

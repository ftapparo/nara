// src/app/services/FirebirdService.ts
import firebird from 'node-firebird';
import firebirdOptions from '../../config/FirebirdConfig';

export interface UserData {
    SEQUENCIA: number,
    NOME: string,
    CLASSIFICACAO: number
}

// Configura o pool de conexões
const pool = firebird.pool(10, firebirdOptions); // Define um pool com até 10 conexões

// Função para obter uma conexão do pool
function getConnection(): Promise<firebird.Database> {
    return new Promise((resolve, reject) => {
        pool.get((err, db) => {
            if (err) {
                reject(err);
            } else {
                resolve(db);
            }
        });
    });
}

// Função para executar uma consulta
export async function executeQuery(query: string, params: any[] = []): Promise<any[]> {
    const db = await getConnection();
    return new Promise((resolve, reject) => {
        db.query(query, params, (err, result) => {
            db.detach(); // Libera a conexão de volta ao pool após a consulta
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

// Função para buscar dados de um CPF específico
export async function findUserByCPF(cpf: string): Promise<UserData> {
    const query = `SELECT SEQUENCIA, "NOME", CLASSIFICACAO FROM PESSOAS p WHERE p."CPF" LIKE ?`;
    const results = await executeQuery(query, [cpf]);

    if (!results || results.length === 0) {
        return {
            SEQUENCIA: 0,
            NOME: "",
            CLASSIFICACAO: 99
        };
    } else {
        const data = results[0]; // Acessa o primeiro elemento do array
        return {
            SEQUENCIA: data.SEQUENCIA,
            NOME: data.NOME.trim(),
            CLASSIFICACAO: data.CLASSIFICACAO
        };
    }
}

// Função para verificar duplicidade de TAG ou placa
export async function isTagOrPlateDuplicate(tagNumber: string, vehiclePlate: string): Promise<boolean> {
    const query = `
        SELECT 1 FROM VEICULOS 
        WHERE TAGVEICULO = ? OR PLACA = ?
        ROWS 1
    `;
    const results = await executeQuery(query, [tagNumber, vehiclePlate]);

    return results && results.length > 0; // Retorna true se houver duplicidade, caso contrário false
}


// Função para conceder acesso ao veículo, incluindo a inserção de fotos
export async function grantVehicleAccess(
    cpf: string,
    tagVeiculo: string,
    placa: string,
    marca: string,
    modelo: string,
    cor: string,
    tagPhoto: Buffer | null,       
    vehiclePhoto: Buffer | null    
): Promise<boolean> {
    try {
        // Primeiro, busca o SEQUENCIA do proprietário
        const user = await findUserByCPF(cpf);
        if (!user) {
            throw new Error("Usuário não encontrado.");
        }

        // Insere o veículo na tabela VEICULOS
        const insertVehicleQuery = `
            INSERT INTO VEICULOS (PLACA, MARCA, MODELO, COR, SEQUNIDADE, PROPRIETARIO, TAGVEICULO)
            VALUES (?, ?, ?, ?, 0, ?, ?)
        `;
        await executeQuery(insertVehicleQuery, [
            placa.toUpperCase(),
            marca.toUpperCase(),
            modelo.toUpperCase(),
            cor.toUpperCase(),
            user.SEQUENCIA,
            tagVeiculo.toUpperCase()
        ]);

        // Recupera o SEQUENCIA do veículo recém-inserido
        const getVehicleSequenciaQuery = `
            SELECT SEQUENCIA FROM VEICULOS WHERE PLACA = ? ORDER BY SEQUENCIA DESC
        `;
        const vehicleResult = await executeQuery(getVehicleSequenciaQuery, [placa.toUpperCase()]);
        const vehicleSequencia = vehicleResult[0]?.SEQUENCIA;

        if (!vehicleSequencia) {
            throw new Error("Veículo não encontrado após inserção.");
        }

        // Insere o acesso na tabela IDACESSO
        const insertAccessQuery = `
            INSERT INTO IDACESSO (SEQPESSOA, ID2, TIPO, PANICO, USR, VEICULO)
            VALUES (?, ?, 'Y', 'N', 'NARA', ?)
        `;
        await executeQuery(insertAccessQuery, [
            user.SEQUENCIA,
            tagVeiculo.toUpperCase(),
            vehicleSequencia
        ]);

        // Decodifica as fotos de Base64 para binário
        //const decodedVehiclePhoto = Buffer.from(vehiclePhoto, 'base64');
        //const decodedTagPhoto = Buffer.from(tagPhoto, 'base64');

        // Insere as fotos na tabela VEICULOSFOTO
        const insertPhotoQuery = `
            INSERT INTO VEICULOSFOTO (SEQVEICULO, FOTO, FOTOTAG)
            VALUES (?, ?, ?)
        `;      
        await executeQuery(insertPhotoQuery, [vehicleSequencia, vehiclePhoto, tagPhoto]);
     
        // Confirma se o acesso foi inserido corretamente
        const verifyAccessQuery = `
            SELECT * FROM IDACESSO WHERE SEQPESSOA = ? AND ID2 = ? AND VEICULO = ?
        `;
        const verifyResult = await executeQuery(verifyAccessQuery, [
            user.SEQUENCIA,
            tagVeiculo.toUpperCase(),
            vehicleSequencia
        ]);

        return verifyResult.length > 0; // Retorna true se a inserção foi bem-sucedida
    } catch (error) {
        console.error("Erro ao conceder acesso ao veículo:", error);
        return false; // Retorna false em caso de erro
    }
}

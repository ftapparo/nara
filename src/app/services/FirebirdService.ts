// src/app/services/FirebirdService.ts
import firebird from 'node-firebird';
import firebirdOptions from '../../config/FirebirdConfig';

// Função para obter uma conexão com o banco
function getConnection(): Promise<firebird.Database> {
    return new Promise((resolve, reject) => {
        firebird.attach(firebirdOptions, (err, db) => {
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
            db.detach(); // Fecha a conexão após a consulta
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

// Função para buscar dados de um CPF específico
export async function findUserByCPF(cpf: string): Promise<any | null> {
    const query = `SELECT SEQUENCIA, "NOME", CLASSIFICACAO FROM PESSOAS p WHERE p."CPF" LIKE ?`;
    const results = await executeQuery(query, [cpf]);
    return results.length > 0 ? results[0] : null; // Retorna o primeiro resultado, se houver
}

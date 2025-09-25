import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import oracledb from 'oracledb';
import cors from 'cors';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { loggingMiddleware } from './middleware/loggingMiddleware.js';
import { cacheControlMiddleware } from './middleware/cacheControlMiddleware.js';
import ordersRouter from './routes/orders.routes.js';

console.log('--- [FASE 1 de 4] Início do arquivo server.ts ---');

try {
    oracledb.initOracleClient();
    console.log('Oracle Client inicializado em modo Thick com sucesso!');
} catch (err) {
    console.error('ERRO FATAL na inicialização do Oracle Client:', err);
    process.exit(1);
}

const app = express();
const PORT = 8888;

app.options('*', cors());

app.use(cors());
app.use(express.json());
app.use(loggingMiddleware);
app.use('/api', cacheControlMiddleware);

app.use('/api/orders', ordersRouter);

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECT_STRING
};

async function withDatabase<T>(callback: (connection: oracledb.Connection) => Promise<T>): Promise<T> {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        return await callback(connection);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
            }
        }
    }
}

const findOrCreateCartHeader = async (connection: oracledb.Connection, codUsuario: number): Promise<number> => {
    let result = await connection.execute<{ NUMPEDRCA: number }>(
        `SELECT NUMPEDRCA FROM BRAMV_PEDIDOC WHERE CODUSUARIO = :codUsuario AND STATUS = 0`,
        [codUsuario],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows && result.rows.length > 0 && result.rows[0]) {
        return result.rows[0].NUMPEDRCA;
    }
    else {
        const maxPedResult = await connection.execute(
            `SELECT NVL(MAX(NUMPEDRCA), 0) + 1 AS NEXT_ID FROM BRAMV_PEDIDOC`
        );

        if (!maxPedResult.rows || maxPedResult.rows.length === 0) {
            throw new Error('Não foi possível gerar um novo número de pedido.');
        }
        const newNumpedrca = (maxPedResult.rows[0] as any[])[0];

        await connection.execute(
            `INSERT INTO BRAMV_PEDIDOC (NUMPEDRCA, CODUSUARIO, STATUS, DATA) VALUES (:numpedrca, :codUsuario, 0, SYSDATE)`,
            { numpedrca: newNumpedrca, codUsuario: codUsuario },
        );
        return newNumpedrca;
    }
};

console.log('--- [FASE 2 de 4] Funções e configurações carregadas. Registrando rotas... ---');

app.post('/api/auth/register', async (req, res) => {
    const { primeiro_nome, ultimo_nome, email, senha, genero, telefone } = req.body;
    const codcli = 27995;

    if (!primeiro_nome || !email || !senha) {
        return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(senha, 10);

        await withDatabase(async (connection) => {
            const userExists = await connection.execute(
                `SELECT CODUSUARIO FROM BRAMV_USUARIOS WHERE EMAIL = :email AND CODCLI = :codcli`,
                { email, codcli }
            );

            if (userExists.rows && userExists.rows.length > 0) {
                throw new Error('Este e-mail já está em uso.');
            }

            const maxCodResult = await connection.execute(
                `SELECT NVL(MAX(CODUSUARIO), 0) + 1 AS NEXT_CODUSUARIO FROM BRAMV_USUARIOS`
            );

            if (!maxCodResult.rows || maxCodResult.rows.length === 0) {
                throw new Error('Não foi possível gerar um novo número de usuário.');
            }
            const nextCodUsuario = (maxCodResult.rows[0] as any)[0];

            await connection.execute(
                `INSERT INTO BRAMV_USUARIOS (CODCLI, CODUSUARIO, PRIMEIRO_NOME, ULTIMO_NOME, EMAIL, SENHA, TIPOUSUARIO, GENERO, TELEFONE) 
                 VALUES (:codcli, :codusuario, :primeiro_nome, :ultimo_nome, :email, :senha, 1, :genero, :telefone)`,
                {
                    codcli,
                    codusuario: nextCodUsuario,
                    primeiro_nome,
                    ultimo_nome: ultimo_nome || '',
                    email,
                    senha: hashedPassword,
                    genero: genero || null,
                    telefone: telefone || null
                },
                { autoCommit: true }
            );

            res.status(201).json({ success: true, message: 'Usuário criado com sucesso!' });
        });
    } catch (err: any) {
        if (err.message.includes('já está em uso')) {
            return res.status(409).json({ error: err.message });
        }
        console.error('ERRO AO REGISTRAR USUÁRIO:', err);
        res.status(500).json({ error: 'Erro interno ao registrar o usuário.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, senha } = req.body;
    const codcli = 27995;

    if (!email || !senha) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    try {
        await withDatabase(async (connection) => {
            const query = `
                SELECT 
                    u.CODUSUARIO, u.PRIMEIRO_NOME, u.ULTIMO_NOME, u.EMAIL, u.SENHA,
                    u.TIPOUSUARIO, u.CODSETOR, u.GENERO, u.TELEFONE, u.ID_FUNCIONARIO,
                    s.DESCRICAO AS SETOR_DESCRICAO
                FROM BRAMV_USUARIOS u
                LEFT JOIN BRAMV_SETOR s ON u.CODSETOR = s.CODSETOR AND u.CODCLI = s.CODCLI
                WHERE u.EMAIL = :email AND u.CODCLI = :codcli
            `;

            const result = await connection.execute(query, { email, codcli }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

            if (!result.rows || result.rows.length === 0) {
                return res.status(401).json({ error: 'Credenciais inválidas.' });
            }

            const dbUser: any = result.rows[0];

            const senhaHash = dbUser.SENHA;

            if (!senhaHash) {
                console.error('Objeto recebido do DB não contém a propriedade SENHA. Chaves disponíveis:', Object.keys(dbUser));
                throw new Error('Coluna de senha não encontrada no resultado da consulta.');
            }

            const isPasswordValid = await bcrypt.compare(senha, senhaHash);

            if (!isPasswordValid) {
                return res.status(401).json({ error: 'Credenciais inválidas.' });
            }

            const userPayload = {
                codUsuario: dbUser.CODUSUARIO,
                primeiroNome: dbUser.PRIMEIRO_NOME,
                ultimoNome: dbUser.ULTIMO_NOME,
                email: dbUser.EMAIL,
                tipoUsuario: dbUser.TIPOUSUARIO,
                perfil: dbUser.TIPOUSUARIO === 1 ? 'Admin' : dbUser.TIPOUSUARIO === 2 ? 'Aprovador' : 'Solicitante',
                codSetor: dbUser.CODSETOR,
                setor: dbUser.SETOR_DESCRICAO || 'Não definido',
                genero: dbUser.GENERO || '',
                numeroTelefone: dbUser.TELEFONE || '',
                idFuncionario: dbUser.ID_FUNCIONARIO || '',
                numeroSequencia: 0,
                ativo: true,
            };

            const token = jwt.sign(
                { id: userPayload.codUsuario, nome: userPayload.primeiroNome, tipoUsuario: userPayload.tipoUsuario },
                process.env.JWT_SECRET!,
                { expiresIn: '8h' }
            );

            res.status(200).json({
                success: true,
                token,
                user: userPayload
            });
        });
    } catch (err: any) {
        console.error('ERRO NO LOGIN:', err);
        res.status(500).json({ error: 'Erro interno ao tentar fazer login.' });
    }
});

app.get('/api/produtos', async (_req, res) => {
    console.log('Recebida requisição em /api/produtos');
    try {
        const produtos = await withDatabase(async (connection) => {
            const result = await connection.execute(
                `SELECT DISTINCT 
           P.CODPROD, P.CODAUXILIAR, P.DESCRICAO AS DESCRICAO_PADRAO,
           NVL(I.PTABELA, 0) AS PRECO, P.EMBALAGEM
         FROM PCPRODUT P, PCMARCA M, PCCATEGORIA CAT, PCSUBCATEGORIA SUB, PCCONTRATO C, PCCONTRATOI I, PCCLIENT CLI
         WHERE CLI.CODCLI = 27995
           AND C.CODCLI = CLI.CODCLI AND I.CODCONTRATO = C.CODCONTRATO
           AND P.CODPROD = I.CODPROD AND P.CODMARCA = M.CODMARCA
           AND P.CODCATEGORIA = CAT.CODCATEGORIA(+) AND P.CODSUBCATEGORIA = SUB.CODSUBCATEGORIA(+)
           AND TRUNC(C.DTVENCIMENTO) >= TRUNC(SYSDATE)
         ORDER BY P.DESCRICAO`
            );
            return (result.rows as any[][]).map((row) => ({ id: row[0], codigoAuxiliar: row[1], nome: row[2], preco: row[3], unit: row[4], descricao: `Descrição para ${row[2]}`, imgUrl: `https://placehold.co/300x200/eeeeee/333333?text=Produto+${row[0]}` }));
        });
        res.json(produtos);
    } catch (err) {
        console.error('ERRO AO BUSCAR PRODUTOS:', err);
        res.status(500).json({ error: 'Erro ao buscar produtos do banco de dados.' });
    }
});
console.log('Rota GET /api/produtos registrada.');

app.get('/api/pedido/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`[API] Recebida requisição para GET /api/pedido/${id}`);
    try {
        const pedidoDetails = await withDatabase(async (connection) => {
            console.log(`[API] Conectado ao banco. Buscando detalhes para o pedido #${id}...`);
            const headerResult = await connection.execute(`SELECT p.NUMPEDRCA, p.DATA, p.STATUS, u.PRIMEIRO_NOME || ' ' || u.ULTIMO_NOME AS NOME, u.EMAIL, s.DESCRICAO AS SETOR FROM BRAMV_PEDIDOC p LEFT JOIN BRAMV_USUARIOS u ON p.CODUSUARIO = u.CODUSUARIO LEFT JOIN BRAMV_SETOR s ON u.CODSETOR = s.CODSETOR WHERE p.NUMPEDRCA = :id`, [id], { outFormat: oracledb.OUT_FORMAT_OBJECT });
            if (!headerResult.rows || headerResult.rows.length === 0) throw new Error('Pedido não encontrado');
            const header: any = headerResult.rows[0];
            const itemsResult = await connection.execute(`SELECT i.CODPROD, i.QT, i.PVENDA, p.DESCRICAO, p.UNIDADE FROM BRAMV_PEDIDOI i JOIN PCPRODUT p ON i.CODPROD = p.CODPROD WHERE i.NUMPEDRCA = :id`, [id], { outFormat: oracledb.OUT_FORMAT_OBJECT });
            console.log(`[API] Pedido #${id} encontrado e processado com sucesso.`);
            return {
                id: header.NUMPEDRCA, data: header.DATA, status: header.STATUS,
                solicitante: { nome: header.NOME, email: header.EMAIL }, unidadeAdmin: header.SETOR,
                itens: (itemsResult.rows || []).map((item: any) => ({ id: item.CODPROD, nome: item.DESCRICAO, quantidade: item.QT, preco: item.PVENDA, unit: item.UNIDADE, imgUrl: `https://placehold.co/100x100?text=${item.CODPROD}` }))
            };
        });
        res.json(pedidoDetails);
    } catch (err: any) {

        console.error(`[API] ERRO ao buscar pedido #${id}:`, err);
        res.status(404).json({ error: err.message || 'Pedido não encontrado.' });
    }
});

app.put('/api/pedido/:id/status', async (req, res) => {
    const { id } = req.params;
    const { newStatus, conditionStatus } = req.body;

    if (![0, 1, 2, 3, 5].includes(newStatus)) {
        return res.status(400).json({ error: 'Status inválido.' });
    }

    try {
        await withDatabase(async (connection) => {
            let sql = `UPDATE BRAMV_PEDIDOC SET STATUS = :newStatus WHERE NUMPEDRCA = :id`;
            const params: any = { newStatus, id };

            if (conditionStatus !== undefined) {
                sql += ` AND STATUS = :conditionStatus`;
                params.conditionStatus = conditionStatus;
            }

            const updateResult = await connection.execute(sql, params);

            if (updateResult.rowsAffected === 0 && conditionStatus !== undefined) {

                throw new Error('O status do pedido foi alterado por outro usuário. A página será atualizada.');
            }

            await connection.commit();
        });

        res.status(200).json({ success: true, message: `Status do Pedido #${id} atualizado.` });
    } catch (err: any) {
        if (
            err.message === 'O status do pedido foi alterado por outro usuário. A página será atualizada.'
        ) {
            const atual = await withDatabase(async (connection) => {
                const res = await connection.execute<{ STATUS: number }>(
                    `SELECT STATUS FROM BRAMV_PEDIDOC WHERE NUMPEDRCA = :id`,
                    { id: Number(id) },
                    { outFormat: oracledb.OUT_FORMAT_OBJECT }
                );
                return (res.rows && res.rows[0] && typeof res.rows[0].STATUS !== 'undefined') ? res.rows[0].STATUS : null;
            });
            return res.status(409).json({
                error: err.message,
                statusAtual: atual,
            });
        }
        res.status(500).json({ error: err.message || 'Erro ao atualizar o status do pedido.' });
    }
});

app.get('/api/pedidos/historico', async (_req, res) => {
    try {
        const pedidos = await withDatabase(async (connection) => {
            const result = await connection.execute(
                `WITH OrderTotals AS (
                    SELECT NUMPEDRCA, COUNT(CODPROD) AS QTD_ITENS, SUM(QT * PVENDA) AS VALOR_TOTAL
                    FROM BRAMV_PEDIDOI GROUP BY NUMPEDRCA
                )
                SELECT 
                    p.NUMPEDRCA, p.DATA, p.STATUS,
                    u.PRIMEIRO_NOME || ' ' || u.ULTIMO_NOME AS SOLICITANTE, 
                    s.DESCRICAO AS SETOR,
                    NVL(ot.QTD_ITENS, 0) AS QTD_ITENS,
                    NVL(ot.VALOR_TOTAL, 0) AS VALOR_TOTAL
                 FROM BRAMV_PEDIDOC p
                 LEFT JOIN BRAMV_USUARIOS u ON p.CODUSUARIO = u.CODUSUARIO
                 LEFT JOIN BRAMV_SETOR s ON u.CODSETOR = s.CODSETOR
                 LEFT JOIN OrderTotals ot ON p.NUMPEDRCA = ot.NUMPEDRCA
                 WHERE p.STATUS IN (1, 2, 3) -- Aprovado, Reprovado e Em Análise
                 ORDER BY p.DATA DESC`,
                [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            return (result.rows || []).map((p: any) => ({
                id: p.NUMPEDRCA,
                data: p.DATA,
                status: p.STATUS,
                solicitante: p.SOLICITANTE,
                setor: p.SETOR || 'N/A',
                qtdItens: p.QTD_ITENS,
                valorTotal: p.VALOR_TOTAL,
            }));
        });
        res.json(pedidos);
    } catch (err) {
        console.error('ERRO AO BUSCAR HISTÓRICO DE PEDIDOS:', err);
        res.status(500).json({ error: 'Erro ao buscar histórico de pedidos.' });
    }
});

app.get('/api/carrinho/:codusuario', async (req, res) => {
    const { codusuario } = req.params;
    try {
        const items = await withDatabase(async (connection) => {
            const result = await connection.execute(
                `SELECT i.CODPROD, i.QT, i.PVENDA, p.DESCRICAO, p.UNIDADE
                 FROM BRAMV_PEDIDOI i
                 JOIN BRAMV_PEDIDOC c ON i.NUMPEDRCA = c.NUMPEDRCA
                 JOIN PCPRODUT p ON i.CODPROD = p.CODPROD
                 WHERE c.CODUSUARIO = :codusuario AND c.STATUS = 0`,
                [codusuario], { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            return (result.rows || []).map((item: any) => ({
                id: item.CODPROD,
                nome: item.DESCRICAO,
                quantidade: item.QT,
                preco: item.PVENDA,
                unit: item.UNIDADE,
                imgUrl: `https://placehold.co/100x100?text=${item.CODPROD}`
            }));
        });
        res.json(items);
    } catch (err) {
        console.error("Erro ao buscar carrinho:", err);
        res.status(500).json({ error: 'Erro ao buscar carrinho.' });
    }
});

app.post('/api/carrinho/:codusuario/items', async (req, res) => {
    const { codusuario } = req.params;
    const { codprod, qt, pvenda } = req.body;
    try {
        await withDatabase(async (connection) => {
            const numpedrca = await findOrCreateCartHeader(connection, Number(codusuario));
            const existingItem = await connection.execute(`SELECT QT FROM BRAMV_PEDIDOI WHERE NUMPEDRCA = :1 AND CODPROD = :2`, [numpedrca, codprod]);
            if (existingItem.rows && existingItem.rows.length > 0) {
                await connection.execute(`UPDATE BRAMV_PEDIDOI SET QT = QT + :1 WHERE NUMPEDRCA = :2 AND CODPROD = :3`, [qt, numpedrca, codprod]);
            } else {
                await connection.execute(`INSERT INTO BRAMV_PEDIDOI (NUMPEDRCA, CODPROD, QT, PVENDA) VALUES (:1, :2, :3, :4)`, [numpedrca, codprod, qt, pvenda]);
            }
            await connection.commit();
        });
        res.status(200).json({ success: true });
    } catch (err) {
        console.error("Erro ao adicionar item:", err);
        res.status(500).json({ error: 'Erro ao adicionar item ao carrinho.' });
    }
});

app.put('/api/carrinho/:codusuario/items/:codprod', async (req, res) => {
    const { codusuario, codprod } = req.params;
    const { qt } = req.body;
    try {
        await withDatabase(async (connection) => {
            const numpedrca = await findOrCreateCartHeader(connection, Number(codusuario));
            await connection.execute(`UPDATE BRAMV_PEDIDOI SET QT = :qt WHERE NUMPEDRCA = :numpedrca AND CODPROD = :codprod`, { qt, numpedrca, codprod }, { autoCommit: true });
        });
        res.status(200).json({ success: true });
    } catch (err) {
        console.error("Erro ao atualizar item:", err);
        res.status(500).json({ error: 'Erro ao atualizar item.' });
    }
});

app.delete('/api/carrinho/:codusuario/items/:codprod', async (req, res) => {
    const { codusuario, codprod } = req.params;
    try {
        await withDatabase(async (connection) => {
            const numpedrca = await findOrCreateCartHeader(connection, Number(codusuario));
            await connection.execute(`DELETE FROM BRAMV_PEDIDOI WHERE NUMPEDRCA = :numpedrca AND CODPROD = :codprod`, { numpedrca, codprod }, { autoCommit: true });
        });
        res.status(200).json({ success: true });
    } catch (err) {
        console.error("Erro ao remover item:", err);
        res.status(500).json({ error: 'Erro ao remover item.' });
    }
});

app.post('/api/carrinho/:codusuario/submit', async (req, res) => {
    const { codusuario } = req.params;
    try {
        await withDatabase(async (connection) => {
            const result = await connection.execute(`UPDATE BRAMV_PEDIDOC SET STATUS = 5 WHERE CODUSUARIO = :1 AND STATUS = 0`, [codusuario]);
            if (result.rowsAffected === 0) throw new Error('Nenhum carrinho ativo para submeter.');
            await connection.commit();
        });
        res.status(200).json({ success: true, message: `Pedido enviado para aprovação.` });
    } catch (err: any) {
        console.error("Erro ao submeter carrinho:", err);
        res.status(500).json({ error: err.message || 'Erro ao submeter o pedido.' });
    }
});

app.get('/api/usuarios', async (_req, res) => {
    const codcli = 27995; // Código do cliente fixo
    try {
        const users = await withDatabase(async (connection) => {
            const result = await connection.execute<{ [key: string]: any }>(
                `SELECT 
                    U.CODUSUARIO, U.PRIMEIRO_NOME, U.ULTIMO_NOME, U.EMAIL, U.CODSETOR, U.TIPOUSUARIO, U.GENERO, U.TELEFONE, U.ID_FUNCIONARIO,
                    S.DESCRICAO AS SETOR
                 FROM BRAMV_USUARIOS U 
                 LEFT JOIN BRAMV_SETOR S ON U.CODSETOR = S.CODSETOR
                 WHERE U.CODCLI = 27995`,
                [],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            return (result.rows || []).map(user => ({
                codUsuario: user.CODUSUARIO,
                primeiroNome: user.PRIMEIRO_NOME,
                ultimoNome: user.ULTIMO_NOME,
                email: user.EMAIL,
                codSetor: user.CODSETOR,
                tipoUsuario: user.TIPOUSUARIO,
                genero: user.GENERO,
                numeroTelefone: user.TELEFONE,
                idFuncionario: user.ID_FUNCIONARIO,
                setor: user.SETOR,
                perfil: user.TIPOUSUARIO === 1 ? 'Admin' : (user.TIPOUSUARIO === 2 ? 'Aprovador' : 'Solicitante')
            }));
        });
        res.json(users);
    } catch (err) {
        console.error('ERRO AO BUSCAR USUÁRIOS:', err);
        res.status(500).json({ error: 'Erro ao buscar usuários.' });
    }
});

app.post('/api/usuarios', async (req, res) => {
    // Agora esperamos todos os dados, incluindo a senha e o tipo de usuário
    const { primeiroNome, ultimoNome, email, senha, tipoUsuario, codSetor, genero, telefone, idFuncionario } = req.body;
    const codcli = 27995;

    if (!primeiroNome || !email || !senha || !tipoUsuario) {
        return res.status(400).json({ error: 'Nome, e-mail, senha e perfil são obrigatórios.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(senha, 10);

        await withDatabase(async (connection) => {
            const userExists = await connection.execute(
                `SELECT CODUSUARIO FROM BRAMV_USUARIOS WHERE EMAIL = :email AND CODCLI = :codcli`,
                { email, codcli }
            );

            if (userExists.rows && userExists.rows.length > 0) {
                throw new Error('Este e-mail já está em uso.');
            }

            const maxCodResult = await connection.execute(
                `SELECT NVL(MAX(CODUSUARIO), 0) + 1 AS NEXT_CODUSUARIO FROM BRAMV_USUARIOS`
            );
            if (!maxCodResult.rows || maxCodResult.rows.length === 0) {
                throw new Error('Não foi possível gerar um novo número de usuário.');
            }
            const nextCodUsuario = (maxCodResult.rows as any[])[0][0];

            await connection.execute(
                `INSERT INTO BRAMV_USUARIOS (
                    CODCLI, CODUSUARIO, PRIMEIRO_NOME, ULTIMO_NOME, EMAIL, SENHA, 
                    TIPOUSUARIO, CODSETOR, GENERO, TELEFONE, ID_FUNCIONARIO
                ) VALUES (
                    :codcli, :codusuario, :primeiro_nome, :ultimo_nome, :email, :senha, 
                    :tipoUsuario, :codSetor, :genero, :telefone, :idFuncionario
                )`,
                {
                    codcli,
                    codusuario: nextCodUsuario,
                    primeiro_nome: primeiroNome,
                    ultimo_nome: ultimoNome || '',
                    email,
                    senha: hashedPassword,
                    tipoUsuario,
                    codSetor: codSetor || null,
                    genero: genero || null,
                    telefone: telefone || null,
                    idFuncionario: idFuncionario || null
                },
                { autoCommit: true }
            );

            res.status(201).json({ success: true, message: 'Usuário criado com sucesso!' });
        });
    } catch (err: any) {
        if (err.message.includes('já está em uso')) {
            return res.status(409).json({ error: err.message });
        }
        console.error('ERRO AO CRIAR USUÁRIO:', err);
        res.status(500).json({ error: 'Erro interno ao criar o usuário.' });
    }
});

app.put('/api/usuarios/:codUsuario', async (req, res) => {
    const { codUsuario } = req.params;
    const { primeiroNome, ultimoNome, email, tipoUsuario, codSetor, genero, telefone, idFuncionario } = req.body;
    const codcli = 27995;

    if (!primeiroNome || !email || !tipoUsuario) {
        return res.status(400).json({ error: 'Nome, e-mail e perfil são obrigatórios.' });
    }

    try {
        await withDatabase(async (connection) => {
            const result = await connection.execute(
                `UPDATE BRAMV_USUARIOS SET
                    PRIMEIRO_NOME = :primeiroNome,
                    ULTIMO_NOME = :ultimoNome,
                    EMAIL = :email,
                    TIPOUSUARIO = :tipoUsuario,
                    CODSETOR = :codSetor,
                    GENERO = :genero,
                    TELEFONE = :telefone,
                    ID_FUNCIONARIO = :idFuncionario
                 WHERE CODUSUARIO = :codUsuario AND CODCLI = :codcli`,
                {
                    primeiroNome,
                    ultimoNome: ultimoNome || '',
                    email,
                    tipoUsuario,
                    codSetor: codSetor || null,
                    genero: genero || null,
                    telefone: telefone || null,
                    idFuncionario: idFuncionario || null,
                    codUsuario: Number(codUsuario),
                    codcli
                },
                { autoCommit: true }
            );

            if (result.rowsAffected === 0) {
                return res.status(404).json({ error: 'Usuário não encontrado.' });
            }

            res.status(200).json({ success: true, message: 'Usuário atualizado com sucesso.' });
        });
    } catch (err: any) {
        console.error(`ERRO AO ATUALIZAR USUÁRIO ${codUsuario}:`, err);
        if (err.errorNum === 1) {
            return res.status(409).json({ error: 'O e-mail fornecido já está em uso por outro usuário.' });
        }
        res.status(500).json({ error: 'Erro interno ao atualizar o usuário.' });
    }
});

app.delete('/api/usuarios/:codUsuario', async (req, res) => {
    const { codUsuario } = req.params;
    const codcli = 27995;

    try {
        await withDatabase(async (connection) => {
            const result = await connection.execute(
                `DELETE FROM BRAMV_USUARIOS WHERE CODUSUARIO = :codUsuario AND CODCLI = :codcli`,
                { codUsuario: Number(codUsuario), codcli },
                { autoCommit: true }
            );

            if (result.rowsAffected === 0) {
                return res.status(404).json({ error: 'Usuário não encontrado ou já foi excluído.' });
            }

            res.status(200).json({ success: true, message: 'Usuário excluído com sucesso.' });
        });
    } catch (err: any) {
        console.error(`ERRO AO EXCLUIR USUÁRIO ${codUsuario}:`, err);
        res.status(500).json({ error: 'Erro interno ao excluir o usuário.' });
    }
});

app.get('/api/setores', async (_req, res) => {
    try {
        const setores = await withDatabase(async (connection) => {
            const result = await connection.execute(
                `SELECT CODSETOR, DESCRICAO, SALDO FROM BRAMV_SETOR WHERE CODCLI = 27995 ORDER BY DESCRICAO`,
                [],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            return result.rows || [];
        });
        res.json(setores);
    } catch (err) {
        console.error('ERRO AO BUSCAR SETORES:', err);
        res.status(500).json({ error: 'Erro ao buscar setores.' });
    }
});

app.get('/api/setores/:codsetor/pedidos', async (req, res) => {
    const codsetor = req.params.codsetor;
    try {
        await withDatabase(async (connection) => {
            const query = `
                SELECT
                    pc.NUMPEDRCA,
                    pc.DATA,
                    u.PRIMEIRO_NOME || ' ' || u.ULTIMO_NOME AS SOLICITANTE,
                    (SELECT COUNT(*) FROM BRAMV_PEDIDOI pi_count WHERE pi_count.NUMPEDRCA = pc.NUMPEDRCA) AS QTD_ITENS,
                    (SELECT SUM(pi_sum.QT * pi_sum.PVENDA) FROM BRAMV_PEDIDOI pi_sum WHERE pi_sum.NUMPEDRCA = pc.NUMPEDRCA) AS VALOR_TOTAL
                FROM BRAMV_PEDIDOC pc
                JOIN BRAMV_USUARIOS u ON pc.CODUSUARIO = u.CODUSUARIO
                WHERE u.CODSETOR = :codsetor AND pc.STATUS = 1 -- Apenas pedidos com Status 1 (Aprovado)
                ORDER BY pc.DATA DESC
            `;

            const result = await connection.execute(query, { codsetor: Number(codsetor) }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
            res.status(200).json(result.rows || []);
        });
    } catch (err: any) {
        console.error(`ERRO AO BUSCAR PEDIDOS DO SETOR ${codsetor}:`, err);
        res.status(500).json({ error: 'Erro ao buscar pedidos do setor.' });
    }
});

app.get('/api/setores/:codsetor/historico', async (req, res) => {
    const codsetor = req.params.codsetor;
    try {
        await withDatabase(async (connection) => {
            const result = await connection.execute(
                `SELECT h.DATA_ALT, h.VALOR_ANT, h.NOVO_VALOR, u.PRIMEIRO_NOME
                 FROM BRAMV_SALDO_HISTORICO h
                 LEFT JOIN BRAMV_USUARIOS u ON h.ALT_CODUSUARIO = u.CODUSUARIO
                 WHERE h.CODSETOR = :codsetor ORDER BY h.DATA_ALT DESC`,
                { codsetor: Number(codsetor) },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            res.status(200).json(result.rows || []);
        });
    } catch (err: any) {
        console.error(`ERRO AO BUSCAR HISTÓRICO DO SETOR ${codsetor}:`, err);
        res.status(500).json({ error: 'Erro ao buscar histórico do setor.' });
    }
});

app.put('/api/setores/:codsetor/limite', async (req, res) => {
    const codsetor = req.params.codsetor;
    const { saldo, alteradoPorCodUsuario } = req.body;

    if (saldo === undefined || alteradoPorCodUsuario === undefined) {
        return res.status(400).json({ error: 'O novo limite (saldo) e o ID do utilizador são obrigatórios.' });
    }

    try {
        await withDatabase(async (connection) => {
            const oldSaldoResult = await connection.execute(
                `SELECT SALDO FROM BRAMV_SETOR WHERE CODSETOR = :codsetor`,
                { codsetor: Number(codsetor) },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (!oldSaldoResult.rows || oldSaldoResult.rows.length === 0) {
                return res.status(404).json({ error: 'Setor não encontrado.' });
            }
            const valorAnterior = (oldSaldoResult.rows[0] as { SALDO: number }).SALDO;

            await connection.execute(
                `UPDATE BRAMV_SETOR SET SALDO = :saldo WHERE CODSETOR = :codsetor`,
                { saldo: Number(saldo), codsetor: Number(codsetor) }
            );

            await connection.execute(
                `INSERT INTO BRAMV_SALDO_HISTORICO (CODSETOR, VALOR_ANT, NOVO_VALOR, ALT_CODUSUARIO)
                 VALUES (:codsetor, :valorAnterior, :novoValor, :alteradoPor)`,
                {
                    codsetor: Number(codsetor),
                    valorAnterior: valorAnterior,
                    novoValor: Number(saldo),
                    alteradoPor: alteradoPorCodUsuario
                }
            );

            await connection.commit();
            res.status(200).json({ success: true, message: 'Limite do setor atualizado com sucesso.' });
        });
    } catch (err: any) {
        console.error(`ERRO AO ATUALIZAR LIMITE DO SETOR ${codsetor}:`, err);
        res.status(500).json({ error: 'Erro interno ao atualizar o limite do setor.' });
    }
});

app.get('/api/pedidos/pendentes', async (_req, res) => {
    try {
        const pedidos = await withDatabase(async (connection) => {
            const result = await connection.execute(
                `WITH OrderTotals AS (
                    SELECT
                        NUMPEDRCA,
                        COUNT(CODPROD) AS QTD_ITENS,
                        SUM(QT * PVENDA) AS VALOR_TOTAL
                    FROM BRAMV_PEDIDOI
                    GROUP BY NUMPEDRCA
                )
                SELECT 
                    p.NUMPEDRCA, 
                    p.DATA, 
                    u.PRIMEIRO_NOME || ' ' || u.ULTIMO_NOME AS SOLICITANTE, 
                    s.DESCRICAO AS SETOR,
                    NVL(ot.QTD_ITENS, 0) AS QTD_ITENS,
                    NVL(ot.VALOR_TOTAL, 0) AS VALOR_TOTAL
                 FROM BRAMV_PEDIDOC p
                 LEFT JOIN BRAMV_USUARIOS u ON p.CODUSUARIO = u.CODUSUARIO
                 LEFT JOIN BRAMV_SETOR s ON u.CODSETOR = s.CODSETOR
                 LEFT JOIN OrderTotals ot ON p.NUMPEDRCA = ot.NUMPEDRCA
                 WHERE p.STATUS = 5
                 ORDER BY p.DATA DESC`,
                [],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            return (result.rows || []).map((p: any) => ({
                id: p.NUMPEDRCA,
                data: p.DATA,
                solicitante: p.SOLICITANTE,
                unidadeAdmin: p.SETOR || 'N/A',
                qtdItens: p.QTD_ITENS,
                valor: p.VALOR_TOTAL,
            }));
        });
        res.json(pedidos);
    } catch (err) {
        console.error('ERRO AO BUSCAR PEDIDOS PENDENTES:', err);
        res.status(500).json({ error: 'Erro ao buscar pedidos pendentes.' });
    }
});

app.get('/api/financeiro', async (_req, res) => {
    const codcli = 27995;
    try {
        await withDatabase(async (connection) => {
            const gastosPorSetorResult = await connection.execute(
                `SELECT 
                    s.CODSETOR, 
                    s.DESCRICAO, 
                    NVL(SUM(pi.QT * pi.PVENDA), 0) AS GASTO_TOTAL
                 FROM BRAMV_SETOR s
                 LEFT JOIN BRAMV_USUARIOS u ON s.CODSETOR = u.CODSETOR AND s.CODCLI = u.CODCLI
                 LEFT JOIN BRAMV_PEDIDOC pc ON u.CODUSUARIO = pc.CODUSUARIO AND pc.STATUS = 1 -- Apenas pedidos aprovados
                 LEFT JOIN BRAMV_PEDIDOI pi ON pc.NUMPEDRCA = pi.NUMPEDRCA
                 WHERE s.CODCLI = :codcli
                 GROUP BY s.CODSETOR, s.DESCRICAO
                 ORDER BY s.DESCRICAO`,
                { codcli },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const gastosPorSetor = gastosPorSetorResult.rows || [];
            res.status(200).json({ gastosPorSetor });
        });
    } catch (err: any) {
        console.error('ERRO AO BUSCAR DADOS FINANCEIROS:', err);
        res.status(500).json({ error: 'Erro ao buscar dados financeiros.' });
    }
});

console.log('--- [FASE 3 de 4] Todas as rotas registradas. Iniciando o servidor... ---');

app.listen(PORT, '0.0.0.0', () => {
    console.log('--- [FASE 4 de 4] SERVIDOR INICIADO E ESCUTANDO! ---');
    console.log(`API Server rodando em http://localhost:${PORT}`);
});
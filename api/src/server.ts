import express from 'express';
import oracledb from 'oracledb';
import cors from 'cors';
import 'dotenv/config';

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
        const maxPedResult = await connection.execute<{ NEXT_ID: number }>(
             `SELECT NVL(MAX(NUMPEDRCA), 0) + 1 AS NEXT_ID FROM BRAMV_PEDIDOC`
        );
        const newNumpedrca = (maxPedResult.rows![0] as any).NEXT_ID;

        await connection.execute(
            `INSERT INTO BRAMV_PEDIDOC (NUMPEDRCA, CODUSUARIO, STATUS, DATA) VALUES (:numpedrca, :codUsuario, 0, SYSDATE)`,
            { numpedrca: newNumpedrca, codUsuario: codUsuario },
        );
        return newNumpedrca;
    }
};

console.log('--- [FASE 2 de 4] Funções e configurações carregadas. Registrando rotas... ---');

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

app.get('/api/carrinho/:codusuario', async (req, res) => {
    const { codusuario } = req.params;
    try {
        const items = await withDatabase(async (connection) => {
            const result = await connection.execute(
                `SELECT i.CODPROD as id, p.DESCRICAO as nome, p.EMBALAGEM as descricao, i.PVENDA as preco, i.QT as quantidade, 'https://placehold.co/100x100/E2E8F0/4A5568?text=' || p.CODPROD AS imgUrl, p.UNIDADE as unit
                 FROM BRAMV_PEDIDOI i
                 JOIN BRAMV_PEDIDOC c ON i.NUMPEDRCA = c.NUMPEDRCA
                 JOIN PCPRODUT p ON i.CODPROD = p.CODPROD
                 WHERE c.CODUSUARIO = :codusuario AND c.STATUS = 0`,
                [codusuario], { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            return result.rows || [];
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
            const existingItem = await connection.execute(`SELECT QT FROM BRAMV_PEDIDOI WHERE NUMPEDRCA = :numpedrca AND CODPROD = :codprod`, [numpedrca, codprod]);

            if (existingItem.rows && existingItem.rows.length > 0) {
                await connection.execute(`UPDATE BRAMV_PEDIDOI SET QT = QT + :qt WHERE NUMPEDRCA = :numpedrca AND CODPROD = :codprod`, { qt, numpedrca, codprod });
            } else {
                await connection.execute(`INSERT INTO BRAMV_PEDIDOI (NUMPEDRCA, CODPROD, QT, PVENDA) VALUES (:numpedrca, :codprod, :qt, :pvenda)`, { numpedrca, codprod, qt, pvenda });
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
            await connection.execute(
                `UPDATE BRAMV_PEDIDOI SET QT = :qt WHERE NUMPEDRCA = :numpedrca AND CODPROD = :codprod`, 
                { qt, numpedrca, codprod }, 
                { autoCommit: true } 
            );
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
            await connection.execute(
                `DELETE FROM BRAMV_PEDIDOI WHERE NUMPEDRCA = :numpedrca AND CODPROD = :codprod`, 
                { numpedrca, codprod }, 
                { autoCommit: true }
            );
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
            await connection.execute(
                `UPDATE BRAMV_PEDIDOC SET STATUS = 5 WHERE CODUSUARIO = :codusuario AND STATUS = 0`,
                [codusuario],
                { autoCommit: true }
            );
        });
        res.status(200).json({ success: true, message: `Pedido enviado para aprovação.` });
    } catch (err: any) {
        console.error("Erro ao submeter carrinho:", err);
        res.status(500).json({ error: 'Erro ao submeter o pedido.' });
    }
});

app.get('/api/usuarios', async (_req, res) => {
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
    const { 
        email, senha, tipousuario, codsetor, 
        primeiroNome, ultimoNome, genero, idFuncionario, telefone 
    } = req.body;

    if (tipousuario === 3 && !codsetor) {
        return res.status(400).json({ error: 'O campo Setor é obrigatório para Solicitantes.' });
    }

    try {
        const result = await withDatabase(async (connection) => {
            const maxUserResult = await connection.execute<{ NEXT_ID: number }>(
                `SELECT NVL(MAX(CODUSUARIO), 0) + 1 AS NEXT_ID FROM BRAMV_USUARIOS`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            if (!maxUserResult.rows || maxUserResult.rows.length === 0 || maxUserResult.rows[0] === undefined) {
                throw new Error('Não foi possível obter o próximo ID de usuário.');
            }
            const nextUserId = (maxUserResult.rows[0] as { NEXT_ID: number }).NEXT_ID;

            await connection.execute(
                `INSERT INTO BRAMV_USUARIOS (
                    CODCLI, CODUSUARIO, EMAIL, SENHA, TIPOUSUARIO, CODSETOR, 
                    PRIMEIRO_NOME, ULTIMO_NOME, GENERO, ID_FUNCIONARIO, TELEFONE
                 ) VALUES (
                    :codcli, :codusuario, :email, :senha, :tipousuario, :codsetor, 
                    :primeiroNome, :ultimoNome, :genero, :idFuncionario, :telefone
                 )`,
                { 
                    codcli: 27995, 
                    codusuario: nextUserId, 
                    email, senha, tipousuario, 
                    codsetor: tipousuario === 3 ? codsetor : null, 
                    primeiroNome, ultimoNome, genero, idFuncionario, telefone 
                },
                { autoCommit: true }
            );
            return { codusuario: nextUserId, email };
        });
        res.status(201).json({ success: true, message: 'Usuário criado com sucesso!', user: result });
    } catch (err) {
        console.error('ERRO AO CRIAR USUÁRIO:', err);
        res.status(500).json({ error: 'Erro ao criar usuário.' });
    }
});

app.get('/api/setores', async (_req, res) => {
    try {
        const setores = await withDatabase(async (connection) => {
            const result = await connection.execute(
                `SELECT CODSETOR, DESCRICAO FROM BRAMV_SETOR WHERE CODCLI = 27995 ORDER BY DESCRICAO`,
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

console.log('--- [FASE 3 de 4] Todas as rotas registradas. Iniciando o servidor... ---');

app.listen(PORT, '0.0.0.0', () => {
  console.log('--- [FASE 4 de 4] SERVIDOR INICIADO E ESCUTANDO! ---');
  console.log(`API Server rodando em http://localhost:${PORT}`);
});
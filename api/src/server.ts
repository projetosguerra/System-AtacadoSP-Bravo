import express from 'express';
import oracledb from 'oracledb';
import cors from 'cors'; // Importa o CORS
import 'dotenv/config';

oracledb.initOracleClient(); 

const app = express();
const PORT = 4000;

app.use(cors());

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT_STRING
};

app.get('/api/produtos', async (_req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    console.log('Conexão com o Oracle DB bem-sucedida!');

    const result = await connection.execute(
      `SELECT DISTINCT P.CODPROD, P.CODAUXILIAR, F.ESPECIFICACAO AS DESCRICAO_PADRAO, P.PRECO
       FROM PCPRODUT P, PCMARCA M, PCCATEGORIA CAT, PCSUBCATEGORIA SUB, PCCONTRATO C, PCCONTRATOI I, PCCLIENT CLI
       WHERE CLI.CODCLI = 27995
       AND C.CODCLI = CLI.CODCLI
       AND I.CODCONTRATO = C.CODCONTRATO
       AND P.CODPROD = I.CODPROD
       AND P.CODMARCA = M.CODMARCA
       AND P.CODCATEGORIA = CAT.CODCATEGORIA(+)
       AND P.CODSUBCATEGORIA = SUB.CODSUBCATEGORIA(+)
       AND TRUNC(C.DTVENCIMENTO) >= TRUNC(SYSDATE)
       ORDER BY P.CODPROD`
    );

    if (result.rows) {
      const produtos = (result.rows as any[][]).map((row) => {
        return {
          id: row[0],
          codigoAuxiliar: row[1],
          nome: row[2],
          preco: row[3],
          imageUrl: `https://placehold.co/300x200/eeeeee/333333?text=Produto+${row[0]}`, // Placeholder
          unit: 'UN' // Placeholder
        };
      });
      res.json(produtos);
    } else {
      res.json([]);
    }

  } catch (err) {
    console.error('Erro:', err);
    res.status(500).json({ error: 'Erro ao buscar produtos do banco de dados.' });
  } finally {
    if (connection) {
      try {
        await connection.close();
        console.log('Conexão fechada.');
      } catch (err) {
        console.error('Erro ao fechar conexão:', err);
      }
    }
  }
});

app.listen(PORT, () => {
  console.log(`API Server rodando em http://localhost:${PORT}`);
});
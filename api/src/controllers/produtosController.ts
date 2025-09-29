import oracledb from 'oracledb';
import { withConnection } from '../db/pool.js';

export const listarProdutos = async (_req: any, res: any) => {
  try {
    const produtos = await withConnection(async (connection) => {
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
      return (result.rows as any[][]).map((row) => ({
        id: row[0],
        codigoAuxiliar: row[1],
        nome: row[2],
        preco: row[3],
        unit: row[4],
        descricao: `Descrição para ${row[2]}`,
        imgUrl: `https://placehold.co/300x200/eeeeee/333333?text=Produto+${row[0]}`
      }));
    });
    res.json(produtos);
  } catch (err) {
    console.error('ERRO AO BUSCAR PRODUTOS:', err);
    res.status(500).json({ error: 'Erro ao buscar produtos do banco de dados.' });
  }
};
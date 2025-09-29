import oracledb from 'oracledb';
import { withConnection } from '../db/pool.js';

export const obterFinanceiro = async (_req: any, res: any) => {
  const codcli = 27995;
  try {
    await withConnection(async (connection) => {
      const gastosPorSetorResult = await connection.execute(
        `SELECT 
          s.CODSETOR, 
          s.DESCRICAO, 
          NVL(SUM(pi.QT * pi.PVENDA), 0) AS GASTO_TOTAL
         FROM BRAMV_SETOR s
         LEFT JOIN BRAMV_USUARIOS u ON s.CODSETOR = u.CODSETOR AND s.CODCLI = u.CODCLI
         LEFT JOIN BRAMV_PEDIDOC pc ON u.CODUSUARIO = pc.CODUSUARIO AND pc.STATUS = 1
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
};
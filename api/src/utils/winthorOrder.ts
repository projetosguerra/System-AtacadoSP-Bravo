import oracledb from 'oracledb';

export async function resolveCodUsurForClient(
    connection: oracledb.Connection,
    codCli?: number
): Promise<number> {
    const cli = Number(codCli ?? process.env.CODCLI ?? 27995);

    const r = await connection.execute(
        `SELECT NVL(CODUSUR2, CODUSUR1) AS CODUSUR
            FROM PCCLIENT
            WHERE CODCLI = :codCli`,
        { codCli: cli },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const row: any = r.rows?.[0];
    const codUsur = Number(row?.CODUSUR);
    if (!codUsur || Number.isNaN(codUsur)) {
        throw new Error(`CODUSUR não encontrado para CODCLI=${cli}`);
    }
    return codUsur;
}

export async function reserveNextWinthorOrderNumber(
  connection: oracledb.Connection,
  codUsur: number
): Promise<number> {
  const sel = await connection.execute(
    `SELECT NVL(PROXNUMPEDFORCA, 1) AS PROX
       FROM PCUSUARI
      WHERE CODUSUR = :cod
        FOR UPDATE`,
    { cod: codUsur },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const row: any = sel.rows?.[0];
  if (!row) throw new Error(`PCUSUARI não possui linha para CODUSUR=${codUsur}`);

  const currentNext = Number(row.PROX || row.PROXNUMPEDFORCA || 1);
  const newNext = currentNext + 1;

  await connection.execute(
    `UPDATE PCUSUARI
        SET PROXNUMPEDFORCA = :newNext
      WHERE CODUSUR = :cod`,
    { newNext, cod: codUsur }
  );

  // NÃO dar commit aqui. Caller decide.
  return currentNext;
}
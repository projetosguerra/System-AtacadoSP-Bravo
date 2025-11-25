import React from 'react';

interface Alteracao {
  codProd: number;
  acao: 'ADICIONADO'|'REMOVIDO'|'ALTERADO';
  quantidadeAnterior?: number;
  quantidadeNova: number;
  precoUnit: number;
}

interface Props {
  eventos: { tipo: string; detalheJson?: string | null; data: string }[];
}

export const EdicaoResumo: React.FC<Props> = ({ eventos }) => {
  const edicoes = eventos
    .filter(e => e.tipo === 'EDITACAO_PEDIDO')
    .map(e => {
      try {
        return { data: e.data, ...JSON.parse(String(e.detalheJson || '{}')) };
      } catch { return null; }
    })
    .filter(Boolean) as Array<{ data: string; motivo: string; alteracoes: Alteracao[]; totalAnterior: number; totalNovo: number }>;

  if (edicoes.length === 0) return null;
  const ultima = edicoes[edicoes.length - 1];

  return (
    <div className="space-y-2 p-3 rounded border border-blue-200 bg-blue-50 text-xs">
      <div className="font-semibold text-blue-800">Última edição ({new Date(ultima.data).toLocaleString('pt-BR')})</div>
      <div className="text-blue-700">Motivo: {ultima.motivo}</div>
      <div className="text-blue-700">
        Valor: {fmtBRL(ultima.totalAnterior)} → {fmtBRL(ultima.totalNovo)}
      </div>
      <table className="w-full text-[10px] mt-2">
        <thead>
          <tr className="text-blue-700">
            <th className="text-left">Produto</th>
            <th className="text-left">Ação</th>
            <th className="text-right">Qt Ant</th>
            <th className="text-right">Qt Nova</th>
            <th className="text-right">Preço</th>
          </tr>
        </thead>
        <tbody>
          {ultima.alteracoes.map((a,i) => (
            <tr key={i}>
              <td>{a.codProd}</td>
              <td>{a.acao}</td>
              <td className="text-right">{a.quantidadeAnterior ?? '-'}</td>
              <td className="text-right">{a.quantidadeNova}</td>
              <td className="text-right">{fmtBRL(a.precoUnit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR',{ style:'currency', currency:'BRL'}).format(v);
}
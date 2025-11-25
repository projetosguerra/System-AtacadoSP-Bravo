import React, { useEffect, useState, useMemo } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { fetchPedidoDetalhe, fetchPedidoFinanceiro, fetchPedidoTransportadora } from '../api/pedidos';
import { PedidoDetalhe } from '../types/pedidos';
import PedidoTimeline from './PedidoTimeline';
import { EdicaoResumo } from './EdicaoResumo';

interface OrderDetailsModalProps {
  open: boolean;
  pedidoId: number | null;
  onClose: () => void;
}

const statusLabelFallback: Record<number, string> = {
  1: 'Aprovado',
  2: 'Reprovado',
  3: 'Em Análise',
  5: 'Pendente',
  9: 'Arquivado'
};

function formatDateTime(dt?: string) {
  if (!dt) return { date: '-', time: '-' };
  const d = new Date(dt);
  if (isNaN(d.getTime())) return { date: '-', time: '-' };
  return {
    date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  };
}
function formatCurrency(v?: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));
}

// Helper para resolver URL de imagem dos itens do pedido
const isPlaceholder = (u?: string) => !!u && /placehold|placeholder|text=Produto/i.test(u);
const buildPedidoImgUrl = (item: any) => {
  const original = item?.imgUrl as string | undefined;
  if (original && !isPlaceholder(original)) return original;
  const code = item?.codProd ?? item?.codigoAuxiliar ?? item?.id;
  return code ? `/api/media/produtos/${code}.JPG` : (original ?? '');
};
const onImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>, item: any) => {
  const el = e.currentTarget;
  // Evita loop infinito
  if (el.dataset.fallbackDone === '1') return;
  el.dataset.fallbackDone = '1';
  // Tenta com codigoAuxiliar se existir, senão usa um placeholder visual
  const altCode = item?.codigoAuxiliar ?? item?.codProd;
  el.src = altCode ? `/api/media/produtos/${altCode}.JPG` : `https://placehold.co/56x56?text=${encodeURIComponent('Produto')}`;
};

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ open, pedidoId, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [data, setData] = useState<PedidoDetalhe | null>(null);
  const [financeiro, setFinanceiro] = useState<any | null>(null);
  const [transportadora, setTransportadora] = useState<any | null>(null);

  useEffect(() => {
    if (!open || pedidoId == null) {
      setData(null);
      setErro(null);
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    setErro(null);
    fetchPedidoDetalhe(pedidoId, ac.signal)
      .then((d: React.SetStateAction<PedidoDetalhe | null>) => setData(d))
      .catch((e: { message: React.SetStateAction<string | null>; }) => { if (!ac.signal.aborted) setErro(e.message); })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
  }, [open, pedidoId]);

  useEffect(() => {
    if (!open || pedidoId == null) {
      setFinanceiro(null);
      setTransportadora(null);
      return;
    }
    const ac2 = new AbortController();
    setFinanceiro(null);
    setTransportadora(null);

    (async () => {
      try {
        const fin = await fetchPedidoFinanceiro(pedidoId, ac2.signal);
        setFinanceiro(fin);
      } catch (e: any) {
        console.warn('[Modal] erro ao carregar financeiro:', e?.message || e);
        setFinanceiro(null);
      }

      try {
        const tr = await fetchPedidoTransportadora(pedidoId, ac2.signal);
        setTransportadora(tr?.transportadora ?? tr ?? null);
      } catch (e: any) {
        console.warn('[Modal] erro ao carregar transportadora:', e?.message || e);
        setTransportadora(null);
      }
    })();

    return () => {
      ac2.abort();
    };
  }, [open, pedidoId]);

  const somaLocal = useMemo(() => {
    if (!data?.itens) return 0;
    return (data.itens as any[]).reduce((sum, it) => sum + Number(it.subtotal || 0), 0);
  }, [data?.itens]);

  if (!open) return null;

  const dt = formatDateTime(data?.data);
  const statusText = data?.statusLabel || (data ? statusLabelFallback[data.status] : '');
  const divergencia = data && Math.abs(Number(data.valorTotal) - somaLocal) > 0.009;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-5xl rounded-lg shadow-xl z-10 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">
            {data ? `Detalhes do Pedido #${data.id}` : (pedidoId !== null ? `Pedido #${pedidoId}` : 'Detalhes do Pedido')}
          </h3>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100" aria-label="Fechar">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {loading && (
            <div className="text-sm text-gray-600 animate-pulse">Carregando detalhes...</div>
          )}
          {erro && !loading && (
            <div className="text-sm text-red-600">Erro: {erro}</div>
          )}
          {!loading && !erro && data && (
            <>
              {/* Header */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-gray-500">Data</div>
                  <div className="font-medium">{dt.date}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Horário</div>
                  <div className="font-medium">{dt.time}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Status</div>
                  <div className="font-medium">{statusText}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Solicitante</div>
                  <div className="font-medium truncate" title={data.solicitante?.nome}>{data.solicitante?.nome || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Unidade Administrativa</div>
                  <div className="font-medium truncate" title={data.unidadeAdmin}>{data.unidadeAdmin || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Valor Total (servidor)</div>
                  <div className="font-medium">{formatCurrency(data.valorTotal)}</div>
                </div>
              </div>

              {/* Mostrar motivo de reprovação se houver */}
              {data.status === 2 && data.reprovacaoMotivo && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-800">
                  <strong>Motivo da reprovação:</strong> {data.reprovacaoMotivo}
                </div>
              )}

              {/* Aprovação / aprovador */}
              {data.aprovador && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-800">Aprovador</h4>
                  <div className="text-sm text-gray-700">
                    <div>Aprovado por: <span className="font-medium">{data.aprovador.nome}</span> ({data.aprovador.email})</div>
                    {data.aprovador.perfil && <div className="text-xs text-gray-500">Perfil: {data.aprovador.perfil}</div>}
                  </div>
                </div>
              )}

              {/* Divergência (se existir) */}
              {divergencia && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
                  <AlertTriangle className="w-4 h-4 mt-0.5" />
                  <div>
                    Diferença entre valorTotal do servidor ({formatCurrency(data.valorTotal)}) e soma local ({formatCurrency(somaLocal)}).
                    Recalcular será necessário ao editar itens. (Tolerância ±0,01)
                  </div>
                </div>
              )}

              <EdicaoResumo eventos={data.eventos} />

              {/* Itens */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800">Itens ({data.itens.length})</h4>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Produto</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Unidade</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">Qtd</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">Preço Unit.</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.itens.map(it => (
                        <tr key={it.codProd} className="border-t last:border-b">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-3">
                              <img
                                src={buildPedidoImgUrl(it)}
                                onError={(e) => onImgError(e, it)}
                                alt={it.nome}
                                className="w-14 h-14 object-cover rounded border border-gray-200 bg-white"
                                loading="lazy"
                              />
                              <div className="min-w-0">
                                <div className="font-medium truncate" title={it.nome}>{it.nome}</div>
                                <div className="text-xs text-gray-500">
                                  Código: {it.codProd} | Aux: {it.codigoAuxiliar ?? '—'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-gray-700">{it.unidade}</td>
                          <td className="px-3 py-2 text-right">{it.qt}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(it.precoUnit)}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(it.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50">
                        <td colSpan={4} className="px-3 py-2 text-right font-medium">Total (calculado)</td>
                        <td className="px-3 py-2 text-right font-semibold">{formatCurrency(somaLocal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {data.itens.map(it => (
                    <div key={it.codProd} className="border border-gray-200 rounded-lg p-3 flex gap-3">
                      <img
                        src={buildPedidoImgUrl(it)}
                        onError={(e) => onImgError(e, it)}
                        alt={it.nome}
                        className="w-16 h-16 object-cover rounded border border-gray-200 bg-white"
                        loading="lazy"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate" title={it.nome}>{it.nome}</div>
                        <div className="text-xs text-gray-500 truncate">
                          Código {it.codProd} • Aux {it.codigoAuxiliar ?? '—'}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs">
                          <span className="px-2 py-0.5 bg-gray-100 rounded">{it.unidade}</span>
                          <span className="px-2 py-0.5 bg-gray-100 rounded">Qtd {it.qt}</span>
                          <span className="px-2 py-0.5 bg-gray-100 rounded">Unit {formatCurrency(it.precoUnit)}</span>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                            {formatCurrency(it.subtotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="text-right text-sm font-semibold">
                    Total (calculado): {formatCurrency(somaLocal)}
                  </div>
                </div>
              </div>

              {/* Transportadora */}
              {transportadora && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800">Transportadora</h4>
                  <div className="text-sm text-gray-700 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-gray-500">Transportadora</div>
                      <div className="font-medium">{transportadora.transportadora ?? transportadora.FORNECEDOR ?? '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Frete</div>
                      <div className="font-medium">{formatCurrency(transportadora.vlFrete ?? transportadora.VLFRETE ?? 0)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Entrega prevista</div>
                      <div className="font-medium">{transportadora.dtEntrega ? new Date(transportadora.dtEntrega).toLocaleDateString('pt-BR') : (transportadora.DTENTREGA ? new Date(transportadora.DTENTREGA).toLocaleDateString('pt-BR') : '-')}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Nota / Trans. Venda</div>
                      <div className="font-medium">
                        {transportadora.numNota ?? transportadora.NUMNOTA ?? transportadora.numTransVenda ?? transportadora.NUMTRANSVENDA ?? '-'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Financeiro */}
              {financeiro && Array.isArray(financeiro.parcelas) && financeiro.parcelas.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800">Financeiro</h4>
                  <div className="overflow-x-auto border rounded">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Parcela</th>
                          <th className="px-3 py-2 text-left">Nota Fiscal</th>
                          <th className="px-3 py-2 text-left">Emissão</th>
                          <th className="px-3 py-2 text-left">Vencimento</th>
                          <th className="px-3 py-2 text-right">Valor</th>
                          <th className="px-3 py-2 text-right">Pago</th>
                          <th className="px-3 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {financeiro.parcelas.map((p: any, idx: number) => (
                          <tr key={p.parcela ?? p.notaFiscal ?? idx} className="border-t">
                            <td className="px-3 py-2 text-left">{p.parcela}</td>
                            <td className="px-3 py-2 text-left">{p.notaFiscal ?? p.NOTA_FISCAL ?? '-'}</td>
                            <td className="px-3 py-2 text-left">{p.dtEmissao ? new Date(p.dtEmissao).toLocaleDateString('pt-BR') : (p.DTEMISSAO ? new Date(p.DTEMISSAO).toLocaleDateString('pt-BR') : '-')}</td>
                            <td className="px-3 py-2 text-left">{p.dtVencimento ? new Date(p.dtVencimento).toLocaleDateString('pt-BR') : (p.DTVENC ? new Date(p.DTVENC).toLocaleDateString('pt-BR') : '-')}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(p.valor ?? p.VALOR ?? 0)}</td>
                            <td className="px-3 py-2 text-right">{p.valorPago ? formatCurrency(p.valorPago ?? p.VALORPAGO ?? 0) : '-'}</td>
                            <td className="px-3 py-2 text-left">{p.status ?? p.STATUS ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Concatenação e Eventos */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800">Concatenação</h4>
                {data.concatRole === 'RESULTADO' && data.concatOrigens.length > 0 && (
                  <div className="text-sm text-gray-700">
                    Resultado de concatenação. Origens:
                    <ul className="list-disc pl-5 mt-1 space-y-0.5">
                      {data.concatOrigens.map(o => (
                        <li key={o.id}>
                          Pedido #{o.id} — {o.statusLabel}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {data.concatRole === 'ORIGEM' && data.concatResultado && (
                  <div className="text-sm text-gray-700">
                    Origem concatenada. Pedido resultado: #{data.concatResultado.id} — {data.concatResultado.statusLabel}
                  </div>
                )}
                {!data.concatRole && (
                  <div className="text-sm text-gray-500">Sem concatenação.</div>
                )}
              </div>

              {data.aprovador && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-800">Aprovação</h4>
                  <div className="text-sm text-gray-700">
                    Aprovado por: <span className="font-medium">{data.aprovador.nome}</span> ({data.aprovador.email})
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800">Eventos</h4>
                <PedidoTimeline eventos={data.eventos} />
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
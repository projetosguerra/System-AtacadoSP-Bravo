import React from 'react';
import { Clock, CheckCircle2, XCircle, RefreshCcw, FilePlus, Layers, Truck, PackageCheck, ClipboardCheck, MessageCircle } from 'lucide-react';
import { PedidoEvento } from '../types/pedidos';

interface PedidoTimelineProps {
  eventos: PedidoEvento[];
}

function safeParse(json: string | null): any {
  if (!json) return null;
  try { return JSON.parse(json); } catch { return null; }
}

function mapTipo(tipo: string) {
  const t = String(tipo || '').toUpperCase();
  switch (t) {
    case 'CRIACAO':             return { label: 'Solicitado',           icon: FilePlus,      color: 'text-gray-700',   bg: 'bg-gray-100'  };
    case 'STATUS_CHANGE':       return { label: 'Mudança de Status',    icon: RefreshCcw,    color: 'text-blue-700',   bg: 'bg-blue-50'   };
    case 'APROVACAO':           return { label: 'Aprovado',             icon: CheckCircle2,  color: 'text-green-700',  bg: 'bg-green-50'  };
    case 'REPROVACAO':          return { label: 'Reprovado',            icon: XCircle,       color: 'text-red-700',    bg: 'bg-red-50'    };
    case 'CONCAT_RESULTADO':    return { label: 'Concat (Resultado)',   icon: Layers,        color: 'text-indigo-700', bg: 'bg-indigo-50' };
    case 'CONCAT_ORIGEM':       return { label: 'Concat (Origem)',      icon: Layers,        color: 'text-purple-700', bg: 'bg-purple-50' };
    case 'EM_SEPARACAO':        return { label: 'Em separação',         icon: PackageCheck,  color: 'text-amber-700',  bg: 'bg-amber-50'  };
    case 'FATURADO':            return { label: 'Faturado',             icon: ClipboardCheck,color: 'text-teal-700',   bg: 'bg-teal-50'   };
    case 'EM_TRANSPORTE':       return { label: 'Em transporte',        icon: Truck,         color: 'text-sky-700',    bg: 'bg-sky-50'    };
    case 'ENTREGUE':            return { label: 'Entregue',             icon: CheckCircle2,  color: 'text-green-700',  bg: 'bg-green-50'  };
    case 'ATESTE_RECEBIMENTO':  return { label: 'Atestado',             icon: CheckCircle2,  color: 'text-green-700',  bg: 'bg-green-50'  };
    case 'PESQUISA_SATISFACAO': return { label: 'Pesquisa de satisfação', icon: MessageCircle, color: 'text-blue-700', bg: 'bg-blue-50'   };
    case 'CONTESTE_ABERTO':     return { label: 'Contestação aberta',   icon: MessageCircle, color: 'text-yellow-700', bg: 'bg-yellow-50' };
    case 'CONTESTE_DEFERIDO':   return { label: 'Contestação deferida', icon: CheckCircle2,  color: 'text-green-700',  bg: 'bg-green-50'  };
    case 'CONTESTE_INDEFERIDO': return { label: 'Contestação indeferida', icon: XCircle,    color: 'text-red-700',    bg: 'bg-red-50'    };
    case 'EDITACAO_PEDIDO':     return { label: 'Edição do pedido',     icon: Clock,         color: 'text-gray-600',   bg: 'bg-gray-100'  };  
    default:                    return { label: tipo,                   icon: Clock,         color: 'text-gray-600',   bg: 'bg-gray-100'  };
  }
}

function formatData(d?: string) {
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '-';
  return dt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const PedidoTimeline: React.FC<PedidoTimelineProps> = ({ eventos }) => {
  if (!eventos || eventos.length === 0) {
    return <div className="text-sm text-gray-500">Nenhum evento registrado.</div>;
  }

  return (
    <ol className="space-y-3">
      {eventos.map(ev => {
        const meta = mapTipo(ev.tipo);
        const detalhe = safeParse(ev.detalheJson);
        const Icon = meta.icon as any;
        const usuarioNome = (ev as any).usuarioNome || null;

        return (
          <li key={ev.idEvento} className="flex items-start gap-3">
            <div className={`p-2 rounded-md ${meta.bg}`}>
              <Icon className={`w-4 h-4 ${meta.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-800">{meta.label}</div>
              <div className="text-xs text-gray-500">
                {formatData(ev.data)} • Usuário: {usuarioNome || ev.usuarioId || '—'}
              </div>
              {detalhe && (
                <div className="mt-1 text-xs text-gray-600 space-y-0.5">
                  {detalhe.from !== undefined && detalhe.to !== undefined && (
                    <div>Status: {detalhe.from} → {detalhe.to}</div>
                  )}
                  {detalhe.qtdItens !== undefined && (
                    <div>Itens: {detalhe.qtdItens} • Total: R$ {Number(detalhe.valorTotal || 0).toFixed(2)}</div>
                  )}
                  {detalhe.frete !== undefined && (
                    <div>Frete: R$ {Number(detalhe.frete || 0).toFixed(2)}</div>
                  )}
                  {detalhe.motivo && (
                    <div className="text-red-700 font-medium">Motivo: {detalhe.motivo}</div>
                  )}
                  {detalhe.comentario && (
                    <div>Comentário: {detalhe.comentario}</div>
                  )}
                  {detalhe.recebidoOk !== undefined && (
                    <div>Ateste: {detalhe.recebidoOk ? 'Recebido OK' : 'Com divergências'}</div>
                  )}
                  {detalhe.rating !== undefined && (
                    <div>Nota de satisfação: {detalhe.rating}/5</div>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default PedidoTimeline;
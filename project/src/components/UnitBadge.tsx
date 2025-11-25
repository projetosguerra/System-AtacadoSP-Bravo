import React from 'react';
import { Building2 } from 'lucide-react';

interface UnitBadgeProps {
  codSetor?: string | number;
  descricao?: string;
  saldo?: number;
  limite?: number;
  centroCusto?: string;
  compact?: boolean;
  showFinancial?: boolean;
  loading?: boolean;
}

function formatBRL(n?: number) {
  if (n == null || isNaN(n)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

export const UnitBadge: React.FC<UnitBadgeProps> = ({
  codSetor,
  descricao,
  saldo,
  limite,
  centroCusto,
  compact,
  showFinancial,
  loading
}) => {
  if (loading) {
    return (
      <div className={`animate-pulse rounded-md border border-gray-200 ${compact ? 'px-3 py-2' : 'px-4 py-3'} bg-gray-50 text-xs text-gray-400`}>
        Carregando unidade…
      </div>
    );
  }

  if (!codSetor && !descricao) {
    return (
      <div className={`rounded-md border border-dashed border-gray-300 ${compact ? 'px-3 py-2' : 'px-4 py-3'} bg-white text-xs text-gray-400`}>
        Unidade não definida
      </div>
    );
  }

  const hasFinancial = showFinancial && (saldo != null || limite != null);

  return (
    <div
      className={`group relative flex flex-col ${compact ? 'px-3 py-2' : 'px-4 py-3'} rounded-md border border-gray-200 bg-white shadow-sm`}
    >
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-gray-500" />
        <span className="font-semibold text-gray-800 text-sm">{codSetor || 'UNID.'}</span>
      </div>
      {!compact && (
        <div className="mt-1 text-xs text-gray-600 leading-snug line-clamp-2">
          {descricao}
        </div>
      )}
      {hasFinancial && (
        <div className="mt-2 flex flex-wrap gap-2">
          {saldo != null && (
            <span className="text-[11px] px-2 py-1 rounded bg-green-50 text-green-700 border border-green-100">
              Saldo: {formatBRL(saldo)}
            </span>
          )}
          {limite != null && (
            <span className="text-[11px] px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-100">
              Limite: {formatBRL(limite)}
            </span>
          )}
          {centroCusto && (
            <span className="text-[11px] px-2 py-1 rounded bg-violet-50 text-violet-700 border border-violet-100">
              CC: {centroCusto}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
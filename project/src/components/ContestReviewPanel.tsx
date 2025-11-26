import React, { useState } from 'react';
import { analyzeConteste } from '../api/conteste';
import { useAuth } from '../context/AuthContext';

interface Props {
  conteste: {
    id: number;
    status: number;
    justificativa: string;
    motivoReprovacao?: string | null;
    parecer?: string | null;
  };
  pedidoId: number;
  onDone: () => void;
}

const ContestReviewPanel: React.FC<Props> = ({ conteste, onDone }) => {
  const { token, user } = useAuth();
  const [parecer, setParecer] = useState('');
  const [reenviar, setReenviar] = useState(true);
  const [loading, setLoading] = useState<'DEF'|'IND'|null>(null);
  const [error, setError] = useState<string|null>(null);

  const perfilUp = String(user?.perfil || '').toUpperCase();
  const isAprovador = perfilUp === 'APROVADOR' || perfilUp === 'ADMIN' || [1,2].includes(Number(user?.tipoUsuario));

  if (!isAprovador) return null;
  if (![1,2].includes(conteste.status)) return null;

  async function handle(decisao: 'DEFERIDO'|'INDEFERIDO') {
    setLoading(decisao === 'DEFERIDO' ? 'DEF' : 'IND');
    setError(null);
    try {
      await analyzeConteste(conteste.id, decisao, parecer.trim(), decisao === 'DEFERIDO' ? reenviar : false, token || undefined);
      onDone();
    } catch (e: any) {
      setError(e?.message || 'Falha ao enviar decisão.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="border rounded-md p-4 space-y-3 bg-white">
      <h4 className="font-semibold text-gray-800 text-sm">Contestação do solicitante</h4>
      <div className="text-xs text-gray-600">
        <strong>Justificativa:</strong> {conteste.justificativa}
      </div>
      {conteste.motivoReprovacao && (
        <div className="text-xs text-gray-600">
          <strong>Motivo original da reprovação:</strong> {conteste.motivoReprovacao}
        </div>
      )}

      <div className="space-y-2 pt-2">
        <label className="text-xs font-medium">Parecer do aprovador *</label>
        <textarea
          rows={3}
          value={parecer}
          onChange={(e) => setParecer(e.target.value)}
          className="w-full border rounded px-2 py-1 text-xs"
          placeholder="Responda a contestação (mín. 5 caracteres)..."
        />
        {parecer.trim().length > 0 && parecer.trim().length < 5 && (
          <p className="text-[11px] text-red-600">Escreva ao menos 5 caracteres.</p>
        )}
      </div>

      {loading === 'DEF' && <div className="text-xs text-blue-600">Deferindo...</div>}
      {loading === 'IND' && <div className="text-xs text-blue-600">Indeferindo...</div>}
      {error && <div className="text-xs text-red-600">{error}</div>}

      <div className="flex items-center gap-3 pt-2">
        <button
          disabled={parecer.trim().length < 5 || loading !== null}
          onClick={() => handle('INDEFERIDO')}
          className="px-3 py-1.5 rounded bg-red-600 text-white text-xs disabled:opacity-40 hover:bg-red-700"
        >
          Indeferir
        </button>
        <button
          disabled={parecer.trim().length < 5 || loading !== null}
          onClick={() => handle('DEFERIDO')}
          className="px-3 py-1.5 rounded bg-green-600 text-white text-xs disabled:opacity-40 hover:bg-green-700"
        >
          Deferir
        </button>
        <label className="flex items-center gap-1 text-[11px] text-gray-700">
          <input
            type="checkbox"
            checked={reenviar}
            onChange={(e) => setReenviar(e.target.checked)}
            disabled={loading !== null}
          />
          Reenviar para análise (status 3) se deferir
        </label>
      </div>
    </div>
  );
};

export default ContestReviewPanel;
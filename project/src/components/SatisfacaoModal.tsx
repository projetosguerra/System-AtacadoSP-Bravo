import React, { useState } from 'react';
import { X } from 'lucide-react';
import { createSatisfacao } from '../api/satisfacao';
import { useAuth } from '../context/AuthContext';

interface Props {
  open: boolean;
  onClose: () => void;
  pedidoId: number;
  onCreated?: () => void;
}

const SatisfacaoModal: React.FC<Props> = ({ open, onClose, pedidoId, onCreated }) => {
  const { token } = useAuth();
  const [rating, setRating] = useState<number>(5);
  const [comentario, setComentario] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createSatisfacao(pedidoId, rating, comentario.trim() || undefined, token || undefined);
      onCreated?.();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Falha ao enviar satisfação.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-xl rounded-md shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-lg font-semibold">Pesquisa de Satisfação</h3>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100" aria-label="Fechar">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Qual sua satisfação com o recebimento?</label>
            <div className="flex items-center gap-2 mt-1">
              {[1,2,3,4,5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={`px-3 py-1.5 rounded border text-sm ${rating === n ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                  aria-pressed={rating === n}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Comentário (opcional)</label>
            <textarea
              rows={4}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="Descreva pontos positivos/negativos do recebimento..."
            />
            <div className="text-xs text-gray-500 mt-1">{comentario.trim().length} caracteres</div>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" onClick={onClose} className="px-3 py-2 text-sm rounded bg-gray-100 hover:bg-gray-200">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="px-3 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </form>
        <div className="px-4 pb-4 text-xs text-gray-500">
          Após o envio, sua avaliação ficará registrada no histórico do pedido.
        </div>
      </div>
    </div>
  );
};

export default SatisfacaoModal;
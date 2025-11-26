import React, { useState } from 'react';
import { X } from 'lucide-react';
import { createAteste } from '../api/ateste';
import { useAuth } from '../context/AuthContext';

interface Props {
  open: boolean;
  onClose: () => void;
  pedidoId: number;
  onCreated?: () => void;
}

const AtesteModal: React.FC<Props> = ({ open, onClose, pedidoId, onCreated }) => {
  const { token } = useAuth();
  const [recebidoOk, setRecebidoOk] = useState(true);
  const [comentario, setComentario] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createAteste(pedidoId, recebidoOk, comentario.trim() || undefined, token || undefined);
      onCreated?.();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Falha ao registrar ateste.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-xl rounded-md shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-lg font-semibold">Atestar recebimento</h3>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100" aria-label="Fechar">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Recebimento correto?</label>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="recebidoOk"
                  checked={recebidoOk}
                  onChange={() => setRecebidoOk(true)}
                />
                Sim
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="recebidoOk"
                  checked={!recebidoOk}
                  onChange={() => setRecebidoOk(false)}
                />
                Não
              </label>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">
              Comentário (opcional) {recebidoOk ? '(ex.: tudo conforme)' : '(ex.: divergências detectadas)'}
            </label>
            <textarea
              rows={4}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="Descreva observações relevantes..."
            />
            <div className="text-xs text-gray-500 mt-1">{comentario.trim().length} caracteres</div>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-sm rounded bg-gray-100 hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-3 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar Ateste'}
              </button>
            </div>
        </form>
        <div className="px-4 pb-4 text-xs text-gray-500">
          Ao confirmar, data/hora e seu usuário serão registrados no histórico do pedido.
        </div>
      </div>
    </div>
  );
};

export default AtesteModal;
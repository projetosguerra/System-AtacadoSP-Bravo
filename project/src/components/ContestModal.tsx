import React, { useState } from 'react';
import { X } from 'lucide-react';
import { createConteste } from '../api/conteste';
import { useAuth } from '../context/AuthContext';

interface Props {
  open: boolean;
  onClose: () => void;
  pedidoId: number;
  motivoReprovacao?: string | null;
  onCreated?: () => void;
}

const ContestModal: React.FC<Props> = ({ open, onClose, pedidoId, motivoReprovacao, onCreated }) => {
  const { token } = useAuth(); // obter token
  const [texto, setTexto] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = texto.trim();
    if (clean.length < 5) {
      setError('Mínimo 5 caracteres.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createConteste(pedidoId, clean, token ?? undefined);
      onCreated?.();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Falha ao enviar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-xl rounded-md shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-lg font-semibold">Contestar reprovação</h3>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100" aria-label="Fechar">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Motivo da reprovação</label>
            <textarea
              readOnly
              value={motivoReprovacao || '—'}
              rows={3}
              className="w-full text-sm border rounded bg-gray-50 px-2 py-1"
            />
          </div>
            <div>
              <label className="text-sm font-medium">Sua justificativa *</label>
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={5}
                placeholder="Explique por que a reprovação deve ser revista..."
                className="w-full text-sm border rounded px-2 py-1"
              />
              <div className="text-xs text-gray-500">{texto.trim().length} caracteres</div>
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button type="button" onClick={onClose} className="px-3 py-2 text-sm rounded bg-gray-100 hover:bg-gray-200">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-3 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Enviando...' : 'Enviar conteste'}
              </button>
            </div>
            <div className="text-xs text-gray-500">
              Ao enviar, registraremos data/hora e seu usuário automaticamente.
            </div>
        </form>
      </div>
    </div>
  );
};

export default ContestModal;
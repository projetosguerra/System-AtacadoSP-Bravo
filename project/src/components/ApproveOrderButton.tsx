import { useState } from 'react';

export function ApproveOrderButton({ pedido, onSuccess, apiFetch }: any) {
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/pedido/${pedido.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newStatus: 1, 
          conditionStatus: pedido.status
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409 && data.statusAtual !== undefined) {
          alert("Esse pedido já foi aprovado ou reprovado por outro usuário. Atualizando lista...");
        } else {
          alert(data.error || "Erro ao aprovar pedido. Tente novamente.");
        }
        await onSuccess(); 
        return;
      }
      await onSuccess();
    } catch (err: any) {
      alert("Erro inesperado ao aprovar pedido. Tente novamente.");
      await onSuccess(); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleApprove} disabled={loading}>
      {loading ? 'Aprovando...' : 'Aprovar'}
    </button>
  );
}
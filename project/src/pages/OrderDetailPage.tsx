import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, XCircle, CheckCircle } from 'lucide-react';
import { OrderDetail } from '../types';
import RejectModal from '../components/RejectModal.tsx';
import { useData } from '../context/DataContext.tsx';

const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refetchAllData } = useData();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  const updateStatusAPI = useCallback(async (newStatus: number, conditionStatus?: number) => {
    try {
      await fetch(`/api/pedido/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStatus, conditionStatus }),
      });
    } catch (err) {
      console.error(`Falha ao tentar mudar status para ${newStatus}:`, err);
    }
  }, [id]);

  useEffect(() => {
    let isMounted = true;

    const fetchOrder = async () => {
      if (!id) return;
      setIsLoading(true);
      setError(null);
      try {
        // Tenta colocar o pedido em análise (status 3), mas apenas se ele estiver pendente (status 5)
        await updateStatusAPI(3, 5);

        const response = await fetch(`/api/pedido/${id}`);
        if (!response.ok) throw new Error('Pedido não encontrado ou já está em análise por outro usuário.');
        const data: OrderDetail = await response.json();

        if (isMounted) {
          setOrder(data);
        }
      } catch (err: any) {
        if (isMounted) {
            setError(err.message);
            // Se der erro, volta para a página anterior após um tempo
            setTimeout(() => navigate('/painel-aprovacao'), 3000);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchOrder();

    // A função de limpeza agora é mais segura
    return () => {
      isMounted = false;
      // Apenas reverte o status se o pedido ainda estiver em análise (status 3)
      if (order?.status === 3) {
        updateStatusAPI(5, 3);
      }
    };
  }, [id, updateStatusAPI, navigate, order?.status]); // Adicione order?.status às dependências
  
  const handleDecision = async (newStatus: number, _motivo?: string) => {
    if (order) setOrder({ ...order, status: newStatus });

    await updateStatusAPI(newStatus, 3);

    alert(`Pedido ${newStatus === 1 ? 'Aprovado' : 'Reprovado'} com sucesso!`);
    await refetchAllData(); 
    navigate('/painel-aprovacao');
  };

  if (isLoading) return <div className="p-8 text-center">Carregando detalhes do pedido...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Erro: {error}</div>;
  if (!order) return <div className="p-8 text-center">Pedido não encontrado.</div>;

  const totalValue = order.itens.reduce((sum, item) => sum + item.preco * item.quantidade, 0);

  return (
    <div className="p-8 space-y-6">
      {/* Cabeçalho */}
      <div>
        <Link to="/painel-aprovacao" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft size={16} /> Voltar ao Painel
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-1">Análise do Pedido #{order.id}</h1>
      </div>

      {/* Detalhes do Pedido */}
      <div className="bg-white p-6 rounded-lg shadow-sm border grid grid-cols-4 gap-6">
        <div><h3 className="text-sm font-medium text-gray-500">Solicitante</h3><p className="mt-1 text-lg">{order.solicitante.nome}</p></div>
        <div><h3 className="text-sm font-medium text-gray-500">Unidade</h3><p className="mt-1 text-lg">{order.unidadeAdmin}</p></div>
        <div><h3 className="text-sm font-medium text-gray-500">Data</h3><p className="mt-1 text-lg">{new Date(order.data).toLocaleDateString('pt-BR')}</p></div>
        <div><h3 className="text-sm font-medium text-gray-500">Status</h3><span className="px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-800">Aguardando Aprovação</span></div>
      </div>

      {/* Tabela de Itens */}
      <div className="bg-white rounded-lg shadow-sm border">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Produto</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Qtd.</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Valor Un.</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {order.itens.map(item => (
              <tr key={item.id}>
                <td className="px-6 py-4">{item.nome}</td>
                <td className="px-6 py-4">{item.quantidade} {item.unit}</td>
                <td className="px-6 py-4">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.preco)}</td>
                <td className="px-6 py-4 font-semibold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.preco * item.quantidade)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-100 font-bold">
            <tr>
              <td colSpan={3} className="px-6 py-4 text-right">VALOR TOTAL:</td>
              <td className="px-6 py-4 text-left text-xl">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Ações do Aprovador */}
      <div className="bg-white p-4 rounded-lg shadow-sm border flex justify-end gap-4">
        <button onClick={() => setIsRejectModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
          <XCircle size={20} /> Reprovar
        </button>
        <button onClick={() => handleDecision(1)} className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
          <CheckCircle size={20} /> Aprovar
        </button>
      </div>

      <RejectModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        orderInfo={{ id: order.id.toString(), solicitante: order.solicitante.nome }}
        onConfirm={(motivo) => {
          handleDecision(2, motivo);
          setIsRejectModalOpen(false); 
        }}
      />
    </div>
  );
};

export default OrderDetailPage;
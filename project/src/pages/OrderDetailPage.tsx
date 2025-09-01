import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Trash2, Save, CheckCircle, XCircle, Edit } from 'lucide-react';
import { OrderDetail, OrderItem } from '../types';
import { getOrderDetailById } from '../data/mockOrderDetails';
import RejectModal from '../components/RejectModal';

const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      const order = getOrderDetailById(id);
      if (order) {
        setOrderDetail(order);
        setItems(order.itens);
      }
    }
  }, [id]);

  const handlequantidadeChange = (productId: string, newquantidade: number) => {
    if (newquantidade >= 1) {
      setItems(prevItems =>
        prevItems.map(item =>
          item.id === productId ? { ...item, quantidade: newquantidade } : item
        )
      );
    }
  };

  const handleRemoveItem = (productId: string) => {
    if (window.confirm('Tem certeza que deseja remover este item do pedido?')) {
      setItems(prevItems => prevItems.filter(item => item.id !== productId));
    }
  };

  const handleSaveChanges = () => {
    console.log('Alterações salvas:', items);
    alert('Alterações salvas com sucesso!');
  };

  const handleApproveOrder = () => {
    if (window.confirm('Tem certeza que deseja aprovar este pedido?')) {
      console.log('Pedido aprovado:', orderDetail?.id);
      alert('Pedido aprovado com sucesso!');
    }
  };

  const handleRejectOrder = (reason: string) => {
    console.log('Pedido reprovado:', orderDetail?.id, 'Motivo:', reason);
    alert(`Pedido reprovado. Motivo: ${reason}`);
  };

  const handleConcatenateOrder = () => {
    console.log('Concatenar pedido:', orderDetail?.id);
    alert('Funcionalidade de concatenação em desenvolvimento');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Verificar se houve alterações
  const hasChanges = items.some(item => 
    item.quantidade !== item.quantidadeOriginal
  ) || items.length !== (orderDetail?.itens.length || 0);

  // Calcular totais
  const orderTotal = items.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
  const projectedBalance = (orderDetail?.custoUnit || 0) - orderTotal;

  if (!orderDetail) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Pedido não encontrado</h2>
          <p className="text-gray-600 mb-4">O pedido solicitado não foi encontrado.</p>
          <Link
            to="/painel-aprovacao"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Painel de Aprovação
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Botão de Voltar */}
      <div className="flex items-center">
        <Link
          to="/painel-aprovacao"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar ao Painel de Aprovação
        </Link>
      </div>

      {/* Bloco A: Cabeçalho do Pedido */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Análise de Pedido #{orderDetail.id}
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Solicitante</label>
            <p className="text-lg text-gray-900">{orderDetail.solicitante}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Unidade Administrativa</label>
            <p className="text-lg text-gray-900">{orderDetail.unidadeAdmin}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Data do Pedido</label>
            <p className="text-lg text-gray-900">{orderDetail.data}</p>
          </div>
        </div>
      </div>

      {/* Bloco B: Informação Financeira */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações Financeiras</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-600 mb-1">Saldo Atual da Unidade</p>
            <p className="text-2xl font-bold text-blue-900">
              {formatCurrency(orderDetail.custoUnit)}
            </p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <p className="text-sm font-medium text-orange-600 mb-1">Valor do Pedido</p>
            <p className="text-2xl font-bold text-orange-900">
              {formatCurrency(orderTotal)}
            </p>
          </div>
          <div className={`text-center p-4 rounded-lg ${
            projectedBalance >= 0 ? 'bg-green-50' : 'bg-red-50'
          }`}>
            <p className={`text-sm font-medium mb-1 ${
              projectedBalance >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              Saldo Projetado
            </p>
            <p className={`text-2xl font-bold ${
              projectedBalance >= 0 ? 'text-green-900' : 'text-red-900'
            }`}>
              {formatCurrency(projectedBalance)}
            </p>
          </div>
        </div>
        {projectedBalance < 0 && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              <strong>Atenção:</strong> Este pedido excede o orçamento disponível da unidade.
            </p>
          </div>
        )}
      </div>

      {/* Bloco C: Itens do Pedido (Tabela Editável) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Itens do Pedido</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preço Unit.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantidade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subtotal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ação
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-12 h-12">
                        <img
                          src={item.imgUrl}
                          alt={item.nome}
                          className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {item.nome}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.descricao}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(item.preco)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      value={item.quantidade}
                      onChange={(e) => handlequantidadeChange(item.id, parseInt(e.target.value) || 1)}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                      min="1"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(item.preco * item.quantidade)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-red-600 hover:text-red-800 transition-colors p-2 hover:bg-red-50 rounded-md"
                      title="Remover item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total do Pedido */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900">Total do Pedido:</span>
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(orderTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Bloco D: Ações de Decisão */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap gap-4 justify-end">
          <button
            onClick={handleSaveChanges}
            disabled={!hasChanges}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-5 h-5" />
            Salvar Alterações
          </button>
          
          <button
            onClick={() => setIsRejectModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <XCircle className="w-5 h-5" />
            Reprovar Pedido
          </button>
          
          <button
            onClick={handleConcatenateOrder}
            className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Edit className="w-5 h-5" />
            Concatenar Pedido
          </button>
          
          <button
            onClick={handleApproveOrder}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <CheckCircle className="w-5 h-5" />
            Aprovar Pedido
          </button>
        </div>
      </div>

      {/* Modal de Reprovação */}
      <RejectModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        onConfirm={handleRejectOrder}
        orderInfo={{
          id: orderDetail.id,
          solicitante: orderDetail.solicitante
        }}
      />
    </div>
  );
};

export default OrderDetailPage;
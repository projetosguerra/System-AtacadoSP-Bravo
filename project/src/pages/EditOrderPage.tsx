import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, XCircle, Plus, Search, AlertTriangle, Package } from 'lucide-react';
import { EditOrderItemsTable } from '../components/EditOrderItemsTable';
import { useAuth } from '../context/AuthContext';
import { PEDIDO_MIN_VALUE } from '../config/constants';

interface RawItem {
  codProd: number;
  nome: string;
  unidade: string;
  qt: number;
  precoUnit: number;
  imgUrl: string;
}

const MIN_VALUE = PEDIDO_MIN_VALUE;

const isPlaceholder = (u?: string) => !!u && /placehold|placeholder|text=Produto/i.test(u);
const resolveImgUrl = (codProd?: number | string, codigoAuxiliar?: number | string, original?: string) => {
  if (original && !isPlaceholder(original)) return original;
  const code = codProd ?? codigoAuxiliar;
  return code ? `/api/media/produtos/${code}.JPG` : (original ?? '');
};

const EditOrderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [pedido, setPedido] = useState<any>(null);
  const [items, setItems] = useState<RawItem[]>([]);
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [searchProd, setSearchProd] = useState('');
  const [prodResults, setProdResults] = useState<any[]>([]);
  const [statusOriginal, setStatusOriginal] = useState<number | null>(null);

  function buildHeaders(contentType?: string): Record<string,string> {
    const h: Record<string,string> = {};
    if (contentType) h['Content-Type'] = contentType;
    if (token) h. Authorization = `Bearer ${token}`;
    return h;
  }

  const fetchPedido = async () => {
    if (!id) return null;
    const r = await fetch(`/api/pedido/${id}`, { headers: buildHeaders() });
    if (!r.ok) throw new Error('Falha ao carregar pedido.');
    return r.json();
  };

  const loadPedido = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPedido();
      setPedido(data);
      setStatusOriginal(data.status);
      
      if (data.status === 5) {
        const lock = await fetch(`/api/pedido/${id}/status`, {
          method: 'PUT',
          headers: buildHeaders('application/json'),
          body: JSON.stringify({ newStatus: 3, conditionStatus: 5 })
        });
        if (lock.ok) {
          const updated = await fetchPedido();
          setPedido(updated);
        }
      }
      
      const mapped = (data.itens || []).map((it: any) => ({
        codProd: it.codProd,
        nome: it.nome,
        unidade: it. unidade,
        qt: it.qt || it.quantidade || 0,
        precoUnit: it.precoUnit || it.preco || 0,
        imgUrl: resolveImgUrl(it.codProd, it.codigoAuxiliar, it.imgUrl)
      }));
      setItems(mapped);
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar pedido.');
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => { loadPedido(); }, [loadPedido]);

  useEffect(() => {
    let active = true;
    async function search() {
      if (!searchProd. trim()) {
        setProdResults([]);
        return;
      }
      try {
        const r = await fetch(
          `/api/produtos? q=${encodeURIComponent(searchProd)}&page=1&pageSize=12`, 
          { headers: buildHeaders() }
        );
        const data = await r.json();
        if (active) setProdResults(data);
      } catch {
        if (active) setProdResults([]);
      }
    }
    const t = setTimeout(search, 400);
    return () => { active = false; clearTimeout(t); };
  }, [searchProd, token]);

  const updateQty = (codProd: number, qt: number) => {
    setItems(prev => prev.map(it => it.codProd === codProd ? { ...it, qt } : it));
  };

  const removeItem = (codProd: number) => {
    setItems(prev => prev.filter(it => it.codProd !== codProd));
  };

  const addProduct = (p: any) => {
    setItems(prev => {
      const exists = prev.find(it => it.codProd === p.id);
      if (exists) {
        return prev.map(it => it.codProd === p.id ? { ...it, qt: it.qt + 1 } : it);
      }
      return [...prev, {
        codProd: p. id,
        nome: p. nome,
        unidade: p.unit,
        qt: 1,
        precoUnit: p. preco,
        imgUrl: resolveImgUrl(p.id, p.codigoAuxiliar, p.imgUrl)
      }];
    });
    setSearchProd('');
    setProdResults([]);
    setAdding(false);
  };

  const totalAtual = items.reduce((s, it) => s + it. qt * it.precoUnit, 0);
  const abaixoMin = totalAtual < MIN_VALUE;
  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  async function handleSalvar() {
    if (!id || saving) return;
    if (motivo.trim(). length < 5) {
      setError('Motivo deve ter pelo menos 5 caracteres.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        motivo: motivo.trim(),
        itens: items.map(it => ({ codProd: it.codProd, qt: it.qt }))
      };
      const r = await fetch(`/api/pedido/${id}/itens`, {
        method: 'PATCH',
        headers: buildHeaders('application/json'),
        body: JSON.stringify(payload)
      });
      const body = await r.json(). catch(() => ({}));
      if (!r. ok) throw new Error(body?. error || 'Falha ao salvar edição.');
      navigate(`/pedido/${id}`, { state: { notice: 'Pedido editado com sucesso.' } });
    } catch (e: any) {
      setError(e. message || 'Erro ao salvar edição.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelar() {
    if (id && statusOriginal === 5) {
      try { 
        await fetch(`/api/pedido/${id}/unlock`, { 
          method: 'POST', 
          headers: buildHeaders() 
        }); 
      } catch {}
    }
    navigate(`/pedido/${id}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando pedido para edição...</p>
        </div>
      </div>
    );
  }

  if (error && !pedido) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center bg-white rounded-lg shadow-sm border border-red-200 p-8 max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao Carregar</h2>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => navigate(`/pedido/${id}`)} 
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Pedido não encontrado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-x-hidden bg-gray-50">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <button
            onClick={handleCancelar}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> 
            Voltar
          </button>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Editar Pedido #{pedido.id}
          </h1>
        </div>

        {/* Tabela de Itens Editável */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 lg:px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-base lg:text-lg font-semibold text-gray-900">Itens do Pedido</h2>
              <button
                onClick={() => setAdding(a => !a)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm shadow-sm"
              >
                <Plus className="w-4 h-4" /> 
                {adding ? 'Fechar Busca' : 'Adicionar Produto'}
              </button>
            </div>
          </div>

          {/* Área de Busca de Produtos (Colapsável) */}
          {adding && (
            <div className="px-5 lg:px-6 py-4 border-b border-gray-100 bg-gray-50 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  value={searchProd}
                  onChange={(e) => setSearchProd(e.target.value)}
                  placeholder="Buscar produto por nome ou código..."
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              {searchProd.trim() && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                  {prodResults.map(pr => (
                    <div
                      key={pr.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 cursor-pointer transition-all duration-200 bg-white"
                      onClick={() => addProduct(pr)}
                    >
                      <img 
                        src={resolveImgUrl(pr.id, pr.codigoAuxiliar, pr.imgUrl)} 
                        alt={pr. nome} 
                        className="w-full h-28 object-cover rounded-lg mb-3" 
                      />
                      <div className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">{pr.nome}</div>
                      <div className="text-xs text-gray-500 mb-2">{pr.unit}</div>
                      <div className="text-sm font-bold text-blue-600">
                        {formatCurrency(pr.preco)}
                      </div>
                    </div>
                  ))}
                  {prodResults.length === 0 && (
                    <div className="col-span-full text-center py-8">
                      <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Nenhum produto encontrado</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tabela de Itens */}
          <div className="overflow-x-auto">
            <EditOrderItemsTable
              items={items}
              onChangeQty={updateQty}
              onRemove={removeItem}
            />
          </div>

          {/* Footer com Total */}
          <div className="px-5 lg:px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm text-gray-700">
                <span className="font-medium">Total Atual:</span>{' '}
                <span className={`text-lg font-bold ${abaixoMin ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(totalAtual)}
                </span>
                <span className="text-gray-500 ml-3">
                  Mínimo: {formatCurrency(MIN_VALUE)}
                </span>
              </div>
              {abaixoMin && (
                <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  Abaixo do mínimo
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Campo de Motivo */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 lg:p-6 space-y-3">
          <label className="block text-sm font-semibold text-gray-900">
            Motivo da Edição <span className="text-red-500">*</span>
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Descreva detalhadamente o motivo da alteração dos itens do pedido..."
          />
          {motivo.trim(). length > 0 && motivo.trim().length < 5 && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              O motivo deve ter pelo menos 5 caracteres
            </p>
          )}
          <p className="text-xs text-gray-500">
            Mínimo de 5 caracteres • {motivo.length} caractere{motivo.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-lg border-2 border-red-300 bg-red-50">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 lg:p-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
            <button
              onClick={handleCancelar}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors text-sm"
            >
              <XCircle className="w-5 h-5" /> 
              Cancelar
            </button>
            <button
              onClick={handleSalvar}
              disabled={saving || items.length === 0 || motivo.trim().length < 5}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm"
            >
              <Save className="w-5 h-5" /> 
              {saving ? 'Salvando.. .' : 'Salvar Alterações'}
            </button>
          </div>
        </div>

        {/* Info sobre Itens */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Informações sobre a edição</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Você pode adicionar, remover ou alterar quantidades de produtos</li>
                <li>O motivo da edição será registrado no histórico do pedido</li>
                <li>O pedido deve atingir o valor mínimo de {formatCurrency(MIN_VALUE)}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditOrderPage;
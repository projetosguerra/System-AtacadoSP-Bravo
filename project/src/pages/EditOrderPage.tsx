import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, XCircle, Plus } from 'lucide-react';
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

// Helper: sempre use a imagem real pelo código do produto (fallback para imgUrl se válido)
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
    if (token) h.Authorization = `Bearer ${token}`;
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
        unidade: it.unidade,
        qt: it.qt || it.quantidade || 0,
        precoUnit: it.precoUnit || it.preco || 0,
        // força a imagem real pelo código
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
      if (!searchProd.trim()) {
        setProdResults([]);
        return;
      }
      try {
        const r = await fetch(`/api/produtos?q=${encodeURIComponent(searchProd)}&page=1&pageSize=12`, { headers: buildHeaders() });
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
        codProd: p.id,
        nome: p.nome,
        unidade: p.unit,
        qt: 1,
        precoUnit: p.preco,
        imgUrl: resolveImgUrl(p.id, p.codigoAuxiliar, p.imgUrl)
      }];
    });
    setSearchProd('');
    setProdResults([]);
    setAdding(false);
  };

  const totalAtual = items.reduce((s, it) => s + it.qt * it.precoUnit, 0);
  const abaixoMin = totalAtual < MIN_VALUE;

  async function handleSalvar() {
    if (!id || saving) return;
    if (motivo.trim().length < 5) {
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
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.error || 'Falha ao salvar edição.');
      navigate(`/pedido/${id}`, { state: { notice: 'Pedido editado com sucesso.' } });
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar edição.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelar() {
    if (id && statusOriginal === 5) {
      try { await fetch(`/api/pedido/${id}/unlock`, { method: 'POST', headers: buildHeaders() }); } catch {}
    }
    navigate(`/pedido/${id}`);
  }

  if (loading) return <div className="p-8">Carregando pedido para edição...</div>;
  if (error) return (
    <div className="p-8 space-y-4">
      <p className="text-red-600">{error}</p>
      <button onClick={() => navigate(`/pedido/${id}`)} className="px-4 py-2 bg-gray-200 rounded">
        Voltar
      </button>
    </div>
  );
  if (!pedido) return <div className="p-8">Pedido não encontrado.</div>;


  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={handleCancelar}
            className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Editar Pedido #{pedido.id}</h1>
      </div>

      <div className="bg-white p-4 rounded-lg border">
        <EditOrderItemsTable
          items={items}
          onChangeQty={updateQty}
          onRemove={removeItem}
        />
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm">
            Total Atual: <strong className={abaixoMin ? 'text-red-600' : 'text-green-600'}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAtual)}
            </strong>{' '}
            • Mínimo exigido: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(MIN_VALUE)}
          </div>
          <button
            onClick={() => setAdding(a => !a)}
            className="px-3 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 inline-block mr-1" /> {adding ? 'Fechar' : 'Adicionar Produto'}
          </button>
        </div>
        {adding && (
          <div className="mt-4 space-y-3">
            <input
              value={searchProd}
              onChange={(e) => setSearchProd(e.target.value)}
              placeholder="Buscar produto..."
              className="w-full border rounded px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {prodResults.map(pr => (
                <div
                  key={pr.id}
                  className="border rounded p-3 flex flex-col gap-2 hover:shadow cursor-pointer"
                  onClick={() => addProduct(pr)}
                >
                  <img src={resolveImgUrl(pr.id, pr.codigoAuxiliar, pr.imgUrl)} alt={pr.nome} className="w-full h-24 object-cover rounded" />
                  <div className="text-sm font-medium">{pr.nome}</div>
                  <div className="text-xs text-gray-500">{pr.unit}</div>
                  <div className="text-sm font-semibold">
                    {new Intl.NumberFormat('pt-BR',{ style:'currency', currency:'BRL'}).format(pr.preco)}
                  </div>
                </div>
              ))}
              {prodResults.length === 0 && searchProd.trim() && (
                <div className="text-sm text-gray-500 col-span-full">Nenhum produto encontrado.</div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg border space-y-3">
        <label className="text-sm font-medium">Motivo da edição *</label>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={4}
          className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Descreva o motivo da alteração dos itens..."
        />
        {motivo.trim().length > 0 && motivo.trim().length < 5 && (
          <p className="text-xs text-red-600">Escreva pelo menos 5 caracteres.</p>
        )}
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="flex justify-end gap-3">
        <button
          onClick={handleCancelar}
          disabled={saving}
          className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm flex items-center gap-2"
        >
          <XCircle className="w-4 h-4" /> Cancelar
        </button>
        <button
          onClick={handleSalvar}
          disabled={saving || items.length === 0}
          className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </div>
  );
};

export default EditOrderPage;
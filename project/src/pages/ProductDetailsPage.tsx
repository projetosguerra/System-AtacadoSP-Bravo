import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Tag, ArrowLeft, ShoppingCart, Minus, Plus, Package, CheckCircle, AlertTriangle } from 'lucide-react';

type ProdutoDetalhe = {
    id: number;
    codigoAuxiliar?: number;
    nome: string;
    descricaoTecnica: string;
    imgUrl: string;
    preco: number;
    embalagem?: string;
    marca?: string | null;
};

type Mini = { id: number; nome: string; imgUrl: string; preco: number; unit?: string };

export default function ProductDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { addToCart } = useCart();

    const [produto, setProduto] = useState<ProdutoDetalhe | null>(null);
    const [proximos, setProximos] = useState<Mini[]>([]);
    const [qty, setQty] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadingNext, setLoadingNext] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [added, setAdded] = useState(false);

    function safeName(n?: string | null) {
      const x = String(n ??  '').trim();
      if (!! x && x !== '. ') return x;
      return produto?.marca ?  `Produto ${produto.marca}` : (produto ?  `Produto ${produto.id}` : 'Produto');
    }

    const formatPrice = (price: number) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

    useEffect(() => {
        if (! id) return;
        setLoading(true);
        setError(null);
        fetch(`/api/produtos/${encodeURIComponent(id)}`)
            .then(async r => {
                if (!r. ok) throw new Error(`Erro ${r.status}`);
                return r.json();
            })
            .then(setProduto)
            .catch(e => setError(e.message || 'Erro ao carregar produto. '))
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        if (!id) return;
        setLoadingNext(true);
        fetch(`/api/produtos/${encodeURIComponent(id)}/proximos`)
            .then(async r => {
                if (!r.ok) throw new Error(`Erro ${r.status}`);
                return r.json();
            })
            .then((arr) => setProximos(Array.isArray(arr) ? arr. slice(0, 3) : []))
            .catch(() => setProximos([]))
            .finally(() => setLoadingNext(false));
    }, [id]);

    const handleAddToCart = () => {
        if (!produto) return;
        addToCart(
            {
                id: produto. id,
                nome: safeName(produto.nome),
                preco: produto.preco,
                descricao: produto.descricaoTecnica,
                imgUrl: produto.imgUrl,
                unit: produto.embalagem || '',
                brand: produto.marca || undefined
            },
            qty
        );
        setAdded(true);
        setTimeout(() => setAdded(false), 3000);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando produto... </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] bg-gray-50">
                <div className="text-center bg-white rounded-lg shadow-sm border border-red-200 p-8 max-w-md mx-4">
                    <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao Carregar</h2>
                    <p className="text-sm text-red-600 mb-4">{error}</p>
                    <button
                        onClick={() => navigate('/catalogo-produtos')}
                        className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
                    >
                        Voltar ao Catálogo
                    </button>
                </div>
            </div>
        );
    }

    if (!produto) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] bg-gray-50">
                <div className="text-center bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md mx-4">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Produto Não Encontrado</h2>
                    <p className="text-sm text-gray-600 mb-4">O produto solicitado não está disponível.</p>
                    <button
                        onClick={() => navigate('/catalogo-produtos')}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                        Ver Catálogo
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-x-hidden bg-gray-50">
            {/* Container com max-width */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm">
                    <button
                        onClick={() => navigate('/catalogo-produtos')}
                        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar ao Catálogo
                    </button>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-900 font-medium truncate max-w-[200px] sm:max-w-none">
                        {safeName(produto.nome)}
                    </span>
                </div>

                {/* Grid Principal - Proporção 5:7 */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Coluna Esquerda: Imagem e Produtos Relacionados */}
                    <div className="lg:col-span-5 space-y-5">
                        {/* Imagem Principal */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                            <div className="aspect-square flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
                                <img
                                    src={produto.imgUrl}
                                    alt={safeName(produto.nome)}
                                    className="max-h-full max-w-full object-contain p-4"
                                    loading="lazy"
                                    onError={(e) => {
                                        const el = e. currentTarget as HTMLImageElement;
                                        el.onerror = null;
                                        el.src = `https://placehold.co/500x500/f3f4f6/9ca3af?text=${encodeURIComponent(safeName(produto.nome). slice(0, 32))}`;
                                    }}
                                />
                            </div>
                        </div>

                        {/* Produtos Relacionados */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Package className="w-4 h-4 text-gray-600" />
                                Produtos Relacionados
                            </h3>
                            {loadingNext ? (
                                <div className="grid grid-cols-3 gap-3">
                                    {[1, 2, 3]. map(i => (
                                        <div key={i} className="h-28 rounded-lg bg-gray-100 animate-pulse" />
                                    ))}
                                </div>
                            ) : proximos.length === 0 ? (
                                <div className="text-xs text-gray-500 text-center py-4">
                                    Nenhum produto relacionado
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-2">
                                    {proximos.map(item => (
                                        <Link
                                            key={item. id}
                                            to={`/produtos/${item.id}`}
                                            className="group bg-gray-50 border border-gray-200 rounded-lg overflow-hidden hover:shadow-md hover:border-blue-300 transition-all"
                                        >
                                            <div className="aspect-square flex items-center justify-center p-2 bg-white">
                                                <img
                                                    src={item.imgUrl}
                                                    alt={item.nome}
                                                    className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        const el = e.currentTarget as HTMLImageElement;
                                                        el.onerror = null;
                                                        el.src = `https://placehold.co/150x150/f3f4f6/9ca3af?text=${encodeURIComponent(item.nome. slice(0, 15))}`;
                                                    }}
                                                />
                                            </div>
                                            <div className="p-2 border-t border-gray-200">
                                                <div className="text-[10px] font-medium text-gray-900 line-clamp-2 mb-1 min-h-[28px] group-hover:text-blue-600 transition-colors">
                                                    {item.nome}
                                                </div>
                                                <div className="text-xs font-semibold text-green-600">
                                                    {formatPrice(item.preco)}
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Coluna Direita: Informações do Produto */}
                    <div className="lg:col-span-7 space-y-5">
                        {/* Card de Informações */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mb-3">
                                {safeName(produto.nome)}
                            </h1>

                            {/* Metadados */}
                            <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                    <span className="text-gray-500">Cód:</span>
                                    <span className="font-mono font-medium">{produto.id}</span>
                                </div>
                                {produto.codigoAuxiliar && (
                                    <div className="flex items-center gap-1">
                                        <span className="text-gray-500">EAN:</span>
                                        <span className="font-mono font-medium">{produto.codigoAuxiliar}</span>
                                    </div>
                                )}
                                {produto.marca && (
                                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs">
                                        <Tag className="w-3 h-3 text-blue-600" />
                                        <span className="font-medium text-blue-700">{produto.marca}</span>
                                    </div>
                                )}
                                {produto.embalagem && (
                                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 border border-gray-200 rounded-full text-xs">
                                        <Package className="w-3 h-3 text-gray-600" />
                                        <span className="font-medium text-gray-700">{produto.embalagem}</span>
                                    </div>
                                )}
                            </div>

                            {/* Preço */}
                            <div className="mb-5 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl lg:text-3xl font-bold text-green-600">
                                        {formatPrice(produto. preco)}
                                    </span>
                                    {produto.embalagem && (
                                        <span className="text-xs text-gray-600">
                                            por {produto.embalagem}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Descrição Técnica */}
                            <div className="mb-5">
                                <h3 className="text-sm font-semibold text-gray-900 mb-2">Descrição do Produto</h3>
                                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line bg-gray-50 p-3 rounded-lg border border-gray-200 max-h-32 overflow-y-auto">
                                    {produto.descricaoTecnica || 'Sem descrição técnica disponível. '}
                                </div>
                            </div>

                            {/* Controles de Compra */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Quantidade
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center border-2 border-gray-300 rounded-lg">
                                            <button
                                                onClick={() => setQty(q => Math.max(1, q - 1))}
                                                className="p-2 hover:bg-gray-100 transition-colors"
                                                aria-label="Diminuir quantidade"
                                            >
                                                <Minus className="w-4 h-4 text-gray-700" />
                                            </button>
                                            <input
                                                type="number"
                                                className="w-16 text-center text-base font-bold border-x-2 border-gray-300 outline-none py-2"
                                                value={String(qty)}
                                                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                                                min="1"
                                            />
                                            <button
                                                onClick={() => setQty(q => q + 1)}
                                                className="p-2 hover:bg-gray-100 transition-colors"
                                                aria-label="Aumentar quantidade"
                                            >
                                                <Plus className="w-4 h-4 text-gray-700" />
                                            </button>
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            Total: <span className="font-bold text-gray-900">{formatPrice(produto.preco * qty)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Botão Adicionar ao Carrinho */}
                                {! added ?  (
                                    <button
                                        onClick={handleAddToCart}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md active:scale-95"
                                    >
                                        <ShoppingCart className="w-5 h-5" />
                                        Adicionar ao Carrinho
                                    </button>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="w-full bg-green-600 text-white py-3 px-5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 shadow-sm">
                                            <CheckCircle className="w-5 h-5" />
                                            Produto Adicionado! 
                                        </div>
                                        <Link
                                            to="/carrinho"
                                            className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-2. 5 px-5 rounded-lg font-medium text-center transition-colors text-sm"
                                        >
                                            Ver Carrinho →
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Info Box */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                                <Package className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="text-xs text-blue-800">
                                    <p className="font-semibold mb-1">Informações de Compra</p>
                                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                                        <li>Produto sujeito à disponibilidade em estoque</li>
                                        <li>Preços podem ser alterados sem aviso prévio</li>
                                        <li>Consulte prazos após aprovação do pedido</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
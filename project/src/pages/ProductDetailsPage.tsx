import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

type ProdutoDetalhe = {
    id: number;
    codigoAuxiliar?: number;
    nome: string;
    descricaoTecnica: string;
    imgUrl: string;
    preco: number;
    embalagem?: string;
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

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        setError(null);
        fetch(`/api/produtos/${encodeURIComponent(id)}`)
            .then(async r => {
                if (!r.ok) throw new Error(`Erro ${r.status}`);
                return r.json();
            })
            .then(setProduto)
            .catch(e => setError(e.message || 'Erro ao carregar produto.'))
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
            .then((arr) => setProximos(Array.isArray(arr) ? arr.slice(0, 2) : []))
            .catch(() => setProximos([]))
            .finally(() => setLoadingNext(false));
    }, [id]);

    if (loading) return <div className="p-8 text-center">Carregando...</div>;
    if (error) return <div className="p-8 text-red-600 text-center">{error}</div>;
    if (!produto) return <div className="p-8 text-center">Produto não encontrado.</div>;

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6">
            {/* Breadcrumb simples */}
            <div className="text-sm text-gray-500 mb-4 flex items-center gap-2">
                <button onClick={() => navigate(-1)} className="hover:underline">Voltar</button>
                <span>/</span>
                <span>Detalhes do Produto</span>
            </div>

            {/* Grid principal: 12 colunas para evitar quebra e overflow */}
            <div className="grid grid-cols-12 gap-8">
                {/* Coluna imagem */}
                <div className="col-span-12 lg:col-span-6 min-w-0">
                    <div className="bg-white rounded-xl border p-4 h-80 md:h-[420px] flex items-center justify-center">
                        <img
                            src={produto.imgUrl}
                            alt={produto.nome}
                            className="max-h-full max-w-full object-contain"
                            loading="lazy"
                            onError={(e) => {
                                const el = e.currentTarget as HTMLImageElement;
                                el.onerror = null;
                                el.src = `https://placehold.co/600x400/eeeeee/333333?text=${encodeURIComponent(produto.nome?.slice(0, 32) || 'Produto')}`;
                            }}
                        />
                    </div>

                    {/* Próximos (apenas 2) */}
                    <div className="mt-5">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Próximos produtos</h3>
                        {loadingNext ? (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="h-36 rounded-lg bg-gray-100 animate-pulse" />
                                <div className="h-36 rounded-lg bg-gray-100 animate-pulse" />
                            </div>
                        ) : proximos.length === 0 ? (
                            <div className="text-sm text-gray-500">Sem próximos a exibir.</div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {proximos.map(item => (
                                    <Link key={item.id} to={`/produtos/${item.id}`} className="group">
                                        <div className="bg-white border rounded-lg overflow-hidden hover:shadow transition">
                                            <div className="h-24 flex items-center justify-center">
                                                <img
                                                    src={item.imgUrl}
                                                    alt={item.nome}
                                                    className="max-h-full max-w-full object-contain p-2"
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        const el = e.currentTarget as HTMLImageElement;
                                                        el.onerror = null;
                                                        el.src = `https://placehold.co/300x200/eeeeee/333333?text=${encodeURIComponent(item.nome.slice(0, 24))}`;
                                                    }}
                                                />
                                            </div>
                                            <div className="p-2">
                                                <div className="text-xs font-medium line-clamp-2 min-h-[32px] group-hover:underline">
                                                    {item.nome}
                                                </div>
                                                <div className="text-[13px] text-green-600 font-semibold mt-1">
                                                    R$ {item.preco.toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Coluna informações */}
                <div className="col-span-12 lg:col-span-6 min-w-0">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{produto.nome}</h1>

                    <div className="mt-2 text-sm text-gray-500">
                        Cod.: <span className="font-mono">{produto.id}</span>
                        {produto.codigoAuxiliar && <> • EAN: <span className="font-mono">{produto.codigoAuxiliar}</span></>}
                    </div>

                    <div className="mt-4 flex items-baseline gap-3">
                        <span className="text-2xl md:text-3xl font-semibold text-green-600">R$ {produto.preco.toFixed(2)}</span>
                        {produto.embalagem && <span className="text-sm text-gray-500">Embalagem: {produto.embalagem}</span>}
                    </div>

                    <div className="mt-6 text-gray-800 leading-relaxed whitespace-pre-line">
                        {produto.descricaoTecnica || 'Sem descrição técnica.'}
                    </div>

                    <div className="mt-6 flex items-center gap-4">
                        <div className="flex items-center border rounded-lg">
                            <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-3 py-2">-</button>
                            <input
                                className="w-16 text-center outline-none"
                                value={String(qty)}
                                onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                            />
                            <button onClick={() => setQty(q => q + 1)} className="px-3 py-2">+</button>
                        </div>
                        <button
                            onClick={() =>
                                addToCart(
                                    {
                                        id: produto.id,
                                        nome: produto.nome,
                                        preco: produto.preco,
                                        descricao: produto.descricaoTecnica,
                                        imgUrl: produto.imgUrl,
                                        unit: produto.embalagem || ''
                                    },
                                    qty
                                )
                            }
                            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow"
                        >
                            Adicionar ao carrinho
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
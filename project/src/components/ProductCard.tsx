import React, { useState } from 'react';
import { ShoppingCart, CheckCircle, Minus, Plus, Tag } from 'lucide-react';
import { Product } from '../types';
import { Link } from 'react-router-dom';

interface ProductCardProps {
    product: Product;
    onAddToCart: (product: Product, quantity: number) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
    const [quantidade, setQuantidade] = useState(1);
    const [added, setAdded] = useState(false);

    const handleAddToCart = () => {
        onAddToCart(product, quantidade);
        setAdded(true);
        setTimeout(() => setAdded(false), 3000);
    };

    const formatPrice = (price: number) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

    const safeName = (n?: string) => {
      const x = String(n ?? '').trim();
      if (!!x && x !== '.') return x;
      return product.brand ? `Produto ${product.brand}` : `Produto ${product.id}`;
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden group">
            <Link to={`/produtos/${product.id}`} className="block">
                <div className="relative h-44 md:h-52 lg:h-60 bg-white rounded-t-xl overflow-hidden flex items-center justify-center">
                    <img
                        src={product.imgUrl}
                        alt={safeName(product.nome)}
                        loading="lazy"
                        decoding="async"
                        className="max-h-full max-w-full object-contain p-3"
                        onError={(e) => {
                            const el = e.currentTarget as HTMLImageElement;
                            el.onerror = null;
                            el.src = `https://placehold.co/600x400/ffffff/cccccc?text=${encodeURIComponent(
                                safeName(product.nome).slice(0, 32)
                            )}`;
                        }}
                    />
                </div>
            </Link>

            <div className="p-5 flex flex-col flex-grow">
                <div className="flex-grow">
                    <Link to={`/produtos/${product.id}`} className="hover:underline">
                        <h3 className="text-base font-semibold text-gray-900 line-clamp-2">{safeName(product.nome)}</h3>
                    </Link>

                    {/* Marca e Unidade */}
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                        {product.brand && (
                          <span className="inline-flex items-center gap-1">
                            <Tag className="w-3 h-3" /> {product.brand}
                          </span>
                        )}
                        {product.unit && <span className="text-gray-500">• Unid.: {product.unit}</span>}
                    </div>

                    {/* Descrição curta com clamp */}
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                      {product.descricao || 'Sem descrição.'}
                    </p>
                </div>

                <div className="space-y-4">
                    <div className='flex justify-between items-center mb-2'>
                        <div className="text-center">
                            <div className="text-base font-bold text-green-600 bg-green-50 inline-block px-3 py-1 rounded-lg">
                                {formatPrice(product.preco)}
                            </div>
                        </div>
                        <div className="flex items-center justify-center">
                            <div className="flex items-center justify-center gap-4 my-4">
                                <button
                                    onClick={() => setQuantidade(q => Math.max(1, q - 1))}
                                    className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
                                >
                                    <Minus size={16} />
                                </button>
                                <input
                                    type="number"
                                    value={quantidade}
                                    onChange={(e) => setQuantidade(Math.max(1, Number(e.target.value)))}
                                    className="w-16 text-center font-bold text-lg border-x-0 border-t-0 border-b-2 border-gray-300 focus:ring-0 focus:border-blue-500"
                                />
                                <button
                                    onClick={() => setQuantidade(q => q + 1)}
                                    className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="w-full">
                            {!added ? (
                                <button
                                    onClick={handleAddToCart}
                                    className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-medium text-sm transition-all duration-200 shadow-md hover:shadow-lg active:transform active:scale-95"
                                >
                                    <ShoppingCart size={18} />
                                    Adicionar ao Carrinho
                                </button>
                            ) : (
                                <div className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-medium text-sm shadow-md animate-pulse">
                                    <CheckCircle size={18} />
                                    <span>Adicionado com Sucesso!</span>
                                </div>
                            )}
                        </div>

                        {added && (
                            <div className="text-center animate-fadeIn">
                                <Link
                                    to="/carrinho"
                                    className="inline-flex items-center text-sm text-red-600 hover:text-red-800 font-medium hover:underline transition-colors duration-200"
                                >
                                    Ver Carrinho →
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
};

export default ProductCard;
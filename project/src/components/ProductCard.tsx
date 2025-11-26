import React, { useState } from 'react';
import { ShoppingCart, CheckCircle, Minus, Plus, Tag, Eye } from 'lucide-react';
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
      if (!! x && x !== '.') return x;
      return product.brand ? `Produto ${product.brand}` : `Produto ${product.id}`;
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden group">
            {/* Imagem do Produto */}
            <Link to={`/produtos/${product.id}`} className="block relative">
                <div className="relative h-48 bg-gray-50 flex items-center justify-center overflow-hidden">
                    <img
                        src={product.imgUrl}
                        alt={safeName(product.nome)}
                        loading="lazy"
                        decoding="async"
                        className="max-h-full max-w-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                            const el = e.currentTarget as HTMLImageElement;
                            el.onerror = null;
                            el.src = `https://placehold.co/400x400/f3f4f6/9ca3af?text=${encodeURIComponent(
                                safeName(product.nome). slice(0, 32)
                            )}`;
                        }}
                    />
                    {/* Badge de Ver Detalhes */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-lg">
                            <Eye className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-gray-900">Ver Detalhes</span>
                        </div>
                    </div>
                </div>
            </Link>

            {/* Conteúdo do Card */}
            <div className="p-4 flex flex-col flex-grow">
                {/* Nome e Info */}
                <div className="flex-grow mb-4">
                    <Link to={`/produtos/${product. id}`}>
                        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2 hover:text-blue-600 transition-colors min-h-[40px]">
                            {safeName(product.nome)}
                        </h3>
                    </Link>

                    {/* Marca e Unidade */}
                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                        {product.brand && (
                          <span className="inline-flex items-center gap-1">
                            <Tag className="w-3 h-3" /> {product.brand}
                          </span>
                        )}
                        {product.unit && (
                          <span className="text-gray-400">• {product.unit}</span>
                        )}
                    </div>

                    {/* Descrição */}
                    {product.descricao && (
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                          {product.descricao}
                        </p>
                    )}
                </div>

                {/* Preço */}
                <div className="mb-4">
                    <div className="inline-flex items-center bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
                        <span className="text-lg font-bold text-green-600">
                            {formatPrice(product.preco)}
                        </span>
                    </div>
                </div>

                {/* Controle de Quantidade */}
                <div className="flex items-center justify-center gap-3 mb-4">
                    <button
                        onClick={() => setQuantidade(q => Math.max(1, q - 1))}
                        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                        aria-label="Diminuir quantidade"
                    >
                        <Minus className="w-4 h-4 text-gray-700" />
                    </button>
                    <input
                        type="number"
                        value={quantidade}
                        onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 text-center font-bold text-base border-2 border-gray-300 rounded-lg py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="1"
                        aria-label="Quantidade"
                    />
                    <button
                        onClick={() => setQuantidade(q => q + 1)}
                        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                        aria-label="Aumentar quantidade"
                    >
                        <Plus className="w-4 h-4 text-gray-700" />
                    </button>
                </div>

                {/* Botão Adicionar ao Carrinho */}
                <div className="space-y-3">
                    {! added ?  (
                        <button
                            onClick={handleAddToCart}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-semibold text-sm transition-all duration-200 shadow-sm hover:shadow-md active:transform active:scale-95"
                        >
                            <ShoppingCart className="w-4 h-4" />
                            Adicionar ao Carrinho
                        </button>
                    ) : (
                        <div className="w-full bg-green-600 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-semibold text-sm shadow-md">
                            <CheckCircle className="w-4 h-4" />
                            <span>Adicionado! </span>
                        </div>
                    )}

                    {added && (
                        <div className="text-center animate-fadeIn">
                            <Link
                                to="/carrinho"
                                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors"
                            >
                                Ver Carrinho →
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductCard;
import React, { useState } from 'react';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { Products } from '../types';

interface ProductCardProps {
    product: Products;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
    const [quantity, setQuantity] = useState(1);

    const handleDecrease = () => {
        if (quantity > 1) {
            setQuantity(quantity - 1);
        }
    };

    const handleIncrease = () => {
        setQuantity(quantity + 1);
    };

    const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value);
        if (!isNaN(value) && value >= 1) {
            setQuantity(value);
        }
    };

    const handleAddToCart = () => {
        console.log(`Adicionado: ${quantity}x ${product.nome}`);
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(price);
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            {/* Product Image */}
            <div className="aspect-[4/3] overflow-hidden rounded-t-lg">
                <img
                    src={product.imageUrl}
                    alt={product.nome}
                    className="w-full h-full object-cover"
                />
            </div>

            {/* Product Info */}
            <div className="p-4">
                <h3 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">
                    {product.nome}
                </h3>
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                    {product.descricao}
                </p>

                {/* Price */}
                <div className="mb-4">
                    <div className="text-lg font-bold text-green-600">
                        {formatPrice(product.preco)}
                    </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center border border-gray-300 rounded-md">
                        <button
                            onClick={handleDecrease}
                            className="p-1 hover:bg-gray-100 transition-colors rounded-l-md"
                            disabled={quantity <= 1}
                        >
                            <Minus className="w-4 h-4 text-gray-600" />
                        </button>
                        <input
                            type="number"
                            value={quantity}
                            onChange={handleQuantityChange}
                            className="w-12 text-center text-sm border-0 focus:ring-0 py-1"
                            min="1"
                        />
                        <button
                            onClick={handleIncrease}
                            className="p-1 hover:bg-gray-100 transition-colors rounded-r-md"
                        >
                            <Plus className="w-4 h-4 text-gray-600" />
                        </button>
                    </div>

                    {/* Add to Cart Button */}
                    <button
                        onClick={handleAddToCart}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md flex items-center gap-1 text-sm font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <ShoppingCart className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductCard;
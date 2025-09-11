import React, { useState, useEffect } from 'react';
import ProductCard from '../components/ProductCard';
import { Product } from '../types';
import { useCart } from '../context/CartContext';

const CatalogPage: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const { addToCart } = useCart();

    useEffect(() => {
        const fetchProducts = async () => {
            setIsLoading(true);
            try {
                const response = await fetch("/api/produtos");
                if (!response.ok) throw new Error('A resposta da rede não foi bem-sucedida');
                const data: Product[] = await response.json();
                setProducts(data);
            } catch (err: any) {
                setError('Falha ao carregar produtos: ' + err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProducts();
    }, []);

    if (isLoading) return <div className="text-center p-12">Carregando produtos...</div>;
    if (error) return <div className="text-center p-12 text-red-600">Erro: {error}</div>;

    return (
        <div className='space-y-6'>
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Catálogo de Produtos</h1>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.map(product => (
                    <ProductCard
                        key={product.id}
                        product={product}
                        onAddToCart={addToCart}
                    />
                ))}
            </div>
        </div>
    );
};

export default CatalogPage;
import React, { useState, useEffect, useRef } from 'react';
import ProductCard from '../components/ProductCard';
import { Product } from '../types';
import { useCart } from '../context/CartContext';

const CatalogPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { addToCart } = useCart();

  const abortRef = useRef<AbortController | null>(null);

  async function load(page = 1, pageSize = 24, q = '') {
    setIsLoading(true);
    setError(null);
    try {
      try { abortRef.current?.abort(); } catch {}
      abortRef.current = new AbortController();

      const timeout = setTimeout(() => abortRef.current?.abort(), 12_000);

      const url = `/api/produtos?page=${page}&pageSize=${pageSize}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
      const response = await fetch(url, { signal: abortRef.current.signal });
      clearTimeout(timeout);

      if (!response.ok) throw new Error(`Falha ao buscar produtos (${response.status})`);
      const data: Product[] = await response.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      setError(e?.message || 'Falha ao carregar produtos.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load(1, 24, '');
    return () => {
      try { abortRef.current?.abort(); } catch {}
    };
  }, []);

  if (isLoading) return <div className="text-center p-12">Carregando produtos...</div>;
  if (error) return (
    <div className="text-center p-12 text-red-600">
      Erro: {error}
      <div className="mt-4">
        <button
          onClick={() => load(1, 24, '')}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );

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
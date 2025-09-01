import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { Products } from '../types';

const CatalogPage: React.FC = () => {
<<<<<<< HEAD
=======
<<<<<<< Updated upstream
    const [selectedCategory, setSelectedCategory] = useState('Todos');
>>>>>>> 47d0c63ddeb734216c517fb6ae42ff6ba83e788c

  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const categories = ['Todos', 'Escritório', 'Limpeza', 'Informática', 'Papelaria'];

<<<<<<< HEAD
  const [products, setProducts] = useState<Products[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("/api/produtos");
        if (!response.ok) {
          throw new Error('A resposta da rede não foi bem-sucedida');
        }
        const data: Products[] = await response.json();
        setProducts(data);
      } catch (err: any) {
        setError('Falha ao carregar produtos: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  if (isLoading) {
    return <div className="text-center p-12">Carregando produtos...</div>;
  }

  if (error) {
    return <div className="text-center p-12 text-red-600">Erro: {error}</div>;
  }

=======
    const filteredProducts = mockProducts;
=======

  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const categories = ['Todos', 'Escritório', 'Limpeza', 'Informática', 'Papelaria'];

  const [products, setProducts] = useState<Products[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
        const response = await fetch(`${apiUrl}/api/produtos`);
        if (!response.ok) {
          throw new Error('A resposta da rede não foi bem-sucedida');
        }
        const data: Products[] = await response.json();
        setProducts(data);
      } catch (err: any) {
        setError('Falha ao carregar produtos: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  if (isLoading) {
    return <div className="text-center p-12">Carregando produtos...</div>;
  }
>>>>>>> Stashed changes

  if (error) {
    return <div className="text-center p-12 text-red-600">Erro: {error}</div>;
  }

>>>>>>> 47d0c63ddeb734216c517fb6ae42ff6ba83e788c
  const filteredProducts = products;

  return (
    <div className='space-y-6'>
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Catálogo de Produtos</h1>
        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Filtrar por Categoria</label>
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[120px]"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredProducts.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Nenhum produto encontrado para a categoria selecionada.</p>
        </div>
      )}
    </div>
  );
};

export default CatalogPage;
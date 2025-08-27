import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { mockProducts } from '../data/mockProducts';

const CatalogPage: React.FC = () => {
    const [selectedCategory, setSelectedCategory] = useState('Todos');

    const categories = ['Todos', 'Escritório', 'Limpeza', 'Informática', 'Papelaria'];

    const filteredProducts = mockProducts;

    return (
        <div>
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

            <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
                {/* Products Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filteredProducts.map(product => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>

                {/* Empty State (if no products) */}
                {filteredProducts.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Nenhum produto encontrado para a categoria selecionada.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default CatalogPage;
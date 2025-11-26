import React, { useState, useEffect, useRef, useMemo } from 'react';
import ProductCard from '../components/ProductCard';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { Search, Loader2, AlertCircle, Filter, Package } from 'lucide-react';

type SortKey = 'relevance' | 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc';

const CatalogPage: React. FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortKey>('relevance');

  const [page] = useState<number>(1);
  const [pageSize] = useState<number>(24);

  const { addToCart } = useCart();

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const getName = (p: any) => String(p?. nome ??  p?.name ?? '');
  const getDesc = (p: any) => String(p?.descricao ?? p?.description ?? '');
  const getCategory = (p: any) =>
    String(p?.categoria ??  p?.category ?? p?.categoriaNome ?? p?.grupo ?? p?.setor ?? '');
  const getPrice = (p: any) => Number(p?.preco ?? p?.price ?? 0);
  const getBrand = (p: any) => String(p?.brand ?? p?.marca ?? '');
  const getUnit = (p: any) => String(p?.unit ?? p?.unidade ?? '');

  async function load(opts?: { page?: number; pageSize?: number; q?: string; category?: string; sort?: SortKey }) {
    const pg = opts?.page ?? page;
    const ps = opts?.pageSize ?? pageSize;
    const q = (opts?.q ?? searchTerm). trim();
    const category = (opts?.category ?? selectedCategory).trim();
    const sort = opts?.sort ?? sortBy;

    setIsLoading(true);
    setError(null);
    try {
      try { abortRef.current?.abort(); } catch {}
      abortRef. current = new AbortController();

      const params = new URLSearchParams({
        page: String(pg),
        pageSize: String(ps),
      });
      if (q) params.set('q', q);
      if (category) params.set('category', category);
      if (sort && sort !== 'relevance') {
        if (sort.startsWith('name')) {
          params.set('sort', 'name');
          params.set('order', sort. endsWith('asc') ? 'asc' : 'desc');
        } else if (sort. startsWith('price')) {
          params.set('sort', 'price');
          params.set('order', sort.endsWith('asc') ? 'asc' : 'desc');
        }
      }

      const url = `/api/produtos?${params.toString()}`;

      const timeout = window.setTimeout(() => abortRef.current?.abort(), 12_000);
      const response = await fetch(url, { signal: abortRef.current.signal });
      window.clearTimeout(timeout);

      if (!response.ok) throw new Error(`Falha ao buscar produtos (${response.status})`);
      const data: Product[] = await response. json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (e: any) {
      if (e?. name === 'AbortError') return;
      setError(e?. message || 'Falha ao carregar produtos.');
    } finally {
      setIsLoading(false);
      if (document.activeElement !== inputRef.current && inputRef.current) {
        if (searchTerm.length > 0) inputRef.current.focus();
      }
    }
  }

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      load({ page: 1, pageSize, q: searchTerm, category: selectedCategory, sort: sortBy });
    }, 350) as unknown as number;

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [searchTerm, selectedCategory, sortBy]);

  useEffect(() => {
    load({ page: 1, pageSize, q: '', category: '', sort: 'relevance' });
    return () => {
      try { abortRef.current?.abort(); } catch {}
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      const c = getCategory(p);
      if (c) set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [products]);

  const displayProducts = useMemo(() => {
    let list = [...products];

    if (selectedCategory) {
      list = list.filter(p => getCategory(p) === selectedCategory);
    }

    const term = searchTerm.trim(). toLowerCase();
    if (term) {
      list = list.filter(p => {
        const fields = [getName(p), getDesc(p), getCategory(p), getBrand(p), getUnit(p)];
        return fields.some(f => f.toLowerCase().includes(term));
      });
    }

    const collator = new Intl. Collator('pt-BR', { sensitivity: 'base' });
    if (sortBy === 'name-asc') {
      list. sort((a, b) => collator.compare(getName(a), getName(b)));
    } else if (sortBy === 'name-desc') {
      list.sort((a, b) => collator.compare(getName(b), getName(a)));
    } else if (sortBy === 'price-asc') {
      list.sort((a, b) => getPrice(a) - getPrice(b));
    } else if (sortBy === 'price-desc') {
      list. sort((a, b) => getPrice(b) - getPrice(a));
    }
    return list;
  }, [products, searchTerm, selectedCategory, sortBy]);

  return (
    <div className="flex-1 overflow-x-hidden bg-gray-50">
      <div className="w-full space-y-6">
        {/* Header com Filtros */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Catálogo de Produtos</h1>
            <div className="text-sm text-gray-600">
              {! isLoading && (
                <span className="font-medium">
                  {displayProducts.length} produto{displayProducts.length !== 1 ? 's' : ''} encontrado{displayProducts.length !== 1 ?  's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Barra de Filtros */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Busca */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Buscar por nome, descrição ou código..."
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Buscar produtos"
                />
              </div>

              {/* Categoria */}
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <select
                  className="border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-[160px]"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  aria-label="Filtrar por categoria"
                >
                  <option value="">Todas Categorias</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Ordenação */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 whitespace-nowrap hidden sm:inline">Ordenar:</span>
                <select
                  className="border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-[180px]"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  aria-label="Ordenação"
                >
                  <option value="relevance">Relevância</option>
                  <option value="name-asc">Nome (A → Z)</option>
                  <option value="name-desc">Nome (Z → A)</option>
                  <option value="price-asc">Menor Preço</option>
                  <option value="price-desc">Maior Preço</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-lg border-2 border-red-300 bg-red-50">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-700 font-medium mb-2">{error}</p>
                <button
                  onClick={() => load({ page: 1, pageSize, q: searchTerm, category: selectedCategory, sort: sortBy })}
                  className="text-sm text-red-600 hover:text-red-800 font-medium underline"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Screen Reader Status */}
        <div className="sr-only" aria-live="polite">
          {isLoading ?  'Carregando produtos...' : `${displayProducts.length} produtos encontrados. `}
        </div>

        {/* Grid de Produtos */}
        <div className="relative min-h-[400px]">
          {isLoading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                <p className="text-sm text-gray-600 font-medium">Carregando produtos...</p>
              </div>
            </div>
          )}

          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5"
            aria-busy={isLoading ?  'true' : 'false'}
          >
            {displayProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={addToCart}
              />
            ))}
          </div>

          {!isLoading && displayProducts.length === 0 && ! error && (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum produto encontrado
              </h3>
              <p className="text-sm text-gray-600">
                Tente ajustar os filtros ou realizar uma nova busca
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CatalogPage;
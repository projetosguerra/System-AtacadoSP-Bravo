import React, { useState, useEffect, useRef, useMemo } from 'react';
import ProductCard from '../components/ProductCard';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { Search, Loader2, AlertCircle } from 'lucide-react';

type SortKey = 'relevance' | 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc';

const CatalogPage: React.FC = () => {
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

  const getName = (p: any) => String(p?.nome ?? p?.name ?? '');
  const getDesc = (p: any) => String(p?.descricao ?? p?.description ?? '');
  const getCategory = (p: any) =>
    String(p?.categoria ?? p?.category ?? p?.categoriaNome ?? p?.grupo ?? p?.setor ?? '');
  const getPrice = (p: any) => Number(p?.preco ?? p?.price ?? 0);

  async function load(opts?: { page?: number; pageSize?: number; q?: string; category?: string; sort?: SortKey }) {
    const pg = opts?.page ?? page;
    const ps = opts?.pageSize ?? pageSize;
    const q = (opts?.q ?? searchTerm).trim();
    const category = (opts?.category ?? selectedCategory).trim();
    const sort = opts?.sort ?? sortBy;

    setIsLoading(true);
    setError(null);
    try {
      try { abortRef.current?.abort(); } catch {}
      abortRef.current = new AbortController();

      const params = new URLSearchParams({
        page: String(pg),
        pageSize: String(ps),
      });
      if (q) params.set('q', q);
      if (category) params.set('category', category);
      if (sort && sort !== 'relevance') {
        if (sort.startsWith('name')) {
          params.set('sort', 'name');
          params.set('order', sort.endsWith('asc') ? 'asc' : 'desc');
        } else if (sort.startsWith('price')) {
          params.set('sort', 'price');
          params.set('order', sort.endsWith('asc') ? 'asc' : 'desc');
        }
      }

      const url = `/api/produtos?${params.toString()}`;

      const timeout = window.setTimeout(() => abortRef.current?.abort(), 12_000);
      const response = await fetch(url, { signal: abortRef.current.signal });
      window.clearTimeout(timeout);

      if (!response.ok) throw new Error(`Falha ao buscar produtos (${response.status})`);
      const data: Product[] = await response.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      setError(e?.message || 'Falha ao carregar produtos.');
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

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter(p => {
        const fields = [getName(p), getDesc(p), getCategory(p)];
        return fields.some(f => f.toLowerCase().includes(term));
      });
    }

    const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' });
    if (sortBy === 'name-asc') {
      list.sort((a, b) => collator.compare(getName(a), getName(b)));
    } else if (sortBy === 'name-desc') {
      list.sort((a, b) => collator.compare(getName(b), getName(a)));
    } else if (sortBy === 'price-asc') {
      list.sort((a, b) => getPrice(a) - getPrice(b));
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => getPrice(b) - getPrice(a));
    }
    return list;
  }, [products, searchTerm, selectedCategory, sortBy]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Catálogo de Produtos</h1>

        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar por nome, descrição ou categoria..."
              className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-[260px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Buscar produtos"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Categoria</label>
            <select
              className="border rounded px-2 py-2 text-sm"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filtrar por categoria"
            >
              <option value="">Todas</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Ordenar por</label>
            <select
              className="border rounded px-2 py-2 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              aria-label="Ordenação"
            >
              <option value="relevance">Relevância (padrão)</option>
              <option value="name-asc">Nome (A → Z)</option>
              <option value="name-desc">Nome (Z → A)</option>
              <option value="price-asc">Preço (menor → maior)</option>
              <option value="price-desc">Preço (maior → menor)</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-md border border-red-200 bg-red-50 text-red-800">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <div className="text-sm">
            {error}
            <button
              onClick={() => load({ page: 1, pageSize, q: searchTerm, category: selectedCategory, sort: sortBy })}
              className="ml-3 underline"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      <div className="sr-only" aria-live="polite">
        {isLoading ? 'Carregando produtos...' : `${displayProducts.length} produtos encontrados.`}
      </div>

      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10">
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              Carregando...
            </div>
          </div>
        )}

        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          aria-busy={isLoading ? 'true' : 'false'}
        >
          {displayProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={addToCart}
            />
          ))}
        </div>

        {!isLoading && displayProducts.length === 0 && !error && (
          <div className="text-center text-gray-500 py-12">
            Nenhum produto encontrado com os filtros aplicados.
          </div>
        )}
      </div>
    </div>
  );
};

export default CatalogPage;
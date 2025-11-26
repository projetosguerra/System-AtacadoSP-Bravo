import React, { useEffect, useRef } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';

type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

interface FiltersButtonProps {
  showFilters: boolean;
  setShowFilters: SetState<boolean>;
  selectedSetorId: string;
  setSelectedSetorId: SetState<string>;
  setores: Array<{ CODSETOR: string | number; DESCRICAO: string }>;
  disabled?: boolean;
}

const FiltersButton: React.FC<FiltersButtonProps> = ({
  showFilters,
  setShowFilters,
  selectedSetorId,
  setSelectedSetorId,
  setores = [],
  disabled = false,
}) => {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (! showFilters) return;
      const t = e.target as Node;
      if (popoverRef.current?. contains(t)) return;
      if (buttonRef.current?.contains(t)) return;
      setShowFilters(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showFilters, setShowFilters]);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowFilters(false);
    }
    if (showFilters) document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [showFilters, setShowFilters]);

  const clear = () => setSelectedSetorId('');

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={() => setShowFilters(v => !v)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        title="Mostrar/ocultar filtros"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={showFilters}
        aria-controls="filters-popover"
      >
        <SlidersHorizontal className="w-4 h-4" />
        Filtros
      </button>

      {showFilters && (
        <div
          id="filters-popover"
          ref={popoverRef}
          className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-xl z-50"
          role="dialog"
          aria-label="Filtros que alteram os cards"
        >
          <div className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Filtros Globais</h3>
                <p className="text-xs text-gray-500 mt-0.5">Atualize os dados dos cards</p>
              </div>
              <button
                onClick={() => setShowFilters(false)}
                className="p-1. 5 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Fechar filtros"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Unidade Administrativa
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  value={selectedSetorId}
                  onChange={(e) => setSelectedSetorId(e.target.value)}
                  disabled={disabled}
                  title="Selecionar unidade administrativa"
                >
                  <option value="">Todas as Unidades</option>
                  {(setores || []).map(s => (
                    <option key={String(s.CODSETOR)} value={String(s.CODSETOR)}>
                      {s.DESCRICAO}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Dica:</strong> Ao escolher uma unidade, os cards e a tabela serão filtrados automaticamente. 
                </p>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={clear}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Limpar
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FiltersButton;
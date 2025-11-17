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
      if (!showFilters) return;
      const t = e.target as Node;
      if (popoverRef.current?.contains(t)) return;
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
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
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
          className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
          role="dialog"
          aria-label="Filtros que alteram os cards"
        >
          <div className="p-3">
            <div className="flex items-start justify-between mb-2">
              <label className="text-xs font-medium text-gray-700 mt-0.5">
                Unidade Administrativa
              </label>
              <button
                onClick={() => setShowFilters(false)}
                className="p-1 rounded hover:bg-gray-100"
                aria-label="Fechar filtros"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <select
              className="w-full border rounded px-2 py-1.5 text-sm"
              value={selectedSetorId}
              onChange={(e) => setSelectedSetorId(e.target.value)}
              disabled={disabled}
              title="Selecionar unidade administrativa"
            >
              <option value="">Todas</option>
              {(setores || []).map(s => (
                <option key={String(s.CODSETOR)} value={String(s.CODSETOR)}>
                  {s.DESCRICAO}
                </option>
              ))}
            </select>

            <p className="mt-2 text-xs text-gray-600">
              Ao escolher a unidade, os dados dos cards serão atualizados para refletir os pedidos da unidade.
            </p>

            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={clear}
                className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-50"
              >
                Limpar
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
              >
                Ok
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FiltersButton;
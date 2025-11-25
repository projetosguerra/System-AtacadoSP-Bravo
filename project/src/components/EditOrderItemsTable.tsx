import React from 'react';

interface EditItem {
  codProd: number;
  nome: string;
  qt: number;
  precoUnit: number;
  imgUrl: string;
  unidade: string;
}

interface Props {
  items: EditItem[];
  onChangeQty: (codProd: number, newQt: number) => void;
  onRemove: (codProd: number) => void;
}

export const EditOrderItemsTable: React.FC<Props> = ({ items, onChangeQty, onRemove }) => {
  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <table className="w-full">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Produto</th>
          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Código</th>
          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Quantidade</th>
          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Valor Unit.</th>
          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Subtotal</th>
          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Ações</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {items.map(it => {
          const subtotal = it.qt * it.precoUnit;
          return (
            <tr key={it.codProd}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <img src={it.imgUrl} alt={it.nome} className="w-10 h-10 rounded object-cover" />
                  <span className="text-sm">{it.nome}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm">{it.codProd}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <button
                    className="px-2 py-1 rounded bg-gray-100"
                    onClick={() => onChangeQty(it.codProd, Math.max(1, it.qt - 1))}
                    disabled={it.qt <= 1}
                  >-</button>
                  <span className="w-8 text-center">{it.qt}</span>
                  <button
                    className="px-2 py-1 rounded bg-gray-100"
                    onClick={() => onChangeQty(it.codProd, it.qt + 1)}
                  >+</button>
                </div>
              </td>
              <td className="px-4 py-3 text-sm">{fmt(it.precoUnit)}</td>
              <td className="px-4 py-3 font-medium">{fmt(subtotal)}</td>
              <td className="px-4 py-3">
                <button
                  onClick={() => onRemove(it.codProd)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remover
                </button>
              </td>
            </tr>
          );
        })}
        {items.length === 0 && (
          <tr>
            <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>
              Nenhum item no pedido.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};
import React from 'react';
import { Minus, Plus, Trash2, Package } from 'lucide-react';
import { CartItem } from '../types';

interface CartItemsTableProps {
    items: CartItem[];
    onUpdateQuantity: (productId: number, newQuantity: number) => void;
    onRemoveItem: (productId: number) => void;
}

const CartItemsTable: React.FC<CartItemsTableProps> = ({
    items,
    onUpdateQuantity,
    onRemoveItem
}) => {
    const fmtCurrency = (v: number) => new Intl.NumberFormat('pt-BR',{ style:'currency', currency:'BRL'}).format(Number(v||0));
    const onImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>, item: CartItem) => {
      const el = e.currentTarget;
      const altCode = (item as any)?.codigoAuxiliar || item.id;
      el.src = `/api/media/produtos/${altCode}.JPG`;
      el.onerror = () => { el.src = `https://placehold.co/80x80?text=${encodeURIComponent(String(item.id))}`; };
    };

    return (
        <>
            {/* Layout em cards para mobile */}
            <div className="block md:hidden divide-y divide-gray-200">
                {items.map(item => {
                    const subtotal = Number(item.preco || 0) * Number(item.quantidade || 0);
                    return (
                        <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex gap-3">
                                <div className="flex-shrink-0">
                                    <img
                                        src={item.imgUrl}
                                        onError={(e) => onImgError(e, item)}
                                        alt={item.nome}
                                        className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                                        loading="lazy"
                                    />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                                        {item.nome}
                                    </h3>
                                    {item.descricao && (
                                        <p className="text-xs text-gray-500 mb-2 line-clamp-1">
                                            {item. descricao}
                                        </p>
                                    )}
                                    
                                    <div className="flex items-center gap-2 mb-2">
                                        <Package className="w-3 h-3 text-gray-400" />
                                        <span className="text-xs text-gray-600">
                                            Cód: {item.id}
                                            {(item as any)?.codigoAuxiliar && ` • Aux: ${(item as any). codigoAuxiliar}`}
                                        </span>
                                    </div>

                                    <div className="text-sm text-gray-700 mb-2">
                                        <span className="text-xs text-gray-500">Preço: </span>
                                        <span className="font-semibold">{fmtCurrency(item.preco)}</span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                                            <button 
                                                onClick={() => onUpdateQuantity(item.id, item.quantidade - 1)} 
                                                disabled={item.quantidade <= 1} 
                                                className="p-1. 5 rounded-md hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <Minus className="w-3. 5 h-3.5 text-gray-600" />
                                            </button>
                                            <span className="px-2. 5 font-semibold text-gray-900 min-w-[1.5rem] text-center text-sm">
                                                {item.quantidade}
                                            </span>
                                            <button 
                                                onClick={() => onUpdateQuantity(item. id, item.quantidade + 1)} 
                                                className="p-1.5 rounded-md hover:bg-white transition-colors"
                                            >
                                                <Plus className="w-3.5 h-3.5 text-gray-600" />
                                            </button>
                                        </div>

                                        <button 
                                            onClick={() => onRemoveItem(item.id)} 
                                            className="p-2 rounded-lg hover:bg-red-50 transition-colors" 
                                            title="Remover"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-600" />
                                        </button>
                                    </div>

                                    <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                                        <span className="text-xs text-gray-600">Subtotal:</span>
                                        <span className="text-base font-bold text-gray-900">{fmtCurrency(subtotal)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Tabela */}
            <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Produto
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Código
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Quantidade
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Preço
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Subtotal
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Ações
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {items.map(item => {
                            const subtotal = Number(item.preco || 0) * Number(item.quantidade || 0);
                            return (
                                <tr key={item. id} className="hover:bg-gray-50 transition-colors">
                                    {/* Coluna Produto */}
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={item. imgUrl}
                                                onError={(e) => onImgError(e, item)}
                                                alt={item.nome}
                                                className="w-14 h-14 object-cover rounded-md border border-gray-200 flex-shrink-0"
                                                loading="lazy"
                                            />
                                            <div className="min-w-0 max-w-xs">
                                                <div className="text-sm font-medium text-gray-900 truncate" title={item.nome}>
                                                    {item.nome}
                                                </div>
                                                {item.descricao && (
                                                    <div className="text-xs text-gray-500 truncate mt-0.5" title={item.descricao}>
                                                        {item. descricao}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Coluna Código */}
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="font-medium text-gray-900 text-sm">{item.id}</div>
                                        {(item as any)?.codigoAuxiliar && (
                                            <div className="text-xs text-gray-500">
                                                Aux: {(item as any).codigoAuxiliar}
                                            </div>
                                        )}
                                    </td>

                                    {/* Coluna Quantidade */}
                                    <td className="px-4 py-4">
                                        <div className="flex items-center justify-center">
                                            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                                                <button 
                                                    onClick={() => onUpdateQuantity(item.id, item.quantidade - 1)} 
                                                    disabled={item.quantidade <= 1} 
                                                    className="p-1.5 rounded-md hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    <Minus className="w-4 h-4 text-gray-600" />
                                                </button>
                                                <span className="px-3 font-semibold text-gray-900 text-sm min-w-[2. 5rem] text-center">
                                                    {item.quantidade}
                                                </span>
                                                <button 
                                                    onClick={() => onUpdateQuantity(item.id, item.quantidade + 1)} 
                                                    className="p-1.5 rounded-md hover:bg-white transition-colors"
                                                >
                                                    <Plus className="w-4 h-4 text-gray-600" />
                                                </button>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Coluna Preço */}
                                    <td className="px-4 py-4 whitespace-nowrap text-right">
                                        <div className="text-sm font-medium text-gray-900">{fmtCurrency(item.preco)}</div>
                                    </td>

                                    {/* Coluna Subtotal */}
                                    <td className="px-4 py-4 whitespace-nowrap text-right">
                                        <div className="text-sm font-bold text-blue-600">{fmtCurrency(subtotal)}</div>
                                    </td>

                                    {/* Coluna Ações */}
                                    <td className="px-4 py-4 whitespace-nowrap text-center">
                                        <button 
                                            onClick={() => onRemoveItem(item.id)} 
                                            className="p-2 rounded-lg hover:bg-red-50 transition-colors" 
                                            title="Remover item"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-600" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default CartItemsTable;
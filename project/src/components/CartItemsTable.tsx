import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { CartItem } from '../types';

interface CartItemsTableProps {
    items: CartItem[];
    onUpdateQuantity: (productId: string, newQuantity: number) => void;
    onRemoveItem: (productId: string) => void;
}

const CartItemsTable: React.FC<CartItemsTableProps> = ({
    items,
    onUpdateQuantity,
    onRemoveItem
}) => {
    return (
        <table className="min-w-full divide-y divide-gray-200">
            <thead>
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantidade</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preço</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {items.map(item => (
                    <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                                <img src={item.imgUrl} alt={item.nome} className="w-16 h-16 object-cover rounded-md mr-4" />
                                <div>
                                    <div className="text-sm font-medium text-gray-900">{item.nome}</div>
                                    <div className="text-sm text-gray-500">{item.descricao}</div>
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                                <button onClick={() => onUpdateQuantity(item.id, item.quantidade - 1)} disabled={item.quantidade <= 1}>
                                    <Minus className="w-4 h-4 text-gray-600" />
                                </button>
                                <span className="mx-2">{item.quantidade}</span>
                                <button onClick={() => onUpdateQuantity(item.id, item.quantidade + 1)}>
                                    <Plus className="w-4 h-4 text-gray-600" />
                                </button>
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">R$ {item.preco.toFixed(2)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <button onClick={() => onRemoveItem(item.id)}>
                                <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default CartItemsTable;
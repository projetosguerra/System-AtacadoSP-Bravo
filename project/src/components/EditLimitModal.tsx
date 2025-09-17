import React, { useState, useEffect } from 'react';
import { X, DollarSign } from 'lucide-react';
import { Setor } from '../types';

interface EditLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  setor: Setor | null;
  onSave: (newLimit: number) => void;
}

const EditLimitModal: React.FC<EditLimitModalProps> = ({ isOpen, onClose, setor, onSave }) => {
  const [newLimit, setNewLimit] = useState<string>('');

  useEffect(() => {
    if (setor) {
      setNewLimit((setor.SALDO || 0).toFixed(2).replace('.', ''));
    }
  }, [setor]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    if (!setor) return;

    const limitInCents = parseFloat(newLimit);

    if (!isNaN(limitInCents) && limitInCents >= 0) {
      const correctLimitValue = limitInCents / 100; 

      onSave(correctLimitValue);
      onClose();
    }
  };

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    if (numericValue === '') return '';
    const formattedValue = (parseFloat(numericValue) / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `R$ ${formattedValue}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewLimit(e.target.value.replace(/\D/g, ''));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            Editar Limite de: {setor?.DESCRICAO || 'Carregando...'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Novo Limite Total (R$)
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={formatCurrency(newLimit)}
              onChange={handleInputChange}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              placeholder="R$ 0,00"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditLimitModal;
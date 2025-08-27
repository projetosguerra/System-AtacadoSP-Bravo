import React, { useState, useEffect } from 'react';
import { X, DollarSign } from 'lucide-react';
import { UnitFinancials } from '../types';

interface EditLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: UnitFinancials | null;
  onSave: (newLimit: number) => void;
}

const EditLimitModal: React.FC<EditLimitModalProps> = ({ isOpen, onClose, unit, onSave }) => {
  const [newLimit, setNewLimit] = useState<string>('');

  useEffect(() => {
    if (unit) {
      setNewLimit(unit.limiteTotal.toString());
    }
  }, [unit]);

  const handleSave = () => {
    const limitValue = parseFloat(newLimit);
    if (!isNaN(limitValue) && limitValue > 0) {
      onSave(limitValue);
      onClose();
    }
  };

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    const formattedValue = (parseFloat(numericValue) / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formattedValue;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    const numericValue = parseFloat(value) / 100;
    setNewLimit(numericValue.toString());
  };

  if (!isOpen || !unit) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Alterar Limite para {unit.nome}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Limite Atual
            </label>
            <div className="text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(unit.limiteTotal)}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Novo Limite
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={formatCurrency(newLimit)}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              <strong>Atenção:</strong> Esta alteração será registrada no histórico e entrará em vigor imediatamente.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditLimitModal;
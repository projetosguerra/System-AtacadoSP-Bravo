import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { ConfirmationModal } from './ConfirmationModal';

interface Setor {
    CODSETOR: number;
    DESCRICAO: string;
}

interface UserDetailsModalProps {
    user: User | null;
    onClose: () => void;
    onUserDeleted: () => void;
    onUserUpdated?: () => void;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
    user,
    onClose,
    onUserDeleted,
    onUserUpdated
}) => {
    const [isEditMode, setIsEditMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Estados para edição
    const [primeiroNome, setPrimeiroNome] = useState('');
    const [ultimoNome, setUltimoNome] = useState('');
    const [genero, setGenero] = useState('');
    const [idFuncionario, setIdFuncionario] = useState('');
    const [telefone, setTelefone] = useState('');
    const [email, setEmail] = useState('');
    const [tipousuario, setTipousuario] = useState<number>(3);
    const [codsetor, setCodsetor] = useState<number | ''>('');
    const [setores, setSetores] = useState<Setor[]>([]);

    useEffect(() => {
        if (user) {
            setPrimeiroNome(user.primeiroNome);
            setUltimoNome(user.ultimoNome || '');
            setGenero(user.genero || '');
            setIdFuncionario(user.idFuncionario || '');
            setTelefone(user.numeroTelefone || '');
            setEmail(user.email);
            setTipousuario(user.tipoUsuario);
            setCodsetor(user.codSetor || '');
            setError(null);
            setShowDeleteConfirm(false);
            setIsEditMode(false);
        }
    }, [user]);

    useEffect(() => {
        if (isEditMode) {
            const fetchSetores = async () => {
                try {
                    const response = await fetch('/api/setores');
                    if (!response.ok) throw new Error('Falha ao buscar setores');
                    setSetores(await response.json());
                } catch (err: any) {
                    setError(err.message);
                }
            };
            fetchSetores();
        }
    }, [isEditMode]);

    const handleEdit = () => {
        setIsEditMode(true);
        setError(null);
    };

    const handleCancelEdit = () => {
        if (user) {
            setPrimeiroNome(user.primeiroNome);
            setPrimeiroNome(user.primeiroNome);
            setUltimoNome(user.ultimoNome || '');
            setGenero(user.genero || '');
            setIdFuncionario(user.idFuncionario || '');
            setTelefone(user.numeroTelefone || '');
            setEmail(user.email);
            setTipousuario(user.tipoUsuario);
            setCodsetor(user.codSetor || '');
            setError(null);
            setShowDeleteConfirm(false);
            setIsEditMode(false);
        }
        setIsEditMode(false);
        setError(null);
    };

    const handleSave = async () => {
        setIsLoading(true);
        setError(null);

        const userDataToUpdate = {
            primeiroNome,
            ultimoNome,
            email,
            tipoUsuario: tipousuario,
            codSetor: codsetor,
            genero,
            telefone,
            idFuncionario
        };

        console.log('Dados que serão enviados para a API (PUT):', userDataToUpdate);

        try {
            const response = await fetch(`/api/usuarios/${user?.codUsuario}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userDataToUpdate), 
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Falha ao atualizar usuário');
            }

            if (onUserUpdated) {
                onUserUpdated();
            }
            setIsEditMode(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!user) return;

        setIsDeleting(true);
        setError(null);
        try {
            const response = await fetch(`/api/usuarios/${user.codUsuario}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Falha ao excluir usuário.');
            }
            onUserDeleted();
        } catch (err: any) {
            setError(err.message);
            setShowDeleteConfirm(false);
        } finally {
            setIsDeleting(false);
        }
    };

    const getUserTypeLabel = (tipo: number) => {
        switch (tipo) {
            case 1: return 'Administrador';
            case 2: return 'Aprovador';
            case 3: return 'Solicitante';
            default: return 'Desconhecido';
        }
    };

    const getUserTypeBadgeClass = (tipo: number) => {
        switch (tipo) {
            case 1: return 'bg-red-100 text-red-800';
            case 2: return 'bg-yellow-100 text-yellow-800';
            case 3: return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (!user) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col transform transition-all duration-300 scale-100">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-1">
                            {isEditMode ? 'Editar Usuário' : 'Detalhes do Usuário'}
                        </h2>
                        <p className="text-sm text-gray-600">
                            {isEditMode
                                ? `Altere as informações do usuário ${user.primeiroNome} ${user.ultimoNome}`
                                : `Visualizando informações de ${user.primeiroNome} ${user.ultimoNome}`
                            }
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200 group"
                    >
                        <svg className="w-6 h-6 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {!isEditMode ? (
                        <div className="p-6">
                            {/* Informações do Sistema */}
                            <div className="bg-gray-50 p-4 rounded-lg border mb-6">
                                <h3 className="text-sm font-medium text-gray-700 mb-3">Informações do Sistema</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center">
                                        <svg className="w-4 h-4 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                        </svg>
                                        <span className="text-gray-500">ID:</span>
                                        <span className="ml-2 font-mono font-medium">#{user.codUsuario}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <svg className="w-4 h-4 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                        <span className="text-gray-500">Tipo:</span>
                                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getUserTypeBadgeClass(user.tipoUsuario)}`}>
                                            {getUserTypeLabel(user.tipoUsuario)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* Informações Pessoais */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        Informações Pessoais
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <p className="text-sm text-gray-500">Nome Completo</p>
                                                <p className="font-medium text-gray-900">{user.primeiroNome} {user.ultimoNome}</p>
                                            </div>
                                        </div>
                                        {user.genero && (
                                            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                                                <div>
                                                    <p className="text-sm text-gray-500">Gênero</p>
                                                    <p className="font-medium text-gray-900">{user.genero}</p>
                                                </div>
                                            </div>
                                        )}
                                        {user.idFuncionario && (
                                            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                                                <div>
                                                    <p className="text-sm text-gray-500">ID Funcionário</p>
                                                    <p className="font-medium text-gray-900 font-mono">{user.idFuncionario}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Informações de Contato */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        Informações de Contato
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <p className="text-sm text-gray-500">Email</p>
                                                <p className="font-medium text-gray-900">{user.email}</p>
                                            </div>
                                        </div>
                                        {user.numeroTelefone && (
                                            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                                                <div>
                                                    <p className="text-sm text-gray-500">Telefone</p>
                                                    <p className="font-medium text-gray-900 font-mono">{user.numeroTelefone}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Informações Organizacionais */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                        </div>
                                        Informações Organizacionais
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <p className="text-sm text-gray-500">Perfil</p>
                                                <p className="font-medium text-gray-900">{user.perfil}</p>
                                            </div>
                                        </div>
                                        {user.setor && (
                                            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                                                <div>
                                                    <p className="text-sm text-gray-500">Setor</p>
                                                    <p className="font-medium text-gray-900">{user.setor}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <div className="flex">
                                        <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p className="text-sm text-red-700">{error}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Edit Mode
                        <form onSubmit={handleSave} className="p-6">
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        Informações Pessoais
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Primeiro Nome <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={primeiroNome}
                                                onChange={(e) => setPrimeiroNome(e.target.value)}
                                                required
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-white"
                                                placeholder="Digite o primeiro nome"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Último Nome <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={ultimoNome}
                                                onChange={(e) => setUltimoNome(e.target.value)}
                                                required
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-white"
                                                placeholder="Digite o último nome"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Gênero
                                            </label>
                                            <select
                                                value={genero}
                                                onChange={(e) => setGenero(e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-white"
                                            >
                                                <option value="">Selecione o gênero</option>
                                                <option value="Masculino">Masculino</option>
                                                <option value="Feminino">Feminino</option>
                                                <option value="Outro">Outro</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                ID do Funcionário
                                            </label>
                                            <input
                                                type="text"
                                                value={idFuncionario}
                                                onChange={(e) => setIdFuncionario(e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-white font-mono"
                                                placeholder="Ex: 0246AHR"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Seção de Informações de Contato */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        Informações de Contato
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Telefone
                                            </label>
                                            <input
                                                type="tel"
                                                value={telefone}
                                                onChange={(e) => setTelefone(e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-white font-mono"
                                                placeholder="(11) 99999-9999"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Email <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-white"
                                                placeholder="usuario@empresa.com"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Configurações do Sistema */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                            </svg>
                                        </div>
                                        Configurações do Sistema
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Tipo de Usuário <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                value={tipousuario}
                                                onChange={(e) => setTipousuario(Number(e.target.value))}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-white"
                                            >
                                                <option value={3}>Solicitante</option>
                                                <option value={2}>Aprovador</option>
                                                <option value={1}>Administrador</option>
                                            </select>
                                        </div>

                                        {/* Campo de Setor - Apenas para Solicitante */}
                                        {tipousuario === 3 && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Setor (Secretaria) <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    value={codsetor}
                                                    onChange={(e) => setCodsetor(Number(e.target.value))}
                                                    required={tipousuario === 3}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-white"
                                                >
                                                    <option value="" disabled>Selecione um setor</option>
                                                    {setores.map(setor => (
                                                        <option key={setor.CODSETOR} value={setor.CODSETOR}>
                                                            {setor.DESCRICAO}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <div className="flex">
                                        <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p className="text-sm text-red-700">{error}</p>
                                    </div>
                                </div>
                            )}
                        </form>
                    )}
                </div>

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                    <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-10 rounded-2xl">
                        <div className="bg-white rounded-lg p-6 max-w-md mx-4">
                            <div className="flex items-center mb-4">
                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">Confirmar Exclusão</h3>
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setIsDeleting(true)}
                                    disabled={isLoading}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-red-300">
                                    Excluir
                                </button>
                                <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                    {!isEditMode ? (
                        // View Mode Footer
                        <div className="flex justify-between">
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={isDeleting}
                                className="px-6 py-3 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium transition-all duration-200 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center space-x-2 disabled:opacity-50"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span>Excluir Usuário</span>
                            </button>

                            <div className="flex space-x-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        console.log("Clique registado no botão 'X' dentro do modal.");
                                        onClose();
                                    }}
                                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-all duration-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                                >
                                    Fechar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleEdit}
                                    className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center space-x-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    <span>Editar</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        // Edit Mode Footer
                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-all duration-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                onClick={handleSave}
                                className="px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg font-medium transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center space-x-2"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        <span>Salvando...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Salvar Alterações</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <ConfirmationModal
                isOpen={isDeleting}
                onClose={() => setIsDeleting(false)}
                onConfirm={handleDelete}
                title="Confirmar Exclusão"
                message={`Tem certeza que deseja excluir o usuário ${user.primeiroNome}? Esta ação não pode ser desfeita.`}
            />
        </div>
    );
};

export default UserDetailsModal;
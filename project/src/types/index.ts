export type UserRoleConst = 'ADMIN' | 'APROVADOR' | 'SOLICITANTE';

export interface User {
  codUsuario: number;
  primeiroNome: string;
  ultimoNome: string | null;
  email: string;
  genero: string | null;
  numeroTelefone: string | null;
  idFuncionario: string | null;

  tipoUsuario: number;

  perfil: 'Admin' | 'Aprovador' | 'Solicitante';

  codSetor: number | null;
  setor: string; 
}

export interface Setor {
  CODSETOR: number;
  DESCRICAO: string;
  SALDO: number;
}

export interface KpiData {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export interface FinancialData {
  gastosPorSetor: {
    CODSETOR: number;
    DESCRICAO: string;
    GASTO_TOTAL: number;
  }[];
}

export interface Product {
  id: number;
  nome: string;
  descricao: string;
  preco: number;
  imgUrl: string;
  unit: string;
}

export interface CartItem extends Product {
  quantidade: number;
}

export interface PedidoPendente {
  id: number;
  data: string;
  status: number;
  solicitante: string;
  unidadeAdmin: string;    
  qtdItens: number;
  valor: number;
}

export interface OrderItem extends Product {
  quantidade: number;
}

export interface LegacyOrderDetail {
  id: number;
  data: string;
  status: number;
  solicitante: {
    nome: string;
    email: string;
  };
  unidadeAdmin: string;
  itens: OrderItem[];
}

export interface HistoricalOrder {
  id: number;
  data: string;
  status: number;
  solicitante: string;
  setor: string;
  qtdItens: number;
  valorTotal: number;
  concatRole?: 'RESULTADO' | 'ORIGEM' | null;
  concatGroupId?: number | null;
}
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
  codSetor: number;
  descricao: string;
  saldo: number;
}

export interface KpiData {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export interface UnitFinancials {
  id: string;
  nome: string;
  limiteTotal: number;
  saldoDisponivel: number;
  valorGasto: number;
  historico: {
    data: string;
    valorAnterior: number;
    novoValor: number;
    alteradoPor: string;
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
  status(status: any): unknown;
  id: number;
  data: string;
  solicitante: string;
  unidadeAdmin: string;
  qtdItens: number;
  valor: number;
}

export interface OrderItem extends Product {
  quantidade: number;
}

export interface OrderDetail {
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
}
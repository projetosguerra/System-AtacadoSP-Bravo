export interface User {
  codUsuario: number;
  numeroSequencia: number;
  primeiroNome: string;
  ultimoNome: string;
  genero: string;
  idFuncionario: string;
  numeroTelefone: string;
  perfil: 'Admin' | 'Aprovador' | 'Solicitante';
  email: string;
  setor: string;
  codSetor: number;
  tipoUsuario: number;
  ativo: boolean;
}

export interface Sector {
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
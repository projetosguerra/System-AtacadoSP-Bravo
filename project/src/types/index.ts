export interface User {
  id: number;
  numeroSequencia: number;
  primeiroNome: string;
  ultimoNome: string;
  genero: string;
  idFuncionario: string;
  numeroTelefone: string;
  cargo: 'Gestor' | 'Aprovador' | 'Solicitante'; // Define os valores possíveis
  designacao: string;
}

export interface PedidoPendente {
  id: string;
  data: string;
  solicitante: string;
  unidadeAdmin: string;
  qtdItens: number;
  valor: number;
}

export interface KpiData {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export interface LimitChangeLog {
  data: string;
  valorAnterior: number;
  novoValor: number;
  alteradoPor: string;
}

export interface UnitFinancials {
  id: string;
  nome: string;
  limiteTotal: number;
  valorGasto: number;
  saldoDisponivel: number;
  historico: LimitChangeLog[];
}

export interface Products {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  imgUrl: string;
  unit: string;
}

export interface CartItem extends Products {
  quantidade: number;
}
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

export interface Product {
  id: number;
  nome: string;
  descricao: string;
  preco: number;
  imgUrl: string;
  unit: string;
  codigoAuxiliar: string;
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
  status: string;
  setor: string;
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

export interface Products {
  id: number;
  nome: string;
  descricao: string;
  preco: number;
  imgUrl: string;
  unit: string;
  codigoAuxiliar: string;
}

export interface CartItem extends Products {
  quantidade: number;
}

export interface OrderItem extends Products {
  quantidade: number;
  quantidadeOriginal: number;
}

export interface OrderDetail extends PedidoPendente {
  itens: OrderItem[];
  custoUnit: number;
}

export interface OrderItem extends Products {
  quantidade: number;
  quantidadeOriginal: number;
}

export interface OrderDetail extends PedidoPendente {
  itens: OrderItem[];
  custoUnit: number;
}

export interface OrderDetail extends User {
  unidadeAdmin: string;
}
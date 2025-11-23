export type ConcatRole = 'RESULTADO' | 'ORIGEM' | null;

export interface PedidoItem {
  codProd: number;
  codigoAuxiliar: string | number | null;
  nome: string;
  unidade: string;
  qt: number;
  precoUnit: number;
  subtotal: number;
  imgUrl: string;
}

export interface PedidoConcatOrigem {
  id: number;
  status: number;
  statusLabel: string;
}

export interface PedidoConcatResultado {
  id: number;
  status: number;
  statusLabel: string;
}

export interface PedidoSolicitante {
  id: number;
  nome: string;
  email: string;
  codSetor: number;
  setorNome: string;
}

export interface PedidoAprovador {
  id: number;
  nome: string;
  email: string;
  perfil: number; // 1=Admin, 2=Aprovador, 3=Solicitante 
}

export interface PedidoEvento {
  idEvento: number;
  tipo: string;
  usuarioId: number | null;
  data: string;
  detalheJson: string | null;
}

export interface PedidoDetalhe {
  id: number;
  status: number;
  statusLabel: string;
  data: string;
  solicitante: PedidoSolicitante;
  unidadeAdmin: string;
  qtdItens: number;
  valorTotal: number;
  itens: PedidoItem[];
  concatRole: ConcatRole;
  concatGroupId: number | null;
  concatOrigens: PedidoConcatOrigem[];
  concatResultado: PedidoConcatResultado | null;
  aprovador: PedidoAprovador | null;
  eventos: PedidoEvento[];
  editavel: boolean;
  reprovacaoMotivo?: string;
}

export interface PedidoPendente {
  id: number;
  data: string;
  solicitante: string;
  unidadeAdmin: string;
  qtdItens: number;
  valor: number;
  status?: number;
}

export interface HistoricalOrder {
  id: number;
  data: string;
  status: number;
  solicitante: string;
  setor: string;
  qtdItens: number;
  valorTotal: number;
  concatRole?: ConcatRole;
  concatGroupId?: number | null;
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
  itens: {
    codProd: number;
    nome: string;
    unidade: string;
    quantidade: number;
    preco: number;
  }[];
}
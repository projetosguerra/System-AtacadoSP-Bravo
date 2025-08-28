import { OrderDetail, OrderItem } from '../types';

// Dados detalhados de um pedido específico
export const mockOrderDetail: OrderDetail = {
  id: '0246AHR',
  data: '21/08/2025',
  solicitante: 'Ana Silva',
  unidadeAdmin: 'Recursos Humanos',
  qtdItens: 100,
  valor: 5000.00,
  custoUnit: 17250.00,
  itens: [
    {
      id: 'prod_1',
      nome: 'Grampo para Grampeador 26/6',
      descricao: 'Galvanizado 2094 Maxprint - 5000UN',
      preco: 2.99,
      imgUrl: 'https://images.pexels.com/photos/159751/book-address-book-learning-learn-159751.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      unit: '5000UN',
      quantidade: 50,
      quantidadeOriginal: 50,
    },
    {
      id: 'prod_2',
      nome: 'Caneta Esferográfica Azul',
      descricao: 'Ponta média, tinta azul',
      preco: 1.50,
      imgUrl: 'https://images.pexels.com/photos/261763/pexels-photo-261763.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      unit: 'Unidade',
      quantidade: 30,
      quantidadeOriginal: 30,
    },
    {
      id: 'prod_6',
      nome: 'Papel Sulfite A4',
      descricao: 'Pacote com 500 folhas, branco',
      preco: 25.50,
      imgUrl: 'https://images.pexels.com/photos/1226398/pexels-photo-1226398.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      unit: 'Pacote',
      quantidade: 20,
      quantidadeOriginal: 20,
    },
  ],
};

// Função para buscar detalhes do pedido por ID
export const getOrderDetailById = (id: string): OrderDetail | null => {
  // Por enquanto retorna sempre o mesmo pedido mock
  // No futuro, isso seria uma chamada para API
  if (id === '0246AHR') {
    return mockOrderDetail;
  }
  return null;
};
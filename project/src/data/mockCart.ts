import { CartItem } from '../types';

export const mockCartItems: CartItem[] = [
  {
    id: 'prod_1',
    nome: 'Grampo para Grampeador 26/6',
    descricao: 'Galvanizado 2094 Maxprint - 5000UN',
    preco: 2.99,
    imgUrl: 'https://images.pexels.com/photos/159751/book-address-book-learning-learn-159751.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
    unit: '5000UN',
    quantidade: 10,
  },
  {
    id: 'prod_6',
    nome: 'Papel Sulfite A4',
    descricao: 'Pacote com 500 folhas, branco',
    preco: 25.50,
    imgUrl: 'https://images.pexels.com/photos/1226398/pexels-photo-1226398.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
    unit: 'Pacote',
    quantidade: 5,
  },
  {
    id: 'prod_2',
    nome: 'Caneta Esferográfica Azul',
    descricao: 'Ponta média, tinta azul',
    preco: 1.50,
    imgUrl: 'https://images.pexels.com/photos/261763/pexels-photo-261763.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
    unit: 'Unidade',
    quantidade: 25,
  },
];
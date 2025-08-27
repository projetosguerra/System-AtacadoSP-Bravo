import { UnitFinancials } from '../types';

export const mockFinancialData: UnitFinancials[] = [
  {
    id: 'rh',
    nome: 'Recursos Humanos',
    limiteTotal: 50000.00,
    valorGasto: 32750.00,
    saldoDisponivel: 17250.00,
    historico: [
      { data: '21/08/2025', valorAnterior: 40000.00, novoValor: 50000.00, alteradoPor: 'Luciano Lima' },
      { data: '20/07/2025', valorAnterior: 30000.00, novoValor: 40000.00, alteradoPor: 'Pietro Guerra' },
      { data: '15/06/2025', valorAnterior: 25000.00, novoValor: 30000.00, alteradoPor: 'Pietro Guerra' },
    ],
  },
  {
    id: 'admin',
    nome: 'Administração',
    limiteTotal: 75000.00,
    valorGasto: 15200.00,
    saldoDisponivel: 59800.00,
    historico: [
      { data: '15/08/2025', valorAnterior: 70000.00, novoValor: 75000.00, alteradoPor: 'Pietro Guerra' },
      { data: '10/07/2025', valorAnterior: 60000.00, novoValor: 70000.00, alteradoPor: 'Luciano Lima' },
    ],
  },
  {
    id: 'ti',
    nome: 'Tecnologia da Informação',
    limiteTotal: 120000.00,
    valorGasto: 87500.00,
    saldoDisponivel: 32500.00,
    historico: [
      { data: '18/08/2025', valorAnterior: 100000.00, novoValor: 120000.00, alteradoPor: 'Pietro Guerra' },
      { data: '05/08/2025', valorAnterior: 80000.00, novoValor: 100000.00, alteradoPor: 'Luciano Lima' },
    ],
  },
  {
    id: 'logistica',
    nome: 'Logística',
    limiteTotal: 95000.00,
    valorGasto: 42300.00,
    saldoDisponivel: 52700.00,
    historico: [
      { data: '12/08/2025', valorAnterior: 85000.00, novoValor: 95000.00, alteradoPor: 'Pietro Guerra' },
    ],
  },
];
// ... (imports e interface)

const OrdersHistoryTable: React.FC<OrdersHistoryTableProps> = ({ /* ...props... */ }) => {
  
  // CORREÇÃO AQUI: Alinhando o mapa de status com a nossa definição
  const statusMap = {
    1: { text: 'Aprovado', color: 'green' },
    2: { text: 'Reprovado', color: 'red' }, // <-- Alterado de 3 para 2
    3: { text: 'Em Análise', color: 'blue' },
  };

  // ... (resto do seu componente, formatCurrency, etc.)

  const getStatusBadge = (status: number) => {
    const statusInfo = statusMap[status as keyof typeof statusMap];
    if (!statusInfo) {
      // Fallback para status desconhecidos
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-800">Desconhecido ({status})</span>;
    }
    // ... (resto da sua função getStatusBadge)
  };

  // ... (resto do seu return JSX)
};

export default OrdersHistoryTable;
```

#### Passo 3: Conecte Todas as Páginas ao "Cérebro" Central

Finalmente, vamos fazer todas as páginas que precisam de dados de pedidos (Carrinho, Painel, Histórico, Detalhes) notificarem e lerem a partir do nosso `DataContext` central.

**Instrução 1: `CartContext.tsx`**
Altere a chamada de `refetchPedidos` para `refetchAllData`.

```javascript
// Dentro do seu CartContext.tsx, na função submitCart
const { refetchAllData } = useData(); // Altere para refetchAllData
// ...
refetchAllData(); // Altere para refetchAllData
```

**Instrução 2: `ApprovalPanelPage.tsx`**
Faça a página ler os dados corretos do `DataContext`.

```javascript
// Dentro do seu ApprovalPanelPage.tsx
const { pedidosPendentes, isLoading } = useData(); // Use isLoading em vez de isLoadingPedidos
// ...
// Use 'pedidosPendentes' e 'isLoading' no seu JSX
```

**Instrução 3: `AllOrdersPage.tsx`**
Faça a página de histórico ler os dados do `DataContext`.

```javascript
// Dentro do seu AllOrdersPage.tsx
import { useData } from '../context/DataContext'; // Importe o useData
// ...
const { pedidosHistorico, isLoading } = useData(); // Pegue os dados do contexto
// Remova o useEffect de busca local
// A sua lógica de useMemo agora deve depender de 'pedidosHistorico'
const filteredOrders = useMemo(() => { return pedidosHistorico.filter(...) }, [pedidosHistorico, ...]);
```

**Instrução 4: `OrderDetailPage.tsx`**
Altere a chamada de `refetchPedidos` para `refetchAllData`.

```javascript
// Dentro do seu OrderDetailPage.tsx, na função handleDecision
const { refetchAllData } = useData(); // Altere para refetchAllData
// ...
refetchAllData(); // Altere para refetchAllData

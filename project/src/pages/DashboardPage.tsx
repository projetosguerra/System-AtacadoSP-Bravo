import React, { useState, useEffect } from 'react';
import StatsCard from '../components/StatsCard';
import VolumeChart from '../components/LineChart';
import StatusChart from '../components/DonutChart';
import ApprovalTable from '../components/ApprovalTable';
import RecentActivities from '../components/RecentActivities';
import { Clock, DollarSign, Package, AlertTriangle } from 'lucide-react';

const DashboardPage = () => {
  const [novosPedidos, setNovosPedidos] = useState<number | string>('...');

  useEffect(() => {
    fetch('https://jsonplaceholder.typicode.com/todos')
      .then(response => response.json())
      .then(data => {
        setNovosPedidos(data.length);
      })
      .catch(error => {
        console.error("Erro ao buscar dados da API:", error);
        setNovosPedidos(0);
      });
  }, []);

  return (
    <main className="flex-1 overflow-x-hidden">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatsCard
          title="Novos Pedidos"
          value={novosPedidos.toString()}
          subtitle="Quantidade de pedidos no dia de hoje"
          icon={Package}
          iconBgColor="bg-pink-500"
        />
        <StatsCard
          title="Valor total aprovado"
          value="R$52.345,00"
          subtitle="0.2% a menos que o último mês"
          icon={DollarSign}
          iconBgColor="bg-green-500"
          changeType="negative"
        />
        <StatsCard
          title="Novos Pedidos"
          value="28"
          subtitle="Quantidade de pedidos no dia de hoje"
          icon={Package}
          iconBgColor="bg-pink-500"
          changeType="positive"
        />
        <StatsCard
          title="Conteste Abertos"
          value="2"
          subtitle="2 Contestes em Análise"
          icon={AlertTriangle}
          iconBgColor="bg-blue-500"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <VolumeChart />
        <StatusChart />
      </div>

      {/* Table and Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ApprovalTable />
        </div>
        <div>
          <RecentActivities />
        </div>
      </div>
    </main>
  );
}


export default DashboardPage;
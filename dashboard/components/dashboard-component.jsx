import React, { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { 
  EyeIcon, 
  ComputerDesktopIcon, 
  ChartBarIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Dashboard = ({ trackingId }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [realtimeData, setRealtimeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d');
  const [error, setError] = useState(null);

  // Función para cargar datos del dashboard
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/dashboard/${trackingId}?period=${period}`);

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar datos en tiempo real
  const loadRealtimeData = async () => {
    try {
      const response = await fetch(`/api/analytics/realtime/${trackingId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch realtime data');
      }

      const data = await response.json();
      setRealtimeData(data);
    } catch (err) {
      console.error('Error loading realtime data:', err);
    }
  };

  useEffect(() => {
    if (trackingId) {
      loadDashboardData();
      loadRealtimeData();

      // Actualizar datos en tiempo real cada 30 segundos
      const interval = setInterval(loadRealtimeData, 30000);
      return () => clearInterval(interval);
    }
  }, [trackingId, period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const metrics = dashboardData?.metrics || {};
  const realtime = realtimeData?.summary || {};

  // Configuración de gráfico de líneas para tendencias
  const lineChartData = {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    datasets: [
      {
        label: 'Bots de IA Detectados',
        data: [12, 19, 3, 5, 2, 8, 15],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Páginas Vistas',
        data: [65, 59, 80, 81, 56, 55, 40],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
      }
    ],
  };

  // Configuración de gráfico de dona para tipos de bots
  const doughnutData = {
    labels: metrics.topBots?.map(bot => bot.name) || [],
    datasets: [
      {
        data: metrics.topBots?.map(bot => bot.count) || [],
        backgroundColor: [
          '#3B82F6',
          '#10B981',
          '#F59E0B',
          '#EF4444',
          '#8B5CF6',
          '#F97316',
          '#06B6D4',
          '#84CC16'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Pixel Dashboard</h1>
            <p className="text-sm text-gray-500">Tracking ID: {trackingId}</p>
          </div>
          <div className="flex space-x-2">
            {['24h', '7d', '30d', '90d'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  period === p
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <EyeIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Eventos
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {metrics.totalEvents?.toLocaleString() || '0'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ComputerDesktopIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Bots de IA Detectados
                  </dt>
                  <dd className="text-lg font-medium text-blue-600">
                    {metrics.aiBotsDetected?.toLocaleString() || '0'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Sesiones Únicas
                  </dt>
                  <dd className="text-lg font-medium text-green-600">
                    {metrics.uniqueSessions?.toLocaleString() || '0'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Última Hora
                  </dt>
                  <dd className="text-lg font-medium text-yellow-600">
                    {realtime.aiBotsDetectedLastHour || '0'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de tendencias */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Tendencia de Actividad
          </h3>
          <Line data={lineChartData} options={{
            responsive: true,
            plugins: {
              legend: {
                position: 'top',
              },
            },
            scales: {
              y: {
                beginAtZero: true,
              },
            },
          }} />
        </div>

        {/* Gráfico de tipos de bots */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Tipos de Bots Detectados
          </h3>
          {metrics.topBots && metrics.topBots.length > 0 ? (
            <Doughnut data={doughnutData} options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'bottom',
                },
              },
            }} />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No hay datos de bots disponibles
            </div>
          )}
        </div>
      </div>

      {/* Tablas de datos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top páginas */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Páginas Más Visitadas
            </h3>
            <div className="mt-5">
              <div className="flow-root">
                <ul className="divide-y divide-gray-200">
                  {metrics.topPages?.slice(0, 5).map((page, index) => (
                    <li key={index} className="py-3">
                      <div className="flex items-center space-x-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {page.url}
                          </p>
                        </div>
                        <div className="inline-flex items-center text-sm text-gray-500">
                          {page.views} vistas
                        </div>
                      </div>
                    </li>
                  )) || (
                    <li className="py-3 text-gray-500 text-center">
                      No hay datos disponibles
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Top bots */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Bots Más Activos
            </h3>
            <div className="mt-5">
              <div className="flow-root">
                <ul className="divide-y divide-gray-200">
                  {metrics.topBots?.slice(0, 5).map((bot, index) => (
                    <li key={index} className="py-3">
                      <div className="flex items-center space-x-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {bot.name || 'Bot Desconocido'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {bot.description}
                          </p>
                        </div>
                        <div className="inline-flex items-center text-sm text-blue-600 font-medium">
                          {bot.count} detecciones
                        </div>
                      </div>
                    </li>
                  )) || (
                    <li className="py-3 text-gray-500 text-center">
                      No hay bots detectados
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actividad en tiempo real */}
      {realtimeData && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Actividad Reciente
            </h3>
            <div className="mt-5">
              <div className="flow-root">
                <ul className="divide-y divide-gray-200">
                  {realtimeData.data?.slice(0, 10).map((event, index) => (
                    <li key={index} className="py-3">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {event.type === 'ai_bot_detected' ? (
                            <ComputerDesktopIcon className="h-5 w-5 text-blue-500" />
                          ) : (
                            <EyeIcon className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {event.type === 'ai_bot_detected' 
                              ? `Bot detectado: ${event.data?.name || 'Desconocido'}`
                              : 'Página vista'
                            }
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {event.url}
                          </p>
                        </div>
                        <div className="text-sm text-gray-500">
                          {format(new Date(event.timestamp), 'HH:mm')}
                        </div>
                      </div>
                    </li>
                  )) || (
                    <li className="py-3 text-gray-500 text-center">
                      No hay actividad reciente
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

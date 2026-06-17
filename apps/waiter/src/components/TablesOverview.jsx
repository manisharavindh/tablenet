import { Users, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@tablenet/supabase';

export default function TablesOverview({ onSelectTable }) {
  const [tables, setTables] = useState([]);

  useEffect(() => {
    fetchTablesAndOrders();

    const channel1 = supabase.channel('waiter-tables')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, fetchTablesAndOrders)
      .subscribe();

    const channel2 = supabase.channel('waiter-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchTablesAndOrders)
      .subscribe();

    const channel3 = supabase.channel('waiter-assistance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assistance_requests' }, fetchTablesAndOrders)
      .subscribe();

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
      supabase.removeChannel(channel3);
    };
  }, []);

  const fetchTablesAndOrders = async () => {
    // RLS handles filtering by the user's restaurant_id
    const [{ data: tablesData }, { data: ordersData }, { data: assistanceData }] = await Promise.all([
      supabase.from('tables').select('*').order('table_number', { ascending: true }),
      supabase.from('orders').select('*').in('status', ['placed', 'preparing', 'ready', 'served']),
      supabase.from('assistance_requests').select('*').eq('status', 'pending')
    ]);

    if (tablesData && ordersData) {
      const computedTables = tablesData.map(table => {
        // Find active orders for this table
        const tableOrders = ordersData.filter(o => o.table_id === table.id);
        const activeOrders = tableOrders.filter(o => o.status !== 'served');
        const servedOrders = tableOrders.filter(o => o.status === 'served');
        
        const tableRequests = assistanceData.filter(r => r.table_id === table.id);
        const needsAssistance = tableRequests.length > 0;

        let status = 'open';
        let timeSeated = null;

        if (activeOrders.length > 0) {
           const hasReady = activeOrders.some(o => o.status === 'ready');
           const hasPreparing = activeOrders.some(o => o.status === 'preparing');
           const hasPlaced = activeOrders.some(o => o.status === 'placed');
           if (hasReady) status = 'waiting';
           else status = 'seated';
           
           timeSeated = getFormattedTimeSince(activeOrders[0].created_at);
        } else if (servedOrders.length > 0) {
           status = 'served';
           timeSeated = getFormattedTimeSince(servedOrders[0].created_at);
        }

        return {
          ...table,
          number: table.table_number,
          capacity: 4, // placeholder
          status,
          timeSeated,
          needsAssistance,
          assistanceRequests: tableRequests
        };
      });
      setTables(computedTables);
    }
  };

  const getFormattedTimeSince = (dateString) => {
    const diff = Math.floor((new Date() - new Date(dateString)) / 60000);
    return `${diff}m`;
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'open': return 'bg-surface shadow-soft text-primary';
      case 'seated': return 'bg-blue-50 shadow-soft text-blue-800';
      case 'waiting': return 'bg-amber-50 shadow-soft text-amber-800 border-2 border-amber-200';
      case 'served': return 'bg-green-50 shadow-soft text-green-800';
      default: return 'bg-surface';
    }
  };

  const openCount = tables.filter(t => t.status === 'open').length;
  const waitingCount = tables.filter(t => t.status === 'waiting').length;
  const seatedCount = tables.filter(t => t.status === 'seated').length;
  const servedCount = tables.filter(t => t.status === 'served').length;

  return (
    <div className="p-4 max-w-md mx-auto pb-24 pt-6">
      <div className="mb-6 px-2">
        <h1 className="text-3xl font-bold tracking-tight mb-4">Tables</h1>
        <div className="flex gap-2 text-xs font-medium overflow-x-auto pb-2 snap-x">
          <span className="px-4 py-2 bg-surface shadow-inset rounded-full snap-start whitespace-nowrap">All ({tables.length})</span>
          {waitingCount > 0 && <span className="px-4 py-2 bg-amber-50 text-amber-800 rounded-full shadow-soft snap-start whitespace-nowrap">Waiting ({waitingCount})</span>}
          {seatedCount > 0 && <span className="px-4 py-2 bg-blue-50 text-blue-800 rounded-full shadow-soft snap-start whitespace-nowrap">Seated ({seatedCount})</span>}
          {servedCount > 0 && <span className="px-4 py-2 bg-green-50 text-green-800 rounded-full shadow-soft snap-start whitespace-nowrap">Served ({servedCount})</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 px-2">
        {tables.map(table => (
          <button 
            key={table.id}
            onClick={() => onSelectTable(table)}
            className={`${getStatusColor(table.status)} rounded-3xl p-5 text-left active:scale-[0.98] transition-transform flex flex-col justify-between min-h-[9rem] border border-white/50`}
          >
            <div className="flex justify-between items-start">
              <span className="text-2xl font-bold flex items-center gap-2">
                T{table.number}
                {table.needsAssistance && (
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                )}
              </span>
              <div className="flex items-center gap-1 text-xs font-semibold bg-white/50 px-2 py-1 rounded-full">
                <Users size={12} />
                <span>{table.capacity}</span>
              </div>
            </div>
            
            <div>
              <span className="text-sm font-bold capitalize block mb-1">{table.status}</span>
              {table.timeSeated && (
                <div className="flex items-center gap-1 text-xs font-medium opacity-80">
                  <Clock size={12} />
                  <span>{table.timeSeated}</span>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

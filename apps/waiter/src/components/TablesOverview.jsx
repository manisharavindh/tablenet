import { Users, Clock, Settings, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@tablenet/supabase';
import WaiterSettings from './WaiterSettings';
import { playNotificationSound } from '../utils/soundProfiles';

export default function TablesOverview({ onSelectTable }) {
  const [tables, setTables] = useState(() => {
    const cached = sessionStorage.getItem('waiter_tables');
    return cached ? JSON.parse(cached) : [];
  });
  const [filter, setFilter] = useState('all');
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(localStorage.getItem('waiter_sound_disabled') !== 'true');

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    localStorage.setItem('waiter_sound_disabled', (!newState).toString());
    if (newState) {
      const profile = localStorage.getItem('waiter_sound_profile') || 'classic';
      playNotificationSound(profile);
    }
  };

  useEffect(() => {
    fetchTablesAndOrders();

    const intervalId = setInterval(() => {
      fetchTablesAndOrders();
    }, 30000);

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
      clearInterval(intervalId);
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
      supabase.removeChannel(channel3);
    };
  }, []);

  const fetchTablesAndOrders = async () => {
    // Clean up expired sessions server-side first
    await supabase.rpc('cleanup_expired_sessions');

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

        const tableRequests = assistanceData ? assistanceData.filter(r => r.table_id === table.id) : [];
        const needsAssistance = tableRequests.length > 0;

        let status = 'open';
        let timeSeated = null;
        let remainingMins = null;

        if (table.session_start_time) {
          const seatedTimeStr = new Date(table.session_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const elapsed = getFormattedTimeSince(table.session_start_time);
          timeSeated = `Seated at ${seatedTimeStr}`;
        }

        if (table.active_session_id && table.session_ends_at) {
          status = 'seated';
          remainingMins = Math.max(0, Math.ceil((new Date(table.session_ends_at).getTime() - new Date().getTime()) / 60000));
        }

        if (activeOrders.length > 0) {
          const hasReady = activeOrders.some(o => o.status === 'ready');
          const hasPreparing = activeOrders.some(o => o.status === 'preparing');
          const hasPlaced = activeOrders.some(o => o.status === 'placed');
          if (hasReady) status = 'waiting';
          else status = 'seated';
        } else if (servedOrders.length > 0) {
          status = 'served';
        }

        return {
          ...table,
          number: table.table_number,
          capacity: table.capacity || 4,
          status,
          timeSeated,
          remainingMins,
          needsAssistance,
          assistanceRequests: tableRequests
        };
      });
      setTables(computedTables);
      sessionStorage.setItem('waiter_tables', JSON.stringify(computedTables));
    }
  };

  const getFormattedTimeSince = (dateString) => {
    const diff = Math.floor((new Date() - new Date(dateString)) / 60000);
    return `${diff}m`;
  };

  const getStatusColor = (table) => {
    if (table.needsAssistance) return 'bg-red-50 border border-red-200 text-red-900 shadow-sm';
    switch (table.status) {
      case 'open': return 'bg-white shadow-sm border border-slate-100 text-theme-text-main';
      case 'seated': return 'bg-blue-50 border border-blue-100 text-blue-900';
      case 'waiting': return 'bg-amber-50 border border-amber-200 text-amber-900';
      case 'served': return 'bg-green-50 border border-green-200 text-green-900';
      default: return 'bg-white border border-slate-100';
    }
  };

  const waitingCount = tables.filter(t => t.status === 'waiting').length;
  const seatedCount = tables.filter(t => t.status === 'seated').length;
  const servedCount = tables.filter(t => t.status === 'served').length;
  const callsCount = tables.filter(t => t.needsAssistance).length;

  const getPriority = (t) => {
    if (t.needsAssistance) return 0;
    if (t.status === 'waiting') return 1;
    if (t.status === 'seated') return 2;
    if (t.status === 'served') return 3;
    if (t.status === 'open') return 4;
    return 5;
  };

  const filteredTables = tables
    .filter(t => {
      if (filter === 'all') return true;
      if (filter === 'calls') return t.needsAssistance;
      return t.status === filter;
    })
    .sort((a, b) => getPriority(a) - getPriority(b));

  const getFilterStyle = (f) => {
    const base = "py-2.5 px-2 rounded-xl transition-all text-[11px] uppercase tracking-wider font-extrabold border shadow-sm flex justify-center items-center gap-1.5 active:scale-95";
    if (filter === f) {
      if (f === 'calls') return `${base} bg-red-500 text-white border-red-600`;
      if (f === 'waiting') return `${base} bg-amber-500 text-white border-amber-600`;
      if (f === 'seated') return `${base} bg-blue-500 text-white border-blue-600`;
      if (f === 'served') return `${base} bg-green-500 text-white border-green-600`;
      return `${base} bg-theme-text-main text-white border-theme-text-main`;
    }
    // Unselected styles
    if (f === 'calls') return `${base} bg-red-50 text-red-900 border-red-100`;
    if (f === 'waiting') return `${base} bg-amber-50 text-amber-900 border-amber-100`;
    if (f === 'seated') return `${base} bg-blue-50 text-blue-900 border-blue-100`;
    if (f === 'served') return `${base} bg-green-50 text-green-900 border-green-100`;
    return `${base} bg-white text-slate-500 border-slate-200`;
  };

  return (
    <div className="p-4 max-w-md mx-auto pb-24 pt-6 bg-theme-bg min-h-screen">
      <div className="mb-6 px-2">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight italic text-theme-text-main">tablenet</h1>
            <span className="bg-theme-primary/10 text-theme-primary px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest">waiter</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              className={`p-2 rounded-full shadow-sm transition-colors active:scale-95 ${soundEnabled ? 'text-theme-primary bg-red-50 border border-red-100 hover:bg-red-100' : 'text-slate-400 bg-white border border-slate-100 hover:text-theme-text-main'}`}
              title={soundEnabled ? "Sound On" : "Sound Off"}
            >
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 bg-white border border-slate-100 rounded-full shadow-sm text-slate-400 hover:text-theme-text-main transition-colors active:scale-95"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => setFilter('all')} className={getFilterStyle('all')}>
              All <span className="opacity-60 bg-black/10 px-1.5 py-0.5 rounded-md">{tables.length}</span>
            </button>
            <button onClick={() => setFilter('calls')} className={getFilterStyle('calls')}>
              Calls <span className="opacity-60 bg-black/10 px-1.5 py-0.5 rounded-md">{callsCount}</span>
            </button>
            <button onClick={() => setFilter('waiting')} className={getFilterStyle('waiting')}>
              Wait <span className="opacity-60 bg-black/10 px-1.5 py-0.5 rounded-md">{waitingCount}</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setFilter('seated')} className={getFilterStyle('seated')}>
              Seated <span className="opacity-60 bg-black/10 px-1.5 py-0.5 rounded-md">{seatedCount}</span>
            </button>
            <button onClick={() => setFilter('served')} className={getFilterStyle('served')}>
              Served <span className="opacity-60 bg-black/10 px-1.5 py-0.5 rounded-md">{servedCount}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 px-2">
        {filteredTables.map(table => (
          <button
            key={table.id}
            onClick={() => onSelectTable(table)}
            className={`${getStatusColor(table)} rounded-3xl p-5 text-left active:scale-[0.97] transition-all duration-200 flex flex-col justify-between min-h-[9.5rem] relative overflow-hidden`}
          >
            {table.needsAssistance && (
              <span className="absolute bottom-5 right-5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-theme-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-theme-primary"></span>
              </span>
            )}
            <div className="flex justify-between items-start w-full">
              <span className="text-3xl font-black flex items-center gap-2 tracking-tight">
                T{table.number}
              </span>
              <div className="flex flex-col gap-1 items-end">
                {table.remainingMins !== null && (
                  <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${table.remainingMins <= 5
                    ? 'bg-red-50 text-red-600 border-red-200'
                    : 'bg-black/5 text-black/60 border-black/10'
                    }`}>
                    <Clock size={10} />
                    <span>{table.remainingMins}m</span>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full pr-6 mt-4">
              <span className="text-sm font-bold capitalize block">
                {table.status.replace('_', ' ')}
              </span>
              {table.timeSeated && (
                <div className="flex items-center gap-1 text-xs font-semibold opacity-70 mt-1">
                  {/* <Clock size={12} /> */}
                  <span>{table.timeSeated}</span>
                </div>
              )}
            </div>
          </button>
        ))}
        {filteredTables.length === 0 && (
          <div className="col-span-2 text-center py-10 text-theme-text-sec font-medium">
            No tables match the selected filter.
          </div>
        )}
      </div>

      {showSettings && <WaiterSettings onClose={() => setShowSettings(false)} />}
    </div >
  );
}

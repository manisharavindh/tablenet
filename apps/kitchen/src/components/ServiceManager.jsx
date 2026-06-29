import { useState, useEffect } from 'react';
import { supabase } from '@tablenet/supabase';
import { Check, Bell, Droplets, Receipt, Clock, User, Grid } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ServiceTableDetail from './ServiceTableDetail';

export default function ServiceManager({ targetTableId, onTargetTableHandled }) {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [tables, setTables] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [restaurantId, setRestaurantId] = useState(null);
  const [mobileTab, setMobileTab] = useState('requests');

  useEffect(() => {
    if (targetTableId && tables.length > 0) {
      const table = tables.find(t => t.id === targetTableId);
      if (table) {
        setSelectedTable(table);
        if (onTargetTableHandled) onTargetTableHandled();
      }
    }
  }, [targetTableId, tables, onTargetTableHandled]);

  useEffect(() => {
    const init = async () => {
      if (!user) return;
      const { data: roleData } = await supabase.from('user_roles').select('restaurant_id').eq('user_id', user.id).single();
      if (roleData) {
        setRestaurantId(roleData.restaurant_id);
        fetchData(roleData.restaurant_id);
      }
    };
    init();
  }, [user]);

  useEffect(() => {
    if (!restaurantId) return;

    const intervalId = setInterval(() => {
      fetchData(restaurantId);
    }, 30000);

    const channel1 = supabase.channel(`kitchen-assistance-${restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assistance_requests', filter: `restaurant_id=eq.${restaurantId}` }, () => {
        fetchData(restaurantId);
      })
      .subscribe();

    const channel2 = supabase.channel(`kitchen-tables-${restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables', filter: `restaurant_id=eq.${restaurantId}` }, () => {
        fetchData(restaurantId);
      })
      .subscribe();

    const channel3 = supabase.channel(`kitchen-orders-${restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` }, () => {
        fetchData(restaurantId);
      })
      .subscribe();

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
      supabase.removeChannel(channel3);
    };
  }, [restaurantId]);

  const fetchData = async (rId) => {
    // Clean up expired sessions server-side first
    await supabase.rpc('cleanup_expired_sessions');

    const [{ data: reqData }, { data: tableData }, { data: ordersData }] = await Promise.all([
      supabase
        .from('assistance_requests')
        .select(`
          *,
          tables (
            table_number,
            status,
            active_session_id
          )
        `)
        .eq('restaurant_id', rId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true }),
      supabase
        .from('tables')
        .select('*')
        .eq('restaurant_id', rId)
        .order('table_number', { ascending: true }),
      supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', rId)
    ]);

    if (tableData && ordersData) {
      const computedTables = tableData.map(table => {
        const tableOrders = ordersData.filter(o => o.table_id === table.id);
        const activeOrders = tableOrders.filter(o => o.status !== 'served');
        const servedOrders = tableOrders.filter(o => o.status === 'served');

        let computedStatus = 'open';
        let remainingMins = null;
        let timeSeated = null;

        if (table.session_start_time) {
          const seatedTimeStr = new Date(table.session_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          timeSeated = `${seatedTimeStr}`;
        }

        // If there's an active session, we consider it at least seated
        if (table.active_session_id && table.session_ends_at) {
          computedStatus = 'seated';
          remainingMins = Math.max(0, Math.ceil((new Date(table.session_ends_at).getTime() - new Date().getTime()) / 60000));
        }

        if (activeOrders.length > 0) {
          const hasReady = activeOrders.some(o => o.status === 'ready');
          if (hasReady) computedStatus = 'waiting';
          else computedStatus = 'seated';
        } else if (servedOrders.length > 0) {
          computedStatus = 'served';
        }

        return {
          ...table,
          computedStatus,
          number: table.table_number,
          capacity: table.capacity || 4,
          remainingMins,
          timeSeated,
          needsAssistance: reqData?.some(r => r.table_id === table.id)
        };
      });
      computedTables.sort((a, b) => {
        const getPriority = (t) => {
          if (t.needsAssistance) return 0;
          if (t.computedStatus === 'waiting') return 1;
          if (t.computedStatus === 'seated') return 2;
          if (t.computedStatus === 'served') return 3;
          if (t.computedStatus === 'open') return 4;
          return 5;
        };
        return getPriority(a) - getPriority(b);
      });

      setTables(computedTables);
      if (reqData) {
        setRequests(reqData);
      }
      if (ordersData) {
        setAllOrders(ordersData);
      }
    }
  };

  const resolveRequest = async (id) => {
    const { error } = await supabase.from('assistance_requests').update({ status: 'resolved' }).eq('id', id);
    if (!error) {
      setRequests(requests.filter(req => req.id !== id));
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'Water': return <Droplets className="text-blue-500" size={24} />;
      case 'Bill': return <Receipt className="text-green-500" size={24} />;
      case 'Waiter': return <User className="text-theme-primary" size={24} />;
      default: return <Bell className="text-amber-500" size={24} />;
    }
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getWaitTime = (isoString) => {
    const diff = Math.floor((new Date() - new Date(isoString)) / 60000);
    if (diff < 1) return 'Just now';
    return `${diff} min ago`;
  };

  const getStatusColor = (table) => {
    if (table.needsAssistance) return 'bg-red-50 border border-red-200 text-red-900 shadow-sm';
    switch (table.computedStatus) {
      case 'open': return 'bg-white shadow-sm border border-slate-100 text-theme-text-main';
      case 'seated': return 'bg-blue-50 border border-blue-100 text-blue-900';
      case 'waiting': return 'bg-amber-50 border border-amber-200 text-amber-900';
      case 'served': return 'bg-green-50 border border-green-200 text-green-900';
      default: return 'bg-white border border-slate-100';
    }
  };

  const seatedTablesCount = tables.filter(t => t.computedStatus !== 'open').length;

  return (
    <>
      {selectedTable && (
        <ServiceTableDetail 
          table={selectedTable} 
          onBack={() => setSelectedTable(null)} 
          waiterId={user?.id} 
          orders={allOrders.filter(o => o.table_id === selectedTable.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))}
          assistanceRequests={requests.filter(r => r.table_id === selectedTable.id).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))}
          onResolveRequest={resolveRequest}
        />
      )}
      <div className={selectedTable ? "hidden" : "p-4 pt-0 md:p-6 max-w-[1600px] mx-auto h-full overflow-y-auto block md:flex md:flex-col md:overflow-hidden"}>
      {/* Mobile Sub-Navigation */}
      <div className="md:hidden flex-shrink-0 flex p-3 gap-2 bg-surface border-b border-theme-border overflow-x-auto hide-scrollbar sticky top-0 z-10 -mx-4 px-4 mb-2">
        <button
          onClick={() => setMobileTab('requests')}
          className={`flex-1 min-w-[120px] py-2 text-xs font-bold rounded-xl duration-300 ease-in-out flex items-center justify-center gap-1.5 ${mobileTab === 'requests'
            ? 'bg-theme-primary text-white border border-theme-border shadow-md shadow-theme-primary/20'
            : 'bg-theme-bg text-theme-text-sec hover:bg-surface border border-theme-border'
            }`}
        >
          <Bell size={14} />
          <span>Requests</span>
          {requests.length > -1 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${mobileTab === 'requests' ? 'bg-white/20' : 'bg-black/10 text-black'}`}>
              {requests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setMobileTab('tables')}
          className={`flex-1 min-w-[120px] py-2 text-xs font-bold rounded-xl duration-300 ease-in-out flex items-center justify-center gap-1.5 ${mobileTab === 'tables'
            ? 'bg-theme-primary text-white border border-theme-border shadow-md shadow-theme-primary/20'
            : 'bg-theme-bg text-theme-text-sec hover:bg-surface border border-theme-border'
            }`}
        >
          <Grid size={14} />
          <span>Tables</span>
          {seatedTablesCount > -1 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${mobileTab === 'tables' ? 'bg-white/20' : 'bg-black/10 text-black'}`}>
              {seatedTablesCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8 flex-1 md:overflow-hidden">

        {/* Requests Column */}
        <div className={`md:w-1/3 lg:w-1/4 xl:w-1/5 md:min-w-[320px] md:max-w-[400px] flex flex-col ${mobileTab === 'requests' ? 'flex' : 'hidden'} md:flex md:overflow-y-auto hide-scrollbar pb-24 md:pb-6`}>
          <h2 className="hidden md:flex text-xl font-bold text-theme-text-main mb-4 items-center gap-2 flex-shrink-0 md:sticky md:top-0 bg-theme-bg z-10 py-2">
            <Bell size={20} />
            Pending Assistance
          </h2>

          {requests.length === 0 ? (
            <div className="bg-theme-bg/50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-8 text-center h-48 mt-2">
              <Bell className="text-slate-300 mb-4" size={32} />
              <h3 className="text-lg font-bold text-theme-text-main mb-1">No Active Requests</h3>
              <p className="text-theme-sec text-sm">All guests are currently satisfied.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {requests.map((req) => (
                <div key={req.id} className="bg-surface rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-slate-50 rounded-xl">
                        {getIcon(req.request_type)}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-theme-text-main">Table {req.tables?.table_number || '?'}</h3>
                        <p className="text-theme-sec text-sm font-medium">{req.request_type}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-theme-sec text-xs font-bold mb-4 mt-auto opacity-70">
                    <Clock size={14} strokeWidth={2.5} />
                    <span>{getWaitTime(req.created_at)}</span>
                  </div>

                  <button
                    onClick={() => resolveRequest(req.id)}
                    className="w-full bg-theme-primary/10 hover:bg-theme-primary hover:text-white text-theme-primary font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors group text-sm"
                  >
                    <Check size={18} className="group-hover:scale-110 transition-transform" />
                    Mark as Resolved
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tables Column */}
        <div className={`flex-1 flex flex-col ${mobileTab === 'tables' ? 'flex' : 'hidden'} md:flex md:overflow-y-auto hide-scrollbar pb-24 md:pb-6`}>
          <h2 className="hidden md:flex text-xl font-bold text-theme-text-main mb-4 items-center gap-2 flex-shrink-0 md:sticky md:top-0 bg-theme-bg z-10 py-2">
            <Grid className="text-theme-sec" size={20} />
            All Tables
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {tables.map(table => (
              <button
                key={table.id}
                onClick={() => setSelectedTable(table)}
                className={`${getStatusColor(table)} rounded-3xl p-5 text-left active:scale-[0.97] transition-all duration-200 flex flex-col justify-between min-h-[9.5rem] relative overflow-hidden group hover:shadow-md`}
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
                <div className="w-full pr-6 mt-4">
                  <span className="text-sm font-bold capitalize block">
                    {table.needsAssistance ? 'Help Needed' : table.computedStatus.replace('_', ' ')}
                  </span>
                  {table.timeSeated && (
                    <div className="flex items-center gap-1 text-xs font-semibold opacity-70 mt-1">
                      <span>{table.timeSeated}</span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
    </>
  );
}

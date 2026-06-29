import { Clock, Check, ChefHat, BellRing, Play, CheckCircle2, ArrowUpDown, ChevronRight } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@tablenet/supabase';
import { playNotificationSound } from '../utils/soundProfiles';

export default function LiveTicketBoard({ onNewTicket, onNavigateToTable, sortOrder, setSortOrder }) {
  const columns = ['placed', 'preparing', 'ready'];
  const [tickets, setTickets] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mobileTab, setMobileTab] = useState('placed');
  const prevTicketsCount = useRef(0);
  const isInitialLoad = useRef(true);
  const pendingUpdates = useRef(new Set());

  useEffect(() => {
    fetchTickets();

    const channel = supabase.channel('kitchen-tickets')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          fetchTickets(true);
        }
      )
      .subscribe();

    const timer = setInterval(() => setCurrentTime(new Date()), 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, []);

  const fetchTickets = async (isRealtimeUpdate = false) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, tables(table_number)')
      .in('status', ['placed', 'preparing', 'ready'])
      .order('created_at', { ascending: true });

    if (data) {
      setTickets(prev => {
        const merged = data.map(dbTicket => {
          if (pendingUpdates.current.has(dbTicket.id)) {
            const localTicket = prev.find(t => t.id === dbTicket.id);
            return localTicket ? { ...localTicket } : dbTicket;
          }
          return dbTicket;
        });

        if (!isInitialLoad.current && prevTicketsCount.current !== null && merged.length > prevTicketsCount.current) {
          const soundDisabled = localStorage.getItem('kitchen_sound_disabled') === 'true';
          if (!soundDisabled) {
            const profile = localStorage.getItem('kitchen_sound_profile') || 'classic';
            playNotificationSound(profile);
          }
          if (onNewTicket) {
            onNewTicket();
          }
        }
        prevTicketsCount.current = merged.length;
        return merged;
      });
      isInitialLoad.current = false;
    } else if (error) {
      console.error(error);
    }
  };

  const updateTicketStatus = async (ticket, newStatus) => {
    pendingUpdates.current.add(ticket.id);

    // Optimistic UI update for instant feedback
    setTickets(prev => prev.map(t => {
      if (t.id !== ticket.id) return t;
      return {
        ...t,
        status: newStatus,
        items: newStatus === 'ready' ? t.items.map(i => ({ ...i, completed: true })) : t.items
      };
    }));

    let updates = { status: newStatus };

    if (newStatus === 'ready') {
      updates.items = ticket.items.map(i => ({ ...i, completed: true }));
    }

    // Fire network request in background
    supabase.from('orders').update(updates).eq('id', ticket.id).then(({ error }) => {
      if (error) console.error("Failed to update ticket status:", error);
      setTimeout(() => pendingUpdates.current.delete(ticket.id), 2000);
    });
  };

  const toggleItemCompletion = async (ticket, itemIndex) => {
    if (ticket.status === 'ready') return;

    pendingUpdates.current.add(ticket.id);

    const newItems = [...ticket.items];
    newItems[itemIndex] = { ...newItems[itemIndex], completed: !newItems[itemIndex].completed };

    // Do not auto-move to ready. Let the user explicitly click READY.
    // If it's placed and they check an item, move it to preparing.
    const newStatus = ticket.status === 'placed' ? 'preparing' : ticket.status;

    // Optimistic UI update for instant feedback
    setTickets(prev => prev.map(t => {
      if (t.id !== ticket.id) return t;
      return { ...t, status: newStatus, items: newItems };
    }));

    // Fire network request in background
    supabase.from('orders').update({ items: newItems, status: newStatus }).eq('id', ticket.id).then(({ error }) => {
      if (error) console.error("Failed to update ticket items:", error);
      setTimeout(() => pendingUpdates.current.delete(ticket.id), 2000);
    });
  };

  const handle86Item = async (e, item) => {
    e.stopPropagation();
    if (!item.id) {
      alert("Cannot mark this item out of stock (missing ID).");
      return;
    }

    if (window.confirm(`Mark ${item.name} as OUT OF STOCK?`)) {
      const { error } = await supabase.from('menu_items').update({ is_available: false }).eq('id', item.id);
      if (error) {
        alert("Failed to mark out of stock: " + error.message);
      }
    }
  };

  const getMinutesElapsed = (createdAt) => {
    return Math.max(0, Math.floor((currentTime - new Date(createdAt)) / 60000));
  };

  const getTicketColorClasses = (minutesElapsed, status) => {
    if (status === 'ready') return "bg-green-50 border-green-200 text-green-900 dark:bg-green-950/30 dark:border-green-800/50 dark:text-green-300";
    if (minutesElapsed >= 20) return "bg-red-50 border-red-200 text-red-900 dark:bg-red-950/30 dark:border-red-800/50 dark:text-red-300";
    if (minutesElapsed >= 10) return "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800/50 dark:text-amber-300";
    return "bg-surface border-theme-border text-theme-text-main";
  };

  const getTimerColorClasses = (minutesElapsed, status) => {
    if (status === 'ready') return "text-green-700 bg-green-200 dark:text-green-300 dark:bg-green-900/50";
    if (minutesElapsed >= 20) return "text-white bg-red-600 animate-pulse dark:shadow-[0_0_15px_rgba(220,38,38,0.5)]";
    if (minutesElapsed >= 10) return "text-amber-800 bg-amber-300 dark:text-amber-300 dark:bg-amber-900/50";
    return "text-theme-text-sec bg-theme-bg border border-theme-border";
  };

  const getTableBtnColorClasses = (minutesElapsed, status) => {
    if (status === 'ready') return "text-green-800 bg-green-500/20 hover:bg-green-500/30 border-green-500/30 dark:text-green-300";
    if (minutesElapsed >= 20) return "text-red-800 bg-red-500/20 hover:bg-red-500/30 border-red-500/30 dark:text-red-300";
    if (minutesElapsed >= 10) return "text-amber-800 bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/30 dark:text-amber-300";
    return "text-theme-primary bg-theme-primary/10 hover:bg-theme-primary/20 border-theme-primary/20";
  };

  return (
    <div className="h-full overflow-y-auto block lg:flex lg:flex-col lg:overflow-hidden transition-colors duration-300">
      {/* Mobile Sub-Navigation */}
      <div className="lg:hidden flex p-3 gap-2 bg-surface border-b border-theme-border overflow-x-auto hide-scrollbar sticky top-0 z-10">
        {columns.map(col => (
          <button
            key={col}
            onClick={() => setMobileTab(col)}
            className={`flex-1 min-w-[100px] py-2 text-xs font-bold rounded-xl duration-300 ease-in-out flex items-center justify-center gap-1.5 ${mobileTab === col
              ? 'bg-theme-primary text-white border border-theme-border shadow-md shadow-theme-primary/20'
              : 'bg-theme-bg text-theme-text-sec hover:bg-surface border border-theme-border'
              }`}
          >
            <span className="capitalize">{col === 'placed' ? 'New' : col}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${mobileTab === col ? 'bg-white/20' : 'bg-black/10'}`}>
              {tickets.filter(t => t.status === col).length}
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 lg:overflow-hidden">
        {columns.map(col => (
          <div key={col} className={`${mobileTab === col ? 'flex' : 'hidden'} lg:flex flex-col lg:h-full bg-theme-bg md:border border-theme-border md:shadow-inner lg:overflow-hidden transition-colors duration-300`}>
            <div className="hidden lg:flex justify-between items-center px-2 md:px-4 pt-2 md:pt-4 pb-4 flex-shrink-0 bg-theme-bg z-10">
              <h2 className="font-bold text-lg capitalize text-theme-text-main flex items-center gap-2">
                {col === 'placed'}
                {col === 'preparing'}
                {col === 'ready'}
                {col === 'placed' ? 'New Orders' : col}
              </h2>

              <div className="flex items-center gap-2">
                <span className="bg-surface text-theme-text-main font-bold px-3 py-1 rounded-full text-sm border border-theme-border">
                  {tickets.filter(t => t.status === col).length}
                </span>
              </div>
            </div>

            <div className="flex-1 lg:overflow-y-auto space-y-4 hide-scrollbar px-2 md:px-4 pb-10 md:pb-16 pt-2 lg:pt-0">
              {tickets
                .filter(t => t.status === col)
                .sort((a, b) => {
                  const timeA = new Date(a.created_at).getTime();
                  const timeB = new Date(b.created_at).getTime();
                  return sortOrder === 'oldest' ? timeA - timeB : timeB - timeA;
                })
                .map(ticket => {
                  const minutesElapsed = getMinutesElapsed(ticket.created_at);
                  const colorClasses = getTicketColorClasses(minutesElapsed, ticket.status);
                  const timerClasses = getTimerColorClasses(minutesElapsed, ticket.status);
                  const tableBtnClasses = getTableBtnColorClasses(minutesElapsed, ticket.status);

                  return (
                    <div
                      key={ticket.id}
                      className={`rounded-xl p-5 border relative transition-colors duration-300 ${colorClasses}`}
                    >
                      <div className="flex justify-between items-center mb-4 pb-4 border-b border-theme-border flex-wrap gap-2 transition-colors duration-300">
                        <div className="flex items-center gap-2">
                          <button
                            className={`flex items-center gap-1 font-black text-xl cursor-pointer px-3 py-1.5 pr-1 rounded-xl border transition-all active:scale-95 group shadow-sm ${tableBtnClasses}`}
                            onClick={() => onNavigateToTable && onNavigateToTable(ticket.table_id)}
                            title="Go to Table Services"
                          >
                            T{ticket.tables?.table_number}
                            <ChevronRight size={18} strokeWidth={3} className="opacity-60 group-hover:opacity-100 transition-all" />
                          </button>
                          <span className="font-bold text-xs opacity-50 uppercase tracking-wider">#{ticket.id.substring(0, 6)}</span>
                        </div>
                        <div className={`flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-xl shadow-sm transition-colors duration-300 ${timerClasses}`}>
                          <Clock size={16} strokeWidth={2.5} />
                          {minutesElapsed}m
                        </div>
                      </div>

                      <ul className="space-y-2 mb-6">
                        {ticket.items.map((item, idx) => (
                          <li
                            key={idx}
                            onClick={() => toggleItemCompletion(ticket, idx)}
                            className={`flex gap-3 items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all hover:border-theme-text-sec border ${item.completed ? 'bg-black/10 dark:bg-black/30 opacity-50 border-transparent' : 'bg-surface shadow-sm border-theme-border'}`}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border transition-colors ${item.completed ? 'border-theme-accent bg-theme-accent text-white' : 'border-slate-300 dark:border-white/20 bg-theme-bg'}`}>
                                {item.completed && <Check size={12} strokeWidth={3} />}
                              </div>
                              <span className={`font-semibold text-[14px] leading-tight ${item.completed ? 'line-through opacity-70' : 'text-theme-text-main'}`}>
                                <span className="text-theme-primary mr-1.5">{item.quantity}x</span>
                                {item.name}
                              </span>
                            </div>

                            {/* 86 Button */}
                            {!item.completed && ticket.status !== 'ready' && (
                              <button
                                onClick={(e) => handle86Item(e, item)}
                                className="group relative px-2 py-1 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900/50 dark:hover:bg-red-900/50 text-[10px] font-bold rounded uppercase transition-colors whitespace-nowrap ml-2"
                              >
                                86
                                <div className="absolute top-full right-0 mt-2 px-2 py-1 bg-slate-800 dark:bg-white text-white dark:text-slate-900 text-[10px] font-bold rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-xl whitespace-nowrap z-[100] pointer-events-none">
                                  Mark out of stock
                                  <div className="absolute -top-1.5 right-2 border-4 border-transparent border-b-slate-800 dark:border-b-white"></div>
                                </div>
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>

                      {ticket.chef_instructions && (
                        <div className="mb-4 bg-red-50 border border-red-100 text-red-800 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-300 p-3 rounded-lg text-sm font-medium leading-relaxed shadow-inner transition-colors duration-300">
                          <div className="uppercase tracking-widest font-bold text-[10px] mb-1.5 text-red-500 flex items-center gap-1.5">
                            <ChefHat size={14} /> Chef Note
                          </div>
                          {ticket.chef_instructions}
                        </div>
                      )}

                      {col === 'placed' && (
                        <button
                          onClick={() => updateTicketStatus(ticket, 'preparing')}
                          className="w-full bg-surface border border-theme-border text-theme-text-main hover:border-theme-primary hover:text-theme-primary font-bold text-sm py-2.5 rounded-lg transition-all flex justify-center items-center gap-2"
                        >
                          Start Preparing
                        </button>
                      )}

                      {col === 'preparing' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateTicketStatus(ticket, 'ready')}
                            className="w-full bg-theme-primary text-white shadow-lg shadow-theme-primary/20 hover:bg-theme-primary-light font-bold text-sm py-2.5 rounded-lg transition-all flex justify-center items-center gap-2"
                          >
                            Complete
                          </button>
                        </div>
                      )}

                      {col === 'ready' && (
                        <div className="text-center text-green-700 bg-green-100/50 border border-green-200/50 dark:text-green-400 dark:bg-green-950/30 dark:border-green-900/50 font-bold text-xs py-3 rounded-lg flex items-center justify-center gap-2 transition-colors duration-300">
                          Waiting for Waiter
                        </div>
                      )}
                    </div>
                  );
                })}
              {tickets.filter(t => t.status === col).length === 0 && (
                <div className="text-center py-12 opacity-20 flex flex-col items-center">
                  <ChefHat size={32} className="mb-3" />
                  <span className="font-bold text-sm">No tickets</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

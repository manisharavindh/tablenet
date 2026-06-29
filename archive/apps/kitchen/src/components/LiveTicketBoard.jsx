import { Clock, Check, ChefHat, BellRing, Play, CheckCircle2 } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@tablenet/supabase';
import { playNotificationSound } from '../utils/soundProfiles';

export default function LiveTicketBoard() {
  const columns = ['placed', 'preparing', 'ready'];
  const [tickets, setTickets] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const prevTicketsCount = useRef(0);

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
      setTickets(data);
      if (prevTicketsCount.current !== null && data.length > prevTicketsCount.current) {
        // Only play sound if a NEW ticket arrived (count increased)
        const soundDisabled = localStorage.getItem('kitchen_sound_disabled') === 'true';
        if (!soundDisabled) {
          const profile = localStorage.getItem('kitchen_sound_profile') || 'classic';
          playNotificationSound(profile);
        }
      }
      prevTicketsCount.current = data.length;
    } else if (error) {
      console.error(error);
    }
  };

  const updateTicketStatus = async (ticket, newStatus) => {
    let updates = { status: newStatus };

    if (newStatus === 'ready') {
      updates.items = ticket.items.map(i => ({ ...i, completed: true }));
    }

    await supabase.from('orders').update(updates).eq('id', ticket.id);
  };

  const toggleItemCompletion = async (ticket, itemIndex) => {
    if (ticket.status === 'ready') return;

    const newItems = [...ticket.items];
    newItems[itemIndex] = { ...newItems[itemIndex], completed: !newItems[itemIndex].completed };

    // Do not auto-move to ready. Let the user explicitly click READY.
    // If it's placed and they check an item, move it to preparing.
    const newStatus = ticket.status === 'placed' ? 'preparing' : ticket.status;

    await supabase.from('orders').update({ items: newItems, status: newStatus }).eq('id', ticket.id);
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
      } else {
        alert(`${item.name} is now 86'd (Out of Stock)`);
      }
    }
  };

  const getMinutesElapsed = (createdAt) => {
    return Math.floor((currentTime - new Date(createdAt)) / 60000);
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

  return (
    <div className="h-[calc(100vh-80px)] overflow-hidden flex flex-col transition-colors duration-300">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden gap-4 p-4">
        {columns.map(col => (
          <div key={col} className="flex flex-col h-full bg-theme-bg border border-theme-border shadow-inner rounded-2xl p-4 overflow-hidden transition-colors duration-300">
            <div className="flex justify-between items-center mb-4 px-1 flex-shrink-0 sticky top-0">
              <h2 className="font-bold text-lg capitalize text-theme-text-main flex items-center gap-2">
                {col === 'placed' && <span className="w-2 h-2 rounded-full bg-theme-primary shadow-[0_0_8px_#E23744]"></span>}
                {col === 'preparing' && <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]"></span>}
                {col === 'ready' && <span className="w-2 h-2 rounded-full bg-theme-accent shadow-[0_0_8px_#24963F]"></span>}
                {col === 'placed' ? 'New Orders' : col}
              </h2>
              <span className="bg-surface text-theme-text-main font-bold px-3 py-1 rounded-full text-sm border border-theme-border">
                {tickets.filter(t => t.status === col).length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 hide-scrollbar pb-10">
              {tickets.filter(t => t.status === col).map(ticket => {
                const minutesElapsed = getMinutesElapsed(ticket.created_at);
                const colorClasses = getTicketColorClasses(minutesElapsed, ticket.status);
                const timerClasses = getTimerColorClasses(minutesElapsed, ticket.status);

                return (
                  <div
                    key={ticket.id}
                    className={`rounded-xl p-5 shadow-lg border relative transition-colors duration-300 ${colorClasses}`}
                  >
                    <div className="flex justify-between items-start mb-4 pb-4 border-b border-theme-border flex-wrap gap-2 transition-colors duration-300">
                      <div>
                        <div className="font-bold text-xs uppercase tracking-widest opacity-60 mb-1">Table</div>
                        <div className="font-bold text-2xl leading-none">{ticket.tables?.table_number}</div>
                      </div>
                      <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-colors duration-300 ${timerClasses}`}>
                        <Clock size={14} strokeWidth={2.5} />
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
                              className="px-2 py-1 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900/50 dark:hover:bg-red-900/50 text-[10px] font-bold rounded uppercase transition-colors whitespace-nowrap ml-2"
                              title="Mark out of stock"
                            >
                              86
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
                        <Play size={16} className="text-amber-500 fill-amber-500" /> Start Preparing
                      </button>
                    )}

                    {col === 'preparing' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateTicketStatus(ticket, 'ready')}
                          className="w-full bg-theme-primary text-white shadow-lg shadow-theme-primary/20 hover:bg-theme-primary-light font-bold text-sm py-2.5 rounded-lg transition-all flex justify-center items-center gap-2"
                        >
                          <Check size={18} strokeWidth={2.5} /> Ready
                        </button>
                      </div>
                    )}

                    {col === 'ready' && (
                      <div className="text-center text-green-700 bg-green-100/50 border border-green-200/50 dark:text-green-400 dark:bg-green-950/30 dark:border-green-900/50 font-bold text-xs py-3 rounded-lg flex items-center justify-center gap-2 transition-colors duration-300">
                        <Check size={16} strokeWidth={3} /> Waiting for Waiter
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

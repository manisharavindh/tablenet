import { Clock, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@tablenet/supabase';

export default function LiveTicketBoard() {
  const columns = ['placed', 'preparing', 'ready'];
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    fetchTickets();

    const channel = supabase.channel('kitchen-tickets')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTickets = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, tables(table_number)')
      .in('status', ['placed', 'preparing', 'ready'])
      .order('created_at', { ascending: true });

    if (data) {
      setTickets(data);
    } else if (error) {
      console.error(error);
    }
  };

  const updateTicketStatus = async (id, newStatus) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', id);
    // Realtime channel will re-fetch the tickets automatically
  };

  const getTimeElapsed = (createdAt) => {
    const diff = Math.floor((new Date() - new Date(createdAt)) / 60000);
    return `${diff}m`;
  };

  return (
    <div className="p-6 h-[calc(100vh-80px)] overflow-hidden">
      <div className="grid grid-cols-3 gap-6 h-full">
        {columns.map(col => (
          <div key={col} className="bg-slate-100 shadow-inset rounded-3xl p-4 flex flex-col h-full border border-slate-200">
            <div className="flex justify-between items-center mb-4 px-2">
              <h2 className="font-bold text-lg capitalize text-primary">{col}</h2>
              <span className="bg-surface shadow-soft text-secondary font-bold px-3 py-1 rounded-full text-sm">
                {tickets.filter(t => t.status === col).length}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 px-2 pb-4">
              {tickets.filter(t => t.status === col).map(ticket => (
                <div key={ticket.id} className="bg-[url('https://www.transparenttextures.com/patterns/rice-paper-2.png')] bg-amber-50 rounded-b-lg rounded-t-sm p-4 shadow-md border-t-8 border-amber-300 relative">
                  <div className="flex justify-between items-start mb-3 pb-3 border-b border-amber-200 border-dashed flex-wrap gap-2">
                    <div className="font-mono text-xl font-bold text-amber-900">Table {ticket.tables?.table_number}</div>
                    <div className="flex items-center gap-1 text-sm text-amber-700 font-bold">
                      <Clock size={14} />
                      {getTimeElapsed(ticket.created_at)}
                    </div>
                  </div>
                  <ul className="space-y-2 mb-6 font-semibold text-amber-900 text-sm">
                    {ticket.items.map((item, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="text-amber-500">•</span>
                        <span>{item.quantity}x {item.name}</span>
                      </li>
                    ))}
                  </ul>

                  {ticket.chef_instructions && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-800 p-2.5 rounded-lg text-xs font-bold leading-tight font-sans">
                      <div className="uppercase tracking-widest text-[9px] mb-1 text-red-500">Chef Instructions</div>
                      {ticket.chef_instructions}
                    </div>
                  )}
                  
                  {col !== 'ready' && (
                    <button 
                      onClick={() => updateTicketStatus(ticket.id, col === 'placed' ? 'preparing' : 'ready')}
                      className="w-full bg-surface text-primary shadow-soft hover:shadow-inset font-bold py-3 rounded-xl transition-all text-sm"
                    >
                      {col === 'placed' ? 'Start Preparing' : 'Mark Ready'}
                    </button>
                  )}
                  {col === 'ready' && (
                    <div className="text-center text-green-800 font-bold text-sm bg-green-100 py-3 rounded-xl flex items-center justify-center gap-2 border border-green-200">
                      <Check size={16} /> Waiting for server
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { ChevronLeft, Check, Trash2, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@tablenet/supabase';
import { useNavigate } from 'react-router-dom';

export default function TableDetail({ table, onBack, waiterId }) {
  const [orders, setOrders] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();

    const channel = supabase.channel(`waiter-orders-${table.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `table_id=eq.${table.id}` },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table.id]);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('table_id', table.id)
      .order('created_at', { ascending: false });

    if (data) setOrders(data);
  };

  const handleServe = async (id) => {
    await supabase.from('orders').update({ status: 'served' }).eq('id', id);
  };

  const handleClearTable = async () => {
    if (!window.confirm('Are you sure you want to clear this table? This will permanently delete all active order data for this table.')) {
      return;
    }
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('table_id', table.id);
    
    if (error) {
      alert("Failed to clear table. You may need to add a DELETE policy for the orders table in Supabase.");
      console.error(error);
    } else {
      onBack();
    }
  };

  const handleAddToOrder = () => {
    navigate(`/w/${waiterId}/table/${table.id}/menu`);
  };

  return (
    <div className="flex flex-col h-screen bg-background max-w-md mx-auto relative">
      <header className="px-4 py-4 flex items-center justify-between bg-background/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200/50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-surface shadow-soft rounded-full active:shadow-inset">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold">Table {table.number}</h1>
            <p className="text-sm text-secondary font-medium capitalize">{table.status} • {table.capacity} Guests</p>
          </div>
        </div>
        {orders.length > 0 && (
          <button onClick={handleClearTable} className="p-2 bg-red-50 text-red-600 rounded-full active:scale-95 transition-transform" title="Clear Table">
            <Trash2 size={20} />
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
        <h2 className="font-semibold text-lg px-2">Active Orders</h2>
        
        {orders.length === 0 && (
          <p className="text-secondary px-2 text-sm">No active orders for this table.</p>
        )}

        {orders.map(order => (
          <div key={order.id} className="card p-4 flex items-center justify-between">
            <div className="flex-1 mr-4">
              <h3 className="font-semibold text-sm leading-tight">
                {order.items?.map(i => `${i.quantity}x ${i.name}`).join(', ')}
              </h3>
              <p className={`text-xs font-bold mt-1 capitalize ${
                order.status === 'ready' ? 'text-green-600' : 
                order.status === 'preparing' ? 'text-amber-600' : 
                order.status === 'served' ? 'text-slate-400' : 'text-slate-500'
              }`}>
                {order.status}
              </p>
            </div>
            
            {order.status === 'ready' && (
              <button 
                onClick={() => handleServe(order.id)}
                className="btn-accent px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-md active:shadow-inset shrink-0"
              >
                <Check size={16} />
                Serve
              </button>
            )}
            {order.status === 'served' && (
              <span className="text-green-600 bg-green-50 p-2 rounded-full shadow-inset-sm shrink-0">
                <Check size={20} />
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 bg-surface shadow-[0_-10px_40px_rgba(0,0,0,0.05)] rounded-t-3xl pb-safe">
        <button onClick={handleAddToOrder} className="btn btn-primary w-full flex items-center justify-center gap-2">
          <Plus size={20} />
          Add to Order
        </button>
      </div>
    </div>
  );
}

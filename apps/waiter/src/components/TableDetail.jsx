import { ChevronLeft, Check, Trash2, Plus, Receipt, ArrowRightLeft, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@tablenet/supabase';
import { useNavigate } from 'react-router-dom';
import SlideToConfirm from './SlideToConfirm';

export default function TableDetail({ table, onBack, waiterId }) {
  const [orders, setOrders] = useState(() => {
    const cached = sessionStorage.getItem(`waiter_orders_${table.id}`);
    return cached ? JSON.parse(cached) : [];
  });
  const [assistanceRequests, setAssistanceRequests] = useState(() => {
    const cached = sessionStorage.getItem(`waiter_assistance_${table.id}`);
    return cached ? JSON.parse(cached) : [];
  });

  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [availableTables, setAvailableTables] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
    fetchAssistanceRequests();

    const channel1 = supabase.channel(`waiter-orders-${table.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `table_id=eq.${table.id}` },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    const channel2 = supabase.channel(`waiter-assistance-${table.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assistance_requests', filter: `table_id=eq.${table.id}` },
        () => {
          fetchAssistanceRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
    };
  }, [table.id]);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('table_id', table.id)
      .order('created_at', { ascending: false });

    if (data) {
      setOrders(data);
      sessionStorage.setItem(`waiter_orders_${table.id}`, JSON.stringify(data));
    }
  };

  const fetchAssistanceRequests = async () => {
    const { data } = await supabase
      .from('assistance_requests')
      .select('*')
      .eq('table_id', table.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (data) {
      setAssistanceRequests(data);
      sessionStorage.setItem(`waiter_assistance_${table.id}`, JSON.stringify(data));
    }
  };

  const handleServe = async (id) => {
    await supabase.from('orders').update({ status: 'served' }).eq('id', id);
  };

  const handleResolveRequest = async (id) => {
    await supabase.from('assistance_requests').update({ status: 'resolved' }).eq('id', id);
  };

  const handleClearTable = async () => {
    if (!window.confirm('Are you sure you want to clear this table? This will permanently delete all active order data.')) {
      return;
    }
    clearTableAndFinish();
  };

  const clearTableAndFinish = async () => {
    await supabase.from('assistance_requests').update({ status: 'resolved' }).eq('table_id', table.id).eq('status', 'pending');
    await supabase.from('orders').delete().eq('table_id', table.id);

    // Clear cart and instructions cache for this table
    sessionStorage.removeItem(`cart_${table.id}`);
    sessionStorage.removeItem(`instructions_${table.id}`);

    await supabase.from('tables').update({ status: 'available' }).eq('id', table.id);

    onBack();
  };

  const handleAddToOrder = () => {
    navigate(`/w/${waiterId}/table/${table.id}/menu`);
  };

  const handleOpenTransfer = async () => {
    const { data } = await supabase.from('tables').select('*').eq('restaurant_id', table.restaurant_id).eq('status', 'available').order('table_number');
    setAvailableTables(data || []);
    setIsTransferModalOpen(true);
  };

  const handleTransferTable = async (newTableId) => {
    await supabase.from('orders').update({ table_id: newTableId }).eq('table_id', table.id);
    await supabase.from('assistance_requests').update({ table_id: newTableId }).eq('table_id', table.id);

    await supabase.from('tables').update({ status: 'seated' }).eq('id', newTableId);

    await supabase.from('tables').update({ status: 'available' }).eq('id', table.id);

    onBack();
  };

  const calculateTotals = () => {
    let subtotal = 0;
    orders.forEach(o => {
      o.items?.forEach(i => {
        subtotal += (i.price * i.quantity);
      });
    });
    const gst = Math.round(subtotal * 0.05);
    return { subtotal, gst, total: subtotal + gst };
  };

  const { subtotal, gst, total } = calculateTotals();

  return (
    <div className="flex flex-col h-[100dvh] bg-theme-bg max-w-md mx-auto relative overflow-hidden">
      <header className="px-4 py-4 flex items-center justify-between bg-theme-bg/90 sticky top-0 z-10 border-b border-slate-200/50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-white shadow-sm border border-slate-100 rounded-full active:scale-95 transition-transform text-theme-text-main">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-theme-text-main">Table {table.number}</h1>
            <p className="text-sm text-theme-text-sec font-medium capitalize">{table.status} • {table.capacity} Guests</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleOpenTransfer} className="p-3 bg-blue-50 text-blue-600 rounded-full active:scale-95 transition-transform" title="Transfer Table">
            <ArrowRightLeft size={20} />
          </button>
          {(orders.length > 0 || assistanceRequests.length > 0) && (
            <button onClick={handleClearTable} className="p-3 bg-red-50 text-red-600 rounded-full active:scale-95 transition-transform" title="Clear Table">
              <Trash2 size={20} />
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
        {assistanceRequests.length > 0 && (
          <div className="space-y-3 mb-6">
            <h2 className="font-semibold text-lg px-2 text-theme-primary flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-theme-primary"></span>
              </span>
              Assistance Needed
            </h2>
            {assistanceRequests.map(req => (
              <div key={req.id} className="bg-red-50 border border-red-200 p-5 rounded-3xl flex items-center justify-between shadow-sm">
                <div>
                  <h3 className="font-bold text-red-900">{req.request_type}</h3>
                  <p className="text-xs text-red-700 font-medium mt-1">Requested just now</p>
                </div>
                <button
                  onClick={() => handleResolveRequest(req.id)}
                  className="bg-theme-primary text-white px-5 py-2.5 rounded-2xl text-sm font-bold shadow-lg shadow-red-500/20 active:scale-95 transition-transform"
                >
                  Resolve
                </button>
              </div>
            ))}
          </div>
        )}

        <h2 className="font-semibold text-lg px-2 text-theme-text-main">Active Orders</h2>

        {orders.length === 0 && (
          <p className="text-theme-text-sec px-2 text-sm font-medium">No active orders for this table.</p>
        )}

        {orders.map(order => (
          <div key={order.id} className="card p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 mr-4">
                <h3 className="font-bold text-sm leading-tight text-theme-text-main">
                  {order.items?.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                </h3>
                {order.chef_instructions && (
                  <p className="text-xs text-theme-primary font-bold mt-1.5 italic">Note: {order.chef_instructions}</p>
                )}
                <p className={`text-xs font-bold mt-1.5 capitalize ${order.status === 'ready' ? 'text-theme-accent' :
                  order.status === 'preparing' ? 'text-amber-600' :
                    order.status === 'served' ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                  {order.status}
                </p>
              </div>

              {order.status === 'ready' && (
                <button
                  onClick={() => handleServe(order.id)}
                  className="btn-accent px-5 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 shrink-0"
                >
                  <Check size={18} />
                  Serve
                </button>
              )}
              {order.status === 'served' && (
                <span className="text-theme-accent bg-green-50 p-2.5 rounded-full shrink-0 border border-green-100">
                  <Check size={20} />
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white rounded-t-3xl pb-safe z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] grid grid-cols-2 gap-3">
        <button onClick={() => setIsBillModalOpen(true)} className="bg-slate-50 border border-slate-200 text-slate-700 w-full py-4 rounded-xl text-lg font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform">
          <Receipt size={22} />
          Bill
        </button>
        <button onClick={handleAddToOrder} className="bg-theme-primary text-white w-full py-4 rounded-xl text-lg font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform">
          <Plus size={22} />
          Add Order
        </button>
      </div>

      {/* Bill Modal */}
      {isBillModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-black text-theme-text-main flex items-center gap-2">
                <Receipt size={24} className="text-theme-primary" />
                Table {table.number} Bill
              </h2>
              <button onClick={() => setIsBillModalOpen(false)} className="p-2 bg-slate-50 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {orders.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No items ordered yet.</p>
              ) : (
                <div className="space-y-4">
                  {orders.map(o => o.items?.map((item, idx) => (
                    <div key={`${o.id}-${idx}`} className="flex justify-between items-start text-sm">
                      <div className="flex-1 pr-4">
                        <span className="font-bold text-slate-700">{item.quantity}x</span> {item.name}
                      </div>
                      <div className="font-bold text-slate-800">
                        ₹{item.price * item.quantity}
                      </div>
                    </div>
                  )))}

                  <div className="pt-4 border-t border-slate-200 border-dashed space-y-2">
                    <div className="flex justify-between text-slate-500 text-sm">
                      <span>Subtotal</span>
                      <span>₹{subtotal}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-sm">
                      <span>GST (5%)</span>
                      <span>₹{gst}</span>
                    </div>
                    <div className="flex justify-between text-xl font-black text-theme-text-main pt-2">
                      <span>Total</span>
                      <span className="text-theme-primary">₹{total}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 pb-safe">
              <SlideToConfirm
                onConfirm={clearTableAndFinish}
                text="Paid & Clear"
                subtext="Swipe to confirm"
                variant="success"
              />
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in slide-in-from-bottom-8">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-black text-theme-text-main flex items-center gap-2">
                <ArrowRightLeft size={24} className="text-blue-500" />
                Transfer Table
              </h2>
              <button onClick={() => setIsTransferModalOpen(false)} className="p-2 bg-slate-50 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <p className="text-slate-500 text-sm font-medium mb-4">Select an available table to transfer all orders and assistance requests to:</p>

              {availableTables.length === 0 ? (
                <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl">
                  No available tables found.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {availableTables.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleTransferTable(t.id)}
                      className="p-4 rounded-2xl border-2 border-slate-100 flex flex-col items-center justify-center hover:border-blue-500 hover:bg-blue-50 transition-colors"
                    >
                      <span className="text-2xl font-black text-slate-700">T{t.table_number}</span>
                      <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Cap: {t.capacity}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

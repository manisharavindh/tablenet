import { ChevronLeft, Check, Trash2, Plus, ArrowRightLeft, Clock, Receipt, User, Droplets, Bell, X, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@tablenet/supabase';
import WaiterMenu from './waiter/WaiterMenu';
import SlideToConfirm from './SlideToConfirm';
import ExtendSessionModal from './ExtendSessionModal';

export default function ServiceTableDetail({ table, onBack, waiterId, orders = [], assistanceRequests = [], onResolveRequest }) {
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isClosingTransfer, setIsClosingTransfer] = useState(false);
  const [isAddOrderMenuOpen, setIsAddOrderMenuOpen] = useState(false);
  const [availableTables, setAvailableTables] = useState([]);
  const [isMobileBillOpen, setIsMobileBillOpen] = useState(false);
  const [isClosingBill, setIsClosingBill] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [isClosingExtend, setIsClosingExtend] = useState(false);
  const [extendingSession, setExtendingSession] = useState(false);

  const handleCloseBill = () => {
    setIsClosingBill(true);
    setTimeout(() => {
      setIsClosingBill(false);
      setIsMobileBillOpen(false);
    }, 200);
  };

  const handleCloseTransfer = () => {
    setIsClosingTransfer(true);
    setTimeout(() => {
      setIsClosingTransfer(false);
      setIsTransferModalOpen(false);
    }, 200);
  };

  const handleCloseExtend = () => {
    setIsClosingExtend(true);
    setTimeout(() => {
      setIsClosingExtend(false);
      setShowExtendModal(false);
    }, 200);
  };



  const handleServe = async (id) => {
    await supabase.from('orders').update({ status: 'served' }).eq('id', id);
  };

  const handleResolveRequest = async (id) => {
    if (onResolveRequest) {
      onResolveRequest(id);
    } else {
      await supabase.from('assistance_requests').update({ status: 'resolved' }).eq('id', id);
    }
  };

  const handleClearTable = async (isPaid = false) => {
    if (!isPaid) {
      if (!window.confirm('Are you sure you want to clear without payment? This deletes all active order data.')) {
        return;
      }
    }
    await supabase.from('assistance_requests').update({ status: 'resolved' }).eq('table_id', table.id).eq('status', 'pending');
    await supabase.from('orders').delete().eq('table_id', table.id);

    await supabase.from('tables').update({
      status: 'available',
      active_session_id: null,
      session_start_time: null,
      session_secret: null
    }).eq('id', table.id);

    onBack();
  };

  const handleAddToOrder = () => {
    setIsAddOrderMenuOpen(true);
  };

  if (isAddOrderMenuOpen) {
    return (
      <WaiterMenu
        tableId={table.id}
        waiterId={waiterId}
        onBack={() => setIsAddOrderMenuOpen(false)}
      />
    );
  }

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

  const handleExtendSession = async (minutes) => {
    setExtendingSession(true);
    try {
      const { error, data } = await supabase.rpc('extend_table_session', {
        p_table_id: table.id,
        p_session_secret: table.session_secret,
        p_additional_minutes: minutes,
        p_is_customer: false
      });
      if (error || data?.error) {
        alert(data?.message || error?.message || 'Failed to extend session');
      } else {
        handleCloseExtend();
      }
    } catch (err) {
      alert('An error occurred while extending the session.');
    } finally {
      setExtendingSession(false);
    }
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

  const getIcon = (type) => {
    switch (type) {
      case 'Water': return <Droplets className="text-blue-500" size={20} />;
      case 'Bill': return <Receipt className="text-green-500" size={20} />;
      case 'Waiter': return <User className="text-theme-primary" size={20} />;
      default: return <Bell className="text-amber-500" size={20} />;
    }
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col absolute inset-0 z-40 bg-theme-bg overflow-hidden">
      {/* DESKTOP HEADER */}
      <div className="hidden lg:flex px-8 py-5 border-b border-theme-border shrink-0 bg-white shadow-sm items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-surface hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors text-theme-text-main flex items-center gap-2 font-bold shadow-sm">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-theme-text-main flex items-center gap-3">
              Table {table.number}
              <span className="text-sm font-bold bg-theme-bg px-3 py-1 rounded-lg border border-slate-200 text-theme-sec uppercase tracking-widest">{table.computedStatus || table.status}</span>
              {table.remainingMins !== null && (
                <button
                  onClick={() => setShowExtendModal(true)}
                  className={`text-xs px-3 py-1 rounded-lg flex items-center gap-1.5 active:scale-95 transition-transform ${table.remainingMins <= 5
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                >
                  <Clock size={14} /> {table.remainingMins}m left
                </button>
              )}
            </h1>
            {table.session_start_time && (
              <p className="text-sm font-medium text-theme-text-sec mt-1">
                Seated at {new Date(table.session_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>

        {/* HEADER ACTIONS */}
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={handleAddToOrder} className="bg-theme-primary hover:bg-theme-primary-light text-white font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition-all shadow-sm text-sm">
            <Plus size={16} />
            Add Order
          </button>
          <button onClick={handleOpenTransfer} className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition-all border border-blue-200 text-sm">
            <ArrowRightLeft size={16} />
            Transfer
          </button>
          {table.remainingMins !== null && (
            <button onClick={() => setShowExtendModal(true)} className="bg-amber-50 hover:bg-amber-100 text-amber-600 font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition-all border border-amber-200 text-sm">
              <Clock size={16} />
              Extend
            </button>
          )}
          <button onClick={() => handleClearTable(false)} className="bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition-all border border-red-200 text-sm active:scale-95">
            <Trash2 size={16} />
            Clear
          </button>
        </div>
      </div>

      {/* MOBILE WAITER HEADER */}
      <header className="lg:hidden px-4 py-3 flex items-center justify-between bg-theme-bg/90 sticky top-0 z-10 border-b border-slate-200/50">
        <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
          <button onClick={onBack} className="p-2 bg-white shadow-sm border border-slate-100 rounded-full active:scale-95 transition-transform text-theme-text-main shrink-0">
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-theme-text-main truncate">
                Table {table.number}
              </h1>
              {table.remainingMins !== null && (
                <button
                  onClick={() => setShowExtendModal(true)}
                  className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 active:scale-95 transition-transform whitespace-nowrap shrink-0 ${table.remainingMins <= 5
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                >
                  <Clock size={10} /> {table.remainingMins}m left
                </button>
              )}
            </div>
            <p className="text-xs text-theme-text-sec font-medium capitalize mt-0.5 truncate">
              {table.status}
              {table.session_start_time && ` • Seated ${new Date(table.session_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={handleOpenTransfer} className="p-2.5 bg-blue-50 text-blue-600 rounded-full active:scale-95 transition-transform" title="Transfer Table">
            <ArrowRightLeft size={18} />
          </button>
          {(orders.length > 0 || assistanceRequests.length > 0) && (
            <button onClick={() => handleClearTable(false)} className="p-2.5 bg-red-50 text-red-600 rounded-full active:scale-95 transition-transform" title="Clear Table">
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 pb-48 lg:pb-8 space-y-8">

          {assistanceRequests.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-theme-primary mb-4 flex items-center gap-2">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-theme-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-theme-primary"></span>
                </span>
                Pending Assistance Requests
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {assistanceRequests.map(req => (
                  <div key={req.id} className="bg-red-50 border border-red-200 p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2.5 rounded-xl border border-red-100">
                        {getIcon(req.request_type)}
                      </div>
                      <div>
                        <h3 className="font-bold text-red-900">{req.request_type}</h3>
                        <p className="text-xs text-red-700 font-medium mt-1">{formatTime(req.created_at)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleResolveRequest(req.id)}
                      className="bg-theme-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-theme-primary-light active:scale-95 transition-all"
                    >
                      Resolve
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-xl font-bold text-theme-text-main mb-4 flex items-center gap-2">
              <Clock className="text-theme-sec" size={20} />
              Active Orders
            </h2>
            {orders.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-[32px] p-12 text-center shadow-sm">
                <Receipt className="text-slate-300 mx-auto mb-4" size={40} />
                <h3 className="text-lg font-bold text-theme-text-main mb-1">No Orders Yet</h3>
                <p className="text-theme-sec text-sm">This table hasn't placed any orders.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between gap-4 mb-4">
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-2">
                        Order #{order.id.substring(0, 6)}<span className="mx-1 font-normal">\</span><span className="text-theme-primary capitalize font-bold">{order.status}</span>
                      </div>
                      <div className="font-black text-[18px] text-slate-800 leading-snug">
                        {order.items?.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                      </div>

                      {order.chef_instructions && (
                        <div className="text-red-500 italic font-bold mt-1.5 text-[16px]">
                          Note: {order.chef_instructions}
                        </div>
                      )}
                    </div>

                    {order.status === 'ready' && (
                      <div className="flex items-center sm:items-end">
                        <button
                          onClick={() => handleServe(order.id)}
                          className="bg-theme-accent hover:bg-theme-accent/90 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"
                        >
                          <Check size={16} />
                          Serve Items
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* MOBILE BOTTOM ACTION BAR */}
          <div className="lg:hidden absolute bottom-[72px] left-0 right-0 p-4 bg-white rounded-t-3xl z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] grid grid-cols-2 gap-3 border-t border-slate-100">
            <button onClick={() => setIsMobileBillOpen(true)} className="bg-slate-50 border border-slate-200 text-slate-700 w-full py-4 rounded-xl text-lg font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform">
              <Receipt size={22} />
              Bill
            </button>
            <button onClick={handleAddToOrder} className="bg-theme-primary text-white w-full py-4 rounded-xl text-lg font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform">
              <Plus size={22} />
              Add Order
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Detailed Bill Sidebar */}
        <div className="hidden lg:flex w-[400px] xl:w-[450px] bg-white border-l border-slate-200 flex-col h-full shadow-[-8px_0_20px_rgba(0,0,0,0.03)] z-30 shrink-0">
          <div className="p-6 border-b border-slate-100 bg-theme-bg/50 shrink-0">
            <h2 className="text-xl font-bold text-theme-text-main flex items-center gap-2">
              <Receipt className="text-theme-primary" size={24} />
              Bill Summary
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {orders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <Receipt className="text-slate-300" size={32} />
                </div>
                <p className="font-medium">No items ordered yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(o => o.items?.map((item, idx) => (
                  <div key={`${o.id}-${idx}`} className="flex justify-between items-start text-[15px]">
                    <div className="flex-1 pr-4">
                      <span className="font-bold text-slate-700">{item.quantity}x</span> <span className="font-bold text-slate-800">{item.name}</span>
                    </div>
                    <div className="font-bold text-slate-900">
                      ₹{item.price * item.quantity}
                    </div>
                  </div>
                )))}
              </div>
            )}
          </div>

          <div className="p-6 border-t border-slate-100 bg-theme-bg/30 shrink-0">
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-slate-500 font-bold text-[15px]">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 font-bold text-[15px]">
                <span>GST (5%)</span>
                <span>₹{gst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-2xl font-black text-theme-text-main pt-3 mt-3 border-t border-slate-200 border-dashed">
                <span>Total</span>
                <span className="text-theme-primary">₹{total.toFixed(2)}</span>
              </div>
            </div>
            <button onClick={() => handleClearTable(true)} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm shadow-green-500/20 active:scale-95 text-[15px]">
              <Receipt size={18} />
              Pay & Clear
            </button>
          </div>
        </div>

      </div>

      {/* Bill Modal (Mobile Only) */}
      {(isMobileBillOpen || isClosingBill) && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end pointer-events-none md:items-center md:justify-center md:p-4 lg:hidden">
          <div className={`absolute inset-0 bg-black/40 pointer-events-auto ${isClosingBill ? 'animate-fadeOut' : 'animate-fadeIn'}`} onClick={handleCloseBill}></div>
          <div className={`bg-white w-full max-w-md mx-auto md:rounded-3xl rounded-t-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative z-10 pointer-events-auto ${isClosingBill ? 'animate-slideDown md:animate-fadeOut' : 'animate-slideUp md:animate-fadeIn'}`}>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-black text-theme-text-main flex items-center gap-2">
                <Receipt size={24} className="text-theme-primary" />
                Table {table.number} Bill
              </h2>
              <button onClick={handleCloseBill} className="p-2 bg-slate-50 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
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
                      <span>₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-sm">
                      <span>GST (5%)</span>
                      <span>₹{gst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-black text-theme-text-main pt-2">
                      <span>Total</span>
                      <span className="text-theme-primary">₹{total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 pb-28">
              <SlideToConfirm
                onConfirm={() => handleClearTable(true)}
                text="Paid & Clear"
                subtext="Swipe to confirm"
                variant="success"
              />
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {(isTransferModalOpen || isClosingTransfer) && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end pointer-events-none md:items-center md:justify-center md:p-4">
          <div className={`absolute inset-0 bg-black/40 pointer-events-auto ${isClosingTransfer ? 'animate-fadeOut' : 'animate-fadeIn'}`} onClick={handleCloseTransfer}></div>
          <div className={`bg-white w-full max-w-md mx-auto md:rounded-3xl rounded-t-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh] relative z-10 pointer-events-auto ${isClosingTransfer ? 'animate-slideDown md:animate-fadeOut' : 'animate-slideUp md:animate-fadeIn'}`}>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-black text-theme-text-main flex items-center gap-2">
                <ArrowRightLeft size={24} className="text-blue-500" />
                Transfer Table {table.number}
              </h2>
              <button onClick={handleCloseTransfer} className="p-2 bg-slate-50 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto pb-28 lg:pb-6">
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

      {/* Extend Session Modal */}
      <ExtendSessionModal
        isOpen={showExtendModal}
        isClosing={isClosingExtend}
        onClose={handleCloseExtend}
        onExtend={handleExtendSession}
        extendingSession={extendingSession}
        tableNumber={table.number}
      />
    </div>
  );
}

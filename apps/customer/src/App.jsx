import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useParams, Navigate } from 'react-router-dom';
import { ShoppingBag, Home, Menu as MenuIcon, FileText } from 'lucide-react';
import MenuPage from './components/MenuPage';
import CartPage from './components/CartPage';
import OrderTrackingPage from './components/OrderTrackingPage';
import { supabase } from '@tablenet/supabase';

function CustomerView() {
  const { qrToken } = useParams();
  const [tableNumber, setTableNumber] = useState('');
  const [tableId, setTableId] = useState(null);
  const [restaurantId, setRestaurantId] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(true);

  const [cart, setCart] = useState([]);
  const [activeTab, setActiveTab] = useState('menu');
  const [activeOrders, setActiveOrders] = useState([]);
  const [hasOrdered, setHasOrdered] = useState(false);

  useEffect(() => {
    let sid = localStorage.getItem('tablenet_session_id');
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem('tablenet_session_id', sid);
    }
    setSessionId(sid);

    const resolveTable = async () => {
      try {
        const { data, error } = await supabase
          .from('tables')
          .select('id, table_number, restaurant_id')
          .eq('qr_token', qrToken)
          .single();

        if (data) {
          setTableNumber(data.table_number);
          setTableId(data.id);
          setRestaurantId(data.restaurant_id);
        } else {
          setTableNumber(qrToken.replace('tbl_abc', '').replace(/^0+/, ''));
        }
      } catch (e) {
        setTableNumber(qrToken.replace('tbl_abc', '').replace(/^0+/, ''));
      } finally {
        setTimeout(() => setLoading(false), 800);
      }
    };

    resolveTable();
  }, [qrToken]);

  useEffect(() => {
    if (!tableId) return;

    const fetchActiveOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('table_id', tableId)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        setActiveOrders(data);
        setHasOrdered(true);
      }
    };

    fetchActiveOrders();

    const channel = supabase.channel(`customer-orders-table-${tableId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setActiveOrders(prev => prev.filter(o => o.id !== payload.old.id));
          } else if (payload.new && payload.new.id) {
            if (payload.new.table_id === tableId) {
              setActiveOrders(prev => {
                const exists = prev.find(o => o.id === payload.new.id);
                if (exists) {
                  return prev.map(o => o.id === payload.new.id ? payload.new : o);
                } else {
                  return [payload.new, ...prev];
                }
              });
              setHasOrdered(true);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableId]);

  useEffect(() => {
    if (hasOrdered && activeOrders.length === 0) {
      // The table was cleared by the waiter!
      localStorage.removeItem('tablenet_session_id');

      // Reset the table for a new customer
      const newSid = crypto.randomUUID();
      localStorage.setItem('tablenet_session_id', newSid);
      setSessionId(newSid);
      setHasOrdered(false);
      setCart([]);
      setActiveTab('home');
    }
  }, [hasOrdered, activeOrders]);

  const handleAddToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(0, item.quantity + delta) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handlePlaceOrder = async () => {
    const orderItems = cart;
    setCart([]);

    if (tableId && restaurantId) {
      const { data, error } = await supabase.from('orders').insert({
        session_id: sessionId,
        items: orderItems,
        status: 'placed',
        table_id: tableId,
        restaurant_id: restaurantId
      }).select();

      if (error) {
        console.error('Error placing order:', error);
      } else if (data && data.length > 0) {
        setActiveOrders(prev => {
          if (prev.find(o => o.id === data[0].id)) return prev;
          return [data[0], ...prev];
        });
        setActiveTab('tracking');
      }
    } else {
      alert("Error: Table not found or unlinked.");
    }
  };

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFCF7] flex flex-col items-center justify-center font-sans">
        <div className="w-16 h-16 border-4 border-slate-200 border-t-accent rounded-full animate-spin mb-4 shadow-soft"></div>
        <h1 className="text-xl font-bold text-primary animate-pulse tracking-tight">Resolving Table...</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative font-sans bg-[#FDFCF7] animate-in fade-in duration-500 pb-24">
      {activeTab !== 'cart' && activeTab !== 'tracking' && (
        <header className="sticky top-0 z-30 bg-[#FDFCF7]/90 backdrop-blur-md px-4 py-4 max-w-md mx-auto text-center">
          <div className="font-bold text-xl tracking-tight text-primary">TableNet</div>
          <div className="text-xs font-semibold text-secondary uppercase tracking-widest mt-0.5">Table {tableNumber || 'Unknown'}</div>
        </header>
      )}

      <main className="max-w-md mx-auto">
        {activeTab === 'home' && (
          <div className="p-8 text-center mt-12">
            <h2 className="text-2xl font-bold mb-2">Welcome to TableNet</h2>
            <p className="text-secondary mb-6">Enjoy your meal at Table {tableNumber}</p>
            <button onClick={() => setActiveTab('menu')} className="bg-[#F24E5B] text-white px-6 py-3 rounded-xl font-bold shadow-soft">View Menu</button>
          </div>
        )}
        {activeTab === 'menu' && (
          <MenuPage
            onAddToCart={handleAddToCart}
            restaurantId={restaurantId}
            cart={cart}
            updateQuantity={updateQuantity}
          />
        )}
        {activeTab === 'cart' && (
          <CartPage
            isOpen={true}
            onClose={() => setActiveTab('menu')}
            cart={cart}
            tableNumber={tableNumber}
            updateQuantity={updateQuantity}
            onPlaceOrder={handlePlaceOrder}
          />
        )}
        {activeTab === 'tracking' && activeOrders.length > 0 && (
          <OrderTrackingPage
            orders={activeOrders}
            onClose={() => setActiveTab('menu')}
            restaurantId={restaurantId}
          />
        )}
        {activeTab === 'tracking' && activeOrders.length === 0 && (
          <div className="p-8 text-center mt-12">
            <h2 className="text-xl font-bold text-slate-900 mb-2">No Active Orders</h2>
            <p className="text-slate-500 mb-6">You don't have any orders currently being prepared.</p>
            <button onClick={() => setActiveTab('menu')} className="bg-[#1AA147] text-white px-6 py-3 rounded-xl font-bold shadow-soft">Browse Menu</button>
          </div>
        )}
      </main>

      {/* Floating Cart Banner */}
      {cart.length > 0 && activeTab === 'menu' && (
        <div className="fixed bottom-24 left-4 right-4 z-40 max-w-[calc(28rem-2rem)] mx-auto bg-[#F24E5B] text-white rounded-full shadow-xl p-3 px-5 flex justify-between items-center cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]" onClick={() => setActiveTab('cart')}>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3">
              {cart.slice(0, 3).map(item => (
                <img key={item.id} src={item.image_url} className="w-10 h-10 rounded-full border-2 border-[#F24E5B] object-cover bg-white" alt="" />
              ))}
            </div>
            <span className="font-bold text-lg">{cartItemsCount} item{cartItemsCount !== 1 && 's'} added</span>
          </div>
          <div className="flex items-center font-bold text-lg">
            View cart <span className="ml-1 mb-0.5">&gt;</span>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#FDFCF7]/95 backdrop-blur-md pb-safe border-t border-slate-100">
        <div className="max-w-md mx-auto px-4 py-2 flex justify-between items-center relative">

          <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center justify-center p-2 w-16 transition-colors ${activeTab === 'home' ? 'text-[#F24E5B]' : 'text-slate-400'}`}>
            <Home size={22} className={activeTab === 'home' ? 'fill-current' : ''} />
            <span className="text-[10px] font-bold mt-1">Home</span>
          </button>

          <button onClick={() => setActiveTab('menu')} className={`flex flex-col items-center justify-center p-2 w-16 transition-colors ${activeTab === 'menu' ? 'text-[#F24E5B]' : 'text-slate-400'}`}>
            <MenuIcon size={22} />
            <span className="text-[10px] font-bold mt-1">Menu</span>
          </button>

          <button onClick={() => setActiveTab('tracking')} className={`flex flex-col items-center justify-center p-2 w-16 transition-colors ${activeTab === 'tracking' ? 'text-[#F24E5B]' : 'text-slate-400'} relative`}>
            <div className="relative">
              <FileText size={22} className={activeTab === 'tracking' ? 'fill-current' : ''} />
              {activeOrders.length > 0 && activeTab !== 'tracking' && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#1AA147] rounded-full border-2 border-white animate-pulse"></span>
              )}
            </div>
            <span className="text-[10px] font-bold mt-1">Orders</span>
          </button>

          <button onClick={() => setActiveTab('cart')} className={`flex flex-col items-center justify-center p-2 w-16 transition-colors ${activeTab === 'cart' ? 'text-[#F24E5B]' : 'text-slate-400'} relative`}>
            <div className="relative">
              <ShoppingBag size={22} className={activeTab === 'cart' ? 'fill-current' : ''} />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-[#F24E5B] text-white text-[9px] font-black min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full border-2 border-[#FDFCF7]">
                  {cartItemsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold mt-1">Cart</span>
          </button>

        </div>
      </nav>

    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/t/:qrToken" element={<CustomerView />} />
        <Route path="*" element={<Navigate to="/t/tbl_abc001" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

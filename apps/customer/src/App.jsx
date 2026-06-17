import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useParams, Navigate } from 'react-router-dom';
import { ShoppingBag, Home, Menu as MenuIcon, FileText, Bell, Coffee, Search, Plus, Minus } from 'lucide-react';
import MenuPage from './components/MenuPage';
import CartPage from './components/CartPage';
import OrderTrackingPage from './components/OrderTrackingPage';
import AssistanceModal from './components/AssistanceModal';
import ImageFallback from './components/ImageFallback';
import { supabase } from '@tablenet/supabase';

function CustomerView() {
  const { qrToken } = useParams();
  const [tableNumber, setTableNumber] = useState('');
  const [tableId, setTableId] = useState(null);
  const [restaurantId, setRestaurantId] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(true);

  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem('tablenet_cart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('tablenet_cart', JSON.stringify(cart));
  }, [cart]);
  const [activeTab, setActiveTab] = useState('home');
  const [activeOrders, setActiveOrders] = useState([]);
  const [hasOrdered, setHasOrdered] = useState(false);
  const [isAssistanceModalOpen, setIsAssistanceModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [popularItems, setPopularItems] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [hideTotal, setHideTotal] = useState(false);
  const [chefInstructions, setChefInstructions] = useState('');
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

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
    if (tableNumber) {
      document.title = `TableNet | Table ${tableNumber}`;
    } else {
      document.title = 'TableNet | Customer Portal';
    }
  }, [tableNumber]);

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
    if (!restaurantId) return;

    const fetchHomeData = async () => {
      // Fetch popular items
      const { data: popularData } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_popular', true)
      // .limit(4);

      if (popularData && popularData.length > 0) {
        setPopularItems(popularData);
      } else {
        const { data: fallbackData } = await supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .limit(3);
        if (fallbackData) setPopularItems(fallbackData);
      }

      // Fetch categories
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('category')
        .eq('restaurant_id', restaurantId);

      if (menuData) {
        const cats = ['All', ...new Set(menuData.map(item => item.category || 'Uncategorized'))];
        setCategories(cats);
      }
      // Fetch settings
      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('hide_customer_total')
        .eq('id', restaurantId)
        .single();
      if (restaurantData) {
        setHideTotal(restaurantData.hide_customer_total);
      }
    };

    fetchHomeData();

    // Subscribe to restaurant settings changes
    const restChannel = supabase.channel(`public:restaurants:${restaurantId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'restaurants', filter: `id=eq.${restaurantId}` }, (payload) => {
        if (payload.new && payload.new.hide_customer_total !== undefined) {
          setHideTotal(payload.new.hide_customer_total);
        }
      }).subscribe();

    return () => {
      supabase.removeChannel(restChannel);
    };
  }, [restaurantId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

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

  const handlePlaceOrder = async (instructions = '') => {
    const orderItems = cart;
    setCart([]);
    setChefInstructions('');

    if (tableId && restaurantId) {
      const { data, error } = await supabase.from('orders').insert({
        session_id: sessionId,
        items: orderItems,
        status: 'placed',
        table_id: tableId,
        restaurant_id: restaurantId,
        chef_instructions: instructions
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

  const handleRequestAssistance = async (type) => {
    if (tableId && restaurantId) {
      const { error } = await supabase.from('assistance_requests').insert({
        session_id: sessionId,
        table_id: tableId,
        restaurant_id: restaurantId,
        request_type: type,
        status: 'pending'
      });
      if (error) {
        console.error('Error requesting assistance:', error);
      } else {
        showToast(type === 'Waiter' ? 'Waiter called' : `${type} requested`);
      }
    }
  };

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className={`min-h-screen relative font-sans bg-theme-bg animate-in fade-in duration-500 pb-24 ${loading ? 'overflow-hidden h-screen' : ''}`}>
      {loading && (
        <div className="absolute inset-0 z-[999] bg-theme-primary flex flex-col items-center justify-center font-sans">
          <h1 className="text-[3.5rem] leading-none font-black text-white italic tracking-tighter mb-4">tablenet</h1>
          <div className="flex gap-2.5">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
          </div>
        </div>
      )}
      <header className="sticky top-0 z-30 bg-theme-surface px-4 py-4 max-w-md mx-auto flex items-center justify-between border-b border-slate-100 shadow-sm">
        <div>
          <div className="text-[10px] font-bold text-theme-text-sec uppercase tracking-widest">TableNet • {currentTime}</div>
          <div className="font-bold text-xl tracking-tight text-theme-text-main mt-0.5">
            {activeTab === 'home' && `${getGreeting()}!`}
            {activeTab === 'menu' && 'Our Menu'}
            {activeTab === 'tracking' && 'Live Orders'}
            {activeTab === 'cart' && 'Your Cart'}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-full border border-theme-primary bg-theme-primary/10 text-theme-primary font-bold text-xs shadow-sm">
            Table {tableNumber || '2'}
          </div>
          <button onClick={() => setIsAssistanceModalOpen(true)} className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center bg-theme-surface shadow-sm hover:bg-slate-50 transition-colors">
            <Bell size={18} className="text-slate-700" />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto">
        <div className={activeTab === 'home' ? 'block' : 'hidden'}>
          <div className="p-4 space-y-6">
            <div className="overflow-hidden">
              {/* <div className="absolute top-0 left-0 w-full h-1 bg-theme-primary"></div> */}
              {/* <h2 className="text-2xl font-bold mb-1 text-theme-text-main tracking-tight">{getGreeting()}!</h2>
              <p className="text-theme-text-sec mb-6 font-medium text-sm">Welcome, we're glad you're here. You are comfortably seated at Table {tableNumber || '2'}.</p> */}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (searchInput.trim()) {
                    setSearchQuery(searchInput);
                    setActiveCategory('All');
                    setActiveTab('menu');
                  }
                }}
                className="relative mb-4"
              >
                <input
                  type="text"
                  placeholder="Search for dishes..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:border-theme-primary transition-colors"
                />
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-text-sec" />
              </form>

              <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-2 -mx-2 px-2 pb-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => {
                      setActiveCategory(cat);
                      setActiveTab('menu');
                    }}
                    className={`whitespace-nowrap px-4 py-1.5 rounded-full font-bold text-sm border shadow-sm transition-colors bg-theme-surface text-theme-text-sec border-slate-200 hover:border-theme-primary hover:text-theme-primary`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <button onClick={() => { setSearchQuery(''); setActiveCategory('All'); setActiveTab('menu'); }} className="w-full bg-theme-primary hover:bg-theme-primary-light text-white py-3.5 rounded-xl font-bold shadow-sm transition-colors active:scale-[0.98]">
                Explore Full Menu
              </button>
            </div>

            {popularItems.length > 0 && (
              <div>
                <h3 className="font-bold text-lg mb-3 px-2 flex items-center gap-2">
                  <span className="text-theme-primary">★</span> Popular Items
                </h3>
                <div className="grid grid-cols-2 gap-3 pb-16">
                  {popularItems.map((item) => {
                    const cartItem = cart?.find(i => i.id === item.id);
                    return (
                      <div key={item.id} className={`bg-theme-surface rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col ${!item.is_available ? 'opacity-60 grayscale' : ''}`}>
                        <div className="relative aspect-square">
                          <ImageFallback src={item.image_url} name={item.name} className="w-full h-full object-cover" />

                          {/* Out of stock overlay */}
                          {!item.is_available && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Out of Stock</span>
                            </div>
                          )}

                          {/* Veg/Non-Veg Indicator */}
                          <div className="absolute bottom-2 left-2 bg-theme-surface/90 p-0.5 rounded shadow-sm">
                            <div className={`w-3.5 h-3.5 border flex items-center justify-center ${item.is_veg !== false ? 'border-green-600' : 'border-[#8B4513]'}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${item.is_veg !== false ? 'bg-green-600' : 'bg-[#8B4513]'}`}></div>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 flex flex-col flex-grow bg-theme-surface">
                          <h3 className="font-bold text-[13px] leading-tight mb-3 uppercase text-theme-text-main line-clamp-2">{item.name}</h3>

                          <div className="flex items-center justify-between mt-auto">
                            <div className="flex flex-col">
                              <span className="font-bold text-[15px] leading-none">₹{Math.round(item.price)}</span>
                              <span className="text-[9px] font-bold text-theme-text-sec mt-0.5 tracking-wider">+5% GST</span>
                            </div>

                            <div>
                              {!item.is_available ? (
                                <button disabled className="bg-slate-200 text-theme-text-sec font-bold text-[11px] px-3 py-1.5 rounded uppercase cursor-not-allowed">
                                  N/A
                                </button>
                              ) : cartItem ? (
                                <div className="flex items-center bg-theme-primary rounded overflow-hidden">
                                  <button onClick={() => updateQuantity(item.id, -1)} className="p-1.5 text-white hover:bg-black/10 active:bg-black/20 transition-colors">
                                    <Minus size={14} strokeWidth={3} />
                                  </button>
                                  <span className="text-white font-bold text-[13px] w-4 text-center">{cartItem.quantity}</span>
                                  <button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 text-white hover:bg-black/10 active:bg-black/20 transition-colors">
                                    <Plus size={14} strokeWidth={3} />
                                  </button>
                                </div>
                              ) : (
                                <button onClick={() => handleAddToCart(item)} className="bg-theme-primary text-theme-surface font-bold text-[11px] px-4 py-1.5 rounded uppercase active:scale-95 transition-transform">
                                  ADD
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={activeTab === 'menu' ? 'block' : 'hidden'}>
          <MenuPage
            onAddToCart={handleAddToCart}
            restaurantId={restaurantId}
            cart={cart}
            updateQuantity={updateQuantity}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            categories={categories}
          />
        </div>

        {activeTab === 'cart' && (
          <CartPage
            isOpen={true}
            onClose={() => setActiveTab('menu')}
            cart={cart}
            tableNumber={tableNumber}
            updateQuantity={updateQuantity}
            onPlaceOrder={handlePlaceOrder}
            hideTotal={hideTotal}
            instructions={chefInstructions}
            setInstructions={setChefInstructions}
          />
        )}
        {activeTab === 'tracking' && activeOrders.length > 0 && (
          <OrderTrackingPage
            orders={activeOrders}
            onClose={() => setActiveTab('menu')}
            restaurantId={restaurantId}
            hideTotal={hideTotal}
          />
        )}
        {activeTab === 'tracking' && activeOrders.length === 0 && (
          <div className="p-8 text-center mt-12">
            <h2 className="text-xl font-bold text-theme-text-main mb-2">No Active Orders</h2>
            <p className="text-theme-text-sec mb-6">You don't have any orders currently being prepared.</p>
            <button onClick={() => setActiveTab('menu')} className="bg-[#1AA147] text-white px-6 py-3 rounded-xl font-bold shadow-soft">Browse Menu</button>
          </div>
        )}
      </main>

      {/* Floating Cart Banner */}
      {cart.length > 0 && (activeTab === 'menu' || activeTab === 'home') && (
        <div className="fixed bottom-[5.5rem] left-1/2 -translate-x-1/2 w-[calc(100%-16px)] max-w-[calc(28rem-16px)] z-40 pointer-events-none">
          <div className="w-full bg-theme-primary text-theme-surface rounded-2xl shadow-xl p-3 flex justify-between items-center cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] animate-slideUp pointer-events-auto" onClick={() => setActiveTab('cart')}>
            <div className="flex items-center gap-3 flex-shrink min-w-0">
              <div className="flex -space-x-2 sm:-space-x-3 flex-shrink-0">
                {cart.slice(0, 2).map(item => (
                  <ImageFallback key={item.id} src={item.image_url} name={item.name} className="w-10 h-10 rounded-xl border-2 border-theme-primary object-cover bg-theme-surface shadow-sm" alt="" />
                ))}
                {cart.length > 2 && (
                  <div className="w-10 h-10 rounded-xl border-2 border-theme-primary bg-theme-surface text-theme-primary flex items-center justify-center font-bold text-sm z-10 shadow-sm">
                    +{cart.length - 2}
                  </div>
                )}
              </div>
              <span className="font-bold text-base truncate">
                {cartItemsCount} item{cartItemsCount !== 1 && 's'}
                <span className="hidden sm:inline"> added</span>
              </span>
            </div>
            <div className="flex items-center font-bold text-base flex-shrink-0 ml-2 bg-theme-surface text-theme-primary px-5 py-2.5 rounded-xl shadow-sm">
              View cart
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 bg-theme-surface rounded-t-3xl pb-safe border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="px-4 py-2 flex justify-between items-center relative">

          <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center justify-center p-2 w-16 transition-colors ${activeTab === 'home' ? 'text-theme-primary' : 'text-theme-text-sec'}`}>
            <Home size={22} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
            <span className="text-[10px] font-bold mt-1">Home</span>
          </button>

          <button onClick={() => setActiveTab('menu')} className={`flex flex-col items-center justify-center p-2 w-16 transition-colors ${activeTab === 'menu' ? 'text-theme-primary' : 'text-theme-text-sec'}`}>
            <MenuIcon size={22} strokeWidth={activeTab === 'menu' ? 3 : 2} />
            <span className="text-[10px] font-bold mt-1">Menu</span>
          </button>

          <button onClick={() => setActiveTab('tracking')} className={`flex flex-col items-center justify-center p-2 w-16 transition-colors ${activeTab === 'tracking' ? 'text-theme-primary' : 'text-theme-text-sec'} relative`}>
            <div className="relative">
              <FileText size={22} strokeWidth={activeTab === 'tracking' ? 2.5 : 2} />
              {activeOrders.length > 0 && activeTab !== 'tracking' && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-theme-primary rounded-full border-2 border-white animate-pulse"></span>
              )}
            </div>
            <span className="text-[10px] font-bold mt-1">Orders</span>
          </button>

          <button onClick={() => setActiveTab('cart')} className={`flex flex-col items-center justify-center p-2 w-16 transition-colors ${activeTab === 'cart' ? 'text-theme-primary' : 'text-theme-text-sec'} relative`}>
            <div className="relative">
              <ShoppingBag size={22} strokeWidth={activeTab === 'cart' ? 2.5 : 2} />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-theme-primary text-theme-surface text-[9px] font-black min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full border-2 border-white">
                  {cartItemsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold mt-1">Cart</span>
          </button>

        </div>
      </nav>

      {/* Assistance Modal */}
      <AssistanceModal
        isOpen={isAssistanceModalOpen}
        onClose={() => setIsAssistanceModalOpen(false)}
        onNotify={handleRequestAssistance}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none w-full max-w-md px-4 flex justify-center">
          <div className="bg-theme-surface border border-slate-100 text-theme-text-main px-4 py-2.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-theme-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-theme-primary animate-pulse"></span>
            </div>
            <span className="font-bold text-[14px] tracking-tight pr-2">{toast}</span>
          </div>
        </div>
      )}

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

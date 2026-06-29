import { useState, useEffect } from 'react';
import { ChevronLeft, Minus, Plus, Edit3, Save } from 'lucide-react';
import { supabase } from '@tablenet/supabase';
import { useNavigate, useParams } from 'react-router-dom';
import ImageFallback from './ImageFallback';
import SlideToConfirm from './SlideToConfirm';

export default function WaiterMenu({ tableId: propTableId, waiterId: propWaiterId, onBack }) {
  const params = useParams();
  const tableId = propTableId || params.tableId;
  const waiterId = propWaiterId || params.waiterId;
  const navigate = useNavigate();

  const [menuItems, setMenuItems] = useState(() => {
    const cached = sessionStorage.getItem('waiter_menu');
    return cached ? JSON.parse(cached) : [];
  });

  const [cart, setCart] = useState(() => {
    const saved = sessionStorage.getItem(`cart_${tableId}`);
    return saved ? JSON.parse(saved) : [];
  });

  const [chefInstructions, setChefInstructions] = useState(() => {
    return sessionStorage.getItem(`instructions_${tableId}`) || '';
  });

  const [restaurantId, setRestaurantId] = useState(null);

  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState(() => {
    const cached = sessionStorage.getItem('waiter_categories');
    return cached ? JSON.parse(cached) : ['All'];
  });

  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    sessionStorage.setItem(`cart_${tableId}`, JSON.stringify(cart));
    sessionStorage.setItem(`instructions_${tableId}`, chefInstructions);
  }, [cart, chefInstructions, tableId]);

  useEffect(() => {
    const init = async () => {
      const { data: tableData } = await supabase.from('tables').select('restaurant_id').eq('id', tableId).single();
      if (tableData) {
        setRestaurantId(tableData.restaurant_id);
        const { data: items } = await supabase.from('menu_items').select('*').eq('restaurant_id', tableData.restaurant_id).order('category').order('name');
        if (items) {
          setMenuItems(items);
          sessionStorage.setItem('waiter_menu', JSON.stringify(items));

          const uniqueCats = ['All', ...new Set(items.map(i => i.category || 'Uncategorized'))];
          setCategories(uniqueCats);
          sessionStorage.setItem('waiter_categories', JSON.stringify(uniqueCats));
        }
      }
    };
    init();
  }, [tableId]);

  const handleAddToCart = (item) => {
    if (isEditMode) return;
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id, delta) => {
    if (isEditMode) return;
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(0, item.quantity + delta) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleToggleAvailability = async (item) => {
    if (!isEditMode) return;
    const newStatus = !item.is_available;
    // Optimistic update
    setMenuItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: newStatus } : i));
    const { error } = await supabase.from('menu_items').update({ is_available: newStatus }).eq('id', item.id);
    if (error) {
      console.error(error);
      alert("Failed to update availability");
      setMenuItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: item.is_available } : i));
    }
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;

    const { data: tableData } = await supabase
      .from('tables')
      .select('session_secret')
      .eq('id', tableId)
      .single();

    if (!tableData && !tableData?.session_secret) {
      // Just a safety check in case the table was deleted
    }

    const { error } = await supabase.rpc('place_order_validated', {
      p_table_id: tableId,
      p_session_secret: tableData?.session_secret || 'staff-override',
      p_items: cart,
      p_chef_instructions: chefInstructions || null
    });

    if (error) {
      alert("Failed to place order: " + error.message);
      console.error(error);
    } else {
      setCart([]);
      setChefInstructions('');
      sessionStorage.removeItem(`cart_${tableId}`);
      sessionStorage.removeItem(`instructions_${tableId}`);
      if (onBack) {
        onBack();
      } else {
        navigate(-1);
      }
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const displayedMenu = menuItems.filter(item => {
    const itemName = String(item.name || '');
    const query = String(searchQuery || '');
    const matchesSearch = itemName.toLowerCase().includes(query.toLowerCase());

    if (activeCategory === 'Selected') return matchesSearch && cart.some(c => c.id === item.id);
    const matchesCategory = activeCategory === 'All' || (item.category || 'Uncategorized') === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col lg:flex-row absolute inset-0 z-50 bg-theme-bg w-full mx-auto overflow-hidden">

      {/* LEFT SECTION: Menu */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">

        {/* HEADER */}
        <header className="px-4 lg:px-8 py-4 flex items-center justify-between bg-theme-bg/90 backdrop-blur-md z-20 border-b border-slate-200/50 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => onBack ? onBack() : navigate(-1)} className="p-3 bg-white shadow-sm border border-slate-100 rounded-full active:scale-95 transition-transform text-theme-text-main">
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-theme-text-main">Menu</h1>
              <p className="text-sm text-theme-text-sec font-medium">Add to Table Order</p>
            </div>
          </div>
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-4 py-2 rounded-full font-bold text-[12px] uppercase flex items-center gap-1.5 border transition-all active:scale-95 ${isEditMode ? 'bg-amber-100 border-amber-300 text-amber-800 shadow-inner' : 'bg-white border-slate-200 text-slate-500 shadow-sm'
              }`}
          >
            {isEditMode ? <Save size={14} /> : <Edit3 size={14} />}
            {isEditMode ? 'Done' : 'Edit Stock'}
          </button>
        </header>

        {/* SEARCH & FILTERS */}
        <div className="bg-theme-bg/90 backdrop-blur-md z-10 shadow-sm border-b border-slate-200/50 px-4 lg:px-8 py-3 space-y-3 shrink-0">
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-theme-primary transition-colors text-sm font-medium shadow-sm"
            />
          </div>
          <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-1">
            <button
              onClick={() => setActiveCategory('All')}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full font-bold text-sm border shadow-sm transition-colors ${activeCategory === 'All'
                ? 'bg-theme-primary text-white border-theme-primary'
                : 'bg-white text-theme-text-sec border-slate-200 hover:border-theme-primary hover:text-theme-primary'
                }`}
            >
              All
            </button>

            {/* Only show 'Selected' pill on mobile screens */}
            <button
              onClick={() => setActiveCategory('Selected')}
              className={`lg:hidden whitespace-nowrap px-4 py-1.5 rounded-full font-bold text-sm border shadow-sm transition-colors flex items-center gap-1.5 ${activeCategory === 'Selected'
                ? 'bg-theme-accent text-white border-theme-accent'
                : 'bg-white text-theme-text-sec border-slate-200 hover:border-theme-accent hover:text-theme-accent'
                }`}
            >
              Selected
              {cartItemsCount > 0 && (
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${activeCategory === 'Selected' ? 'bg-white text-theme-accent' : 'bg-theme-accent text-white'}`}>
                  {cartItemsCount}
                </span>
              )}
            </button>

            {categories.filter(c => c !== 'All').map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full font-bold text-sm border shadow-sm transition-colors ${activeCategory === cat
                  ? 'bg-theme-primary text-white border-theme-primary'
                  : 'bg-white text-theme-text-sec border-slate-200 hover:border-theme-primary hover:text-theme-primary'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* SCROLLABLE GRID */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-4 pb-48 lg:pb-8">

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-5">
            {/* Mobile-only Selected Cart View */}
            {activeCategory === 'Selected' && cart.length > 0 && (
              <div className="col-span-full space-y-4 mb-2 lg:hidden">
                <div className="bg-theme-surface rounded-xl p-4 shadow-sm border border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-theme-text-main text-lg">Total: {cartItemsCount} Items</span>
                  <span className="font-bold text-theme-accent text-xl">₹{cartTotal}</span>
                </div>
                <textarea
                  placeholder="Chef instructions (e.g., No onions, extra spicy...)"
                  value={chefInstructions}
                  onChange={(e) => setChefInstructions(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 transition-all resize-none h-24 placeholder:text-slate-400 shadow-sm"
                />
              </div>
            )}

            {displayedMenu.map((item) => {
              const cartItem = cart?.find(i => i.id === item.id);

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col relative transition-all ${!item.is_available && !isEditMode ? 'opacity-60 grayscale' : ''} ${isEditMode ? 'ring-2 ring-amber-400 cursor-pointer scale-[0.98]' : 'hover:shadow-md'}`}
                  onClick={() => handleToggleAvailability(item)}
                >
                  {isEditMode && (
                    <div className={`absolute top-2 right-2 z-20 px-2 py-1 rounded text-[10px] font-bold text-white shadow-sm ${item.is_available ? 'bg-green-500' : 'bg-red-500'}`}>
                      {item.is_available ? 'IN STOCK' : 'OUT OF STOCK'}
                    </div>
                  )}

                  <div className={`relative aspect-square ${isEditMode && !item.is_available ? 'opacity-50 grayscale' : ''}`}>
                    <ImageFallback src={item.image_url} name={item.name} className="w-full h-full object-cover" />

                    {/* Out of stock overlay */}
                    {!item.is_available && !isEditMode && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Out of Stock</span>
                      </div>
                    )}

                    {/* Veg/Non-Veg Indicator */}
                    <div className="absolute bottom-2 left-2 bg-white/90 p-0.5 rounded shadow-sm">
                      <div className={`w-3.5 h-3.5 border flex items-center justify-center ${item.is_veg !== false ? 'border-green-600' : 'border-[#8B4513]'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${item.is_veg !== false ? 'bg-green-600' : 'bg-[#8B4513]'}`}></div>
                      </div>
                    </div>
                  </div>

                  <div className={`p-3 flex flex-col flex-grow bg-white ${isEditMode && !item.is_available ? 'opacity-50' : ''}`}>
                    <h3 className="font-bold text-[13px] leading-tight mb-3 uppercase text-theme-text-main line-clamp-2">{item.name}</h3>

                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex flex-col">
                        <span className="font-black text-[15px] leading-none text-theme-text-main">₹{Math.round(item.price)}</span>
                        <span className="text-[9px] font-bold text-theme-text-sec mt-0.5 tracking-wider">+5% GST</span>
                      </div>

                      <div>
                        {!item.is_available && !isEditMode ? (
                          <button disabled className="bg-slate-200 text-theme-text-sec font-bold text-[11px] px-3 py-1.5 rounded uppercase cursor-not-allowed">
                            N/A
                          </button>
                        ) : isEditMode ? (
                          <div className={`font-bold text-[11px] px-3 py-1.5 rounded uppercase ${item.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {item.is_available ? 'ON' : 'OFF'}
                          </div>
                        ) : cartItem ? (
                          <div className="flex items-center bg-theme-primary rounded overflow-hidden">
                            <button onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, -1); }} className="p-1.5 text-white hover:bg-black/10 active:bg-black/20 transition-colors">
                              <Minus size={14} strokeWidth={3} />
                            </button>
                            <span className="text-white font-bold text-[13px] w-4 text-center">{cartItem.quantity}</span>
                            <button onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, 1); }} className="p-1.5 text-white hover:bg-black/10 active:bg-black/20 transition-colors">
                              <Plus size={14} strokeWidth={3} />
                            </button>
                          </div>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); handleAddToCart(item); }} className="bg-theme-primary text-white font-bold text-[11px] px-4 py-1.5 rounded uppercase active:scale-95 transition-transform shadow-sm hover:shadow">
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

          {displayedMenu.length === 0 && (
            <div className="text-center text-slate-500 py-12">
              {activeCategory === 'Selected' ? 'No items selected yet.' : 'Menu is currently empty.'}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SECTION: Desktop Cart Sidebar */}
      <div className="hidden lg:flex w-[400px] xl:w-[450px] bg-white border-l border-slate-200 flex-col h-full shadow-[-8px_0_20px_rgba(0,0,0,0.03)] z-30 shrink-0">
        <div className="p-6 border-b border-slate-100 bg-theme-bg/50 shrink-0">
          <h2 className="text-xl font-bold text-theme-text-main flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-theme-primary"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"></path><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path><path d="M12 17.5v-11"></path></svg>
            Selected Items
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><path d="M3 6h18"></path><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
              </div>
              <p className="font-medium">Cart is empty</p>
              <p className="text-sm text-slate-400 mt-1 text-center">Add items from the menu</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="">
                <textarea
                  value={chefInstructions}
                  onChange={e => setChefInstructions(e.target.value)}
                  placeholder="Chef instructions (e.g., No onions, extra spicy...)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 outline-none resize-none h-28 font-medium transition-all"
                />
              </div>
              {cart.map(item => (
                <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between">
                  <div className="flex flex-col pr-2">
                    <h4 className="font-bold text-slate-800 text-[15px] uppercase tracking-wide leading-tight">{item.name}</h4>
                    <p className="font-bold text-red-500 text-[13px] mt-1.5">₹{Math.round(item.price)} each</p>
                  </div>
                  <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-full px-3 py-2 shrink-0">
                    <button onClick={() => updateQuantity(item.id, -1)} className="text-slate-700 hover:text-black transition-colors">
                      <Minus size={18} strokeWidth={2.5} />
                    </button>
                    <span className="font-bold text-slate-900 text-[16px] w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="text-slate-700 hover:text-black transition-colors">
                      <Plus size={18} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-white shrink-0">
          <div className="flex justify-between items-center mb-6">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-sm">Total Amount</span>
            <span className="font-black text-3xl text-theme-text-main">₹{cartTotal.toFixed(2)}</span>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={cart.length === 0}
            className="w-full bg-theme-primary hover:bg-theme-primary-light text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-theme-primary/30 disabled:opacity-50 disabled:shadow-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>
            PLACE ORDER
          </button>
        </div>
      </div>

      {/* Mobile-only Slide to Confirm Footer */}
      <div className={`lg:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-100 pb-safe z-30 shadow-[0_-8px_20px_rgba(0,0,0,0.08)] rounded-t-3xl transition-transform duration-300 ${isEditMode ? 'translate-y-full' : 'translate-y-0'}`}>
        <div className={`p-4 ${cart.length === 0 ? 'pointer-events-none opacity-50' : 'opacity-100'}`}>
          <SlideToConfirm
            onConfirm={handlePlaceOrder}
          />
        </div>
      </div>
    </div>
  );
}

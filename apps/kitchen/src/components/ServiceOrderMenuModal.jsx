import { useState, useEffect, Component } from 'react';
import { supabase } from '@tablenet/supabase';
import { Search, X, Plus, Minus, Receipt, Check } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 p-8">
          <div className="bg-white p-8 rounded-2xl max-w-lg w-full">
            <h1 className="text-red-500 font-bold text-xl mb-4">Modal Crashed!</h1>
            <pre className="bg-red-50 p-4 rounded text-xs text-red-900 overflow-auto whitespace-pre-wrap">
              {this.state.error?.message || 'Unknown error'}
              {'\n\n'}
              {this.state.error?.stack}
            </pre>
            <button onClick={this.props.onClose} className="mt-6 bg-slate-200 px-4 py-2 rounded font-bold">Close Modal</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ServiceOrderMenuModalContent({ tableId, restaurantId, onClose }) {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [cart, setCart] = useState([]);
  const [chefInstructions, setChefInstructions] = useState('');

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        if (!restaurantId) return;
        const { data, error } = await supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .eq('is_available', true)
          .order('category')
          .order('name');

        if (error) throw error;

        if (data) {
          setMenuItems(data);
          const uniqueCats = ['All', ...new Set(data.map(i => i.category || 'Uncategorized'))];
          setCategories(uniqueCats);
        }
      } catch (err) {
        console.error("Failed to fetch menu:", err);
      }
    };
    fetchMenu();
  }, [restaurantId]);

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
    if (cart.length === 0) return;

    try {
      const { data: tableData } = await supabase
        .from('tables')
        .select('session_secret')
        .eq('id', tableId)
        .single();

      if (!tableData || !tableData.session_secret) {
        alert("Table session not found. Please seat the table first.");
        return;
      }

      const { error } = await supabase.rpc('place_order_validated', {
        p_table_id: tableId,
        p_session_secret: tableData.session_secret,
        p_items: cart,
        p_chef_instructions: chefInstructions || null
      });

      if (error) {
        alert("Failed to place order: " + error.message);
      } else {
        onClose();
      }
    } catch (err) {
      alert("Error placing order.");
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);

  const filteredMenu = menuItems.filter(item => {
    const itemName = String(item.name || '');
    const query = String(searchQuery || '');
    const matchesSearch = itemName.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = activeCategory === 'All' || (item.category || 'Uncategorized') === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-theme-bg w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 flex overflow-hidden border border-slate-200/50">
        
        {/* LEFT PANEL: Menu Items */}
        <div className="flex-1 flex flex-col bg-theme-bg border-r border-slate-200">
          <div className="p-6 border-b border-slate-200 bg-surface">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-theme-text-main">Menu</h2>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={24} className="text-slate-500" />
              </button>
            </div>

            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Search items..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:border-theme-primary transition-colors text-sm font-medium shadow-sm"
                />
              </div>
              <div className="flex bg-white border border-slate-200 rounded-2xl overflow-x-auto hide-scrollbar p-1 shadow-sm">
                {categories.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-6 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${activeCategory === cat ? 'bg-theme-primary text-white shadow-sm' : 'text-slate-500 hover:text-theme-text-main hover:bg-slate-50'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMenu.map(item => {
                const cartItem = cart.find(i => i.id === item.id);
                return (
                  <div key={item.id} className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                    <h3 className="font-bold text-theme-text-main leading-tight mb-1">{String(item.name || 'Unnamed')}</h3>
                    <p className="text-theme-sec text-xs mb-4">{String(item.category || 'Uncategorized')}</p>
                    
                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-100">
                      <span className="font-black text-lg text-theme-text-main">₹{Number(item.price || 0).toFixed(2)}</span>
                      
                      {cartItem ? (
                        <div className="flex items-center gap-3 bg-theme-primary text-white rounded-xl p-1 shadow-sm">
                          <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-black/10 rounded-lg transition-colors">
                            <Minus size={16} strokeWidth={3} />
                          </button>
                          <span className="font-bold text-sm w-4 text-center">{cartItem.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-black/10 rounded-lg transition-colors">
                            <Plus size={16} strokeWidth={3} />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleAddToCart(item)}
                          className="bg-theme-primary/10 hover:bg-theme-primary hover:text-white text-theme-primary font-bold px-4 py-2 rounded-xl text-sm transition-colors"
                        >
                          Add to Order
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Current Order */}
        <div className="w-96 bg-surface flex flex-col">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-theme-text-main flex items-center gap-2">
              <Receipt size={24} className="text-theme-primary" />
              Current Order
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Receipt size={48} className="mb-4 opacity-50" />
                <p className="font-medium">Order is empty</p>
                <p className="text-sm">Select items from the menu to add.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map(item => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-10 h-10 bg-theme-primary/10 text-theme-primary font-bold rounded-xl flex items-center justify-center shrink-0">
                      {item.quantity}x
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-theme-text-main text-sm leading-tight">{String(item.name || 'Unnamed')}</h4>
                      <p className="font-bold text-theme-sec text-xs mt-1">₹{(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}</p>
                    </div>
                  </div>
                ))}

                <div className="pt-6 mt-6 border-t border-slate-200">
                  <label className="block text-sm font-bold text-theme-text-main mb-2">Chef Instructions</label>
                  <textarea 
                    value={chefInstructions}
                    onChange={e => setChefInstructions(e.target.value)}
                    placeholder="E.g., No onions, extra spicy..."
                    className="w-full bg-theme-bg border border-slate-200 rounded-xl p-3 text-sm focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 outline-none resize-none h-24"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-slate-200 bg-white">
            <div className="flex justify-between items-center mb-6">
              <span className="font-bold text-slate-500">Total</span>
              <span className="font-black text-2xl text-theme-text-main">₹{Number(cartTotal || 0).toFixed(2)}</span>
            </div>
            
            <button 
              onClick={handlePlaceOrder}
              disabled={cart.length === 0}
              className="w-full bg-theme-primary hover:bg-theme-primary-light text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-theme-primary/20 disabled:opacity-50 disabled:shadow-none"
            >
              <Check size={20} />
              Place Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ServiceOrderMenuModal(props) {
  return (
    <ErrorBoundary onClose={props.onClose}>
      <ServiceOrderMenuModalContent {...props} />
    </ErrorBoundary>
  );
}

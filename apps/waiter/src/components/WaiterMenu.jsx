import { useState, useEffect } from 'react';
import { ChevronLeft, Minus, Plus, ShoppingBag } from 'lucide-react';
import { supabase } from '@tablenet/supabase';
import { useNavigate, useParams } from 'react-router-dom';

export default function WaiterMenu() {
  const { waiterId, tableId } = useParams();
  const navigate = useNavigate();
  
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [restaurantId, setRestaurantId] = useState(null);

  useEffect(() => {
    const init = async () => {
      // Get table details to get restaurantId
      const { data: tableData } = await supabase.from('tables').select('restaurant_id').eq('id', tableId).single();
      if (tableData) {
        setRestaurantId(tableData.restaurant_id);
        const { data: items } = await supabase.from('menu_items').select('*').eq('restaurant_id', tableData.restaurant_id);
        if (items) setMenuItems(items);
      }
    };
    init();
  }, [tableId]);

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

    // Determine session_id to use
    // Does the table have active orders? If so, use their session_id so it groups perfectly.
    const { data: existingOrders } = await supabase
      .from('orders')
      .select('session_id')
      .eq('table_id', tableId)
      .limit(1);

    const sessionId = (existingOrders && existingOrders.length > 0) 
      ? existingOrders[0].session_id 
      : crypto.randomUUID();

    const { error } = await supabase.from('orders').insert({
      session_id: sessionId,
      items: cart,
      status: 'placed',
      table_id: tableId,
      restaurant_id: restaurantId
    });

    if (error) {
      alert("Failed to place order.");
      console.error(error);
    } else {
      navigate(-1); // Go back to TableDetail
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex flex-col h-screen bg-background max-w-md mx-auto relative pb-32">
      <header className="px-4 py-4 flex items-center justify-between bg-background/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200/50">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-surface shadow-soft rounded-full active:shadow-inset">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold">Menu</h1>
            <p className="text-sm text-secondary font-medium">Add to Table Order</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {menuItems.map(item => {
          const cartItem = cart.find(c => c.id === item.id);
          return (
            <div key={item.id} className="card p-4 flex items-center justify-between">
              <div className="flex-1 mr-4">
                <h3 className="font-bold text-sm uppercase">{item.name}</h3>
                <p className="text-secondary text-sm font-bold mt-1">₹{item.price}</p>
              </div>
              
              {cartItem ? (
                <div className="flex items-center justify-between w-24 border border-slate-200 rounded-full py-1.5 px-1 bg-white shrink-0 shadow-sm">
                  <button onClick={() => updateQuantity(item.id, -1)} className="text-primary px-2 font-bold"><Minus size={14} /></button>
                  <span className="font-bold text-sm">{cartItem.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="text-primary px-2 font-bold"><Plus size={14} /></button>
                </div>
              ) : (
                <button 
                  onClick={() => handleAddToCart(item)}
                  className="bg-primary/10 text-primary px-4 py-2 rounded-full font-bold text-sm active:bg-primary/20 transition-colors shrink-0"
                >
                  ADD
                </button>
              )}
            </div>
          );
        })}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-surface shadow-[0_-10px_40px_rgba(0,0,0,0.05)] rounded-t-3xl pb-safe">
          <button onClick={handlePlaceOrder} className="btn btn-accent w-full flex items-center justify-between px-6">
            <div className="flex items-center gap-2">
              <ShoppingBag size={20} />
              <span>{cartItemsCount} Items</span>
            </div>
            <span>Place Order (₹{cartTotal})</span>
          </button>
        </div>
      )}
    </div>
  );
}

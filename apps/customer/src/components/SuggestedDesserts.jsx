import { Plus, Minus } from 'lucide-react';
import ImageFallback from './ImageFallback';

export default function SuggestedDesserts({ suggestedItems, onAddToCart, cart, isReadOnly, updateQuantity }) {
  if (!suggestedItems || suggestedItems.length === 0) return null;

  return (
    <div className="mb-2">
      <h4 className="text-[11px] font-bold text-theme-text-sec uppercase tracking-widest mb-3 flex items-center gap-2">
        You might also like... 😋
      </h4>
      <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-2 -mx-4 snap-x scroll-pl-4">
        <div className="w-1 flex-shrink-0"></div>
        {suggestedItems.map(item => {
          const inCart = cart?.find(i => i.id === item.id);
          
          return (
            <div key={item.id} className={`w-[170px] flex-shrink-0 snap-start bg-theme-surface rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col ${!item.is_available ? 'opacity-60 grayscale' : ''}`}>
              <div className="relative aspect-square">
                <ImageFallback src={item.image_url} name={item.name} className="w-full h-full object-cover" />

                {/* Out of stock overlay */}
                {!item.is_available && (
                  <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                    <span className="bg-danger text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Out of Stock</span>
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
                    <span className="font-bold text-[15px] leading-none text-theme-text-main">₹{Math.round(item.price)}</span>
                    <span className="text-[9px] font-bold text-theme-text-sec mt-0.5 tracking-wider">+5% GST</span>
                  </div>

                  <div>
                    {!item.is_available ? (
                      <button disabled className="bg-slate-200 text-theme-text-sec font-bold text-[11px] px-3 py-1.5 rounded uppercase cursor-not-allowed">
                        N/A
                      </button>
                    ) : isReadOnly ? (
                      <div className="text-[11px] font-bold text-theme-text-sec uppercase tracking-wider px-2 py-1.5">
                        View Only
                      </div>
                    ) : inCart ? (
                      <div className="flex items-center bg-theme-primary rounded overflow-hidden">
                        <button onClick={() => updateQuantity(item.id, -1)} className="p-1.5 text-theme-surface hover:bg-black/10 active:bg-black/20 transition-colors">
                          <Minus size={14} strokeWidth={3} />
                        </button>
                        <span className="text-theme-surface font-bold text-[13px] w-4 text-center">{inCart.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 text-theme-surface hover:bg-black/10 active:bg-black/20 transition-colors">
                          <Plus size={14} strokeWidth={3} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => onAddToCart(item)} className="bg-theme-primary text-theme-surface font-bold text-[11px] px-4 py-1.5 rounded uppercase active:scale-95 transition-transform">
                        ADD
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div className="w-1 flex-shrink-0"></div>
      </div>
    </div>
  );
}

import { Clock } from 'lucide-react';

export default function OrderStatusBadge() {
  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto">
      <div className="bg-primary text-white p-4 rounded-2xl shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full animate-pulse">
            <Clock size={20} />
          </div>
          <div>
            <p className="font-semibold text-sm">Order Preparing</p>
            <p className="text-white/70 text-xs">Est. 15-20 mins</p>
          </div>
        </div>
        <button className="bg-white/10 px-4 py-2 rounded-xl text-sm font-medium hover:bg-white/20 transition-colors">
          View
        </button>
      </div>
    </div>
  );
}

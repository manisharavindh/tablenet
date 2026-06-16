import { useState } from 'react';
import { BrowserRouter, Routes, Route, useParams, Navigate } from 'react-router-dom';
import { ChefHat, ListTree } from 'lucide-react';
import LiveTicketBoard from './components/LiveTicketBoard';
import MenuManager from './components/MenuManager';

function KitchenView() {
  const { kitchenId } = useParams();
  const [activeTab, setActiveTab] = useState('tickets');

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <header className="bg-surface shadow-sm border-b border-slate-200/50 px-6 py-4 flex justify-between items-center z-10 relative">
        <div className="flex items-center gap-3 text-primary">
          <div className="bg-primary text-white p-2 rounded-xl shadow-lg">
            <ChefHat size={24} />
          </div>
          <div>
            <h1 className="font-bold text-2xl tracking-tight leading-tight">TableNet Kitchen</h1>
            {kitchenId && <p className="text-xs font-bold text-secondary uppercase tracking-widest mt-0.5">Station {kitchenId}</p>}
          </div>
        </div>
        
        <div className="flex bg-slate-100 shadow-inset p-1.5 rounded-2xl">
          <button 
            onClick={() => setActiveTab('tickets')}
            className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'tickets' ? 'bg-surface shadow-soft text-primary' : 'text-secondary hover:text-primary'}`}
          >
            <ChefHat size={18} />
            Live Tickets
          </button>
          <button 
            onClick={() => setActiveTab('menu')}
            className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'menu' ? 'bg-surface shadow-soft text-primary' : 'text-secondary hover:text-primary'}`}
          >
            <ListTree size={18} />
            Menu Manager
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        {activeTab === 'tickets' ? <LiveTicketBoard /> : <MenuManager />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/k/:kitchenId" element={<KitchenView />} />
        <Route path="*" element={<Navigate to="/k/1" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

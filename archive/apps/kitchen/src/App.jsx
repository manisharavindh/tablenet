import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useParams, Navigate } from 'react-router-dom';
import { ChefHat, ListTree, Grid, Settings, Moon } from 'lucide-react';
import LiveTicketBoard from './components/LiveTicketBoard';
import MenuManager from './components/MenuManager';
import TableManager from './components/TableManager';
import SettingsManager from './components/SettingsManager';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function KitchenView() {
  const { kitchenId } = useParams();
  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets', 'menu', 'tables', 'settings'

  useEffect(() => {
    // Initialize theme based on localStorage
    const isDark = localStorage.getItem('kitchen_theme') === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col transition-colors duration-300">
      <header className="bg-surface/80 backdrop-blur-md border-b border-theme-border px-8 py-5 flex justify-between items-center z-10 sticky top-0 shadow-sm transition-colors duration-300">
        <div className="flex items-center gap-4 text-theme-text-main">
          <div className="bg-theme-primary text-white p-3 rounded-2xl shadow-lg shadow-theme-primary/20">
            <ChefHat size={28} />
          </div>
          <div>
            <h1 className="font-bold text-2xl tracking-tight leading-tight">TableNet Kitchen</h1>
            {kitchenId && <p className="text-xs font-bold text-theme-text-sec uppercase tracking-widest mt-0.5 opacity-70">Station {kitchenId}</p>}
          </div>
        </div>
        
        <div className="flex bg-theme-bg p-1.5 rounded-2xl overflow-x-auto snap-x hide-scrollbar border border-theme-border transition-colors duration-300">
          <button 
            onClick={() => setActiveTab('tickets')}
            className={`px-5 py-3 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap snap-start ${activeTab === 'tickets' ? 'bg-surface shadow-sm text-theme-primary' : 'text-theme-text-sec hover:text-theme-text-main'}`}
          >
            <ChefHat size={20} />
            Tickets
          </button>
          <button 
            onClick={() => setActiveTab('menu')}
            className={`px-5 py-3 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap snap-start ${activeTab === 'menu' ? 'bg-surface shadow-sm text-theme-primary' : 'text-theme-text-sec hover:text-theme-text-main'}`}
          >
            <ListTree size={20} />
            Menu
          </button>
          <button 
            onClick={() => setActiveTab('tables')}
            className={`px-5 py-3 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap snap-start ${activeTab === 'tables' ? 'bg-surface shadow-sm text-theme-primary' : 'text-theme-text-sec hover:text-theme-text-main'}`}
          >
            <Grid size={20} />
            Tables
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-5 py-3 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap snap-start ${activeTab === 'settings' ? 'bg-surface shadow-sm text-theme-primary' : 'text-theme-text-sec hover:text-theme-text-main'}`}
          >
            <Settings size={20} />
            Settings
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto relative">
        <div className={activeTab === 'tickets' ? 'block h-full' : 'hidden'}>
          <LiveTicketBoard />
        </div>
        <div className={activeTab === 'menu' ? 'block h-full' : 'hidden'}>
          <MenuManager />
        </div>
        <div className={activeTab === 'tables' ? 'block h-full' : 'hidden'}>
          <TableManager />
        </div>
        <div className={activeTab === 'settings' ? 'block h-full' : 'hidden'}>
          <SettingsManager />
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/k/:kitchenId" element={<PrivateRoute><KitchenView /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/k/1" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

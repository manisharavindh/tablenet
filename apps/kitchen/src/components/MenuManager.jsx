import { useState } from 'react';
import { Search } from 'lucide-react';

const initialMenu = [
  { id: 1, name: 'Truffle Fries', category: 'Starters', available: true },
  { id: 2, name: 'Calamari', category: 'Starters', available: true },
  { id: 3, name: 'Wagyu Burger', category: 'Mains', available: false },
  { id: 4, name: 'Margherita Pizza', category: 'Mains', available: true }
];

export default function MenuManager() {
  const [menu, setMenu] = useState(initialMenu);

  const toggleAvailability = (id) => {
    setMenu(prev => prev.map(item => 
      item.id === id ? { ...item, available: !item.available } : item
    ));
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1">Menu Manager</h1>
          <p className="text-secondary text-sm font-medium">Manage item availability (86 items)</p>
        </div>
        <div className="relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
          <input 
            type="text" 
            placeholder="Search items..." 
            className="pl-12 pr-4 py-3 rounded-2xl bg-surface shadow-inset outline-none w-72 focus:ring-2 focus:ring-accent/50 transition-all font-medium"
          />
        </div>
      </div>

      <div className="bg-surface shadow-soft rounded-3xl overflow-hidden border border-white/50">
        <table className="w-full text-left">
          <thead className="bg-slate-100/50 text-secondary text-xs uppercase tracking-widest border-b border-slate-200">
            <tr>
              <th className="px-8 py-5 font-bold">Item Name</th>
              <th className="px-8 py-5 font-bold">Category</th>
              <th className="px-8 py-5 font-bold text-right">Status (86)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {menu.map(item => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-5 font-semibold text-lg">{item.name}</td>
                <td className="px-8 py-5 text-secondary font-medium">
                  <span className="bg-slate-100 px-3 py-1 rounded-full text-sm">{item.category}</span>
                </td>
                <td className="px-8 py-5">
                  <div className="flex justify-end items-center gap-4">
                    <span className={`text-sm font-bold uppercase tracking-wider ${item.available ? 'text-green-600' : 'text-danger'}`}>
                      {item.available ? 'Available' : '86\'d'}
                    </span>
                    <button 
                      onClick={() => toggleAvailability(item.id)}
                      className={`neumorphic-toggle w-16 h-8 flex items-center p-1 rounded-full shadow-inset ${item.available ? 'bg-success/20' : 'bg-danger/20'}`}
                    >
                      <div className={`neumorphic-toggle-knob w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${item.available ? 'translate-x-8 bg-success' : 'translate-x-0 bg-danger'}`} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

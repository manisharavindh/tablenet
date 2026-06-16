import { Clock, Check } from 'lucide-react';

const mockTickets = [
  { id: 'T-104', table: '4', status: 'placed', time: '5m', items: ['2x Wagyu Burger', '1x Truffle Fries'] },
  { id: 'T-105', table: '2', status: 'preparing', time: '12m', items: ['1x Margherita Pizza', '1x Calamari'] },
  { id: 'T-106', table: '6', status: 'ready', time: '18m', items: ['4x Wagyu Burger'] },
];

export default function LiveTicketBoard() {
  const columns = ['placed', 'preparing', 'ready'];

  return (
    <div className="p-6 h-[calc(100vh-80px)] overflow-hidden">
      <div className="grid grid-cols-3 gap-6 h-full">
        {columns.map(col => (
          <div key={col} className="bg-slate-100 shadow-inset rounded-3xl p-4 flex flex-col h-full border border-slate-200">
            <div className="flex justify-between items-center mb-4 px-2">
              <h2 className="font-bold text-lg capitalize text-primary">{col}</h2>
              <span className="bg-surface shadow-soft text-secondary font-bold px-3 py-1 rounded-full text-sm">
                {mockTickets.filter(t => t.status === col).length}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 px-2 pb-4">
              {mockTickets.filter(t => t.status === col).map(ticket => (
                <div key={ticket.id} className="bg-[url('https://www.transparenttextures.com/patterns/rice-paper-2.png')] bg-amber-50 rounded-b-lg rounded-t-sm p-4 shadow-md border-t-8 border-amber-300 relative">
                  <div className="flex justify-between items-start mb-3 pb-3 border-b border-amber-200 border-dashed flex-wrap gap-2">
                    <div className="font-mono text-xl font-bold text-amber-900">Table {ticket.table}</div>
                    <div className="flex items-center gap-1 text-sm text-amber-700 font-bold">
                      <Clock size={14} />
                      {ticket.time}
                    </div>
                  </div>
                  <ul className="space-y-2 mb-6 font-semibold text-amber-900 text-sm">
                    {ticket.items.map((item, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="text-amber-500">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {col !== 'ready' && (
                    <button className="w-full bg-surface text-primary shadow-soft hover:shadow-inset font-bold py-3 rounded-xl transition-all text-sm">
                      {col === 'placed' ? 'Start Preparing' : 'Mark Ready'}
                    </button>
                  )}
                  {col === 'ready' && (
                    <div className="text-center text-green-800 font-bold text-sm bg-green-100 py-3 rounded-xl flex items-center justify-center gap-2 border border-green-200">
                      <Check size={16} /> Waiting for server
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { Users, Clock } from 'lucide-react';

const mockTables = [
  { id: 1, number: '1', status: 'open', capacity: 4 },
  { id: 2, number: '2', status: 'seated', capacity: 2, timeSeated: '15m' },
  { id: 3, number: '3', status: 'waiting', capacity: 4, timeSeated: '30m' },
  { id: 4, number: '4', status: 'open', capacity: 6 },
  { id: 5, number: '5', status: 'served', capacity: 2, timeSeated: '45m' },
  { id: 6, number: '6', status: 'waiting', capacity: 4, timeSeated: '10m' },
];

export default function TablesOverview({ onSelectTable }) {
  const getStatusColor = (status) => {
    switch(status) {
      case 'open': return 'bg-surface shadow-soft text-primary';
      case 'seated': return 'bg-blue-50 shadow-soft text-blue-800';
      case 'waiting': return 'bg-amber-50 shadow-soft text-amber-800 border-2 border-amber-200';
      case 'served': return 'bg-green-50 shadow-soft text-green-800';
      default: return 'bg-surface';
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto pb-24 pt-6">
      <div className="mb-6 px-2">
        <h1 className="text-3xl font-bold tracking-tight mb-4">Tables</h1>
        <div className="flex gap-2 text-xs font-medium overflow-x-auto pb-2 snap-x">
          <span className="px-4 py-2 bg-surface shadow-inset rounded-full snap-start whitespace-nowrap">All (6)</span>
          <span className="px-4 py-2 bg-amber-50 text-amber-800 rounded-full shadow-soft snap-start whitespace-nowrap">Waiting (2)</span>
          <span className="px-4 py-2 bg-blue-50 text-blue-800 rounded-full shadow-soft snap-start whitespace-nowrap">Seated (1)</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 px-2">
        {mockTables.map(table => (
          <button 
            key={table.id}
            onClick={() => onSelectTable(table)}
            className={`${getStatusColor(table.status)} rounded-3xl p-5 text-left active:scale-[0.98] transition-transform flex flex-col justify-between h-36 border border-white/50`}
          >
            <div className="flex justify-between items-start">
              <span className="text-2xl font-bold">T{table.number}</span>
              <div className="flex items-center gap-1 text-xs font-semibold bg-white/50 px-2 py-1 rounded-full">
                <Users size={12} />
                <span>{table.capacity}</span>
              </div>
            </div>
            
            <div>
              <span className="text-sm font-bold capitalize block mb-1">{table.status}</span>
              {table.timeSeated && (
                <div className="flex items-center gap-1 text-xs font-medium opacity-80">
                  <Clock size={12} />
                  <span>{table.timeSeated}</span>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

import { Plus } from 'lucide-react';

const mockMenu = [
  {
    category: 'Starters',
    items: [
      { id: 1, name: 'Truffle Fries', price: 8.99, description: 'Crispy fries with truffle oil and parmesan', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&q=80' },
      { id: 2, name: 'Calamari', price: 12.99, description: 'Lightly breaded and fried, served with marinara', image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&q=80' }
    ]
  },
  {
    category: 'Mains',
    items: [
      { id: 3, name: 'Wagyu Burger', price: 18.99, description: 'Half pound wagyu beef, aged cheddar, brioche bun', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80' },
      { id: 4, name: 'Margherita Pizza', price: 15.99, description: 'Fresh mozzarella, san marzano tomatoes, basil', image: 'https://images.unsplash.com/photo-1604068549290-dea0e4a30536?w=500&q=80' }
    ]
  }
];

export default function MenuPage({ onAddToCart }) {
  return (
    <div className="pb-24 pt-6 px-4 max-w-md mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Our Menu</h1>
        <p className="text-secondary text-sm">Discover our delicious offerings</p>
      </div>
      
      {mockMenu.map((category) => (
        <div key={category.category}>
          <h2 className="text-xl font-semibold mb-4">{category.category}</h2>
          <div className="space-y-4">
            {category.items.map((item) => (
              <div key={item.id} className="card flex gap-4 p-4">
                <img src={item.image} alt={item.name} className="w-24 h-24 object-cover rounded-xl shadow-soft-sm" />
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-lg leading-tight mb-1">{item.name}</h3>
                    <p className="text-secondary text-xs line-clamp-2">{item.description}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-accent">${item.price.toFixed(2)}</span>
                    <button 
                      onClick={() => onAddToCart(item)}
                      className="bg-surface shadow-soft rounded-full p-2 text-accent active:shadow-inset active:scale-95 transition-all"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

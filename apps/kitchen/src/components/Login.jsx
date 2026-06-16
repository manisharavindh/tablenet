import { useState } from 'react';
import { supabase } from '@tablenet/supabase';
import { ChefHat } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  if (user) {
    return <Navigate to="/k/1" replace />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="card w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="bg-primary text-white p-4 rounded-2xl shadow-lg mb-4">
            <ChefHat size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Kitchen Portal</h1>
          <p className="text-secondary text-sm mt-1">Staff Access Only</p>
        </div>
        
        {error && <div className="bg-danger/10 text-danger p-3 rounded-lg text-sm text-center">{error}</div>}
        
        <div className="space-y-4">
          <input 
            type="email" 
            placeholder="Email address" 
            className="w-full p-4 rounded-xl bg-surface shadow-inset outline-none focus:ring-2 focus:ring-accent/50 transition-all font-medium" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
          />
          <input 
            type="password" 
            placeholder="Password" 
            className="w-full p-4 rounded-xl bg-surface shadow-inset outline-none focus:ring-2 focus:ring-accent/50 transition-all font-medium" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
          />
        </div>
        
        <button type="submit" className="btn btn-primary w-full py-4 text-lg">
          Authenticate
        </button>
      </form>
    </div>
  );
}

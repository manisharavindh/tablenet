import { useState } from 'react';
import { supabase } from '@tablenet/supabase';
import { ChefHat, Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

export default function Login() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (user) {
    return <Navigate to="/w/1" replace />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    if (!captchaVerified) {
      setError("Please complete the captcha.");
      return;
    }

    if (email.toLowerCase().trim() !== 'waiter@tablenet.app') {
      setError("Only the waiter can access the waiter portal.");
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);

    if (error) setError(error.message);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-surface">
      {/* Login Form Container */}
      <div className="w-full p-8 md:p-12 z-10 flex justify-center">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center text-center mb-6">
            <Logo className="w-56 h-auto mb-2" color="#1C1C1C" />
            {/* <h1 c </div>lassName="text-3xl font-black text-theme-text-main tracking-tight">Waiter Portal</h1> */}
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && <div className="bg-danger/10 text-danger border border-danger/20 p-3 rounded-lg text-sm text-center font-medium">{error}</div>}

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-theme-text-sec uppercase tracking-wider ml-1 mb-2 block">Email Address</label>
                <input
                  type="email"
                  placeholder="waiter@tablenet.app"
                  className="w-full p-4 rounded-xl bg-theme-bg border border-theme-border focus:ring-2 focus:ring-accent/50 outline-none transition-all font-medium text-theme-text-main shadow-inner"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-theme-text-sec uppercase tracking-wider ml-1 mb-2 block">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full p-4 rounded-xl bg-theme-bg border border-theme-border focus:ring-2 focus:ring-accent/50 outline-none transition-all font-medium text-theme-text-main shadow-inner tracking-widest"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Captcha Placeholder */}
            <div className="bg-theme-bg border border-theme-border rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="w-6 h-6 rounded-md accent-theme-primary cursor-pointer border-slate-300"
                  id="captcha"
                  checked={captchaVerified}
                  onChange={(e) => setCaptchaVerified(e.target.checked)}
                />
                <label htmlFor="captcha" className="font-bold text-sm text-theme-text-main cursor-pointer select-none">I'm not a robot</label>
              </div>
              <div className="flex flex-col items-center justify-center opacity-80">
                <img src="https://www.gstatic.com/recaptcha/api2/logo_48.png" alt="reCAPTCHA" className="w-8 h-8 object-contain mb-1 drop-shadow-sm" />
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">reCAPTCHA</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn btn-primary py-4 text-lg font-bold shadow-lg shadow-theme-primary/20 mt-2 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
              {isLoading ? '' : 'Authenticate'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

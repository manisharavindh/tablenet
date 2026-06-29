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
    return <Navigate to="/k/1" replace />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    if (!captchaVerified) {
      setError("Please complete the captcha.");
      return;
    }

    if (email.toLowerCase().trim() !== 'kitchen@tablenet.app') {
      setError("Only the chef has to access the kitchen portal.");
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);

    if (error) setError(error.message);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Left Side - Login Form */}
      <div className="flex-1 w-full md:w-[45%] lg:w-[40%] flex flex-col items-center justify-center p-8 md:p-12 lg:p-16 shadow-[10px_0_30px_rgba(0,0,0,0.03)] z-10 bg-surface">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center md:items-start text-center md:text-left mb-10">
            <Logo className="w-56 h-auto drop-shadow-md" />
            {/* <h1 className="text-2xl font-black text-theme-text-main tracking-tight">Staff Portal</h1>
            <p className="text-theme-text-sec text-sm mt-2 font-medium">Please sign in to access the kitchen management dashboard.</p> */}
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && <div className="bg-danger/10 text-danger border border-danger/20 p-3 rounded-lg text-sm text-center font-medium">{error}</div>}

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-theme-text-sec uppercase tracking-wider ml-1 mb-2 block">Email Address</label>
                <input
                  type="email"
                  placeholder="kitchen@tablenet.app"
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

      <div className="hidden md:block md:w-[55%] lg:w-[60%] relative bg-slate-200 dark:bg-slate-800 overflow-hidden">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3769.2297802872404!2d77.43714847480302!3d8.708043691341048!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3b043947d4c59bfd%3A0x8f115ffabb5421b1!2sTaj%20Tamira%20Restaurant!5e1!3m2!1sen!2sin!4v1782534982053!5m2!1sen!2sin"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen=""
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 w-full h-full object-cover"
        ></iframe>

        {/* <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent opacity-60 pointer-events-none"></div>
        <div className="absolute inset-0 bg-theme-primary/5 pointer-events-none mix-blend-overlay"></div> */}
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import AlwaysOnMic from '../components/AlwaysOnMic';
import HandGestureNav from '../components/HandGestureNav';

function VibrationRecorder({ onSave }) {
  const [pattern, setPattern] = useState([]); // Store durations in ms
  const [recording, setRecording] = useState(false);
  const [tapping, setTapping] = useState(false);
  const pressStart = useRef(null);
  
  const handlePressStart = () => { if (!recording) return; pressStart.current = Date.now(); setTapping(true); };
  const handlePressEnd = () => {
    if (!recording || !pressStart.current) return;
    const duration = Date.now() - pressStart.current;
    if (duration > 50) { // filter out accidental taps
      setPattern(prev => [...prev, duration]);
    }
    pressStart.current = null; setTapping(false);
  };

  return (
    <div className="text-center">
      <p className="text-white/60 text-sm mb-4">{recording ? 'Tap/Hold the zone below' : 'Press Record to start'}</p>
      {pattern.length > 0 && (
        <div className="flex gap-2 justify-center mb-4 flex-wrap">
          {pattern.map((p, i) => (<div key={i} className={`h-4 rounded-full transition-all ${p > 300 ? 'w-12 bg-saffron-500' : 'w-4 bg-white/60'}`} />))}
        </div>
      )}
      <div className={`tap-zone mx-auto mb-4 h-32 flex items-center justify-center select-none ${tapping ? 'tapping' : ''} border-2 border-white/10 rounded-3xl bg-white/5 active:bg-saffron-500/10 transition-colors`}
        style={{ touchAction: 'none' }} onMouseDown={handlePressStart} onMouseUp={handlePressEnd}
        onTouchStart={e => { e.preventDefault(); handlePressStart(); }} onTouchEnd={handlePressEnd}>
        <div className="text-center pointer-events-none">
          <div className="text-4xl mb-2">{recording ? (tapping ? '✊' : '👆') : '🔒'}</div>
          <p className="text-white/40 text-xs">{recording ? 'Tap/Hold' : 'Locked'}</p>
        </div>
      </div>
      <div className="flex gap-3 justify-center">
        {!recording ? (
          <button onClick={() => { setPattern([]); setRecording(true); }} className="px-6 py-2 gradient-saffron rounded-xl text-white font-semibold hover:opacity-90 transition-all">🔴 Start Recording</button>
        ) : (
          <>
            <button onClick={() => setRecording(false)} className="px-6 py-2 glass rounded-xl text-white/70 hover:bg-white/10 transition-all font-bold group flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Stop Recording
            </button>
            <button onClick={() => { setPattern([]); setRecording(false); }} className="px-4 py-2 text-white/40 hover:text-white transition-all text-sm">Cancel</button>
          </>
        )}
      </div>
      {pattern.length >= 2 && !recording && (
        <button onClick={() => onSave(pattern)} className="mt-4 w-full py-3 bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl font-bold hover:bg-green-500/30 transition-all">✓ Save This Pattern</button>
      )}
      {pattern.length > 0 && !recording && (
        <p className="text-white/40 text-xs mt-3">{pattern.length} taps recorded</p>
      )}
    </div>
  );
}

function ForgotPasswordFlow({ onBack }) {
  const [step, setStep] = useState('email'); // email | otp | reset
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpId, setOtpId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(300);

  useEffect(() => {
    if (step !== 'otp') return;
    const interval = setInterval(() => setTimer(t => { if (t <= 1) { clearInterval(interval); return 0; } return t - 1; }), 1000);
    return () => clearInterval(interval);
  }, [step]);

  const sendOtp = async () => {
    if (!email) return toast.error('Enter your email');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('OTP sent! Check your email.');
      setStep('otp'); setTimer(300);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to send OTP'); }
    finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (!otp || otp.length !== 6) return toast.error('Enter 6-digit OTP');
    if (timer <= 0) return toast.error('OTP expired. Request a new one.');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { email, otp, type: 'password_reset' });
      setOtpId(data.otpId);
      toast.success('OTP verified!');
      setStep('reset');
    } catch (err) { toast.error(err.response?.data?.message || 'Invalid OTP'); }
    finally { setLoading(false); }
  };

  const resetPassword = async () => {
    if (newPassword.length < 6) return toast.error('Password min 6 chars');
    if (newPassword !== confirmPw) return toast.error('Passwords don\'t match');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, otpId, newPassword });
      toast.success('Password reset! You can now login.');
      onBack();
    } catch (err) { toast.error(err.response?.data?.message || 'Reset failed'); }
    finally { setLoading(false); }
  };

  const mins = Math.floor(timer / 60);
  const secs = timer % 60;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      {step === 'email' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">🔓 Forgot Password</h2>
          <p className="text-white/50 text-sm">Enter your registered email. We'll send a 6-digit OTP.</p>
          <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-saffron-500/60 transition-colors" />
          <button onClick={sendOtp} disabled={loading} className="w-full gradient-saffron py-3.5 rounded-xl text-white font-bold hover:opacity-90 disabled:opacity-50 transition-all">
            {loading ? '⚙️ Sending...' : 'Send OTP →'}
          </button>
          <button onClick={onBack} className="w-full text-white/40 text-sm py-2">← Back to Login</button>
        </div>
      )}
      {step === 'otp' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">📧 Enter OTP</h2>
          <p className="text-white/50 text-sm">6-digit OTP sent to {email}</p>
          <div className={`text-center font-mono text-lg ${timer < 60 ? 'text-red-400' : 'text-saffron-400'}`}>
            ⏱ {mins}:{secs.toString().padStart(2, '0')}
          </div>
          <input type="text" inputMode="numeric" placeholder="Enter 6-digit OTP" maxLength={6} value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-saffron-500/60 transition-colors text-center text-2xl tracking-[1rem]" />
          <button onClick={verifyOtp} disabled={loading || timer <= 0} className="w-full gradient-saffron py-3.5 rounded-xl text-white font-bold hover:opacity-90 disabled:opacity-50">
            {loading ? '⚙️ Verifying...' : 'Verify OTP →'}
          </button>
          <button onClick={() => { setStep('email'); setOtp(''); }} className="w-full text-white/40 text-sm py-2">← Request new OTP</button>
        </div>
      )}
      {step === 'reset' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">🔑 New Password</h2>
          <p className="text-white/50 text-sm">Set a new password for your account.</p>
          <input type="password" placeholder="New password (min 6 chars)" value={newPassword} onChange={e => setNewPassword(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-saffron-500/60 transition-colors" />
          <input type="password" placeholder="Confirm new password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-saffron-500/60 transition-colors" />
          <button onClick={resetPassword} disabled={loading} className="w-full gradient-saffron py-3.5 rounded-xl text-white font-bold hover:opacity-90 disabled:opacity-50">
            {loading ? '⚙️ Resetting...' : 'Reset Password ✓'}
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ... existing components ...

export default function Auth() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [authWithFingerprint, setAuthWithFingerprint] = useState(false);
  const [showCameraNav, setShowCameraNav] = useState(false);

  const [form, setForm] = useState({
    role: '', name: '', email: '', mobile: '', password: '', confirmPassword: '',
    parentEmail: '', parentMobile: '', pin: '', confirmPin: '', vibrationPattern: []
  });

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(user.role === 'parent' ? '/parent' : user.role === 'divyang' ? '/accessibility' : '/student');
    } catch (err) { toast.error(err.response?.data?.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  const handleFingerprintLogin = async () => {
    if (!form.email) return toast.error('Enter email first');
    setLoading(true);
    try {
      const { data: options } = await api.post('/auth/webauthn/login-options', { email: form.email });
      const attResp = await startAuthentication(options);
      const { data: verifyResp } = await api.post('/auth/webauthn/login-verify', { email: form.email, response: attResp });

      if (verifyResp.verified) {
        toast.success('Fingerprint verified! Logging in...');
        // Manually update context with tokens if login helper doesn't handle verify data
        localStorage.setItem('accessToken', verifyResp.accessToken);
        localStorage.setItem('refreshToken', verifyResp.refreshToken);
        window.location.href = verifyResp.user.role === 'parent' ? '/parent' : verifyResp.user.role === 'divyang' ? '/accessibility' : '/student';
      }
    } catch (err) { toast.error('Fingerprint auth failed'); }
    finally { setLoading(false); }
  };

  const handleSignupNext = () => {
    if (step === 0 && !form.role) return toast.error('Please select a role');
    if (step === 1) {
      if (!form.name || !form.email || !form.password) return toast.error('Fill all fields');
      if (form.password !== form.confirmPassword) return toast.error('Passwords do not match');
      if (form.password.length < 8) return toast.error('Password must be at least 8 characters');
    }
    if (step === 2) {
      if (form.pin.length !== 6 || !/^\d{6}$/.test(form.pin)) return toast.error('PIN must be exactly 6 digits');
      if (form.pin !== form.confirmPin) return toast.error('PINs do not match');
    }
    setStep(s => s + 1);
  };

  const handleRegister = async () => {
    if (form.vibrationPattern.length < 2) return toast.error('Please record a vibration pattern');
    setLoading(true);
    try {
      const user = await register({
        name: form.name, email: form.email, mobile: form.mobile, password: form.password,
        pin: form.pin, vibrationPattern: form.vibrationPattern,
        role: form.role, parentEmail: form.parentEmail, parentMobile: form.parentMobile
      });
      // Move to Fingerprint registration step (Step 4)
      setStep(4);
    } catch (err) { toast.error(err.response?.data?.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  const handleRegisterWebAuthn = async () => {
    setLoading(true);
    try {
      const { data: options } = await api.get('/auth/webauthn/register-options');
      const attResp = await startRegistration(options);
      await api.post('/auth/webauthn/register-verify', attResp);
      toast.success('Fingerprint registered successfully! 🛡️');
      setStep(5);
    } catch (err) { toast.error('Fingerprint registration failed. Skipping.'); setStep(5); }
    finally { setLoading(false); }
  };

  const roleOptions = [
    { value: 'student', label: 'Student', emoji: '🎓', desc: 'Gamified wallet & savings goals' },
    { value: 'parent', label: 'Parent', emoji: '👨‍👩‍👧', desc: 'Monitor & control child spending' },
    { value: 'divyang', label: 'Divyang', emoji: '♿', desc: 'Accessible UI with voice & vibration' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-80 h-80 bg-saffron-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-navy-600/20 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-12 h-12 gradient-saffron rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-saffron-500/30">₹</div>
            <span className="font-display text-3xl font-bold text-white">Pay<span className="text-gradient-saffron">Bridge</span></span>
          </button>
        </div>

        <motion.div layout className="glass rounded-3xl p-8 border border-white/10 shadow-2xl">
          {mode !== 'forgot' && (
            <div className="flex gap-1 p-1 bg-black/30 rounded-2xl mb-8">
              {['login', 'signup'].map(m => (
                <button key={m} onClick={() => { setMode(m); setStep(0); }}
                  className={`flex-1 py-2.5 rounded-xl font-semibold text-sm capitalize transition-all ${mode === m ? 'gradient-saffron text-white shadow-lg' : 'text-white/50 hover:text-white'}`}>
                  {m === 'login' ? '🔑 Login' : '✨ Sign Up'}
                </button>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            {mode === 'forgot' && (
              <ForgotPasswordFlow key="forgot" onBack={() => setMode('login')} />
            )}

            {mode === 'login' && (
              <motion.form key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                onSubmit={handleLogin} className="space-y-5">
                <h2 className="text-xl font-bold text-white">Welcome back</h2>
                <input type="email" placeholder="Email address" value={form.email} onChange={e => update('email', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-saffron-500/60 transition-colors" />
                <input type="password" placeholder="Password" value={form.password} onChange={e => update('password', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-saffron-500/60 transition-colors" />
                
                <div className="flex gap-3">
                  <button type="submit" disabled={loading}
                    className="flex-[2] gradient-saffron py-4 rounded-xl text-white font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-saffron-500/30">
                    {loading ? '⚙️...' : 'Login →'}
                  </button>
                  <button type="button" onClick={handleFingerprintLogin} disabled={loading}
                    className="flex-1 glass border border-white/10 rounded-xl flex items-center justify-center text-2xl hover:bg-white/5 transition-all" title="Login with Fingerprint">
                    ☝️
                  </button>
                </div>

                <button type="button" onClick={() => setMode('forgot')} className="w-full text-saffron-400 text-sm py-1 hover:underline">
                  Forgot Password?
                </button>
              </motion.form>
            )}

            {mode === 'signup' && (
              <motion.div key="signup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {step < 5 && (
                  <div className="flex gap-2 mb-6">
                    {['Role', 'Details', 'PIN', 'Vibration', 'Fingerprint'].map((s, i) => (
                      <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i <= step ? 'bg-saffron-500' : 'bg-white/10'}`} />
                    ))}
                  </div>
                )}
                <AnimatePresence mode="wait">
                  {step === 0 && (
                    <motion.div key="s0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                      <h2 className="text-xl font-bold text-white mb-5">I am a...</h2>
                      <div className="space-y-3">
                        {roleOptions.map(r => (
                          <button key={r.value} onClick={() => update('role', r.value)}
                            className={`w-full p-4 rounded-xl border transition-all flex items-center gap-4 text-left ${form.role === r.value ? 'border-saffron-500 bg-saffron-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                            <span className="text-3xl">{r.emoji}</span>
                            <div><div className="font-bold text-white">{r.label}</div><div className="text-white/50 text-sm">{r.desc}</div></div>
                          </button>
                        ))}
                      </div>
                      <button onClick={handleSignupNext} className="w-full mt-6 gradient-saffron py-3.5 rounded-xl text-white font-bold hover:opacity-90 transition-all">Continue →</button>
                    </motion.div>
                  )}
                  {step === 1 && (
                    <motion.div key="s1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                      <h2 className="text-xl font-bold text-white">Your details</h2>
                      {[
                        { key: 'name', placeholder: 'Full name', type: 'text' },
                        { key: 'email', placeholder: 'Email address', type: 'email' },
                        { key: 'mobile', placeholder: 'Mobile number', type: 'tel' },
                        { key: 'password', placeholder: 'Password (min 8 chars)', type: 'password' },
                        { key: 'confirmPassword', placeholder: 'Confirm password', type: 'password' },
                      ].map(f => (
                        <input key={f.key} type={f.type} placeholder={f.placeholder} value={form[f.key]}
                          onChange={e => update(f.key, e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-saffron-500/60 transition-colors" />
                      ))}
                      {form.role === 'student' && (
                        <>
                          <input type="text" placeholder="Parent's mobile number" value={form.parentMobile}
                            onChange={e => update('parentMobile', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-saffron-500/60 transition-colors" />
                          <p className="text-white/30 text-xs">Or parent's email:</p>
                          <input type="email" placeholder="Parent's email (optional)" value={form.parentEmail}
                            onChange={e => update('parentEmail', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-saffron-500/60 transition-colors" />
                        </>
                      )}
                      <div className="flex gap-3">
                        <button onClick={() => setStep(0)} className="px-6 py-3 glass rounded-xl text-white/70">← Back</button>
                        <button onClick={handleSignupNext} className="flex-1 gradient-saffron py-3 rounded-xl text-white font-bold hover:opacity-90 transition-all">Continue →</button>
                      </div>
                    </motion.div>
                  )}
                  {step === 2 && (
                    <motion.div key="s2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                      <h2 className="text-xl font-bold text-white">🔢 Set Payment PIN</h2>
                      <p className="text-white/50 text-sm">Your 6-digit PIN secures every payment.</p>
                      <input type="password" inputMode="numeric" placeholder="6-digit PIN" maxLength={6} value={form.pin}
                        onChange={e => update('pin', e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-saffron-500/60 transition-colors text-center text-2xl tracking-[1rem]" />
                      <input type="password" inputMode="numeric" placeholder="Confirm PIN" maxLength={6} value={form.confirmPin}
                        onChange={e => update('confirmPin', e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-saffron-500/60 transition-colors text-center text-2xl tracking-[1rem]" />
                      <div className="flex gap-3">
                        <button onClick={() => setStep(1)} className="px-6 py-3 glass rounded-xl text-white/70">← Back</button>
                        <button onClick={handleSignupNext} className="flex-1 gradient-saffron py-3 rounded-xl text-white font-bold hover:opacity-90 transition-all">Continue →</button>
                      </div>
                    </motion.div>
                  )}
                  {step === 3 && (
                    <motion.div key="s3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                      <h2 className="text-xl font-bold text-white mb-2">📳 Record Vibration Pattern</h2>
                      <p className="text-white/50 text-sm mb-5">This becomes your alternative to PIN for payments.</p>
                      <VibrationRecorder onSave={(pattern) => { update('vibrationPattern', pattern); toast.success(`Pattern saved! ${pattern.length} taps recorded.`); }} />
                      {form.vibrationPattern.length >= 2 && (
                        <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm text-center">✓ Pattern saved ({form.vibrationPattern.length} taps)</div>
                      )}
                      <div className="flex gap-3 mt-5">
                        <button onClick={() => setStep(2)} className="px-6 py-3 glass rounded-xl text-white/70">← Back</button>
                        <button onClick={handleRegister} disabled={loading || form.vibrationPattern.length < 2}
                          className="flex-1 gradient-saffron py-3 rounded-xl text-white font-bold hover:opacity-90 transition-all disabled:opacity-40">
                          {loading ? '⚙️ Creating...' : 'Create Account 🎉'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                  {step === 4 && (
                    <motion.div key="s4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-center">
                      <div className="w-20 h-20 bg-saffron-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-saffron-500/40">
                        <span className="text-4xl text-saffron-500">☝️</span>
                      </div>
                      <h2 className="text-xl font-bold text-white mb-2">Device-Bound Security</h2>
                      <p className="text-white/50 text-sm mb-8">Register your fingerprint for faster, device-bound authentication on this device.</p>
                      
                      <button onClick={handleRegisterWebAuthn} disabled={loading}
                        className="w-full gradient-saffron py-4 rounded-xl text-white font-bold text-lg hover:opacity-90 shadow-lg shadow-saffron-500/30 mb-4">
                        {loading ? 'Registering...' : 'Register Fingerprint'}
                      </button>
                      <button onClick={() => setStep(5)} className="text-white/30 text-sm hover:text-white transition-colors">Skip for now</button>
                    </motion.div>
                  )}
                  {step === 5 && (
                    <motion.div key="s5" initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center py-6">
                      <div className="text-6xl mb-4 animate-bounce">🎉</div>
                      <h2 className="text-2xl font-bold text-white mb-2">Account Created!</h2>
                      <p className="text-white/50">Welcome to PayBridge. Redirecting...</p>
                      <div className="mt-8">
                        <button onClick={() => {
                          const route = form.role === 'parent' ? '/parent' : form.role === 'divyang' ? '/accessibility' : '/student';
                          navigate(route);
                        }} className="gradient-saffron px-8 py-3 rounded-xl text-white font-bold">Go to Dashboard →</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      <AnimatePresence>
        {showCameraNav && <HandGestureNav basePath="/" onNavigate={(path) => navigate(path)} onClose={() => setShowCameraNav(false)} />}
      </AnimatePresence>
      <AlwaysOnMic
        user={null}
        basePath="/"
        navItems={[
          { label: 'Home', path: '', aliases: ['home', 'main', 'landing', 'back'] },
          { label: 'Login', path: 'auth', aliases: ['login', 'signup', 'register'] }
        ]}
        onNavigate={(path) => navigate(path)}
      />
      <button
        onClick={() => setShowCameraNav(s => !s)}
        className={`fixed bottom-20 right-4 z-40 p-3 rounded-full shadow-lg transition-all ${showCameraNav ? 'bg-saffron-500 text-white' : 'glass border border-white/20 text-white/60 hover:text-white'}`}
        title="Toggle Camera Gesture Nav"
      >
        ✋
      </button>
    </div>
  );
}

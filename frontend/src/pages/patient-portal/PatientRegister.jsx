import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePatientPortal } from '../../context/PatientPortalContext';
import { patientPortalAPI } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Leaf, Loader2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

export default function PatientRegister() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { loginPatient } = usePatientPortal();
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirm_password: '', invite_code: ''
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    if (code) {
      set('invite_code', code.toUpperCase());
      toast.success(t('auth.inviteCodeDetected'));
    }
  }, [location.search]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.invite_code)
      return toast.error(t('auth.fillAllFields'));
    if (form.password !== form.confirm_password)
      return toast.error(t('auth.passwordMismatch'));
    if (form.password.length < 6)
      return toast.error(t('auth.passwordTooShort'));

    setLoading(true);
    try {
      await patientPortalAPI.register({
        name:        form.name,
        email:       form.email,
        password:    form.password,
        invite_code: form.invite_code.toUpperCase().trim(),
      });
      await loginPatient(form.email, form.password);
      toast.success(t('auth.accountCreated'));
      navigate('/patient/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || t('auth.registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary-700 flex items-center justify-center mx-auto mb-4">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-primary-800">AyuCare</h1>
          <p className="text-stone-500 mt-1">{t('auth.patientPortalCreate')}</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-serif text-center text-stone-800">
              {t('auth.registerAsPatient')}
            </CardTitle>
            <p className="text-sm text-stone-500 text-center mt-1">
              {t('auth.inviteCodeRequired')}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>{t('auth.inviteCode')} *</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <Input className="pl-10 uppercase tracking-widest font-mono"
                    placeholder="e.g. AB12CD34" value={form.invite_code}
                    onChange={e => set('invite_code', e.target.value.toUpperCase())}
                    maxLength={8} autoComplete="off" autoCorrect="off" spellCheck="false" />
                </div>
                <p className="text-xs text-stone-400">{t('auth.askDietitian')}</p>
              </div>

              <div className="space-y-2">
                <Label>{t('auth.fullName')} *</Label>
                <Input placeholder={t('auth.yourFullName')} value={form.name}
                  onChange={e => set('name', e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>{t('auth.emailAddress')} *</Label>
                <Input type="email" placeholder="you@example.com" value={form.email}
                  onChange={e => set('email', e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>{t('auth.password')} *</Label>
                <div className="relative">
                  <Input type={showPwd ? 'text' : 'password'} placeholder={t('auth.minChars')}
                    value={form.password} onChange={e => set('password', e.target.value)} />
                  <button type="button" onClick={() => setShowPwd(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('auth.confirmPassword')} *</Label>
                <Input type="password" placeholder={t('auth.repeatPassword')}
                  value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)} />
              </div>

              <Button type="submit" className="w-full ayur-btn-primary" disabled={loading}>
                {loading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('auth.creatingAccount')}</>
                  : t('auth.createAccount')}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-sm text-stone-500">
                {t('auth.alreadyRegistered')}{' '}
                <Link to="/patient/login" className="text-primary-700 font-medium hover:underline">
                  {t('auth.signIn')}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
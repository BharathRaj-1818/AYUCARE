import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePatientPortal } from '../../context/PatientPortalContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Leaf, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';


export default function PatientLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loginPatient } = usePatientPortal();
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm]       = useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error(t('auth.fillAllFields'));
    setLoading(true);
    try {
      await loginPatient(form.email, form.password);
      toast.success(t('auth.welcomeBack'));
      navigate('/patient/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary-700 flex items-center justify-center mx-auto mb-4">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-primary-800">AyuCare</h1>
          <p className="text-stone-500 mt-1">{t('patient_nav.portalLabel')}</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-serif text-center text-stone-800">
              {t('auth.signInAccount')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>{t('auth.emailAddress')}</Label>
                <Input type="email" placeholder="you@example.com" value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))} autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label>{t('auth.password')}</Label>
                <div className="relative">
                  <Input type={showPwd ? 'text' : 'password'} placeholder={t('auth.yourPassword')}
                    value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPwd(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full ayur-btn-primary" disabled={loading}>
                {loading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('auth.signingIn')}</>
                  : t('auth.signIn')}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-stone-500">
                {t('auth.newPatient')}{' '}
                <Link to="/patient/register" className="text-primary-700 font-medium hover:underline">
                  {t('auth.registerWithCode')}
                </Link>
              </p>
              <p className="text-xs text-stone-400">
                {t('auth.areDietitian')}{' '}
                <Link to="/login" className="text-stone-500 hover:underline">{t('auth.dietitianLogin')} →</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
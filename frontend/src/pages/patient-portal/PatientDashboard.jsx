import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Utensils, TrendingUp, Calendar, Leaf, Loader2,
  ArrowRight, Sparkles, Scale, Droplets, Moon
} from 'lucide-react';
import { toast } from 'sonner';

const DOSHA_COLORS = {
  Vata:        'bg-purple-100 text-purple-800',
  Pitta:       'bg-orange-100 text-orange-800',
  Kapha:       'bg-teal-100   text-teal-800',
  'Vata-Pitta':'bg-violet-100 text-violet-800',
  'Pitta-Kapha':'bg-amber-100 text-amber-800',
  'Vata-Kapha':'bg-cyan-100  text-cyan-800',
};

const SEASON_EMOJI = {
  Vasanta:'🌸', Grishma:'☀️', Varsha:'🌧️',
  Sharada:'🍂', Hemanta:'❄️', Shishira:'🌨️',
};

export default function PatientDashboard() {
  const { t } = useTranslation();
  const navigate    = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/patient-portal/dashboard')
      .then(r => setData(r.data))
      .catch(() => toast.error(t('dashboard.loadError', 'Failed to load dashboard')))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
    </div>
  );

  const { patient, charts_count, latest_chart, latest_log, upcoming_appointment, current_season } = data || {};
  const doshaColor = DOSHA_COLORS[patient?.prakriti] || 'bg-stone-100 text-stone-700';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Welcome header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-stone-800">
            {t('patientDashboard.namaste')}, {patient?.name?.split(' ')[0]} 🙏
          </h1>
          <p className="text-stone-500 mt-1">{t('patientDashboard.overview')}</p>
        </div>
        {patient?.prakriti && (
          <Badge className={`text-sm px-3 py-1 ${doshaColor}`}>
            {t('prakriti.title')}: {patient.prakriti}
          </Badge>
        )}
      </div>

      {/* Season card */}
      {current_season && (
        <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white">
          <CardContent className="py-4 px-5">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{SEASON_EMOJI[current_season.key] || '🌿'}</span>
              <div>
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-0.5">
                  {t('dashboard.currentSeason')}
                </p>
                <p className="font-serif font-semibold text-stone-800">{current_season.name}</p>
                <p className="text-sm text-stone-500 mt-0.5">{current_season.description}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {current_season.foods_to_favour?.slice(0, 5).map(f => (
                    <span key={f} className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">✓ {f}</span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:border-purple-300 transition-colors"
          onClick={() => navigate('/patient/diet-charts')}>
          <CardContent className="p-4 text-center">
            <Utensils className="w-6 h-6 mx-auto text-purple-500 mb-2" />
            <p className="text-2xl font-bold text-stone-800">{charts_count || 0}</p>
            <p className="text-xs text-stone-500">{t('nav.dietCharts')}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-blue-300 transition-colors"
          onClick={() => navigate('/patient/progress')}>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-stone-800">
              {latest_log?.weight_kg ? `${latest_log.weight_kg}kg` : '—'}
            </p>
            <p className="text-xs text-stone-500">{t('patientDashboard.lastWeight')}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-amber-300 transition-colors"
          onClick={() => navigate('/patient/appointments')}>
          <CardContent className="p-4 text-center">
            <Calendar className="w-6 h-6 mx-auto text-amber-500 mb-2" />
            <p className="text-2xl font-bold text-stone-800">
              {upcoming_appointment
                ? new Date(upcoming_appointment.date).toLocaleDateString('en-IN', { day:'numeric', month:'short' })
                : '—'}
            </p>
            <p className="text-xs text-stone-500">{t('patientDashboard.nextAppt')}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-green-300 transition-colors"
          onClick={() => navigate('/patient/prakriti')}>
          <CardContent className="p-4 text-center">
            <Leaf className="w-6 h-6 mx-auto text-green-500 mb-2" />
            <p className="text-lg font-bold text-stone-800 leading-tight">
              {patient?.prakriti || t('common.notSet')}
            </p>
            <p className="text-xs text-stone-500">{t('prakriti.title')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest diet chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-serif">{t('patientDashboard.latestDietChart')}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/patient/diet-charts')}>
              {t('common.viewAll')} <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {latest_chart ? (
              <div className="p-4 bg-purple-50 border border-purple-100 rounded-lg cursor-pointer hover:border-purple-300 transition-colors"
                onClick={() => navigate(`/patient/diet-charts/${latest_chart.id}`)}>
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-stone-800 leading-snug">{latest_chart.title}</h4>
                  <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                    <Sparkles className="w-3 h-3 mr-1" />AI
                  </Badge>
                </div>
                <p className="text-sm text-stone-500">{latest_chart.start_date} → {latest_chart.end_date}</p>
                {latest_chart.season_name && (
                  <p className="text-xs text-green-600 mt-1">🌿 {latest_chart.season_name}</p>
                )}
                <p className="text-xs text-stone-400 mt-2 font-medium">{t('patientDashboard.tapToView')} →</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <Utensils className="w-10 h-10 mx-auto text-stone-300 mb-2" />
                <p className="text-sm text-stone-500">{t('patientDashboard.noDietChart')}</p>
                <p className="text-xs text-stone-400 mt-1">{t('patientDashboard.dietitianWillCreate')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Latest progress log */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-serif">{t('patientDashboard.todayHealthLog')}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/patient/progress')}>
              {t('patientDashboard.logToday')} <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {latest_log ? (
              <div className="space-y-3">
                <p className="text-xs text-stone-400">{t('patientDashboard.lastLogged')}: {latest_log.date}</p>
                <div className="grid grid-cols-3 gap-3">
                  {latest_log.weight_kg && (
                    <div className="text-center p-2 bg-stone-50 rounded-lg">
                      <Scale className="w-4 h-4 mx-auto text-stone-400 mb-1" />
                      <p className="font-semibold text-stone-800">{latest_log.weight_kg}kg</p>
                      <p className="text-xs text-stone-500">{t('progress.weight').replace(' (kg)','')}</p>
                    </div>
                  )}
                  {latest_log.sleep_hours && (
                    <div className="text-center p-2 bg-stone-50 rounded-lg">
                      <Moon className="w-4 h-4 mx-auto text-stone-400 mb-1" />
                      <p className="font-semibold text-stone-800">{latest_log.sleep_hours}h</p>
                      <p className="text-xs text-stone-500">{t('patientProgress.sleep')}</p>
                    </div>
                  )}
                  {latest_log.water_intake_liters && (
                    <div className="text-center p-2 bg-stone-50 rounded-lg">
                      <Droplets className="w-4 h-4 mx-auto text-stone-400 mb-1" />
                      <p className="font-semibold text-stone-800">{latest_log.water_intake_liters}L</p>
                      <p className="text-xs text-stone-500">{t('patientProgress.water')}</p>
                    </div>
                  )}
                </div>
                {latest_log.energy_level && (
                  <div>
                    <p className="text-xs text-stone-500 mb-1">{t('patientProgress.energyLevel')}</p>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(n => (
                        <div key={n} className={`h-2 flex-1 rounded-full ${n <= latest_log.energy_level ? 'bg-yellow-400' : 'bg-stone-200'}`} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="w-10 h-10 mx-auto text-stone-300 mb-2" />
                <p className="text-sm text-stone-500">{t('patientDashboard.noLogsToday')}</p>
                <Button size="sm" className="mt-3 ayur-btn-primary" onClick={() => navigate('/patient/progress')}>
                  {t('patientDashboard.logNow')} →
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
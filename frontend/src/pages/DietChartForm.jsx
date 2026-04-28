import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { patientsAPI, dietChartsAPI, ritucharyaAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, Sparkles, Loader2, Utensils, Calendar, Target, Info, Leaf } from 'lucide-react';
import { toast } from 'sonner';

const SEASON_STYLES = {
  Vasanta:  { border: 'border-green-200',  bg: 'bg-green-50',   title: 'text-green-800',  badge: 'bg-green-100 text-green-800',   favour: 'bg-green-100 text-green-700',   dot: 'bg-green-500'  },
  Grishma:  { border: 'border-orange-200', bg: 'bg-orange-50',  title: 'text-orange-800', badge: 'bg-orange-100 text-orange-800', favour: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  Varsha:   { border: 'border-blue-200',   bg: 'bg-blue-50',    title: 'text-blue-800',   badge: 'bg-blue-100 text-blue-800',     favour: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500'   },
  Sharada:  { border: 'border-amber-200',  bg: 'bg-amber-50',   title: 'text-amber-800',  badge: 'bg-amber-100 text-amber-800',   favour: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500'  },
  Hemanta:  { border: 'border-purple-200', bg: 'bg-purple-50',  title: 'text-purple-800', badge: 'bg-purple-100 text-purple-800', favour: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  Shishira: { border: 'border-indigo-200', bg: 'bg-indigo-50',  title: 'text-indigo-800', badge: 'bg-indigo-100 text-indigo-800', favour: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
};

export default function DietChartForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPatient = searchParams.get('patient');

  const [patients, setPatients]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [generating, setGenerating]       = useState(false);
  const [currentSeason, setCurrentSeason] = useState(null);

  const [formData, setFormData] = useState({
    patient_id:            preselectedPatient || '',
    duration_days:         '7',
    target_calories:       '',
    specific_requirements: '',
  });

  useEffect(() => {
    loadPatients();
    ritucharyaAPI.getCurrent().then(res => setCurrentSeason(res.data)).catch(() => {});
  }, []);

  const loadPatients = async () => {
    try {
      const response = await patientsAPI.getAll();
      setPatients(response.data);
    } catch {
      toast.error(t('patients.loadError'));
    } finally { setLoading(false); }
  };

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!formData.patient_id) { toast.error(t('dietCharts.selectPatient')); return; }
    setGenerating(true);
    try {
      const data = {
        patient_id:            formData.patient_id,
        duration_days:         parseInt(formData.duration_days),
        target_calories:       formData.target_calories ? parseInt(formData.target_calories) : null,
        specific_requirements: formData.specific_requirements || null,
      };
      const response = await dietChartsAPI.generateWithAI(data);
      toast.success(t('dietCharts.generateSuccess', 'Diet chart generated successfully!'));
      navigate(`/diet-charts/${response.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || t('dietCharts.generateError', 'Failed to generate'));
    } finally { setGenerating(false); }
  };

  const selectedPatient = patients.find(p => p.id === formData.patient_id);
  const seasonStyle = currentSeason ? SEASON_STYLES[currentSeason.key] || SEASON_STYLES['Vasanta'] : null;

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-primary-700" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6" data-testid="diet-chart-form">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/diet-charts')} data-testid="back-btn">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary-800">{t('dietCharts.createTitle')}</h1>
          <p className="text-stone-600 mt-1">{t('dietCharts.createSubtitle')}</p>
        </div>
      </div>

      {/* AI Banner */}
      <Card className="bg-gradient-to-r from-secondary-50 to-primary-50 border-secondary-200">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5 text-secondary-600" />
          </div>
          <div>
            <h3 className="font-medium text-stone-800">{t('dietCharts.aiPowered')}</h3>
            <p className="text-sm text-stone-600 mt-1">{t('dietCharts.aiPoweredDesc')}</p>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleGenerate} className="space-y-6">

        {/* Patient Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-serif flex items-center gap-2">
              <Utensils className="w-5 h-5 text-primary-600" />{t('dietCharts.patientSelection')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patient">{t('dietCharts.selectPatient')}</Label>
              <Select value={formData.patient_id} onValueChange={(v) => handleChange('patient_id', v)}>
                <SelectTrigger data-testid="patient-select">
                  <SelectValue placeholder={t('dietCharts.choosePatient')} />
                </SelectTrigger>
                <SelectContent>
                  {patients.length > 0 ? (
                    patients.map(patient => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name} — {patient.age} {t('patients.yrs')}, {patient.gender}
                        {patient.prakriti && ` (${patient.prakriti})`}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>{t('dietCharts.noPatients')}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedPatient && (
              <div className="p-4 rounded-lg bg-stone-50 space-y-2">
                <p className="text-sm text-stone-500">{t('dietCharts.selectedProfile')}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-stone-500">{t('prakriti.title')}:</span>{' '}<span className="font-medium">{selectedPatient.prakriti || t('common.notSet')}</span></div>
                  <div><span className="text-stone-500">BMI:</span>{' '}<span className="font-medium">{selectedPatient.bmi || t('common.notCalculated')}</span></div>
                  <div><span className="text-stone-500">{t('patients.dietaryHabits')}:</span>{' '}<span className="font-medium">{selectedPatient.dietary_habits || t('common.notSet')}</span></div>
                  <div><span className="text-stone-500">{t('patients.mealsPerDay')}:</span>{' '}<span className="font-medium">{selectedPatient.meal_frequency || 3}</span></div>
                </div>
                {selectedPatient.health_conditions?.length > 0 && (
                  <div className="text-sm">
                    <span className="text-stone-500">{t('patients.healthConditions')}:</span>{' '}
                    <span className="font-medium">{selectedPatient.health_conditions.join(', ')}</span>
                  </div>
                )}
                {!selectedPatient.prakriti_score && (
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 flex items-center justify-between">
                    <span>⚠️ {t('dietCharts.prakritiNotAssessed')}</span>
                    <Button type="button" size="sm" variant="outline"
                      className="text-xs h-6 px-2 border-amber-300 text-amber-700"
                      onClick={() => navigate(`/patients/${selectedPatient.id}/prakriti-quiz`)}>
                      {t('prakriti.takeQuiz')} →
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Diet Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-serif flex items-center gap-2">
              <Target className="w-5 h-5 text-primary-600" />{t('dietCharts.dietParameters')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Calendar className="w-4 h-4 text-stone-400" />{t('dietCharts.durationDays')}</Label>
                <Select value={formData.duration_days} onValueChange={(v) => handleChange('duration_days', v)}>
                  <SelectTrigger data-testid="duration-select"><SelectValue placeholder={t('dietCharts.selectDuration')} /></SelectTrigger>
                  <SelectContent>
                    {[3, 5, 7, 14, 21, 30].map(d => (
                      <SelectItem key={d} value={d.toString()}>{d} {t('common.days')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('dietCharts.targetCalories')}</Label>
                <Input id="calories" type="number" value={formData.target_calories}
                  onChange={(e) => handleChange('target_calories', e.target.value)}
                  placeholder={t('dietCharts.autoCalculated')} data-testid="calories-input" />
                <p className="text-xs text-stone-500">{t('dietCharts.leaveEmpty')}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Info className="w-4 h-4 text-stone-400" />{t('dietCharts.specialRequirements')}</Label>
              <Textarea id="requirements" value={formData.specific_requirements}
                onChange={(e) => handleChange('specific_requirements', e.target.value)}
                placeholder={t('dietCharts.requirementsPlaceholder')} rows={3} data-testid="requirements-input" />
            </div>
          </CardContent>
        </Card>

        {/* Season Panel */}
        {currentSeason && seasonStyle && (
          <div className={`p-4 rounded-lg border ${seasonStyle.border} ${seasonStyle.bg}`}>
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="w-4 h-4 text-green-600" />
              <p className={`text-sm font-semibold ${seasonStyle.title}`}>{t('dietCharts.currentSeason')}: {currentSeason.name}</p>
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${seasonStyle.badge}`}>
                {t('dashboard.focusPacify')} {currentSeason.dosha_focus}
              </span>
            </div>
            <p className="text-xs text-stone-600 mb-3 leading-relaxed">{currentSeason.description}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <p className="text-xs font-medium text-stone-500 mb-1.5">✓ {t('dashboard.favourSeason')}</p>
                <div className="flex flex-wrap gap-1">
                  {currentSeason.foods_to_favour.slice(0, 6).map(f => (
                    <span key={f} className={`text-xs px-2 py-0.5 rounded-full ${seasonStyle.favour}`}>{f}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-stone-500 mb-1.5">✗ {t('dashboard.avoidSeason')}</p>
                <div className="flex flex-wrap gap-1">
                  {currentSeason.foods_to_avoid.slice(0, 5).map(f => (
                    <span key={f} className="text-xs px-2 py-0.5 bg-red-50 border border-red-200 text-red-600 rounded-full">{f}</span>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-xs text-stone-500 italic flex items-center gap-1">
              <Sparkles className="w-3 h-3" />{t('dietCharts.autoFollowSeason')} {currentSeason.name}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/diet-charts')} data-testid="cancel-btn">
            {t('common.cancel')}
          </Button>
          <Button type="submit" className="ayur-btn-primary" disabled={generating || !formData.patient_id} data-testid="generate-btn">
            {generating
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('dietCharts.generating')}</>
              : <><Sparkles className="w-4 h-4 mr-2" />{t('dietCharts.generateChart')}</>}
          </Button>
        </div>
      </form>

      {generating && (
        <Card className="bg-primary-50 border-primary-200">
          <CardContent className="p-6 text-center">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary-600 mb-4" />
            <h3 className="font-medium text-primary-800">{t('dietCharts.generatingNotice')}</h3>
            <p className="text-sm text-primary-600 mt-2">
              {t('dietCharts.generatingDesc')} <strong>{currentSeason?.name || t('dietCharts.currentSeasonFallback')}</strong>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
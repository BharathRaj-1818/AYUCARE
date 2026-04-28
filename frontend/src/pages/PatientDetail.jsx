import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { patientsAPI, dietChartsAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import InviteCodeGenerator from '../components/InviteCodeGenerator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import PatientProgressTab from '../components/PatientProgressTab';
import {
  ArrowLeft, Edit2, Utensils, Loader2, User, Phone, Mail, Calendar,
  Scale, Ruler, Activity, Heart, Pill, AlertCircle, Droplets,
  Moon, Sparkles, Plus, Brain,
} from 'lucide-react';
import { toast } from 'sonner';

export default function PatientDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient]       = useState(null);
  const [dietCharts, setDietCharts] = useState([]);
  const [loading, setLoading]       = useState(true);

  const loadPatient = useCallback(async () => {
    try {
      const response = await patientsAPI.getOne(id);
      setPatient(response.data);
    } catch {
      toast.error(t('patients.loadError'));
      navigate('/patients');
    } finally { setLoading(false); }
  }, [id, navigate]);

  const loadDietCharts = useCallback(async () => {
    try {
      const response = await dietChartsAPI.getAll({ patient_id: id });
      setDietCharts(response.data);
    } catch (error) { console.error('Failed to load diet charts:', error); }
  }, [id]);

  useEffect(() => { loadPatient(); loadDietCharts(); }, [loadPatient, loadDietCharts]);

  const getDoshaColor = (dosha) => {
    if (!dosha) return 'bg-stone-100 text-stone-700';
    if (dosha.includes('Vata'))  return 'dosha-vata';
    if (dosha.includes('Pitta')) return 'dosha-pitta';
    if (dosha.includes('Kapha')) return 'dosha-kapha';
    return 'bg-stone-100 text-stone-700';
  };

  const getBMIStatus = (bmi) => {
    if (!bmi)       return { label: t('bmi.unknown'),     color: 'text-stone-500'   };
    if (bmi < 18.5) return { label: t('bmi.underweight'), color: 'text-blue-600'   };
    if (bmi < 25)   return { label: t('bmi.normal'),      color: 'text-green-600'  };
    if (bmi < 30)   return { label: t('bmi.overweight'),  color: 'text-yellow-600' };
    return            { label: t('bmi.obese'),        color: 'text-red-600'    };
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-primary-700" /></div>;
  if (!patient) return null;

  const bmiStatus = getBMIStatus(patient.bmi);

  return (
    <div className="max-w-6xl mx-auto space-y-6" data-testid="patient-detail">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/patients')} data-testid="back-btn">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-700">{patient.name?.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h1 className="text-3xl font-serif font-bold text-primary-800">{patient.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-stone-600">{patient.age} {t('patients.yrs')} • {patient.gender}</span>
                {patient.prakriti && <Badge className={getDoshaColor(patient.prakriti)}>{patient.prakriti}</Badge>}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button variant="outline" onClick={() => navigate(`/patients/${id}/edit`)} data-testid="edit-btn">
            <Edit2 className="w-4 h-4 mr-2" />{t('common.edit')}
          </Button>
          <Button className="ayur-btn-primary" onClick={() => navigate(`/diet-charts/new?patient=${id}`)} data-testid="create-diet-btn">
            <Utensils className="w-4 h-4 mr-2" />{t('patientDetail.createDietChart')}
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/patients/${id}/prakriti-quiz`)}>
            <Brain className="w-4 h-4 mr-2" />{t('patientDetail.prakritiTest')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-6">

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <User className="w-5 h-5 text-primary-600" />{t('patientDetail.contactInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patient.phone && <div className="flex items-center gap-3"><Phone className="w-4 h-4 text-stone-400" /><span>{patient.phone}</span></div>}
              {patient.email && <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-stone-400" /><span>{patient.email}</span></div>}
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-stone-400" />
                <span>{t('patientDetail.added')} {new Date(patient.created_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Physical Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary-600" />{t('patients.physicalMetrics')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center p-4 rounded-lg bg-stone-50">
                  <Ruler className="w-5 h-5 mx-auto text-stone-400 mb-2" />
                  <p className="text-2xl font-bold text-stone-800">{patient.height_cm || '-'}</p>
                  <p className="text-sm text-stone-500">{t('patients.heightCm')}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-stone-50">
                  <Scale className="w-5 h-5 mx-auto text-stone-400 mb-2" />
                  <p className="text-2xl font-bold text-stone-800">{patient.weight_kg || '-'}</p>
                  <p className="text-sm text-stone-500">{t('patients.weightKg')}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-stone-50">
                  <Activity className="w-5 h-5 mx-auto text-stone-400 mb-2" />
                  <p className={`text-2xl font-bold ${bmiStatus.color}`}>{patient.bmi || '-'}</p>
                  <p className="text-sm text-stone-500">BMI ({bmiStatus.label})</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-stone-50">
                  <Utensils className="w-5 h-5 mx-auto text-stone-400 mb-2" />
                  <p className="text-2xl font-bold text-stone-800">{patient.meal_frequency || 3}</p>
                  <p className="text-sm text-stone-500">{t('patientDetail.mealsDay')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lifestyle */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary-600" />{t('patients.lifestyleHabits')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                  <Droplets className="w-5 h-5 text-blue-500 mb-2" />
                  <p className="text-lg font-semibold text-blue-800">{patient.water_intake_liters || '-'} L</p>
                  <p className="text-sm text-blue-600">{t('patientDetail.waterIntakeDay')}</p>
                </div>
                <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
                  <Moon className="w-5 h-5 text-purple-500 mb-2" />
                  <p className="text-lg font-semibold text-purple-800">{patient.sleep_hours || '-'} hrs</p>
                  <p className="text-sm text-purple-600">{t('patientDetail.sleepNight')}</p>
                </div>
                <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                  <Utensils className="w-5 h-5 text-green-500 mb-2" />
                  <p className="text-lg font-semibold text-green-800">{patient.dietary_habits || t('common.notSpecified')}</p>
                  <p className="text-sm text-green-600">{t('patients.dietaryHabits')}</p>
                </div>
              </div>
              {patient.bowel_movements && (
                <div className="pt-2">
                  <p className="text-sm text-stone-500">{t('patients.bowelMovements')}</p>
                  <p className="text-stone-700">{patient.bowel_movements}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Medical Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <Pill className="w-5 h-5 text-primary-600" />{t('patients.medicalInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {patient.allergies?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-stone-500 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />{t('patients.allergies').replace(' (comma-separated)','')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {patient.allergies.map((a, idx) => <Badge key={idx} variant="destructive" className="bg-red-100 text-red-700">{a}</Badge>)}
                  </div>
                </div>
              )}
              {patient.health_conditions?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-stone-500 mb-2">{t('patients.healthConditions').replace(' (comma-separated)','')}</p>
                  <div className="flex flex-wrap gap-2">
                    {patient.health_conditions.map((c, idx) => <Badge key={idx} variant="secondary">{c}</Badge>)}
                  </div>
                </div>
              )}
              {patient.medications?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-stone-500 mb-2">{t('patients.medications').replace(' (comma-separated)','')}</p>
                  <div className="flex flex-wrap gap-2">
                    {patient.medications.map((m, idx) => <Badge key={idx} className="bg-blue-100 text-blue-700">{m}</Badge>)}
                  </div>
                </div>
              )}
              {patient.notes && (
                <div className="pt-2">
                  <p className="text-sm font-medium text-stone-500 mb-2">{t('patients.notes')}</p>
                  <p className="text-stone-700 whitespace-pre-wrap">{patient.notes}</p>
                </div>
              )}
              {!patient.allergies?.length && !patient.health_conditions?.length && !patient.medications?.length && !patient.notes && (
                <p className="text-stone-500 text-center py-4">{t('patientDetail.noMedicalInfo')}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="space-y-6">

          {/* Ayurvedic Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-600" />{t('patientDetail.ayurvedicProfile')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-sm font-medium text-amber-700 mb-2">{t('patients.prakritiConstitution')}</p>
                {patient.prakriti_score ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className={getDoshaColor(patient.prakriti)}>{patient.prakriti}</Badge>
                      <span className="text-xs text-amber-600">
                        {patient.last_assessed_at ? new Date(patient.last_assessed_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                    {['vata', 'pitta', 'kapha'].map(dosha => (
                      <div key={dosha}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="capitalize font-medium text-stone-600">{dosha}</span>
                          <span className="text-stone-500">{patient.prakriti_score[dosha]}%</span>
                        </div>
                        <div className="w-full bg-amber-100 rounded-full h-2">
                          <div className={`h-2 rounded-full transition-all duration-500 ${dosha === 'vata' ? 'bg-purple-400' : dosha === 'pitta' ? 'bg-orange-400' : 'bg-teal-400'}`}
                            style={{ width: `${patient.prakriti_score[dosha]}%` }} />
                        </div>
                      </div>
                    ))}
                    <Button size="sm" variant="outline" className="w-full border-amber-300 text-amber-700 hover:bg-amber-100"
                      onClick={() => navigate(`/patients/${id}/prakriti-quiz`)}>
                      {t('patientDetail.reassessPrakriti')}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-sm text-amber-600 mb-3">
                      {patient.prakriti
                        ? `${t('patientDetail.setManually')} "${patient.prakriti}"`
                        : t('patientDetail.notAssessed')}
                    </p>
                    <Button size="sm" className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                      onClick={() => navigate(`/patients/${id}/prakriti-quiz`)}>
                      <Brain className="w-4 h-4 mr-2" />{t('prakriti.takeQuiz')} →
                    </Button>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <p className="text-sm text-stone-500">{t('patientDetail.vikriti')}</p>
                <p className="text-lg font-medium text-stone-800">{patient.vikriti || t('prakriti.notAssessed')}</p>
                {patient.vikriti && <Badge className={`mt-2 ${getDoshaColor(patient.vikriti)}`}>{patient.vikriti}</Badge>}
              </div>
            </CardContent>
          </Card>

          <InviteCodeGenerator patient={patient} />

          {/* Diet Charts + Progress Tabs */}
          <Card>
            <Tabs defaultValue="charts">
              <CardHeader className="pb-0">
                <TabsList className="w-full">
                  <TabsTrigger value="charts" className="flex-1 text-xs">{t('nav.dietCharts')}</TabsTrigger>
                  <TabsTrigger value="progress" className="flex-1 text-xs">{t('progress.title')}</TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent className="pt-4">
                <TabsContent value="charts">
                  {dietCharts.length > 0 ? (
                    <div className="space-y-3">
                      {dietCharts.slice(0, 5).map(chart => (
                        <div key={chart.id}
                          className="p-3 rounded-lg bg-stone-50 hover:bg-stone-100 cursor-pointer transition-colors"
                          onClick={() => navigate(`/diet-charts/${chart.id}`)} data-testid={`diet-chart-${chart.id}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-stone-800 text-sm leading-tight break-words whitespace-normal">{chart.title}</p>
                              <p className="text-xs text-stone-500 mt-1">{chart.start_date} - {chart.end_date}</p>
                            </div>
                            <Sparkles className="w-4 h-4 text-secondary-500 flex-shrink-0 mt-0.5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Utensils className="w-10 h-10 mx-auto text-stone-300 mb-2" />
                      <p className="text-sm text-stone-500">{t('patientDetail.noDietCharts')}</p>
                      <Button variant="link" size="sm" onClick={() => navigate(`/diet-charts/new?patient=${id}`)} className="text-primary-700 mt-1">
                        {t('patientDetail.createFirstChart')}
                      </Button>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="progress">
                  <PatientProgressTab patientId={id} />
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
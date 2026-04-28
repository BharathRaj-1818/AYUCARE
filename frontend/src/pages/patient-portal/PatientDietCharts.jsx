import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Utensils, Sparkles, Calendar, Loader2,
  Clock, Coffee, Sun, Sunset, Moon, Target, Leaf
} from 'lucide-react';
import { toast } from 'sonner';

const getMealIcon = (type) => ({ breakfast:Coffee, mid_morning:Sun, lunch:Sun, evening_snack:Sunset, dinner:Moon }[type] || Utensils);
const MEAL_TYPES = ['breakfast','mid_morning','lunch','evening_snack','dinner'];

// ── Diet Charts List ──
export function PatientDietCharts() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [charts, setCharts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/patient-portal/diet-charts')
      .then(r => setCharts(r.data.charts || []))
      .catch(() => toast.error(t('dietCharts.loadError')))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-purple-600 mt-20" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-stone-800">{t('patient_nav.dietCharts')}</h1>
        <p className="text-stone-500 mt-1">{t('patientDietCharts.subtitle')}</p>
      </div>

      {charts.length > 0 ? (
        <div className="space-y-4">
          {charts.map(chart => (
            <Card key={chart.id} className="cursor-pointer hover:border-purple-300 transition-colors"
              onClick={() => navigate(`/patient/diet-charts/${chart.id}`)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-serif font-semibold text-stone-800">{chart.title}</h3>
                      <Badge variant="outline" className="text-xs">
                        <Sparkles className="w-3 h-3 mr-1" />AI
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-stone-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />{chart.start_date} → {chart.end_date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="w-3.5 h-3.5" />{chart.target_calories || '—'} kcal/day
                      </span>
                      {chart.season_name && (
                        <span className="flex items-center gap-1 text-green-600">
                          <Leaf className="w-3.5 h-3.5" />{chart.season_name}
                        </span>
                      )}
                    </div>
                    {chart.notes && (
                      <p className="text-sm text-stone-500 mt-2 line-clamp-2">{chart.notes}</p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" className="ml-4 flex-shrink-0">
                    {t('patientDietCharts.viewPlan')} →
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Utensils className="w-16 h-16 mx-auto text-stone-300 mb-4" />
          <h3 className="text-lg font-semibold text-stone-700">{t('dietCharts.noCharts')}</h3>
          <p className="text-stone-500 mt-2">{t('patientDietCharts.noChartsDesc')}</p>
        </div>
      )}
    </div>
  );
}

// ── Diet Chart Detail ──
export function PatientDietChartDetail() {
  const { t } = useTranslation();
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [chart, setChart]     = useState(null);
  const [loading, setLoading] = useState(true);

  const getMealLabel = (type) => {
    const keys = {
      breakfast: t('meals.breakfast'), mid_morning: t('meals.midMorning'),
      lunch: t('meals.lunch'), evening_snack: t('meals.eveningSnack'), dinner: t('meals.dinner')
    };
    return keys[type] || type;
  };

  useEffect(() => {
    api.get(`/patient-portal/diet-charts/${id}`)
      .then(r => setChart(r.data))
      .catch(() => { toast.error(t('patientDietCharts.chartNotFound')); navigate('/patient/diet-charts'); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-purple-600 mt-20" /></div>;
  if (!chart) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/patient/diet-charts')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-serif font-bold text-stone-800">{chart.title}</h1>
            {chart.season_name && (
              <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                🌿 {chart.season_name}
              </Badge>
            )}
          </div>
          <p className="text-stone-500 mt-1">
            {chart.start_date} → {chart.end_date} · {chart.target_calories || '—'} kcal/day
          </p>
        </div>
      </div>

      {chart.notes && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-amber-700 mb-1">🌿 {t('patientDietCharts.dietitianNotes')}</p>
            <p className="text-sm text-amber-800 leading-relaxed">{chart.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-serif">{t('dietCharts.dailyMealPlan')}</CardTitle>
        </CardHeader>
        <CardContent>
          {chart.meals?.length > 0 ? (
            <Tabs defaultValue="1">
              <TabsList className="flex flex-wrap gap-2 h-auto p-2 bg-stone-100 rounded-lg mb-6">
                {chart.meals.map(m => (
                  <TabsTrigger key={m.day} value={m.day.toString()}
                    className="data-[state=active]:bg-white data-[state=active]:text-purple-700">
                    {t('dietCharts.day')} {m.day}
                  </TabsTrigger>
                ))}
              </TabsList>
              {chart.meals.map(dayMeal => (
                <TabsContent key={dayMeal.day} value={dayMeal.day.toString()}>
                  <div className="space-y-3">
                    {MEAL_TYPES.map(mt => {
                      const meal = dayMeal[mt];
                      if (!meal) return null;
                      const Icon = getMealIcon(mt);
                      return (
                        <div key={mt} className="p-4 rounded-lg bg-stone-50 border border-stone-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-purple-500" />
                              <span className="font-medium text-stone-800">{getMealLabel(mt)}</span>
                              <span className="text-xs text-stone-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />{meal.time}
                              </span>
                            </div>
                            {meal.calories && <Badge variant="secondary">{meal.calories} kcal</Badge>}
                          </div>
                          <ul className="space-y-1">
                            {meal.items?.map((item, i) => (
                              <li key={i} className="flex items-center gap-2 text-sm text-stone-600">
                                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />{item}
                              </li>
                            ))}
                          </ul>
                          {meal.ayurvedic_note && (
                            <p className="mt-2 text-xs text-amber-700 italic pl-3 border-l-2 border-amber-200">
                              {meal.ayurvedic_note}
                            </p>
                          )}
                        </div>
                      );
                    })}
                    <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg text-sm text-purple-700">
                      <strong>{t('dietCharts.day')} {dayMeal.day} {t('dietCharts.total')}: </strong>
                      {MEAL_TYPES.reduce((s, mt) => s + (dayMeal[mt]?.calories || 0), 0)} kcal
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <p className="text-center text-stone-500 py-8">{t('patientDietCharts.noMeals')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { dietChartsAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  ArrowLeft, Download, Loader2, Utensils, Calendar, User, Target, Sparkles,
  Clock, Coffee, Sun, Sunset, Moon, Apple, FlaskConical, AlertTriangle,
  CheckCircle2, Info, Leaf, TrendingUp, ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

const getMealIcon = (mealType) => {
  const icons = { breakfast: Coffee, mid_morning: Sun, lunch: Sun, evening_snack: Sunset, dinner: Moon };
  return icons[mealType] || Utensils;
};

const SEVERITY_CONFIG = {
  critical: { bg: 'bg-red-50',    border: 'border-red-200',    badge: 'bg-red-100 text-red-800',    icon: AlertTriangle, iconColor: 'text-red-500',    label: 'Critical'  },
  moderate: { bg: 'bg-amber-50',  border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-800', icon: AlertTriangle, iconColor: 'text-amber-500',  label: 'Moderate'  },
  mild:     { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-800',icon: Info,          iconColor: 'text-yellow-500', label: 'Mild'      },
};

const RATING_CONFIG = {
  excellent:        { bg: 'bg-green-50',  border: 'border-green-300',  text: 'text-green-800',  icon: '🌟' },
  good:             { bg: 'bg-teal-50',   border: 'border-teal-300',   text: 'text-teal-800',   icon: '✅' },
  needs_improvement:{ bg: 'bg-amber-50',  border: 'border-amber-300',  text: 'text-amber-800',  icon: '⚠️' },
  poor:             { bg: 'bg-red-50',    border: 'border-red-300',    text: 'text-red-800',    icon: '❌' },
};

function NutrientGapCard({ gap }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const cfg = SEVERITY_CONFIG[gap.severity] || SEVERITY_CONFIG.mild;
  const Icon = cfg.icon;

  return (
    <div className={`rounded-lg border ${cfg.border} ${cfg.bg} overflow-hidden`}>
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center gap-3">
          <Icon className={`w-4 h-4 flex-shrink-0 ${cfg.iconColor}`} />
          <div>
            <span className="font-medium text-stone-800 text-sm">{gap.nutrient}</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-stone-500">{gap.current_estimate}</span>
              <span className="text-xs text-stone-400">→</span>
              <span className="text-xs font-medium text-stone-600">RDA: {gap.recommended}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-stone-100">
          <p className="text-sm text-stone-600 pt-3 leading-relaxed">{gap.explanation}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-green-700 mb-1.5 flex items-center gap-1">
                <Leaf className="w-3 h-3" /> {t('nutrientAnalysis.ayurvedicFoods')}
              </p>
              <div className="flex flex-wrap gap-1">
                {gap.ayurvedic_alternatives?.map(food => (
                  <span key={food} className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">{food}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-700 mb-1.5 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> {t('nutrientAnalysis.modernAlternatives')}
              </p>
              <div className="flex flex-wrap gap-1">
                {gap.modern_alternatives?.map(food => (
                  <span key={food} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{food}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NutrientReportPanel({ chartId, patientName }) {
  const { t } = useTranslation();
  const [report, setReport]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [fetched, setFetched]     = useState(false);

  useEffect(() => {
    const loadCached = async () => {
      setLoading(true);
      try {
        const res = await dietChartsAPI.getNutrientReport(chartId);
        setReport(res.data);
      } catch { /* 404 = not analysed yet */ }
      finally { setLoading(false); setFetched(true); }
    };
    loadCached();
  }, [chartId]);

  const runAnalysis = async () => {
    setAnalysing(true);
    try {
      toast.info(t('nutrientAnalysis.running'));
      const res = await dietChartsAPI.analyzeNutrients(chartId);
      setReport(res.data);
      toast.success(t('nutrientAnalysis.complete'));
    } catch (err) {
      toast.error(err.response?.data?.detail || t('nutrientAnalysis.failed'));
    } finally { setAnalysing(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-primary-600 mr-3" />
      <span className="text-stone-500">{t('nutrientAnalysis.loadingAnalysis')}</span>
    </div>
  );

  if (fetched && !report) return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <FlaskConical className="w-8 h-8 text-amber-500" />
      </div>
      <h3 className="text-lg font-serif font-semibold text-stone-800 mb-2">{t('nutrientAnalysis.noAnalysis')}</h3>
      <p className="text-sm text-stone-500 max-w-sm mx-auto mb-6 leading-relaxed">
        {t('nutrientAnalysis.runDesc')} <strong>{patientName}</strong>{t('nutrientAnalysis.runDesc2')}
      </p>
      <Button onClick={runAnalysis} disabled={analysing} className="ayur-btn-primary">
        {analysing
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('nutrientAnalysis.analysing')}</>
          : <><FlaskConical className="w-4 h-4 mr-2" />{t('nutrientAnalysis.runBtn')}</>}
      </Button>
    </div>
  );

  if (!report) return null;

  const ratingCfg = RATING_CONFIG[report.overall_rating] || RATING_CONFIG.good;
  const criticalGaps = report.gaps?.filter(g => g.severity === 'critical') || [];
  const otherGaps    = report.gaps?.filter(g => g.severity !== 'critical') || [];

  return (
    <div className="space-y-6">
      <div className={`rounded-lg border-2 ${ratingCfg.border} ${ratingCfg.bg} p-5`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{ratingCfg.icon}</span>
              <span className={`text-sm font-bold uppercase tracking-wide ${ratingCfg.text}`}>
                {report.overall_rating?.replace('_', ' ')}
              </span>
            </div>
            <p className={`text-sm leading-relaxed ${ratingCfg.text}`}>{report.summary}</p>
          </div>
          <Button size="sm" variant="outline" onClick={runAnalysis} disabled={analysing} className="flex-shrink-0">
            {analysing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          </Button>
        </div>
        {report.rda_used && (
          <div className="mt-3 pt-3 border-t border-stone-200">
            <p className="text-xs text-stone-500 mb-1">{t('nutrientAnalysis.rdaReference')}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {Object.entries(report.rda_used).map(([k, v]) => (
                <span key={k} className="text-xs text-stone-600">
                  <span className="font-medium">{k.replace(/_/g,' ')}:</span> {v}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {criticalGaps.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />{t('nutrientAnalysis.criticalDeficiencies')} ({criticalGaps.length})
          </h4>
          <div className="space-y-2">{criticalGaps.map((gap, i) => <NutrientGapCard key={i} gap={gap} />)}</div>
        </div>
      )}

      {otherGaps.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-stone-600 mb-3 flex items-center gap-2">
            <Info className="w-4 h-4" />{t('nutrientAnalysis.otherGaps')} ({otherGaps.length})
          </h4>
          <div className="space-y-2">{otherGaps.map((gap, i) => <NutrientGapCard key={i} gap={gap} />)}</div>
        </div>
      )}

      {report.gaps?.length === 0 && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-700">{t('nutrientAnalysis.noGaps')}</p>
        </div>
      )}

      {report.strengths?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />{t('nutrientAnalysis.planStrengths')}
          </h4>
          <div className="space-y-2">
            {report.strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-stone-700">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />{s}
              </div>
            ))}
          </div>
        </div>
      )}

      {report.recommendations?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-primary-700 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />{t('nutrientAnalysis.recommendations')}
          </h4>
          <div className="space-y-2">
            {report.recommendations.map((r, i) => (
              <div key={i} className="flex items-start gap-2 p-3 bg-primary-50 border border-primary-100 rounded-lg text-sm text-stone-700">
                <span className="text-primary-600 font-bold flex-shrink-0">{i + 1}.</span>{r}
              </div>
            ))}
          </div>
        </div>
      )}

      {report.ayurvedic_note && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1">
            <Leaf className="w-3 h-3" /> {t('nutrientAnalysis.ayurvedicPerspective')}
          </p>
          <p className="text-sm text-amber-800 leading-relaxed">{report.ayurvedic_note}</p>
        </div>
      )}

      <p className="text-xs text-stone-400 text-right">
        {t('nutrientAnalysis.generated')}: {report.generated_at ? new Date(report.generated_at).toLocaleString() : '—'}
      </p>
    </div>
  );
}

export default function DietChartDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [chart, setChart]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => { loadChart(); }, [id]);

  const loadChart = async () => {
    try {
      const response = await dietChartsAPI.getOne(id);
      setChart(response.data);
    } catch {
      toast.error(t('dietCharts.loadError'));
      navigate('/diet-charts');
    } finally { setLoading(false); }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('ayucare_token');
      const url   = dietChartsAPI.downloadPDF(id);
      const res   = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = window.URL.createObjectURL(blob);
      a.download = `diet_chart_${id.slice(0, 8)}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      toast.success(t('dietCharts.pdfDownloaded'));
    } catch {
      toast.error(t('dietCharts.pdfError'));
    } finally { setDownloading(false); }
  };

  const getMealLabel = (mealType) => {
    const keys = {
      breakfast: t('meals.breakfast'), mid_morning: t('meals.midMorning'),
      lunch: t('meals.lunch'), evening_snack: t('meals.eveningSnack'), dinner: t('meals.dinner')
    };
    return keys[mealType] || mealType;
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-primary-700" /></div>;
  if (!chart) return null;

  const mealTypes = ['breakfast', 'mid_morning', 'lunch', 'evening_snack', 'dinner'];

  return (
    <div className="max-w-6xl mx-auto space-y-6" data-testid="diet-chart-detail">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/diet-charts')} data-testid="back-btn">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-serif font-bold text-primary-800">{chart.title}</h1>
              <Badge className="bg-secondary-100 text-secondary-700">
                <Sparkles className="w-3 h-3 mr-1" />{t('dietCharts.aiGenerated')}
              </Badge>
              {chart.season_name && (
                <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                  🌿 {chart.season_name}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 text-stone-600">
              <span className="flex items-center gap-1"><User className="w-4 h-4" />{chart.patient_name}</span>
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{chart.start_date} — {chart.end_date}</span>
            </div>
          </div>
        </div>
        <Button onClick={handleDownloadPDF} disabled={downloading} className="ayur-btn-primary" data-testid="download-pdf-btn">
          {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          {t('dietCharts.downloadPDF')}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center"><Target className="w-6 h-6 text-primary-600" /></div>
          <div><p className="text-2xl font-bold text-stone-800">{chart.target_calories || '—'}</p><p className="text-sm text-stone-500">{t('dietCharts.targetCalDay')}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center"><Apple className="w-6 h-6 text-green-600" /></div>
          <div><p className="text-2xl font-bold text-stone-800">{chart.total_daily_nutrients?.protein_g || 60}g</p><p className="text-sm text-stone-500">{t('dietCharts.proteinDay')}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center"><Utensils className="w-6 h-6 text-yellow-600" /></div>
          <div><p className="text-2xl font-bold text-stone-800">{chart.total_daily_nutrients?.carbs_g || 250}g</p><p className="text-sm text-stone-500">{t('dietCharts.carbsDay')}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center"><Calendar className="w-6 h-6 text-orange-600" /></div>
          <div><p className="text-2xl font-bold text-stone-800">{chart.meals?.length || 0}</p><p className="text-sm text-stone-500">{t('dietCharts.daysPlanned')}</p></div>
        </CardContent></Card>
      </div>

      {chart.notes && (
        <Card>
          <CardHeader><CardTitle className="text-lg font-serif">{t('dietCharts.ayurvedicNotes')}</CardTitle></CardHeader>
          <CardContent><p className="text-stone-700 whitespace-pre-wrap leading-relaxed">{chart.notes}</p></CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="meals" className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-sm">
          <TabsTrigger value="meals" className="flex items-center gap-2">
            <Utensils className="w-4 h-4" /> {t('dietCharts.mealPlan')}
          </TabsTrigger>
          <TabsTrigger value="nutrients" className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4" /> {t('dietCharts.nutrientAnalysis')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="meals">
          <Card data-testid="meal-plan-card">
            <CardHeader><CardTitle className="text-lg font-serif">{t('dietCharts.dailyMealPlan')}</CardTitle></CardHeader>
            <CardContent>
              {chart.meals?.length > 0 ? (
                <Tabs defaultValue="1" className="w-full">
                  <TabsList className="flex flex-wrap gap-2 h-auto p-2 bg-stone-100 rounded-lg mb-6">
                    {chart.meals.map(meal => (
                      <TabsTrigger key={meal.day} value={meal.day.toString()}
                        className="data-[state=active]:bg-white data-[state=active]:text-primary-700"
                        data-testid={`day-tab-${meal.day}`}>
                        {t('Day')} {meal.day}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {chart.meals.map(dayMeal => (
                    <TabsContent key={dayMeal.day} value={dayMeal.day.toString()}>
                      <div className="space-y-4">
                        {mealTypes.map(mealType => {
                          const meal = dayMeal[mealType];
                          if (!meal) return null;
                          const MealIcon = getMealIcon(mealType);
                          return (
                            <div key={mealType} className="meal-slot" data-testid={`meal-${mealType}`}>
                              <div className="meal-slot-header">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center">
                                    <MealIcon className="w-5 h-5 text-primary-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-stone-800">{getMealLabel(mealType)}</h4>
                                    <p className="meal-time flex items-center gap-1"><Clock className="w-3 h-3" />{meal.time}</p>
                                  </div>
                                </div>
                                {meal.calories && <Badge variant="secondary">{meal.calories} kcal</Badge>}
                              </div>
                              <div className="mt-3 space-y-2">
                                {meal.items?.map((item, idx) => (
                                  <div key={idx} className="flex items-center gap-2 text-stone-700">
                                    <div className="w-2 h-2 rounded-full bg-primary-400 flex-shrink-0" /><span>{item}</span>
                                  </div>
                                ))}
                              </div>
                              {meal.ayurvedic_note && (
                                <p className="mt-2 text-xs text-amber-700 italic pl-4 border-l-2 border-amber-200">{meal.ayurvedic_note}</p>
                              )}
                            </div>
                          );
                        })}
                        <div className="mt-6 p-4 rounded-lg bg-primary-50 border border-primary-100">
                          <h4 className="font-medium text-primary-800 mb-1">{t('dietCharts.day')} {dayMeal.day} {t('dietCharts.total')}</h4>
                          <span className="text-sm text-primary-700">
                            <strong>{mealTypes.reduce((t, mt) => t + (dayMeal[mt]?.calories || 0), 0)}</strong> kcal
                          </span>
                        </div>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                <div className="text-center py-8">
                  <Utensils className="w-12 h-12 mx-auto text-stone-300 mb-3" />
                  <p className="text-stone-500">{t('dietCharts.noMealsPlanned')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nutrients">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-primary-600" />{t('nutrientAnalysis.title')}
              </CardTitle>
              <p className="text-sm text-stone-500 mt-1">{t('nutrientAnalysis.subtitle')}</p>
            </CardHeader>
            <CardContent>
              <NutrientReportPanel chartId={id} patientName={chart.patient_name} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
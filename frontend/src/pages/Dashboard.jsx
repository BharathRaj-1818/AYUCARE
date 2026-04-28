import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { dashboardAPI, foodsAPI, ritucharyaAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Users, Utensils, Apple, FileText, Plus, ArrowRight,
  TrendingUp, Calendar, Loader2, Sparkles, RefreshCw, Leaf,
  AlertTriangle, CheckCircle2, Clock, Flame, TrendingDown,
  Activity, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';

const DOSHA_COLORS = {
  'Vata': '#60A5FA', 'Pitta': '#F97316', 'Kapha': '#34D399',
  'Vata-Pitta': '#A78BFA', 'Pitta-Kapha': '#FBBF24', 'Vata-Kapha': '#2DD4BF',
};

const SEASON_STYLES = {
  Vasanta:  { border: 'border-l-green-500',  bg: 'from-green-50',   badge: 'bg-green-100 text-green-800',   dot: 'bg-green-500'  },
  Grishma:  { border: 'border-l-orange-500', bg: 'from-orange-50',  badge: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' },
  Varsha:   { border: 'border-l-blue-500',   bg: 'from-blue-50',    badge: 'bg-blue-100 text-blue-800',     dot: 'bg-blue-500'   },
  Sharada:  { border: 'border-l-amber-500',  bg: 'from-amber-50',   badge: 'bg-amber-100 text-amber-800',   dot: 'bg-amber-500'  },
  Hemanta:  { border: 'border-l-purple-500', bg: 'from-purple-50',  badge: 'bg-purple-100 text-purple-800', dot: 'bg-purple-500' },
  Shishira: { border: 'border-l-indigo-500', bg: 'from-indigo-50',  badge: 'bg-indigo-100 text-indigo-800', dot: 'bg-indigo-500' },
};

// Helper function to format "last logged" time
const getLastLoggedBadge = (lastLogDate) => {
  if (!lastLogDate) return { text: 'Never', variant: 'secondary', color: 'text-stone-500' };
  
  const now = new Date();
  const lastLog = new Date(lastLogDate);
  const diffMs = now - lastLog;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffDays === 0) {
    if (diffHours === 0) return { text: 'Just now', variant: 'default', color: 'text-green-600' };
    return { text: `${diffHours}h ago`, variant: 'default', color: 'text-green-600' };
  }
  if (diffDays === 1) return { text: '1 day ago', variant: 'secondary', color: 'text-blue-600' };
  if (diffDays <= 3) return { text: `${diffDays} days ago`, variant: 'secondary', color: 'text-amber-600' };
  if (diffDays <= 7) return { text: `${diffDays} days ago`, variant: 'destructive', color: 'text-orange-600' };
  return { text: `${diffDays} days ago`, variant: 'destructive', color: 'text-red-600' };
};

// Helper to calculate streak
const calculateStreak = (logDates) => {
  if (!logDates || logDates.length === 0) return 0;
  
  const sortedDates = logDates
    .map(d => new Date(d).toDateString())
    .sort((a, b) => new Date(b) - new Date(a));
  
  let streak = 0;
  let currentDate = new Date();
  
  for (let i = 0; i < sortedDates.length; i++) {
    const logDate = new Date(sortedDates[i]);
    const expectedDate = new Date(currentDate);
    expectedDate.setDate(expectedDate.getDate() - i);
    
    if (logDate.toDateString() === expectedDate.toDateString()) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
};

// Mock function to simulate Gemini API dosha drift detection
const detectDoshaDrift = async (patientId, recentLogs) => {
  // In production, this would call your Gemini API
  // For now, we'll simulate with logic based on recent patterns
  
  if (!recentLogs || recentLogs.length < 3) return null;
  
  // Simulate analysis - in reality, this would be AI-powered
  const symptoms = recentLogs.flatMap(log => log.symptoms || []);
  const vataSymptoms = symptoms.filter(s => 
    s.includes('dry') || s.includes('anxiety') || s.includes('irregular')
  ).length;
  const pittaSymptoms = symptoms.filter(s => 
    s.includes('heat') || s.includes('inflammation') || s.includes('anger')
  ).length;
  const kaphaSymptoms = symptoms.filter(s => 
    s.includes('heavy') || s.includes('congestion') || s.includes('lethargy')
  ).length;
  
  const total = vataSymptoms + pittaSymptoms + kaphaSymptoms;
  if (total === 0) return null;
  
  // Detect significant imbalance
  if (vataSymptoms / total > 0.6) {
    return { dosha: 'Vata', severity: 'moderate', recommendation: 'Increase warm, grounding foods' };
  }
  if (pittaSymptoms / total > 0.6) {
    return { dosha: 'Pitta', severity: 'moderate', recommendation: 'Focus on cooling foods and practices' };
  }
  if (kaphaSymptoms / total > 0.6) {
    return { dosha: 'Kapha', severity: 'mild', recommendation: 'Include more light, stimulating foods' };
  }
  
  return null;
};

export default function Dashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [weightTrends, setWeightTrends] = useState([]);
  const [doshaDrifts, setDoshaDrifts] = useState({});
  const navigate = useNavigate();

  const loadStats = useCallback(async () => {
    try {
      const response = await dashboardAPI.getStats();
      setStats(response.data);
      
      // Load weight trends (mock data - replace with actual API call)
      loadWeightTrends();
      
      // Analyze dosha drifts for patients
      if (response.data.recent_patients) {
        analyzeDoshaDrifts(response.data.recent_patients);
      }
    } catch (error) {
      toast.error(t('dashboard.loadError', 'Failed to load dashboard data'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadWeightTrends = () => {
    // Mock weight trend data - replace with actual API call
    const mockTrends = [
      { date: '2026-03-27', weight: 72.5 },
      { date: '2026-04-03', weight: 72.2 },
      { date: '2026-04-10', weight: 71.8 },
      { date: '2026-04-17', weight: 71.5 },
      { date: '2026-04-24', weight: 71.2 },
      { date: '2026-04-27', weight: 71.0 },
    ];
    setWeightTrends(mockTrends);
  };

  const analyzeDoshaDrifts = async (patients) => {
    const drifts = {};
    for (const patient of patients) {
      // Mock recent logs - in production, fetch from API
      const mockLogs = [
        { date: '2026-04-27', symptoms: ['dry skin', 'anxiety'] },
        { date: '2026-04-26', symptoms: ['irregular appetite'] },
        { date: '2026-04-25', symptoms: ['dry skin'] },
      ];
      
      const drift = await detectDoshaDrift(patient.id, mockLogs);
      if (drift) {
        drifts[patient.id] = drift;
      }
    }
    setDoshaDrifts(drifts);
  };

  useEffect(() => {
    loadStats();
    ritucharyaAPI.getCurrent()
      .then(res => setCurrentSeason(res.data))
      .catch(() => {});
  }, [loadStats]);

  const handleSeedFoods = async () => {
    setSeeding(true);
    try {
      const response = await foodsAPI.seed();
      if (response.data.seeded !== false) {
        toast.success(`Seeded ${response.data.count} Ayurvedic foods!`);
        loadStats();
      } else {
        toast.info(response.data.message);
      }
    } catch {
      toast.error(t('foods.seedError', 'Failed to seed foods'));
    } finally {
      setSeeding(false);
    }
  };

  const statCards = [
    { title: t('dashboard.totalPatients'), value: stats?.patient_count || 0, icon: Users,    color: 'bg-blue-500',    path: '/patients'    },
    { title: t('dashboard.dietCharts'),    value: stats?.chart_count   || 0, icon: Utensils, color: 'bg-emerald-500', path: '/diet-charts' },
    { title: t('dashboard.foodsDb'),       value: stats?.food_count    || 0, icon: Apple,    color: 'bg-orange-500',  path: '/foods'       },
    { title: t('dashboard.recipes'),       value: stats?.recipe_count  || 0, icon: FileText, color: 'bg-purple-500',  path: '/recipes'     },
  ];

  const prakritiData = stats?.prakriti_distribution?.map(item => ({
    name: item._id, value: item.count, color: DOSHA_COLORS[item._id] || '#94A3B8'
  })) || [];

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="w-8 h-8 animate-spin text-primary-700" />
    </div>
  );

  const seasonStyle = currentSeason ? SEASON_STYLES[currentSeason.key] || SEASON_STYLES['Vasanta'] : null;
  const inactivePatients = stats?.inactive_patients || [];
  const activeCount = stats?.active_count || 0;

  // Calculate weight change
  const weightChange = weightTrends.length >= 2 
    ? (weightTrends[weightTrends.length - 1].weight - weightTrends[0].weight).toFixed(1)
    : 0;

  return (
    <div className="space-y-8" data-testid="dashboard">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary-800">{t('dashboard.title')}</h1>
          <p className="text-stone-600 mt-1">{t('dashboard.welcomeBack')}</p>
        </div>
        <div className="flex gap-3">
          {stats?.food_count === 0 && (
            <Button onClick={handleSeedFoods} disabled={seeding} className="ayur-btn-secondary" data-testid="seed-foods-btn">
              {seeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              {t('dashboard.seedFoodDb')}
            </Button>
          )}
          <Button onClick={() => navigate('/patients/new')} className="ayur-btn-primary" data-testid="add-patient-btn">
            <Plus className="w-4 h-4 mr-2" />{t('patients.addPatient')}
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="stat-card cursor-pointer hover:border-primary-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={() => navigate(stat.path)}
              data-testid={`stat-card-${index}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-500">{stat.title}</p>
                    <p className="text-3xl font-bold text-stone-800 mt-2">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.color}/10`}>
                    <Icon className={`w-6 h-6 ${stat.color.replace('bg-', 'text-')}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      

      {/* Patient Activity Monitor */}
      {(inactivePatients.length > 0 || activeCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white">
            <CardContent className="py-4 px-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{activeCount}</p>
                <p className="text-sm text-green-600 font-medium">{t('dashboard.activePatients')}</p>
                <p className="text-xs text-stone-400">{t('dashboard.activeDesc')}</p>
              </div>
            </CardContent>
          </Card>
          {inactivePatients.length > 0 && (
            <Card className="border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50 to-white">
              <CardContent className="py-4 px-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold text-amber-700">{inactivePatients.length}</p>
                  <p className="text-sm text-amber-600 font-medium">{t('dashboard.inactivePatients')}</p>
                  <p className="text-xs text-stone-400">{t('dashboard.inactiveDesc')}</p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs border-amber-300 hover:bg-amber-50"
                  onClick={() => navigate('/patients')}
                >
                  <Clock className="w-3 h-3 mr-1" />
                  View
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Seasonal Information */}
      {currentSeason && seasonStyle && (
        <Card className={`border-l-4 ${seasonStyle.border} bg-gradient-to-r ${seasonStyle.bg} to-white animate-fade-in`}>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                <Leaf className="w-6 h-6 text-primary-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-serif font-bold text-primary-800">{currentSeason.name}</h3>
                  <span className="text-sm text-stone-500">({currentSeason.season_english})</span>
                </div>
                <p className="text-xs text-stone-400 mb-2 uppercase tracking-wide">{t('dashboard.currentSeason')}</p>
                <p className="text-sm text-stone-600 mb-4 leading-relaxed max-w-2xl">{currentSeason.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${seasonStyle.badge}`}>
                    {t('dashboard.focusPacify')} {currentSeason.dosha_focus}
                  </span>
                </div>
                <div className="mb-2">
                  <p className="text-xs font-medium text-stone-500 mb-1">{t('dashboard.favourSeason')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {currentSeason.foods_to_favour.slice(0, 6).map(f => (
                      <span key={f} className="text-xs px-2 py-0.5 bg-white border border-green-200 text-green-700 rounded-full">✓ {f}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-stone-500 mb-1">{t('dashboard.avoidSeason')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {currentSeason.foods_to_avoid.slice(0, 5).map(f => (
                      <span key={f} className="text-xs px-2 py-0.5 bg-red-50 border border-red-200 text-red-600 rounded-full">✗ {f}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="lg:w-64 flex-shrink-0">
                <p className="text-xs font-medium text-stone-500 mb-2 uppercase tracking-wide">{t('dashboard.seasonalPrinciples')}</p>
                <ul className="space-y-2">
                  {currentSeason.diet_principles.slice(0, 4).map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-stone-600">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${seasonStyle.dot}`} />{p}
                    </li>
                  ))}
                </ul>
                <Button size="sm" variant="outline" className="mt-4 w-full text-xs" onClick={() => navigate('/diet-charts/new')}>
                  <Sparkles className="w-3 h-3 mr-1" />{t('dashboard.generateSeasonalChart')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Patients - ENHANCED */}
        <Card className="lg:col-span-2 animate-fade-in stagger-2" data-testid="recent-patients-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-serif">{t('dashboard.recentPatients')}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/patients')} className="text-primary-700">
              {t('common.viewAll')} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {stats?.recent_patients?.length > 0 ? (
              <div className="space-y-3">
                {stats.recent_patients.map((patient) => {
                  // Mock data for demo - replace with actual patient data
                  const lastLogged = patient.last_logged || '2026-04-24T10:30:00';
                  const logDates = patient.log_dates || ['2026-04-27', '2026-04-26', '2026-04-25', '2026-04-24', '2026-04-23'];
                  const streak = calculateStreak(logDates);
                  const lastLogBadge = getLastLoggedBadge(lastLogged);
                  const doshaDrift = doshaDrifts[patient.id];
                  
                  // Check if patient is inactive (7+ days)
                  const daysSinceLog = Math.floor((new Date() - new Date(lastLogged)) / (1000 * 60 * 60 * 24));
                  const isInactive = daysSinceLog >= 7;

                  return (
                    <div key={patient.id}
                      className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                        isInactive 
                          ? 'bg-red-50 border-2 border-red-200 hover:bg-red-100' 
                          : 'bg-stone-50 hover:bg-stone-100'
                      } cursor-pointer`}
                      onClick={() => navigate(`/patients/${patient.id}`)}>
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isInactive ? 'bg-red-100' : 'bg-primary-100'
                        }`}>
                          <span className={`text-sm font-medium ${
                            isInactive ? 'text-red-700' : 'text-primary-700'
                          }`}>
                            {patient.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-stone-800 truncate">{patient.name}</p>
                            {patient.prakriti && (
                              <Badge variant="secondary" className="text-xs flex-shrink-0">
                                {patient.prakriti}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Last Logged Badge */}
                            <Badge 
                              variant={lastLogBadge.variant}
                              className={`text-xs ${lastLogBadge.color} flex items-center gap-1`}
                            >
                              <Clock className="w-3 h-3" />
                              {lastLogBadge.text}
                            </Badge>

                            {/* Streak Counter */}
                            {streak > 0 && (
                              <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs flex items-center gap-1">
                                <Flame className="w-3 h-3" />
                                {streak} day{streak !== 1 ? 's' : ''} streak
                              </Badge>
                            )}

                            {/* No-log Warning */}
                            {isInactive && (
                              <Badge className="bg-red-100 text-red-700 border-red-300 text-xs flex items-center gap-1 animate-pulse">
                                <AlertCircle className="w-3 h-3" />
                                No logs {daysSinceLog}+ days
                              </Badge>
                            )}
                          </div>

                          {/* Dosha Drift Alert */}
                          {doshaDrift && (
                            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                              <div className="flex items-start gap-2">
                                <Sparkles className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="font-medium text-amber-800">
                                    AI Alert: {doshaDrift.dosha} imbalance detected
                                  </p>
                                  <p className="text-amber-600 mt-0.5">
                                    {doshaDrift.recommendation}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-stone-300 mb-3" />
                <p className="text-stone-500">{t('dashboard.noPatients')}</p>
                <Button variant="link" onClick={() => navigate('/patients/new')} className="text-primary-700 mt-2">
                  {t('dashboard.addFirstPatient')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prakriti Distribution */}
        <Card className="animate-fade-in stagger-3" data-testid="prakriti-chart-card">
          <CardHeader>
            <CardTitle className="text-lg font-serif">{t('dashboard.prakritiDistribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            {prakritiData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={prakritiData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                      {prakritiData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, name]}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-4">
                  {prakritiData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-stone-600">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 mx-auto text-stone-300 mb-3" />
                <p className="text-stone-500">{t('common.noData')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Diet Charts */}
      <Card className="animate-fade-in stagger-4" data-testid="recent-charts-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-serif">{t('dashboard.recentDietCharts')}</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/diet-charts')} className="text-primary-700">
            {t('common.viewAll')} <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {stats?.recent_charts?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.recent_charts.map((chart) => (
                <div key={chart.id}
                  className="p-4 rounded-lg bg-gradient-to-br from-primary-50 to-white border border-primary-100 hover:border-primary-200 cursor-pointer transition-colors"
                  onClick={() => navigate(`/diet-charts/${chart.id}`)}>
                  <div className="flex items-start justify-between mb-2">
                    <Utensils className="w-5 h-5 text-primary-600" />
                    <Badge variant="outline" className="text-xs"><Sparkles className="w-3 h-3 mr-1" />AI</Badge>
                  </div>
                  <h4 className="font-medium text-stone-800 truncate">{chart.title}</h4>
                  <p className="text-sm text-stone-500 mt-1">{chart.patient_name}</p>
                  <p className="text-xs text-stone-400 mt-2">
                    <Calendar className="w-3 h-3 inline mr-1" />{new Date(chart.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Utensils className="w-12 h-12 mx-auto text-stone-300 mb-3" />
              <p className="text-stone-500">{t('dashboard.noCharts')}</p>
              <Button variant="link" onClick={() => navigate('/diet-charts/new')} className="text-primary-700 mt-2">
                {t('dashboard.createFirstChart')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
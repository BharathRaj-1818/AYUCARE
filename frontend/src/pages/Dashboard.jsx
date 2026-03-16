import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, foodsAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Users, 
  Utensils, 
  Apple, 
  FileText, 
  Plus, 
  ArrowRight,
  TrendingUp,
  Calendar,
  Loader2,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const DOSHA_COLORS = {
  'Vata': '#60A5FA',
  'Pitta': '#F97316', 
  'Kapha': '#34D399',
  'Vata-Pitta': '#A78BFA',
  'Pitta-Kapha': '#FBBF24',
  'Vata-Kapha': '#2DD4BF',
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await dashboardAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

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
    } catch (error) {
      toast.error('Failed to seed foods');
    } finally {
      setSeeding(false);
    }
  };

  const statCards = [
    { 
      title: 'Total Patients', 
      value: stats?.patient_count || 0, 
      icon: Users, 
      color: 'bg-blue-500',
      path: '/patients'
    },
    { 
      title: 'Diet Charts', 
      value: stats?.chart_count || 0, 
      icon: Utensils, 
      color: 'bg-emerald-500',
      path: '/diet-charts'
    },
    { 
      title: 'Foods in Database', 
      value: stats?.food_count || 0, 
      icon: Apple, 
      color: 'bg-orange-500',
      path: '/foods'
    },
    { 
      title: 'Recipes', 
      value: stats?.recipe_count || 0, 
      icon: FileText, 
      color: 'bg-purple-500',
      path: '/recipes'
    },
  ];

  const prakritiData = stats?.prakriti_distribution?.map(item => ({
    name: item._id,
    value: item.count,
    color: DOSHA_COLORS[item._id] || '#94A3B8'
  })) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary-700" />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="dashboard">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary-800">Dashboard</h1>
          <p className="text-stone-600 mt-1">Welcome back to AyuCare</p>
        </div>
        <div className="flex gap-3">
          {stats?.food_count === 0 && (
            <Button 
              onClick={handleSeedFoods} 
              disabled={seeding}
              className="ayur-btn-secondary"
              data-testid="seed-foods-btn"
            >
              {seeding ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Seed Food Database
            </Button>
          )}
          <Button 
            onClick={() => navigate('/patients/new')} 
            className="ayur-btn-primary"
            data-testid="add-patient-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Patient
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={stat.title}
              className="stat-card cursor-pointer hover:border-primary-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={() => navigate(stat.path)}
              data-testid={`stat-card-${stat.title.toLowerCase().replace(' ', '-')}`}
            >
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Patients */}
        <Card className="lg:col-span-2 animate-fade-in stagger-2" data-testid="recent-patients-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-serif">Recent Patients</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/patients')}
              className="text-primary-700"
            >
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {stats?.recent_patients?.length > 0 ? (
              <div className="space-y-3">
                {stats.recent_patients.map((patient) => (
                  <div 
                    key={patient.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-stone-50 hover:bg-stone-100 cursor-pointer transition-colors"
                    onClick={() => navigate(`/patients/${patient.id}`)}
                    data-testid={`recent-patient-${patient.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-700">
                          {patient.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-stone-800">{patient.name}</p>
                        <p className="text-sm text-stone-500">
                          {new Date(patient.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {patient.prakriti && (
                      <Badge variant="secondary" className="text-xs">
                        {patient.prakriti}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-stone-300 mb-3" />
                <p className="text-stone-500">No patients yet</p>
                <Button 
                  variant="link" 
                  onClick={() => navigate('/patients/new')}
                  className="text-primary-700 mt-2"
                >
                  Add your first patient
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prakriti Distribution */}
        <Card className="animate-fade-in stagger-3" data-testid="prakriti-chart-card">
          <CardHeader>
            <CardTitle className="text-lg font-serif">Prakriti Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {prakritiData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={prakritiData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {prakritiData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [value, name]}
                      contentStyle={{ 
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-4">
                  {prakritiData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-stone-600">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 mx-auto text-stone-300 mb-3" />
                <p className="text-stone-500">No data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Diet Charts */}
      <Card className="animate-fade-in stagger-4" data-testid="recent-charts-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-serif">Recent Diet Charts</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/diet-charts')}
            className="text-primary-700"
          >
            View all <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {stats?.recent_charts?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.recent_charts.map((chart) => (
                <div 
                  key={chart.id}
                  className="p-4 rounded-lg bg-gradient-to-br from-primary-50 to-white border border-primary-100 hover:border-primary-200 cursor-pointer transition-colors"
                  onClick={() => navigate(`/diet-charts/${chart.id}`)}
                  data-testid={`recent-chart-${chart.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <Utensils className="w-5 h-5 text-primary-600" />
                    <Badge variant="outline" className="text-xs">
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI
                    </Badge>
                  </div>
                  <h4 className="font-medium text-stone-800 truncate">{chart.title}</h4>
                  <p className="text-sm text-stone-500 mt-1">{chart.patient_name}</p>
                  <p className="text-xs text-stone-400 mt-2">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    {new Date(chart.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Utensils className="w-12 h-12 mx-auto text-stone-300 mb-3" />
              <p className="text-stone-500">No diet charts created yet</p>
              <Button 
                variant="link" 
                onClick={() => navigate('/diet-charts/new')}
                className="text-primary-700 mt-2"
              >
                Create your first diet chart
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

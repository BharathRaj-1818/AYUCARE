import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { dietChartsAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  ArrowLeft, 
  Download, 
  Loader2,
  Utensils,
  Calendar,
  User,
  Target,
  Sparkles,
  Clock,
  Coffee,
  Sun,
  Sunset,
  Moon,
  Apple
} from 'lucide-react';
import { toast } from 'sonner';

const getMealIcon = (mealType) => {
  const icons = {
    breakfast: Coffee,
    mid_morning: Sun,
    lunch: Sun,
    evening_snack: Sunset,
    dinner: Moon,
  };
  return icons[mealType] || Utensils;
};

const getMealLabel = (mealType) => {
  const labels = {
    breakfast: 'Breakfast',
    mid_morning: 'Mid-Morning',
    lunch: 'Lunch',
    evening_snack: 'Evening Snack',
    dinner: 'Dinner',
  };
  return labels[mealType] || mealType;
};

export default function DietChartDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [chart, setChart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadChart();
  }, [id]);

  const loadChart = async () => {
    try {
      const response = await dietChartsAPI.getOne(id);
      setChart(response.data);
    } catch (error) {
      toast.error('Failed to load diet chart');
      navigate('/diet-charts');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('ayucare_token');
      const url = dietChartsAPI.downloadPDF(id);
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `diet_chart_${id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary-700" />
      </div>
    );
  }

  if (!chart) return null;

  const mealTypes = ['breakfast', 'mid_morning', 'lunch', 'evening_snack', 'dinner'];

  return (
    <div className="max-w-6xl mx-auto space-y-6" data-testid="diet-chart-detail">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/diet-charts')}
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-serif font-bold text-primary-800">
                {chart.title}
              </h1>
              <Badge className="bg-secondary-100 text-secondary-700">
                <Sparkles className="w-3 h-3 mr-1" />
                AI Generated
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 text-stone-600">
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {chart.patient_name}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {chart.start_date} - {chart.end_date}
              </span>
            </div>
          </div>
        </div>
        <Button 
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="ayur-btn-primary"
          data-testid="download-pdf-btn"
        >
          {downloading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Download PDF
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
              <Target className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-800">
                {chart.target_calories || '-'}
              </p>
              <p className="text-sm text-stone-500">Target Cal/Day</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Apple className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-800">
                {chart.total_daily_nutrients?.protein_g || 60}g
              </p>
              <p className="text-sm text-stone-500">Protein/Day</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
              <Utensils className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-800">
                {chart.total_daily_nutrients?.carbs_g || 250}g
              </p>
              <p className="text-sm text-stone-500">Carbs/Day</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-800">
                {chart.meals?.length || 0}
              </p>
              <p className="text-sm text-stone-500">Days Planned</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {chart.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-serif">Ayurvedic Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-stone-700 whitespace-pre-wrap">{chart.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Meal Plan */}
      <Card data-testid="meal-plan-card">
        <CardHeader>
          <CardTitle className="text-lg font-serif">Daily Meal Plan</CardTitle>
        </CardHeader>
        <CardContent>
          {chart.meals?.length > 0 ? (
            <Tabs defaultValue="1" className="w-full">
              <TabsList className="flex flex-wrap gap-2 h-auto p-2 bg-stone-100 rounded-lg mb-6">
                {chart.meals.map((meal) => (
                  <TabsTrigger 
                    key={meal.day}
                    value={meal.day.toString()}
                    className="data-[state=active]:bg-white data-[state=active]:text-primary-700"
                    data-testid={`day-tab-${meal.day}`}
                  >
                    Day {meal.day}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {chart.meals.map((dayMeal) => (
                <TabsContent key={dayMeal.day} value={dayMeal.day.toString()}>
                  <div className="space-y-4">
                    {mealTypes.map(mealType => {
                      const meal = dayMeal[mealType];
                      if (!meal) return null;
                      
                      const MealIcon = getMealIcon(mealType);
                      
                      return (
                        <div 
                          key={mealType}
                          className="meal-slot"
                          data-testid={`meal-${mealType}`}
                        >
                          <div className="meal-slot-header">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center">
                                <MealIcon className="w-5 h-5 text-primary-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-stone-800">
                                  {getMealLabel(mealType)}
                                </h4>
                                <p className="meal-time flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {meal.time}
                                </p>
                              </div>
                            </div>
                            {meal.calories && (
                              <Badge variant="secondary">
                                {meal.calories} kcal
                              </Badge>
                            )}
                          </div>
                          
                          <div className="mt-3 space-y-2">
                            {meal.items?.map((item, idx) => (
                              <div 
                                key={idx}
                                className="flex items-center gap-2 text-stone-700"
                              >
                                <div className="w-2 h-2 rounded-full bg-primary-400" />
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {/* Daily Total */}
                    <div className="mt-6 p-4 rounded-lg bg-primary-50 border border-primary-100">
                      <h4 className="font-medium text-primary-800 mb-2">Day {dayMeal.day} Total</h4>
                      <div className="flex flex-wrap gap-4">
                        {mealTypes.reduce((total, mealType) => {
                          const meal = dayMeal[mealType];
                          if (meal?.calories) {
                            total += meal.calories;
                          }
                          return total;
                        }, 0) > 0 && (
                          <span className="text-sm text-primary-700">
                            <strong>
                              {mealTypes.reduce((total, mealType) => {
                                const meal = dayMeal[mealType];
                                return total + (meal?.calories || 0);
                              }, 0)}
                            </strong> kcal total
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <div className="text-center py-8">
              <Utensils className="w-12 h-12 mx-auto text-stone-300 mb-3" />
              <p className="text-stone-500">No meals planned yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

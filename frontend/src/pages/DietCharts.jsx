import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dietChartsAPI } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Eye,
  Trash2,
  Utensils,
  Loader2,
  Calendar,
  Sparkles,
  Download,
  User
} from 'lucide-react';
import { toast } from 'sonner';

export default function DietCharts() {
  const [charts, setCharts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadCharts();
  }, []);

  const loadCharts = async () => {
    setLoading(true);
    try {
      const response = await dietChartsAPI.getAll();
      setCharts(response.data);
    } catch (error) {
      console.error('Failed to load diet charts:', error);
      toast.error('Failed to load diet charts');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      await dietChartsAPI.delete(deleteId);
      toast.success('Diet chart deleted successfully');
      loadCharts();
    } catch (error) {
      toast.error('Failed to delete diet chart');
    } finally {
      setDeleteId(null);
    }
  };

  const handleDownloadPDF = (chartId, e) => {
    e.stopPropagation();
    const token = localStorage.getItem('ayucare_token');
    const url = dietChartsAPI.downloadPDF(chartId);
    
    // Open PDF download with auth
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.blob())
      .then(blob => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `diet_chart_${chartId.slice(0, 8)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
        toast.success('PDF downloaded!');
      })
      .catch(() => toast.error('Failed to download PDF'));
  };

  const filteredCharts = charts.filter(chart => 
    !search || 
    chart.title.toLowerCase().includes(search.toLowerCase()) ||
    chart.patient_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6" data-testid="diet-charts-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary-800">Diet Charts</h1>
          <p className="text-stone-600 mt-1">AI-powered Ayurvedic diet plans</p>
        </div>
        <Button 
          onClick={() => navigate('/diet-charts/new')} 
          className="ayur-btn-primary"
          data-testid="create-chart-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Diet Chart
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <Input
              placeholder="Search diet charts by title or patient name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="search-input"
            />
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-700" />
        </div>
      ) : filteredCharts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCharts.map((chart) => (
            <Card 
              key={chart.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/diet-charts/${chart.id}`)}
              data-testid={`chart-card-${chart.id}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center">
                    <Utensils className="w-6 h-6 text-primary-600" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" data-testid={`chart-actions-${chart.id}`}>
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/diet-charts/${chart.id}`);
                      }}>
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleDownloadPDF(chart.id, e)}>
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(chart.id);
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <h3 className="font-serif font-semibold text-lg text-stone-800 mb-2 line-clamp-2">
                  {chart.title}
                </h3>

                <div className="flex items-center gap-2 text-sm text-stone-500 mb-3">
                  <User className="w-4 h-4" />
                  <span>{chart.patient_name || 'Unknown Patient'}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-stone-500 mb-4">
                  <Calendar className="w-4 h-4" />
                  <span>{chart.start_date} - {chart.end_date}</span>
                </div>

                <div className="flex items-center justify-between">
                  {chart.target_calories && (
                    <Badge variant="secondary" className="text-xs">
                      {chart.target_calories} kcal/day
                    </Badge>
                  )}
                  <Badge className="bg-secondary-100 text-secondary-700">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI Generated
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Utensils className="empty-state-icon" />
          <h3 className="text-lg font-medium text-stone-800">No diet charts found</h3>
          <p className="text-stone-500 mt-1">
            {search 
              ? 'Try adjusting your search'
              : 'Create your first AI-powered diet chart'}
          </p>
          {!search && (
            <Button 
              onClick={() => navigate('/diet-charts/new')}
              className="mt-4 ayur-btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Diet Chart
            </Button>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Diet Chart</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this diet chart? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              data-testid="confirm-delete-btn"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

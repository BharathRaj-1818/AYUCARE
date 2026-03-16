import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientsAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
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
  Edit2, 
  Trash2, 
  Eye,
  Users,
  Loader2,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';

const PRAKRITI_OPTIONS = [
  'Vata', 'Pitta', 'Kapha', 
  'Vata-Pitta', 'Pitta-Kapha', 'Vata-Kapha',
  'Tridosha'
];

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [prakritiFilter, setPrakritiFilter] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadPatients();
  }, [search, prakritiFilter]);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (prakritiFilter && prakritiFilter !== 'all') params.prakriti = prakritiFilter;
      
      const response = await patientsAPI.getAll(params);
      setPatients(response.data);
    } catch (error) {
      console.error('Failed to load patients:', error);
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      await patientsAPI.delete(deleteId);
      toast.success('Patient deleted successfully');
      loadPatients();
    } catch (error) {
      toast.error('Failed to delete patient');
    } finally {
      setDeleteId(null);
    }
  };

  const getDoshaColor = (prakriti) => {
    if (!prakriti) return 'bg-stone-100 text-stone-700';
    if (prakriti.includes('Vata')) return 'dosha-vata';
    if (prakriti.includes('Pitta')) return 'dosha-pitta';
    if (prakriti.includes('Kapha')) return 'dosha-kapha';
    return 'bg-stone-100 text-stone-700';
  };

  return (
    <div className="space-y-6" data-testid="patients-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary-800">Patients</h1>
          <p className="text-stone-600 mt-1">Manage your patient profiles</p>
        </div>
        <Button 
          onClick={() => navigate('/patients/new')} 
          className="ayur-btn-primary"
          data-testid="add-patient-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Patient
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <Input
                placeholder="Search patients by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
            </div>
            <Select value={prakritiFilter} onValueChange={setPrakritiFilter}>
              <SelectTrigger className="w-full md:w-48" data-testid="prakriti-filter">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by Prakriti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prakritis</SelectItem>
                {PRAKRITI_OPTIONS.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Patients Table */}
      <Card data-testid="patients-table-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary-700" />
            </div>
          ) : patients.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Age/Gender</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Prakriti</TableHead>
                    <TableHead>BMI</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((patient) => (
                    <TableRow 
                      key={patient.id} 
                      className="cursor-pointer"
                      onClick={() => navigate(`/patients/${patient.id}`)}
                      data-testid={`patient-row-${patient.id}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-700">
                              {patient.name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium">{patient.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {patient.age} yrs / {patient.gender}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {patient.phone && <div>{patient.phone}</div>}
                          {patient.email && <div className="text-stone-500">{patient.email}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {patient.prakriti && (
                          <Badge className={getDoshaColor(patient.prakriti)}>
                            {patient.prakriti}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {patient.bmi ? (
                          <span className={
                            patient.bmi < 18.5 ? 'text-blue-600' :
                            patient.bmi < 25 ? 'text-green-600' :
                            patient.bmi < 30 ? 'text-yellow-600' :
                            'text-red-600'
                          }>
                            {patient.bmi}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-stone-500">
                        {new Date(patient.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" data-testid={`patient-actions-${patient.id}`}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/patients/${patient.id}`);
                            }}>
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/patients/${patient.id}/edit`);
                            }}>
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteId(patient.id);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="empty-state">
              <Users className="empty-state-icon" />
              <h3 className="text-lg font-medium text-stone-800">No patients found</h3>
              <p className="text-stone-500 mt-1">
                {search || prakritiFilter 
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first patient'}
              </p>
              {!search && !prakritiFilter && (
                <Button 
                  onClick={() => navigate('/patients/new')}
                  className="mt-4 ayur-btn-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Patient
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Patient</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this patient? This action cannot be undone.
              All associated diet charts will also be affected.
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

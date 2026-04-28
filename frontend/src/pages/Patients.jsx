import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { patientsAPI } from '../lib/api';
import api from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Plus, Search, MoreVertical, Edit2, Trash2, Eye, Users, Loader2, Filter, Clock } from 'lucide-react';
import { toast } from 'sonner';

const PRAKRITI_OPTIONS = ['Vata','Pitta','Kapha','Vata-Pitta','Pitta-Kapha','Vata-Kapha','Tridosha'];

// ── Last-logged badge helper ───────────────────────────────────────────────────
function LastLoggedBadge({ dateStr }) {
  if (!dateStr) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-400 border border-stone-200">
        <Clock className="w-3 h-3" /> Never
      </span>
    );
  }
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
      <Clock className="w-3 h-3" /> Today
    </span>
  );
  if (days === 1) return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200">
      <Clock className="w-3 h-3" /> Yesterday
    </span>
  );
  if (days <= 7) return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
      <Clock className="w-3 h-3" /> {days}d ago
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-200">
      <Clock className="w-3 h-3" /> {days}d ago
    </span>
  );
}

export default function Patients() {
  const { t } = useTranslation();
  const [patients, setPatients]       = useState([]);
  const [lastLogs, setLastLogs]       = useState({});   // { patient_id: "YYYY-MM-DD" }
  const [loading, setLoading]         = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [search, setSearch]           = useState('');
  const [prakritiFilter, setPrakritiFilter] = useState('');
  const [deleteId, setDeleteId]       = useState(null);
  const navigate = useNavigate();

  useEffect(() => { loadPatients(); }, [search, prakritiFilter]);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (prakritiFilter && prakritiFilter !== 'all') params.prakriti = prakritiFilter;
      const response = await patientsAPI.getAll(params);
      setPatients(response.data);
      // Fire off last-log fetch after patient list is ready
      fetchLastLogs(response.data);
    } catch {
      toast.error(t('patients.loadError', 'Failed to load patients'));
    } finally {
      setLoading(false);
    }
  };

  // Fetch last log date for each patient in parallel (capped at 30 patients per render)
  const fetchLastLogs = async (patientList) => {
    if (!patientList?.length) return;
    setLogsLoading(true);
    const slice = patientList.slice(0, 30);
    const results = await Promise.allSettled(
      slice.map(p =>
        api.get(`/progress/${p.id}?days=90`)
          .then(r => ({ id: p.id, date: r.data?.logs?.at(-1)?.date ?? null }))
          .catch(() => ({ id: p.id, date: null }))
      )
    );
    const map = {};
    results.forEach(r => {
      if (r.status === 'fulfilled') map[r.value.id] = r.value.date;
    });
    setLastLogs(map);
    setLogsLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await patientsAPI.delete(deleteId);
      toast.success(t('patients.deleteSuccess', 'Patient deleted successfully'));
      loadPatients();
    } catch {
      toast.error(t('patients.deleteError', 'Failed to delete patient'));
    } finally {
      setDeleteId(null);
    }
  };

  const getDoshaColor = (prakriti) => {
    if (!prakriti) return 'bg-stone-100 text-stone-700';
    if (prakriti.includes('Vata'))  return 'dosha-vata';
    if (prakriti.includes('Pitta')) return 'dosha-pitta';
    if (prakriti.includes('Kapha')) return 'dosha-kapha';
    return 'bg-stone-100 text-stone-700';
  };

  return (
    <div className="space-y-6" data-testid="patients-page">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary-800">{t('patients.title')}</h1>
          <p className="text-stone-600 mt-1">{t('patients.subtitle')}</p>
        </div>
        <Button onClick={() => navigate('/patients/new')} className="ayur-btn-primary" data-testid="add-patient-btn">
          <Plus className="w-4 h-4 mr-2" />{t('patients.addPatient')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <Input placeholder={t('patients.searchPlaceholder')} value={search}
                onChange={(e) => setSearch(e.target.value)} className="pl-10" data-testid="search-input" />
            </div>
            <Select value={prakritiFilter} onValueChange={setPrakritiFilter}>
              <SelectTrigger className="w-full md:w-48" data-testid="prakriti-filter">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder={t('patients.filterByPrakriti')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('patients.allPrakritis')}</SelectItem>
                {PRAKRITI_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
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
                    <TableHead>{t('patients.name')}</TableHead>
                    <TableHead>{t('patients.ageGender')}</TableHead>
                    <TableHead>{t('common.contact')}</TableHead>
                    <TableHead>{t('prakriti.title')}</TableHead>
                    <TableHead>BMI</TableHead>
                    <TableHead className="whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Last Logged
                        {logsLoading && <Loader2 className="w-3 h-3 animate-spin text-stone-400" />}
                      </span>
                    </TableHead>
                    <TableHead>{t('common.created')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((patient) => (
                    <TableRow key={patient.id} className="cursor-pointer"
                      onClick={() => navigate(`/patients/${patient.id}`)}
                      data-testid={`patient-row-${patient.id}`}>
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
                      <TableCell>{patient.age} {t('patients.yrs')} / {patient.gender}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {patient.phone && <div>{patient.phone}</div>}
                          {patient.email && <div className="text-stone-500">{patient.email}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {patient.prakriti && (
                          <Badge className={getDoshaColor(patient.prakriti)}>{patient.prakriti}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {patient.bmi ? (
                          <span className={
                            patient.bmi < 18.5 ? 'text-blue-600' :
                            patient.bmi < 25   ? 'text-green-600' :
                            patient.bmi < 30   ? 'text-yellow-600' : 'text-red-600'
                          }>
                            {patient.bmi}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        {/* Stop propagation so clicking badge doesn't nav to patient */}
                        <div onClick={() => navigate(`/patients/${patient.id}`)}>
                          <LastLoggedBadge dateStr={lastLogs[patient.id] ?? undefined} />
                        </div>
                      </TableCell>
                      <TableCell className="text-stone-500">
                        {new Date(patient.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/patients/${patient.id}`); }}>
                              <Eye className="w-4 h-4 mr-2" />{t('common.view')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/patients/${patient.id}/edit`); }}>
                              <Edit2 className="w-4 h-4 mr-2" />{t('common.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeleteId(patient.id); }} className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" />{t('common.delete')}
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
              <h3 className="text-lg font-medium text-stone-800">{t('patients.noPatients')}</h3>
              <p className="text-stone-500 mt-1">
                {search || prakritiFilter ? t('common.adjustFilters') : t('patients.getStarted')}
              </p>
              {!search && !prakritiFilter && (
                <Button onClick={() => navigate('/patients/new')} className="mt-4 ayur-btn-primary">
                  <Plus className="w-4 h-4 mr-2" />{t('patients.addPatient')}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('patients.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('patients.deleteDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
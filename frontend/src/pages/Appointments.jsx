import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { patientsAPI } from '../lib/api';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Calendar, Clock, Video, MapPin, Plus, Loader2,
  CheckCircle2, XCircle, AlertCircle, Search,
  ChevronLeft, ChevronRight, X, Monitor, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: 'bg-amber-100  text-amber-700  border-amber-200',  Icon: AlertCircle  },
  confirmed: { label: 'Confirmed', color: 'bg-green-100  text-green-700  border-green-200',  Icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-red-100    text-red-700    border-red-200',    Icon: XCircle      },
  completed: { label: 'Completed', color: 'bg-stone-100  text-stone-500  border-stone-200',  Icon: CheckCircle2 },
};

const TIME_SLOTS = [
  "9:00 AM","9:30 AM","10:00 AM","10:30 AM",
  "11:00 AM","11:30 AM","12:00 PM",
  "2:00 PM","2:30 PM","3:00 PM","3:30 PM",
  "4:00 PM","4:30 PM","5:00 PM",
];

const today = () => new Date().toISOString().split('T')[0];

function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function getWeekDates(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

function CreateModal({ patients, onSuccess, onClose }) {
  const { t } = useTranslation();
  const [selectedPatient, setSelectedPatient] = useState('');
  const [patientSearch, setPatientSearch]     = useState('');
  const [weekStart, setWeekStart]             = useState(getMondayOfWeek(new Date()));
  const [selectedDate, setSelectedDate]       = useState('');
  const [selectedSlot, setSelectedSlot]       = useState('');
  const [type, setType]                       = useState('in-person');
  const [notes, setNotes]                     = useState('');
  const [saving, setSaving]                   = useState(false);

  const dates    = getWeekDates(weekStart);
  const DAY_NAMES = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase())
  );

  const handleCreate = async () => {
    if (!selectedPatient || !selectedDate || !selectedSlot) {
      toast.error(t('appointments.fillRequired'));
      return;
    }
    setSaving(true);
    try {
      await api.post('/appointments', {
        patient_id: selectedPatient, date: selectedDate,
        time_slot: selectedSlot, type, notes: notes || null, duration_mins: 30,
      });
      toast.success(t('appointments.created'));
      onSuccess();
    } catch (e) {
      toast.error(e?.response?.data?.detail || t('appointments.createError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <CardHeader className="pb-3 sticky top-0 bg-white border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="font-serif text-primary-800">{t('appointments.newTitle')}</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          {/* Patient search */}
          <div>
            <Label className="text-xs text-stone-500 mb-1 block">{t('patients.name')} *</Label>
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-stone-400" />
              <Input placeholder={t('appointments.searchPatient')} value={patientSearch}
                onChange={e => setPatientSearch(e.target.value)} className="pl-8 text-sm" />
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1 border border-stone-100 rounded-lg p-1">
              {filteredPatients.slice(0, 10).map(p => (
                <button key={p.id} onClick={() => { setSelectedPatient(p.id); setPatientSearch(p.name); }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all
                    ${selectedPatient === p.id ? 'bg-primary-100 text-primary-800 font-medium' : 'hover:bg-stone-50 text-stone-700'}`}>
                  {p.name}{p.prakriti && <span className="text-xs text-stone-400 ml-2">· {p.prakriti}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Date picker */}
          <div>
            <Label className="text-xs text-stone-500 mb-2 block">{t('appointments.date')} *</Label>
            <div className="flex items-center gap-2 mb-2">
              <Button variant="ghost" size="icon" onClick={() => {
                const d = new Date(weekStart); d.setDate(d.getDate() - 7);
                setWeekStart(d.toISOString().split('T')[0]);
              }}><ChevronLeft className="w-4 h-4" /></Button>
              <span className="text-xs text-stone-500 flex-1 text-center">
                {new Date(dates[0]).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
                {' — '}
                {new Date(dates[6]).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
              </span>
              <Button variant="ghost" size="icon" onClick={() => {
                const d = new Date(weekStart); d.setDate(d.getDate() + 7);
                setWeekStart(d.toISOString().split('T')[0]);
              }}><ChevronRight className="w-4 h-4" /></Button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {dates.map((d, i) => {
                const isPast = d < today();
                return (
                  <button key={d} disabled={isPast}
                    onClick={() => { setSelectedDate(d); setSelectedSlot(''); }}
                    className={`flex flex-col items-center py-2 rounded-lg text-xs transition-all
                      ${isPast ? 'opacity-30 cursor-not-allowed' : ''}
                      ${d === selectedDate ? 'bg-primary-700 text-white' : 'hover:bg-primary-50 border border-stone-100'}`}>
                    <span className="font-medium">{DAY_NAMES[i]}</span>
                    <span>{new Date(d).getDate()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time slots */}
          {selectedDate && (
            <div>
              <Label className="text-xs text-stone-500 mb-2 block">{t('appointments.timeSlot')} *</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {TIME_SLOTS.map(slot => (
                  <button key={slot} onClick={() => setSelectedSlot(slot)}
                    className={`text-xs py-1.5 rounded-lg border transition-all
                      ${selectedSlot === slot ? 'bg-primary-700 text-white border-primary-700' : 'border-stone-200 text-stone-600 hover:border-primary-300'}`}>
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Type */}
          <div>
            <Label className="text-xs text-stone-500 mb-2 block">{t('appointments.consultationType')}</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: 'in-person', label: t('appointments.inPerson'), Icon: MapPin },
                { val: 'video',     label: t('appointments.videoCall'), Icon: Video  },
              ].map(({ val, label, Icon }) => (
                <button key={val} onClick={() => setType(val)}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-sm transition-all
                    ${type === val ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-stone-200 hover:border-primary-200 text-stone-600'}`}>
                  <Icon className="w-4 h-4" />{label}
                </button>
              ))}
            </div>
            {type === 'video' && (
              <p className="text-xs text-blue-600 mt-1.5 flex items-center gap-1">
                <Video className="w-3 h-3" />{t('appointments.videoRoomNote')}
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs text-stone-500 mb-1 block">{t('appointments.notes')}</Label>
            <Textarea placeholder={t('appointments.notesPlaceholder')} value={notes}
              onChange={e => setNotes(e.target.value)} rows={2} className="text-sm resize-none" />
          </div>

          <Button onClick={handleCreate} disabled={saving || !selectedPatient || !selectedDate || !selectedSlot}
            className="w-full ayur-btn-primary">
            {saving
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('common.loading')}</>
              : <><CheckCircle2 className="w-4 h-4 mr-2" />{t('appointments.create')}</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function AppointmentRow({ appt, onStatusChange, onJoin, navigate }) {
  const { t } = useTranslation();
  const { label, color, Icon } = STATUS_CONFIG[appt.status] || STATUS_CONFIG.pending;
  const isToday = appt.date === today();

  return (
    <div className={`p-4 rounded-xl border transition-all
      ${isToday && appt.status === 'confirmed' ? 'border-primary-300 bg-primary-50' : 'border-stone-100 bg-white hover:border-stone-200'}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${appt.type === 'video' ? 'bg-blue-100' : 'bg-green-100'}`}>
            {appt.type === 'video' ? <Video className="w-4 h-4 text-blue-600" /> : <MapPin className="w-4 h-4 text-green-600" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-stone-800 text-sm cursor-pointer hover:text-primary-700"
                onClick={() => navigate(`/patients/${appt.patient_id}`)}>
                {appt.patient_name}
              </span>
              <Badge className={`text-xs border ${color}`}><Icon className="w-3 h-3 mr-1" />{label}</Badge>
              {isToday && <Badge className="text-xs bg-primary-100 text-primary-700 animate-pulse">{t('appointments.today')}</Badge>}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-stone-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(appt.date).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />{appt.time_slot} ({appt.duration_mins} min)
              </span>
              <span className="capitalize">{appt.type}</span>
            </div>
            {appt.notes && (
              <p className="text-xs text-stone-400 mt-1 italic truncate max-w-xs">"{appt.notes}"</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {appt.type === 'video' && appt.meeting_url && appt.status === 'confirmed' && (
            <Button size="sm" className="text-xs bg-blue-600 hover:bg-blue-700 text-white h-7 px-3"
              onClick={() => onJoin(appt.meeting_url)}>
              <Monitor className="w-3 h-3 mr-1" />{t('appointments.join')}
            </Button>
          )}
          {appt.status === 'pending' && (
            <Button size="sm" variant="outline" className="text-xs text-green-600 border-green-300 hover:bg-green-50 h-7 px-2"
              onClick={() => onStatusChange(appt.id, 'confirmed')}>{t('appointments.confirm')}
            </Button>
          )}
          {appt.status === 'confirmed' && (
            <Button size="sm" variant="outline" className="text-xs text-stone-600 border-stone-300 hover:bg-stone-50 h-7 px-2"
              onClick={() => onStatusChange(appt.id, 'completed')}>{t('appointments.markDone')}
            </Button>
          )}
          {['pending','confirmed'].includes(appt.status) && (
            <Button size="sm" variant="ghost" className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 h-7 px-2"
              onClick={() => onStatusChange(appt.id, 'cancelled')}>{t('common.cancel')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Appointments() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showCreate, setShowCreate]     = useState(false);
  const [videoUrl, setVideoUrl]         = useState(null);
  const [filter, setFilter]             = useState('upcoming');
  const [search, setSearch]             = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [apptRes, patRes] = await Promise.all([api.get('/appointments'), patientsAPI.getAll()]);
      setAppointments(apptRes.data);
      setPatients(patRes.data);
    } catch {
      toast.error(t('appointments.loadError', 'Failed to load appointments'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleStatusChange = async (id, status) => {
    try {
      await api.put(`/appointments/${id}`, { status });
      toast.success(`Appointment ${status}`);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || t('common.updateFailed'));
    }
  };

  const todayStr = today();

  const filtered = appointments
    .filter(a => {
      if (filter === 'upcoming') return a.date >= todayStr && a.status !== 'cancelled';
      if (filter === 'today')    return a.date === todayStr;
      if (filter === 'pending')  return a.status === 'pending';
      if (filter === 'past')     return a.date < todayStr || a.status === 'completed';
      return true;
    })
    .filter(a => !search || a.patient_name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.date + a.time_slot).localeCompare(b.date + b.time_slot));

  const stats = {
    today:   appointments.filter(a => a.date === todayStr && a.status === 'confirmed').length,
    pending: appointments.filter(a => a.status === 'pending').length,
    week:    appointments.filter(a => {
      const d = new Date(a.date); const now = new Date();
      const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);
      return d >= now && d <= weekEnd && a.status === 'confirmed';
    }).length,
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="w-8 h-8 animate-spin text-primary-700" />
    </div>
  );

  const FILTER_TABS = [
    { val: 'upcoming', label: t('appointments.upcoming') },
    { val: 'today',    label: t('appointments.todayTab') },
    { val: 'pending',  label: t('appointments.pendingTab') },
    { val: 'past',     label: t('appointments.past') },
    { val: 'all',      label: t('common.all') },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Video modal - uses iframe on desktop, opens new tab on mobile */}
      {videoUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-stone-900">
            <div className="flex items-center gap-2 text-white">
              <Monitor className="w-5 h-5 text-green-400" />
              <span className="font-medium text-sm">{t('appointments.videoConsultation')}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm"
                className="text-white hover:bg-stone-700 text-xs"
                onClick={() => { window.open(videoUrl, '_blank', 'noopener,noreferrer'); }}>
                Open in Tab ↗
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setVideoUrl(null)} className="text-white hover:bg-stone-700">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <div className="flex-1">
            <iframe
              src={videoUrl}
              allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
              allowFullScreen
              className="w-full h-full border-0"
              title="Video Consultation"
            />
          </div>
        </div>
      )}

      {showCreate && (
        <CreateModal patients={patients} onSuccess={() => { setShowCreate(false); load(); }} onClose={() => setShowCreate(false)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary-800">{t('nav.appointments')}</h1>
          <p className="text-stone-500 mt-1">{t('appointments.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
          <Button className="ayur-btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />{t('appointments.new')}
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t('appointments.todayConfirmed'), val: stats.today,   color: 'text-green-700',  bg: 'bg-green-50'  },
          { label: t('appointments.pendingApproval'),val: stats.pending, color: 'text-amber-700',  bg: 'bg-amber-50'  },
          { label: t('appointments.thisWeek'),       val: stats.week,    color: 'text-primary-700', bg: 'bg-primary-50'},
        ].map(({ label, val, color, bg }) => (
          <Card key={label}>
            <CardContent className={`p-4 text-center ${bg} rounded-xl`}>
              <p className={`text-3xl font-bold ${color}`}>{val}</p>
              <p className="text-xs text-stone-500 mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
          <Input placeholder={t('appointments.searchPlaceholder')} value={search}
            onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 bg-stone-100 p-1 rounded-lg">
          {FILTER_TABS.map(({ val, label }) => (
            <button key={val} onClick={() => setFilter(val)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all
                ${filter === val ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
              {label}
              {val === 'pending' && stats.pending > 0 && (
                <span className="ml-1 text-xs bg-amber-100 text-amber-700 rounded-full px-1">{stats.pending}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-12 h-12 mx-auto text-stone-300 mb-3" />
            <p className="text-stone-500">{t('appointments.noAppointments')}</p>
            <Button variant="link" className="text-primary-700 mt-1" onClick={() => setShowCreate(true)}>
              {t('appointments.createNow')}
            </Button>
          </div>
        ) : (
          filtered.map(appt => (
            <AppointmentRow key={appt.id} appt={appt} onStatusChange={handleStatusChange}
              onJoin={setVideoUrl} navigate={navigate} />
          ))
        )}
      </div>
    </div>
  );
}
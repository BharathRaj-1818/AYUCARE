import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Calendar, Clock, Video, MapPin, Plus, Loader2,
  CheckCircle2, XCircle, AlertCircle, X, Monitor,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: 'bg-amber-100  text-amber-700  border-amber-200',  Icon: AlertCircle  },
  confirmed: { label: 'Confirmed', color: 'bg-green-100  text-green-700  border-green-200',  Icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-red-100    text-red-700    border-red-200',    Icon: XCircle      },
  completed: { label: 'Completed', color: 'bg-stone-100  text-stone-600  border-stone-200',  Icon: CheckCircle2 },
};

const TIME_SLOTS = [
  "9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM","12:00 PM",
  "2:00 PM","2:30 PM","3:00 PM","3:30 PM","4:00 PM","4:30 PM","5:00 PM",
];

const DAY_NAMES = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function getWeekDates(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

function getMondayOfWeek(date) {
  const d = new Date(date); const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return d.toISOString().split('T')[0];
}

function VideoCallModal({ url, onClose }) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-stone-900">
        <div className="flex items-center gap-2 text-white">
          <Monitor className="w-5 h-5 text-green-400" />
          <span className="font-medium text-sm">{t('appointments.videoConsultation')}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm"
            className="text-white hover:bg-stone-700 text-xs"
            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>
            Open in Tab ↗
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-stone-700">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>
      <div className="flex-1">
        <iframe
          src={url}
          allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
          allowFullScreen
          className="w-full h-full border-0"
          title="Video Consultation"
        />
      </div>
    </div>
  );
}

function BookingForm({ onSuccess, onCancel }) {
  const { t } = useTranslation();
  const [weekStart, setWeekStart]   = useState(getMondayOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [type, setType]   = useState('in-person');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const dates = getWeekDates(weekStart);

  const handleBook = async () => {
    if (!selectedDate || !selectedSlot) { toast.error(t('appointments.selectDateTime')); return; }
    setSaving(true);
    try {
      await api.post('/patient-portal/appointments/request', {
        patient_id: 'self', date: selectedDate, time_slot: selectedSlot,
        type, notes: notes || null, duration_mins: 30,
      });
      toast.success(t('appointments.requestSent'));
      onSuccess();
    } catch (e) {
      toast.error(e?.response?.data?.detail || t('appointments.bookError'));
    } finally { setSaving(false); }
  };

  return (
    <Card className="border-purple-200 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-serif text-purple-800">{t('appointments.book')}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}><X className="w-4 h-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Date picker */}
        <div>
          <Label className="text-xs text-stone-500 mb-2 block">{t('appointments.selectDate')}</Label>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate()-7); setWeekStart(d.toISOString().split('T')[0]); }} disabled={weekStart <= today}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-stone-500 flex-1 text-center">
              {new Date(dates[0]).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
              {' — '}
              {new Date(dates[6]).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
            </span>
            <Button variant="ghost" size="icon" onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate()+7); setWeekStart(d.toISOString().split('T')[0]); }}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {dates.map((d, i) => {
              const isPast = d < today; const isSelected = d === selectedDate;
              return (
                <button key={d} disabled={isPast}
                  onClick={() => { setSelectedDate(d); setSelectedSlot(''); }}
                  className={`flex flex-col items-center py-2 px-1 rounded-lg text-xs transition-all
                    ${isPast ? 'opacity-30 cursor-not-allowed' : ''}
                    ${isSelected ? 'bg-purple-600 text-white shadow-md' : 'hover:bg-purple-50 border border-stone-100'}`}>
                  <span className="font-medium">{DAY_NAMES[i]}</span>
                  <span className={isSelected ? 'text-white' : 'text-stone-500'}>{new Date(d).getDate()}</span>
                </button>
              );
            })}
          </div>
        </div>

        {selectedDate && (
          <>
            <div>
              <Label className="text-xs text-stone-500 mb-2 block">
                {t('appointments.timeSlot')} — {new Date(selectedDate).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}
              </Label>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                {TIME_SLOTS.map(slot => (
                  <button key={slot} onClick={() => setSelectedSlot(slot)}
                    className={`text-xs py-1.5 rounded-lg border transition-all
                      ${selectedSlot === slot ? 'bg-purple-600 text-white border-purple-600' : 'border-stone-200 text-stone-600 hover:border-purple-300 hover:bg-purple-50'}`}>
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs text-stone-500 mb-2 block">{t('appointments.consultationType')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { val: 'in-person', label: t('appointments.inPerson'), Icon: MapPin, desc: t('appointments.visitClinic') },
                  { val: 'video',     label: t('appointments.videoCall'), Icon: Video,  desc: t('appointments.onlineConsult') },
                ].map(({ val, label, Icon, desc }) => (
                  <button key={val} onClick={() => setType(val)}
                    className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all
                      ${type === val ? 'border-purple-400 bg-purple-50' : 'border-stone-200 hover:border-purple-200'}`}>
                    <Icon className={`w-4 h-4 shrink-0 ${type === val ? 'text-purple-600' : 'text-stone-400'}`} />
                    <div>
                      <p className={`text-sm font-medium ${type === val ? 'text-purple-700' : 'text-stone-700'}`}>{label}</p>
                      <p className="text-xs text-stone-400">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs text-stone-500 mb-1 block">{t('appointments.notes')}</Label>
              <Textarea placeholder={t('appointments.bookingNotesPlaceholder')} value={notes}
                onChange={e => setNotes(e.target.value)} rows={2} className="text-sm resize-none" />
            </div>

            <Button onClick={handleBook} disabled={saving || !selectedSlot}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white">
              {saving
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('appointments.sendingRequest')}</>
                : <><CheckCircle2 className="w-4 h-4 mr-2" />{t('appointments.requestAppointment')}</>}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AppointmentCard({ appt, onCancel, onJoin }) {
  const { t } = useTranslation();
  const { label, color, Icon } = STATUS_CONFIG[appt.status] || STATUS_CONFIG.pending;
  const today = new Date().toISOString().split('T')[0];
  const isUpcoming = appt.status === 'confirmed' && appt.date >= today;
  const isToday    = appt.date === today;

  return (
    <div className={`p-4 rounded-xl border transition-all
      ${isUpcoming && isToday ? 'border-purple-300 bg-purple-50 shadow-sm' : 'border-stone-100 bg-white'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${appt.type === 'video' ? 'bg-blue-100' : 'bg-green-100'}`}>
            {appt.type === 'video' ? <Video className="w-4 h-4 text-blue-600" /> : <MapPin className="w-4 h-4 text-green-600" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-stone-800 text-sm">
                {appt.type === 'video' ? `📹 ${t('appointments.videoConsultation')}` : `🏥 ${t('appointments.inPersonVisit')}`}
              </span>
              <Badge className={`text-xs border ${color}`}><Icon className="w-3 h-3 mr-1" />{label}</Badge>
              {isToday && appt.status === 'confirmed' && (
                <Badge className="text-xs bg-purple-100 text-purple-700 border-purple-200 animate-pulse">
                  {t('appointments.today')}!
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-stone-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(appt.date).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}
              </span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{appt.time_slot}</span>
            </div>
            {appt.dietitian_name && <p className="text-xs text-stone-400 mt-0.5">with Dr. {appt.dietitian_name}</p>}
            {appt.notes && <p className="text-xs text-stone-400 mt-1 italic">"{appt.notes}"</p>}
          </div>
        </div>
        <div className="flex flex-col gap-1.5 items-end shrink-0">
          {appt.type === 'video' && appt.meeting_url && isUpcoming && (
            <Button size="sm" className="text-xs bg-blue-600 hover:bg-blue-700 text-white h-7 px-3"
              onClick={() => onJoin(appt.meeting_url)}>
              <Video className="w-3 h-3 mr-1" />{t('appointments.join')}
            </Button>
          )}
          {appt.status === 'pending' && (
            <Button size="sm" variant="ghost"
              className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 h-7 px-2"
              onClick={() => onCancel(appt.id)}>{t('common.cancel')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PatientAppointments() {
  const { t } = useTranslation();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [filter, setFilter]     = useState('upcoming');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/patient-portal/appointments');
      setAppointments(res.data.appointments || []);
    } catch { toast.error(t('appointments.loadError')); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async (id) => {
    if (!window.confirm(t('appointments.confirmCancel'))) return;
    try {
      await api.delete(`/patient-portal/appointments/${id}/cancel`);
      toast.success(t('appointments.cancelled'));
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || t('appointments.cancelError')); }
  };

  const today = new Date().toISOString().split('T')[0];
  const filtered = appointments.filter(a => {
    if (filter === 'upcoming') return a.date >= today && a.status !== 'cancelled';
    if (filter === 'past')     return a.date <  today || a.status === 'completed';
    return true;
  });
  const upcoming = appointments.filter(a => a.date >= today && a.status === 'confirmed');

  const FILTER_TABS = [
    { val: 'upcoming', label: t('appointments.upcoming') },
    { val: 'all',      label: t('common.all')            },
    { val: 'past',     label: t('appointments.past')     },
  ];

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {videoUrl && <VideoCallModal url={videoUrl} onClose={() => setVideoUrl(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-800">{t('nav.appointments')}</h1>
          <p className="text-stone-500 text-sm mt-0.5">{t('appointments.manageConsultations')}</p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setShowForm(v => !v)}>
          <Plus className="w-4 h-4 mr-1" />
          {showForm ? t('common.cancel') : t('appointments.bookNew')}
        </Button>
      </div>

      {/* Next appointment banner */}
      {upcoming.length > 0 && !showForm && (
        <Card className="border-purple-300 bg-gradient-to-r from-purple-50 to-white">
          <CardContent className="py-4 px-5">
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">
              {t('appointments.nextAppointment')}
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-stone-800">
                  {upcoming[0].type === 'video' ? `📹 ${t('appointments.videoConsultation')}` : `🏥 ${t('appointments.inPersonVisit')}`}
                </p>
                <p className="text-sm text-stone-500 mt-0.5">
                  {new Date(upcoming[0].date).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})} at {upcoming[0].time_slot}
                </p>
              </div>
              {upcoming[0].type === 'video' && upcoming[0].meeting_url && (
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setVideoUrl(upcoming[0].meeting_url)}>
                  <Video className="w-4 h-4 mr-1" />{t('appointments.joinCall')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {showForm && <BookingForm onSuccess={() => { setShowForm(false); load(); }} onCancel={() => setShowForm(false)} />}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-stone-100 p-1 rounded-lg w-fit">
        {FILTER_TABS.map(({ val, label }) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all
              ${filter === val ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
            {label}
            {val === 'upcoming' && upcoming.length > 0 && (
              <span className="ml-1.5 text-xs bg-purple-100 text-purple-700 rounded-full px-1.5 py-0.5">{upcoming.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-14">
            <Calendar className="w-12 h-12 mx-auto text-stone-300 mb-3" />
            <p className="text-stone-500">{t('appointments.noAppointments')} {filter}</p>
            <Button variant="link" className="text-purple-600 mt-1" onClick={() => setShowForm(true)}>
              {t('appointments.bookFirst')} →
            </Button>
          </div>
        ) : (
          filtered.map(appt => (
            <AppointmentCard key={appt.id} appt={appt} onCancel={handleCancel} onJoin={setVideoUrl} />
          ))
        )}
      </div>
    </div>
  );
}
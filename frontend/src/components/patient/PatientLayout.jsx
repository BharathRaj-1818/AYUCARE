import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePatientPortal } from '../../context/PatientPortalContext';
import { useTranslation } from 'react-i18next';  // ← ADD
import {
  LayoutDashboard, Utensils, Leaf, TrendingUp,
  Calendar, LogOut, Menu, X, ChevronRight,
} from 'lucide-react';
import LanguageSwitcher from '../LanguageSwitcher';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import InstallBanner from './InstallBanner';

export default function PatientLayout({ children }) {
  const { patientUser, logoutPatient } = usePatientPortal();
  const { t } = useTranslation();  // ← ADD
  const location  = useLocation();
  const navigate  = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ← Nav items moved INSIDE component so t() works reactively
  const navItems = [
    { path: '/patient/dashboard',    label: t('patient_nav.dashboard'),   icon: LayoutDashboard },
    { path: '/patient/diet-charts',  label: t('patient_nav.dietCharts'),  icon: Utensils        },
    { path: '/patient/prakriti',     label: t('patient_nav.prakriti'),    icon: Leaf            },
    { path: '/patient/progress',     label: t('patient_nav.progress'),    icon: TrendingUp      },
    { path: '/patient/appointments', label: t('patient_nav.appointments'),icon: Calendar        },
  ];

  const handleLogout = () => {
    logoutPatient();
    navigate('/patient/login');
  };

  const initials = patientUser?.name
    ?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'P';

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAFAF5]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-64
        transform transition-transform duration-300 md:transform-none
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex flex-col h-full bg-gradient-to-b from-purple-900 to-purple-800">
          {/* Logo Section */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Leaf className="w-6 h-6 text-purple-200" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-white">AyuCare</h1>
              <p className="text-xs text-purple-200/70">{t('patient_nav.portalLabel')}</p>
            </div>
            <button
              className="md:hidden ml-auto text-white/80 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav links: Added 'overflow-y-auto' so links scroll if list is long */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
            {navItems.map(item => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg
                    transition-colors text-sm font-medium
                    ${isActive ? 'bg-white/15 text-white' : 'text-purple-200 hover:bg-white/10 hover:text-white'}
                  `}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{item.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>

          {/* User Section: shrink-0 ensures it stays at the bottom */}
          <div className="px-4 py-4 border-t border-white/10 space-y-2 shrink-0">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5">
              <Avatar className="w-9 h-9 shrink-0">
                <AvatarFallback className="bg-purple-400 text-white text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{patientUser?.name}</p>
                <p className="text-xs text-purple-200/60">{t('patient_nav.patientLabel')}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg
                text-sm text-purple-200 hover:bg-white/10 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('common.logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* 3. Main Content Area: Takes up remaining width and manages its own scroll */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-stone-200 shrink-0">
          <div className="flex items-center justify-between px-3 md:px-6 h-16">
            <button
              className="md:hidden p-2 text-stone-600 hover:bg-stone-100 rounded-lg"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>

            <p className="hidden sm:block text-sm font-medium text-stone-500">
              {navItems.find(n => location.pathname.startsWith(n.path))?.label ?? 'AyuCare'}
            </p>

            <div className="flex items-center gap-1 md:gap-3">
              <LanguageSwitcher />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-1 md:px-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-purple-600 text-white text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline text-sm font-medium">
                      {patientUser?.name}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />{t('common.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <InstallBanner />

        {/* 4. The actual scrollable content area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Utensils,
  Apple,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Leaf,
} from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/patients', label: 'Patients', icon: Users },
  { path: '/foods', label: 'Food Database', icon: Apple },
  { path: '/diet-charts', label: 'Diet Charts', icon: Utensils },
  { path: '/recipes', label: 'Recipes', icon: FileText },
];

export const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'AC';
  };

  return (
    <div className="flex min-h-screen bg-[#FAFAF5]">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          data-testid="sidebar-overlay"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out md:transform-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        data-testid="sidebar"
      >
        <div className="sidebar flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Leaf className="w-6 h-6 text-[#90A955]" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-white">AyuCare</h1>
              <p className="text-xs text-[#E1EDE5]/60">Ayurvedic Diet Management</p>
            </div>
            <button
              className="md:hidden ml-auto text-white/80 hover:text-white"
              onClick={() => setSidebarOpen(false)}
              data-testid="close-sidebar-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || 
                              location.pathname.startsWith(item.path + '/');
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                  data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="px-4 py-4 border-t border-white/10">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5">
              <Avatar className="w-9 h-9">
                <AvatarFallback className="bg-[#D4A373] text-white text-sm">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-[#E1EDE5]/60 truncate">{user?.role}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-stone-200">
          <div className="flex items-center justify-between px-4 md:px-6 h-16">
            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 -ml-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg"
              onClick={() => setSidebarOpen(true)}
              data-testid="open-sidebar-btn"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Page title (mobile) */}
            <div className="md:hidden">
              <h2 className="font-serif font-semibold text-stone-800">
                {navItems.find(item => location.pathname.startsWith(item.path))?.label || 'AyuCare'}
              </h2>
            </div>

            {/* Spacer */}
            <div className="hidden md:block" />

            {/* User dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2" data-testid="user-menu-btn">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary-700 text-white text-xs">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline text-sm font-medium">{user?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate('/settings')} data-testid="settings-menu-item">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600" data-testid="logout-menu-item">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;

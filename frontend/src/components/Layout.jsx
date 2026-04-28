import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, Utensils, Apple, FileText, Settings, LogOut,
  Menu, X, Leaf, MessageCircle, Send, Bot, User,
  Minimize2, Loader2, Calendar,Sparkles
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from './ui/dropdown-menu';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// --- Chatbot Component ---
const navItems = [
  { path: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { path: '/patients',    label: 'Patients',      icon: Users           },
  { path: '/foods',       label: 'Food Database', icon: Apple           },
  { path: '/diet-charts', label: 'Diet Charts',   icon: Utensils        },
  { path: '/recipes',     label: 'Recipes',       icon: FileText        },
];
 
const SUGGESTED = [
  "What foods reduce Pitta in summer?",
  "Best foods for a Vata-dominant patient?",
  "Which foods to avoid in Varsha season?",
  "Suggest a light dinner for Kapha dosha",
  "What spices improve digestion in Ayurveda?",
  "Iron-rich Ayurvedic foods for women?",
];
 
function ChatMessage({ msg }) {
  const isBot = msg.role === 'assistant';
  return (
    <div className={`flex gap-2.5 ${isBot ? '' : 'flex-row-reverse'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isBot ? 'bg-green-100' : 'bg-primary-100'}`}>
        {isBot ? <Bot className="w-4 h-4 text-green-700" /> : <User className="w-4 h-4 text-primary-700" />}
      </div>
      <div className={`max-w-[82%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
        isBot
          ? 'bg-white border border-stone-100 text-stone-700 rounded-tl-sm shadow-sm'
          : 'bg-primary-600 text-white rounded-tr-sm'
      }`}>
        {msg.content}
      </div>
    </div>
  );
}
 
function AyuChatbot() {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [hasNew, setHasNew]     = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
 
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (open) { setTimeout(() => inputRef.current?.focus(), 100); setHasNew(false); } }, [open]);
 
  const sendMessage = async (text) => {
    const content = (text || input).trim();
    if (!content || loading) return;
 
    const userMsg = { role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
 
    try {
      const token = localStorage.getItem('ayucare_token');
      const res = await fetch(`${BACKEND_URL}/api/ayuchat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          message: content,
          history: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      if (!open) setHasNew(true);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I couldn't connect. Please check if the backend is running.",
      }]);
    } finally {
      setLoading(false);
    }
  };
 
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };
 
  return (
    <>
      {/* Chat window */}
      {open && (
        <div className="fixed bottom-20 right-4 md:right-6 z-50 w-[340px] md:w-[380px] flex flex-col" style={{ height: '520px' }}>
          <div className="flex flex-col h-full rounded-2xl shadow-2xl overflow-hidden border border-stone-200 bg-white">
 
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary-700 to-primary-600">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Leaf className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">AyuAssist</p>
                  <p className="text-xs text-white/70">Ayurvedic Diet Copilot </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button onClick={() => setMessages([])}
                    className="text-white/70 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors">
                    Clear
                  </button>
                )}
                <button onClick={() => setOpen(false)}
                  className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
 
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col justify-center">
                  <div className="text-center mb-5">
                    <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="w-7 h-7 text-green-600" />
                    </div>
                    <p className="text-sm font-semibold text-stone-700">Ask me anything about</p>
                    <p className="text-sm text-stone-500">Ayurvedic diet & nutrition</p>
                  </div>
                  <div className="space-y-2">
                    {SUGGESTED.map((s, i) => (
                      <button key={i} onClick={() => sendMessage(s)}
                        className="w-full text-left text-xs px-3 py-2 rounded-xl bg-white border border-stone-200 text-stone-600 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 transition-all">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => <ChatMessage key={i} msg={msg} />)}
                  {loading && (
                    <div className="flex gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-green-700" />
                      </div>
                      <div className="px-3 py-2.5 bg-white border border-stone-100 rounded-2xl rounded-tl-sm shadow-sm">
                        <div className="flex gap-1 items-center h-4">
                          <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </>
              )}
            </div>
 
            {/* Input */}
            <div className="px-3 py-3 bg-white border-t border-stone-100">
              <div className="flex items-end gap-2">
                <textarea ref={inputRef} value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about Ayurvedic diet..."
                  rows={1} disabled={loading}
                  className="flex-1 resize-none text-sm px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-200 disabled:opacity-50 max-h-24 leading-relaxed"
                  style={{ minHeight: '38px' }}
                />
                <button onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="w-9 h-9 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:bg-stone-200 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0">
                  {loading
                    ? <Loader2 className="w-4 h-4 text-stone-400 animate-spin" />
                    : <Send className="w-4 h-4 text-white" />}
                </button>
              </div>
              <p className="text-xs text-stone-400 mt-1.5 text-center">
                Ayurvedic knowledge base
              </p>
            </div>
          </div>
        </div>
      )}
 
      {/* FAB */}
      <button onClick={() => setOpen(o => !o)}
        className="fixed bottom-4 right-4 md:right-6 z-50 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        style={{
          width: '52px', height: '52px',
          background: open
            ? 'linear-gradient(135deg, #4a7c59, #2F5233)'
            : 'linear-gradient(135deg, #5a9068, #3a6b47)',
        }}
        title="AyuAssist — Ayurvedic diet copilot">
        {open
          ? <X className="w-5 h-5 text-white" />
          : <div className="relative">
              <MessageCircle className="w-6 h-6 text-white" />
              {hasNew && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />}
            </div>}
      </button>
    </>
  );
}

// --- Main Layout Component ---
const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const navItems = [
    { path: '/dashboard',    label: t('nav.dashboard'),    icon: LayoutDashboard },
    { path: '/patients',     label: t('nav.patients'),     icon: Users },
    { path: '/foods',        label: t('nav.foods'),        icon: Apple },
    { path: '/diet-charts',  label: t('nav.dietCharts'),   icon: Utensils },
    { path: '/recipes',      label: t('nav.recipes'),      icon: FileText },
    { path: '/herbs',        label: t('nav.herbs'),        icon: Leaf },
    { path: '/appointments', label: t('nav.appointments'), icon: Calendar },
    { path: '/settings',     label: t('nav.settings'),     icon: Settings },
  ];

  const getInitials = (name) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'AC';

  return (
    <div className="flex h-screen bg-[#FAFAF5] overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar - Always Fixed */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#2F5233] text-white transform transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <Leaf className="w-6 h-6 text-[#90A955]" />
          <span className="text-xl font-bold font-serif">AyuCare</span>
        </div>
        <nav className="p-4 space-y-1 h-[calc(100vh-88px)] overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Content Area - Always on the right */}
      <div className="flex-1 flex flex-col w-full md:ml-64">
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 md:px-8 flex-shrink-0">
          <button className="md:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu />
          </button>
          <div className="hidden md:block" />

          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary-700 text-white">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{user?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('common.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>

      <AyuChatbot />
    </div>
  );
};

export default Layout;
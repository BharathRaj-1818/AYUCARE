import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { 
  User, 
  Mail, 
  Calendar,
  Shield,
  LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
    <div className="max-w-2xl mx-auto space-y-6" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-primary-800">Settings</h1>
        <p className="text-stone-600 mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-serif flex items-center gap-2">
            <User className="w-5 h-5 text-primary-600" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20">
              <AvatarFallback className="bg-primary-700 text-white text-xl">
                {getInitials(user?.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-semibold text-stone-800">{user?.name}</h3>
              <p className="text-stone-500 capitalize">{user?.role}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-stone-400" />
              <div>
                <p className="text-sm text-stone-500">Email</p>
                <p className="font-medium text-stone-800">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-stone-400" />
              <div>
                <p className="text-sm text-stone-500">Role</p>
                <p className="font-medium text-stone-800 capitalize">{user?.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-stone-400" />
              <div>
                <p className="text-sm text-stone-500">Account Created</p>
                <p className="font-medium text-stone-800">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-lg font-serif text-red-600">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-stone-800">Sign Out</p>
              <p className="text-sm text-stone-500">
                Sign out of your account on this device
              </p>
            </div>
            <Button 
              variant="destructive"
              onClick={handleLogout}
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card>
        <CardContent className="p-6 text-center">
          <h3 className="font-serif font-semibold text-primary-800">AyuCare</h3>
          <p className="text-sm text-stone-500 mt-1">
            Ayurvedic Diet Management Software
          </p>
          <p className="text-xs text-stone-400 mt-2">Version 1.0.0</p>
        </CardContent>
      </Card>
    </div>
  );
}

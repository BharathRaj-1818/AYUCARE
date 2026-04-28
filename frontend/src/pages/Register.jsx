import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Leaf, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Register() {
  const [name, setName]                   = useState('');
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]   = useState(false);
  const [loading, setLoading]             = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !email || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      const message = error.response?.data?.detail || 'Registration failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen hero-gradient flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-secondary-200/30 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-700 shadow-elevated mb-4">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-primary-800">AyuCare</h1>
          <p className="text-stone-600 mt-1">Join the holistic healthcare revolution</p>
        </div>

        <Card className="shadow-elevated border-0 animate-fade-in stagger-1" data-testid="register-card">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-serif text-center">Create Account</CardTitle>
            <CardDescription className="text-center">
              Start managing Ayurvedic diet plans today
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit} autoComplete="off">
            <CardContent className="space-y-4">

              {/* Hidden dummy fields — tricks Chrome/Safari into not autofilling real fields */}
              <input type="text"     style={{ display: 'none' }} aria-hidden="true" readOnly />
              <input type="password" style={{ display: 'none' }} aria-hidden="true" readOnly />

              <div className="space-y-2">
                <Label htmlFor="reg_name">Full Name</Label>
                <Input
                  id="reg_name"
                  name="reg_name"
                  type="text"
                  placeholder="Dr. Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="new-password"
                  className="h-11"
                  data-testid="name-input"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg_email">Email</Label>
                <Input
                  id="reg_email"
                  name="reg_email"
                  type="email"
                  placeholder="doctor@ayucare.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="new-password"
                  className="h-11"
                  data-testid="email-input"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg_password">Password</Label>
                <div className="relative">
                  <Input
                    id="reg_password"
                    name="reg_password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className="h-11 pr-10"
                    data-testid="password-input"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg_confirm">Confirm Password</Label>
                <Input
                  id="reg_confirm"
                  name="reg_confirm"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="h-11"
                  data-testid="confirm-password-input"
                  disabled={loading}
                />
              </div>

            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full h-11 ayur-btn-primary"
                disabled={loading}
                data-testid="register-submit-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
              <p className="text-sm text-center text-stone-600">
                Already have an account?{' '}
                <Link to="/login" className="text-primary-700 hover:text-primary-800 font-medium">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-sm text-stone-500 mt-8 animate-fade-in stagger-2">
          By creating an account, you agree to our terms of service
        </p>
      </div>
    </div>
  );
}
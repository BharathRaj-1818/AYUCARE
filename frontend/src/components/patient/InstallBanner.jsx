// src/components/patient/InstallBanner.jsx
import { useState } from 'react';
import { usePWA } from '../../hooks/usePWA';
import { X, Download, ChevronRight } from 'lucide-react';

export default function InstallBanner() {
  const { isInstallable, isInstalled, installApp } = usePWA();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('ayucare_pwa_dismissed') === 'true'
  );
  const [installing, setInstalling] = useState(false);

  if (isInstalled || !isInstallable || dismissed) return null;

  const handleInstall = async () => {
    setInstalling(true);
    await installApp();
    setInstalling(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('ayucare_pwa_dismissed', 'true');
    setDismissed(true);
  };

  return (
    <div className="relative overflow-hidden">
      <div className="bg-gradient-to-r from-purple-800 via-purple-700 to-purple-600 px-4 py-3 shadow-md">

        {/* Decorative background circles */}
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/5 rounded-full pointer-events-none" />
        <div className="absolute -bottom-6 right-16 w-16 h-16 bg-white/5 rounded-full pointer-events-none" />

        <div className="relative flex items-center gap-3 max-w-4xl mx-auto">

          {/* App icon with fallback */}
          <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden shadow-lg border-2 border-white/20 bg-purple-500 flex items-center justify-center">
            <img
              src="/icons/icon-192x192.png"
              alt="AyuCare"
              className="w-full h-full object-cover"
              onError={e => { e.target.style.display = 'none'; }}
            />
            <span className="text-white text-xl font-bold font-serif absolute">A</span>
          </div>

          {/* Text content */}
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight">
              Install AyuCare App
            </p>
            <p className="text-purple-200 text-xs mt-0.5 leading-tight">
              Add to home screen • Works offline • No app store needed
            </p>
          </div>

          {/* Install button */}
          <button
            onClick={handleInstall}
            disabled={installing}
            className="shrink-0 flex items-center gap-1.5 bg-white text-purple-700
              font-semibold text-xs px-3 py-2 rounded-xl shadow-md
              hover:bg-purple-50 active:scale-95 transition-all disabled:opacity-70"
          >
            {installing ? (
              <>
                <div className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                <span>Installing…</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Install</span>
              </>
            )}
          </button>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="shrink-0 p-1 text-white/50 hover:text-white/90 transition-colors"
            aria-label="Dismiss install banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* iOS Safari instructions — Safari doesn't support beforeinstallprompt */}
        {/iPad|iPhone|iPod/.test(navigator.userAgent) && (
          <div className="relative mt-2 flex items-center gap-1.5 text-purple-200 text-xs px-1">
            <ChevronRight className="w-3 h-3 shrink-0" />
            <span>
              On iPhone: tap <strong>Share ⬆️</strong> → <strong>Add to Home Screen</strong> in Safari
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
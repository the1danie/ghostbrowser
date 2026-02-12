import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import BrandMark from './BrandMark';
import { APP_NAME } from '../lib/brand';
import {
  LayoutDashboard,
  Globe,
  Settings,
  LogOut,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Profiles' },
  { to: '/proxies', icon: Globe, label: 'Proxies' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <aside className="w-60 bg-ghost-950 border-r border-ghost-700 flex flex-col h-screen">
      {/* Logo — область перетаскивания окна (Electron hiddenInset) */}
      <div
        className="flex items-center gap-2 px-5 pt-8 pb-5 border-b border-ghost-700"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <BrandMark className="w-7 h-7 shrink-0" />
        <span className="text-lg font-bold text-gray-100">{APP_NAME}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-ghost-800'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User / Sign out */}
      <div className="px-3 py-4 border-t border-ghost-700">
        <div className="text-xs text-gray-500 px-3 mb-2 truncate">{user?.email}</div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-200 hover:bg-ghost-800 transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

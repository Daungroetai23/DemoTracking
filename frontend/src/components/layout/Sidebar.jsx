import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';
import { getRoleLabel } from '../../utils/helpers';
import {
  LayoutDashboard,
  Package,
  ArrowRightLeft,
  Calendar,
  Users,
  Bell,
  UserCheck,
  Settings,
  X,
  LogOut,
} from 'lucide-react';

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const [badgeCount, setBadgeCount] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.get('/dashboard/stats');
        if (data && data.notifications) {
          setBadgeCount(data.notifications.filter(n => n.type === 'success').length); // count available notifications only if desired, or total
        }
      } catch (err) {
        console.error('Failed to fetch notification badge count', err);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 20000); // refresh every 20 seconds
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'แดชบอร์ด' },
    { to: '/assets', icon: Package, label: 'อุปกรณ์' },
    { to: '/transactions', icon: ArrowRightLeft, label: 'ยืม-คืน' },
    { to: '/calendar', icon: Calendar, label: 'ปฏิทิน' },
    { to: '/history', icon: Users, label: 'ประวัติการยืม' },
    { to: '/notifications', icon: Bell, label: 'พร้อมใช้งาน', badge: badgeCount },
    { to: '/users', icon: UserCheck, label: 'ผู้ใช้งาน' },
    { to: '/settings', icon: Settings, label: 'ตั้งค่า' },
  ];

  // Filter menu items by user role
  const filteredNavItems = navItems.filter(item => {
    if (!user) return true;
    if (user.role === 'SALES' || user.role === 'IT_SUPPORT') {
      return item.to !== '/users';
    }
    return true;
  });

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out border-r border-slate-800
          ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/40">
              <Package className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">DemoTracking</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Active User Card at Bottom */}
        {user && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-white border border-slate-600 overflow-hidden font-bold">
                {user.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate max-w-[120px]">{user.name}</p>
                <p className="text-[10px] text-slate-500 truncate">
                  {getRoleLabel(user.role)}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-red-950/30 text-slate-400 hover:text-red-400 transition-colors"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Menu, Bell, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';

export default function Navbar({ onToggleSidebar }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchNotifications = async () => {
    try {
      const data = await api.get('/dashboard/stats');
      if (data && data.notifications) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error('Failed to fetch notifications in Navbar', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000); // sync every 20s
    return () => clearInterval(interval);
  }, []);

  // Determine current page info
  const getPageInfo = () => {
    const path = location.pathname;
    if (path === '/') {
      return { title: 'Dashboard', subtitle: 'ภาพรวมการใช้งานระบบ' };
    }
    if (path.startsWith('/assets/')) {
      return { title: 'Asset Detail', subtitle: 'รายละเอียดอุปกรณ์ประจำเครื่อง' };
    }
    if (path === '/assets') {
      return { title: 'Assets', subtitle: 'จัดการอุปกรณ์ทั้งหมด' };
    }
    if (path === '/transactions') {
      return { title: 'Borrow / Return', subtitle: 'จัดการทำรายการยืม-คืนอุปกรณ์' };
    }
    if (path === '/calendar') {
      return { title: 'Calendar', subtitle: 'ปฏิทินกำหนดส่งคืนอุปกรณ์' };
    }
    if (path === '/history') {
      return { title: 'Borrow History', subtitle: 'ประวัติการยืมและรายงานการใช้งาน' };
    }
    if (path === '/notifications') {
      return { title: 'Notifications', subtitle: 'ความพร้อมใช้งานของอุปกรณ์' };
    }
    if (path === '/users') {
      return { title: 'Users', subtitle: 'จัดการผู้ใช้งานระบบ' };
    }
    if (path === '/settings') {
      return { title: 'Settings', subtitle: 'ตั้งค่าระบบและบัญชีผู้ใช้งาน' };
    }
    return { title: 'DemoTracking', subtitle: 'ระบบจัดการอุปกรณ์เดโม' };
  };

  const { title, subtitle } = getPageInfo();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-4 lg:px-6">
      {/* Left: Hamburger menu on mobile, Title on Desktop */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:block">
          <h2 className="text-lg font-bold text-slate-800 leading-none">{title}</h2>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">{subtitle}</p>
        </div>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-4">
        {/* Notifications Dropdown Container */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </button>

          {showDropdown && (
            <>
              {/* Invisible background overlay to handle outside click closing */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowDropdown(false)} 
              />
              
              {/* Dropdown Tray */}
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden">
                <div className="p-3.5 border-b border-slate-50 flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-blue-500" />
                    การแจ้งเตือน ({notifications.length})
                  </h4>
                  {notifications.length > 0 && (
                    <span className="text-[9px] font-bold text-slate-400">ล่าสุด</span>
                  )}
                </div>
                
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                  {notifications.length === 0 ? (
                    <p className="text-center text-slate-400 text-[10px] font-bold py-6">
                      ไม่มีรายการแจ้งเตือนในขณะนี้
                    </p>
                  ) : (
                    notifications.slice(0, 5).map((notif, idx) => (
                      <div
                        key={idx}
                        className="p-3 hover:bg-slate-50/50 cursor-pointer transition-colors text-[10px] leading-relaxed text-slate-700 font-semibold flex gap-2"
                        onClick={() => {
                          setShowDropdown(false);
                          navigate('/notifications');
                        }}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0
                          ${notif.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'}
                        `} />
                        <p className="line-clamp-2">{notif.message}</p>
                      </div>
                    ))
                  )}
                </div>
                
                <Link
                  to="/notifications"
                  onClick={() => setShowDropdown(false)}
                  className="block text-center py-2.5 bg-slate-50 hover:bg-slate-100 text-[10px] font-bold text-slate-500 hover:text-slate-700 transition-colors border-t border-slate-100"
                >
                  ดูการแจ้งเตือนทั้งหมด
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Vertical divider */}
        <div className="h-6 w-[1px] bg-slate-200" />

        {/* Profile Dropdown */}
        {user && (
          <div className="flex items-center gap-2.5">
            <div className="text-right hidden md:block">
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-slate-700">{user.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white border border-white shadow-sm overflow-hidden text-xs font-bold">
              {user.name.charAt(0)}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, RefreshCw, Info, Eye, ArrowRightLeft, CheckCircle2 } from 'lucide-react';
import api from '../api/client';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await api.get('/dashboard/stats');
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Failed to load notifications list', err);
    } finally {
      setLoading(false);
    }
  };

  // Extract asset code from text message helper to perform navigation action
  const extractAssetCode = (message) => {
    const match = message.match(/\(([^)]+)\)/);
    return match ? match[1] : '';
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-5 rounded-3xl border border-slate-100 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-800">สถานะและความพร้อมใช้งาน</h1>
            <p className="text-[10px] text-slate-400 font-bold">แสดงอุปกรณ์ที่ว่างพร้อมใช้งานในระบบ และเครื่องที่อยู่ระหว่างส่งซ่อม</p>
          </div>
        </div>

        <button
          onClick={loadNotifications}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors self-end sm:self-center bg-white"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          อัปเดตสถานะ
        </button>
      </div>

      {/* Notifications list grid */}
      {notifications.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-sm">
          <Bell className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-bold">ไม่มีการแจ้งเตือนอุปกรณ์ในขณะนี้</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notif, idx) => {
            const assetCode = extractAssetCode(notif.message);
            
            // Icon and theme config based on type
            let cardStyle = 'bg-blue-50/20 border-blue-100 text-blue-800';
            let icon = <Info className="w-5 h-5 text-blue-500 shrink-0" />;
            let label = 'แจ้งข้อมูล';
            
            if (notif.type === 'success') {
              cardStyle = 'bg-emerald-50/30 border-emerald-100 text-emerald-800';
              icon = <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
              label = 'พร้อมใช้งาน';
            } else if (notif.type === 'info') {
              cardStyle = 'bg-blue-50/30 border-blue-100 text-blue-800';
              icon = <Info className="w-5 h-5 text-blue-500 shrink-0" />;
              label = 'ส่งซ่อมบำรุง';
            }

            return (
              <div
                key={idx}
                className={`p-5 rounded-3xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm transition-all hover:shadow-md ${cardStyle}`}
              >
                <div className="flex items-start gap-3.5">
                  {icon}
                  <div className="space-y-1">
                    <p className="text-xs font-black leading-relaxed">{notif.message}</p>
                    <span className="inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/60 border border-slate-200/50 text-slate-500">
                      {label}
                    </span>
                  </div>
                </div>

                {/* Quick actions */}
                {assetCode && (
                  <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 border-t border-slate-100/50 md:border-t-0 pt-3 md:pt-0">
                    <button
                      onClick={async () => {
                        try {
                          const assetData = await api.get(`/assets/${assetCode}`);
                          if (assetData && assetData.id) {
                            navigate(`/assets/${assetData.id}`);
                          }
                        } catch (err) {
                          alert('ไม่พบข้อมูลรหัสอุปกรณ์ในระบบ');
                        }
                      }}
                      className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-[10px] font-bold text-slate-700 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      ดูรายละเอียด
                    </button>
                    
                    {notif.type === 'success' && (
                      <button
                        onClick={() => navigate('/transactions', { state: { scanCode: assetCode } })}
                        className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold transition-all shadow-md shadow-blue-100"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        ทำเรื่องยืม
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, CheckCircle, ArrowRightLeft, Wrench, AlertTriangle, Info, BarChart3, ArrowUpRight, Filter } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../api/client';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatDateShort, PLACEHOLDER_IMAGE } from '../utils/helpers';

const PIE_COLORS = ['#10b981', '#a855f7', '#ef4444']; // emerald, purple, red/rose

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trendFilter, setTrendFilter] = useState('all'); // 'all' or 'hasData'

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await api.get('/dashboard/stats');
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-center py-12 text-red-500">{error}</div>;
  if (!stats) return null;

  const { summary, statusDistribution, borrowTrends, recentTransactions, notifications } = stats;

  const filteredTrends = trendFilter === 'hasData'
    ? borrowTrends.filter(t => t.count > 0)
    : borrowTrends;

  return (
    <div className="space-y-6">
      {/* Link Header Banner to Statistics */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 rounded-3xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black">ภาพรวมระบบ DemoTrack</h2>
          <p className="text-xs text-blue-100 font-medium mt-1">ข้อมูลสถานะอุปกรณ์และการยืม-คืน อัปเดตล่าสุดเรียลไทม์</p>
        </div>
        <button
          onClick={() => navigate('/history?tab=report')}
          className="px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs flex items-center gap-2 backdrop-blur-sm transition-all shadow-sm shrink-0"
        >
          <BarChart3 className="w-4 h-4 text-blue-200" />
          <span>ไปยังหน้าสถิติและรายงาน</span>
          <ArrowUpRight className="w-4 h-4 text-blue-200" />
        </button>
      </div>

      {/* Stat Cards (Clickable to navigate to Statistics/Assets) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div onClick={() => navigate('/assets')} className="cursor-pointer">
          <StatCard
            title="ทั้งหมด"
            value={summary.total}
            progress={100}
            subtitle="100%"
            icon={Package}
            color="primary"
          />
        </div>
        <div onClick={() => navigate('/assets?status=READY')} className="cursor-pointer">
          <StatCard
            title="พร้อมใช้งาน"
            value={summary.ready.count}
            progress={summary.ready.percent}
            subtitle={`${summary.ready.percent}%`}
            icon={CheckCircle}
            color="emerald"
          />
        </div>
        <div onClick={() => navigate('/history?tab=report')} className="cursor-pointer">
          <StatCard
            title="ถูกยืม"
            value={summary.borrowed.count}
            progress={summary.borrowed.percent}
            subtitle={`${summary.borrowed.percent}%`}
            icon={ArrowRightLeft}
            color="amber"
          />
        </div>
        <div onClick={() => navigate('/assets?status=MAINTENANCE')} className="cursor-pointer">
          <StatCard
            title="ซ่อมบำรุง"
            value={summary.maintenance.count}
            progress={summary.maintenance.percent}
            subtitle={`${summary.maintenance.percent}%`}
            icon={Wrench}
            color="red"
          />
        </div>
      </div>

      {/* Middle Row: Pie Chart & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart — Status Distribution */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">สัดส่วนสถานะอุปกรณ์</h3>
          <div className="relative flex justify-center items-center h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  dataKey="value"
                  paddingAngle={4}
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '12px' }}
                  formatter={(v) => [`${v} รายการ`]}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center percentage label */}
            <div className="absolute text-center">
              <p className="text-2xl font-black text-slate-800">{summary.ready.count}</p>
              <p className="text-[10px] font-bold text-slate-400">พร้อมใช้งาน</p>
            </div>
          </div>

          {/* Custom Legend */}
          <div className="space-y-2 mt-4">
            {statusDistribution.map((item, idx) => {
              const percentages = [
                summary.ready.percent,
                summary.borrowed.percent,
                summary.maintenance.percent,
              ];
              return (
                <div key={item.name} className="flex items-center justify-between text-xs text-slate-600 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx] }} />
                    <span>{item.name}</span>
                  </div>
                  <span className="text-slate-400 font-bold">{item.value} ({percentages[idx]}%)</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Transactions list */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col justify-between overflow-visible">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-4">การยืม-คืนล่าสุด</h3>
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-12">ยังไม่มีรายการทำธุรกรรม</p>
            ) : (
              <div className="overflow-visible">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold pb-2">
                      <th className="py-2">อุปกรณ์</th>
                      <th className="py-2">รหัส/ชื่ออุปกรณ์</th>
                      <th className="py-2 text-center">สถานะ</th>
                      <th className="py-2">ชื่อลูกค้า</th>
                      <th className="py-2 text-right">วันที่ยืม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.map((t) => (
                      <tr key={t.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="py-2 flex items-center gap-3">
                          <div className="relative group cursor-zoom-in hover:z-[90]">
                            <img
                              src={t.asset?.images?.[0]?.imageUrl || t.asset?.imageUrl || PLACEHOLDER_IMAGE}
                              alt="thumbnail"
                              className="w-10 h-7 rounded object-cover border border-slate-100 shadow-sm animate-pulse"
                              onLoad={(e) => e.target.classList.remove('animate-pulse')}
                            />
                            <div className="absolute hidden group-hover:flex items-center justify-center z-[100] bottom-full left-1/2 mb-2 p-1.5 bg-white/95 backdrop-blur-sm border border-slate-150 rounded-2xl shadow-2xl pointer-events-none w-48 h-36 origin-bottom animate-tooltip-in">
                              <img
                                src={t.asset?.images?.[0]?.imageUrl || t.asset?.imageUrl || PLACEHOLDER_IMAGE}
                                alt="preview"
                                className="max-w-full max-h-full object-contain rounded-xl"
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-2 font-medium">
                          <p className="text-slate-800 font-bold">{t.asset?.assetCode}</p>
                          <p className="text-[10px] text-slate-400 font-semibold truncate max-w-[200px]">{t.asset?.name}</p>
                        </td>
                        <td className="py-2 text-center">
                          <StatusBadge status={t.status} type="transaction" />
                        </td>
                        <td className="py-2 font-semibold text-slate-600">
                          {t.borrowerName}
                        </td>
                        <td className="py-2 text-right text-slate-500 font-bold">
                          {formatDateShort(t.borrowDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Trends Chart & Warnings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart — Trends */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-bold text-slate-800">กราฟการยืมในช่วง 7 วันที่ผ่านมา</h3>
            
            {/* Filter Toggle Controls for 7-Day Graph */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
              <button
                onClick={() => setTrendFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  trendFilter === 'all'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                แสดงทั้งหมด (7 วัน)
              </button>
              <button
                onClick={() => setTrendFilter('hasData')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  trendFilter === 'hasData'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                แสดงเฉพาะวันที่มีข้อมูล
              </button>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={filteredTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '11px', fontWeight: 600 }}
                formatter={(v) => [`${v} รายการ`, 'จำนวนการยืม']}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 4, stroke: '#2563eb', strokeWidth: 2, fill: '#ffffff' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Alerts panel */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            แจ้งเตือน
          </h3>
          {notifications.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-12">ไม่มีการแจ้งเตือนอุปกรณ์</p>
          ) : (
            <div className="space-y-3 max-h-[230px] overflow-y-auto pr-1">
              {notifications.map((n, idx) => {
                const config = {
                  danger: { bg: 'bg-rose-50 border-rose-100', icon: AlertTriangle, iconColor: 'text-rose-500' },
                  warning: { bg: 'bg-amber-50 border-amber-100', icon: AlertTriangle, iconColor: 'text-amber-500' },
                  success: { bg: 'bg-emerald-50 border-emerald-100', icon: CheckCircle, iconColor: 'text-emerald-500' },
                  info: { bg: 'bg-blue-50 border-blue-100', icon: Info, iconColor: 'text-blue-500' },
                }[n.type] || { bg: 'bg-slate-50 border-slate-100', icon: Info, iconColor: 'text-slate-400' };

                return (
                  <div key={idx} className={`flex gap-3 p-3.5 rounded-xl border ${config.bg} shadow-sm`}>
                    <config.icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.iconColor}`} />
                    <p className="text-xs font-semibold text-slate-700 leading-relaxed">{n.message}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Search, Users, FileText, CheckCircle, Clock, Eye, X, Trash2, Calendar, Download, Building2, HardDrive } from 'lucide-react';
import api from '../api/client';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import StatusBadge from '../components/ui/StatusBadge';
import { formatDateShort, getLocalDateString } from '../utils/helpers';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import MapLinkButton from '../components/ui/MapLinkButton';
import { useAuth } from '../contexts/AuthContext';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#6366f1', '#14b8a6'];

export default function BorrowHistoryPage() {
  const { user } = useAuth();
  const location = useLocation();
  const queryTab = new URLSearchParams(location.search).get('tab');
  const [activeSection, setActiveSection] = useState(queryTab === 'report' ? 'report' : 'history'); // 'history' or 'report'
  const [borrowers, setBorrowers] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal
  const [selectedBorrower, setSelectedBorrower] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Report date range
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return getLocalDateString(d);
  });
  const [endDate, setEndDate] = useState(() => getLocalDateString(new Date()));

  useEffect(() => {
    if (queryTab === 'report') {
      setActiveSection('report');
    }
  }, [queryTab]);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [borrowersData, analyticsData] = await Promise.all([
        api.get('/transactions/borrowers'),
        api.get(`/reports/analytics?startDate=${startDate}&endDate=${endDate}`)
      ]);
      setBorrowers(borrowersData);
      setReportData(analyticsData);
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const data = await api.get(`/reports/analytics?startDate=${startDate}&endDate=${endDate}`);
      setReportData(data);
    } catch (err) {
      console.error('Failed to load analytics', err);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete('/transactions/borrowers', {
        data: {
          name: deleteTarget.name,
          organization: deleteTarget.organization
        }
      });
      setDeleteTarget(null);
      loadAll();
    } catch (err) {
      alert(err.message || 'เกิดข้อผิดพลาดในการลบข้อมูลลูกค้า');
    }
  };

  const filteredBorrowers = borrowers.filter(b => {
    const term = search.toLowerCase();
    return b.name.toLowerCase().includes(term) || 
           (b.organization || '').toLowerCase().includes(term);
  });

  // Export to CSV with Equipment Usage Data
  const exportToCSV = () => {
    if (!reportData || reportData.transactions.length === 0) return;
    
    const headers = ['รหัสอุปกรณ์', 'ชื่ออุปกรณ์', 'หมวดหมู่', 'ชื่อลูกค้า', 'ทีมเซลล์', 'แผนก', 'หน่วยงาน', 'ระยะเวลาใช้งาน (วัน)', 'วันที่ยืม', 'กำหนดส่งคืน', 'สถานที่ส่งกลับ', 'สถานะ'];
    const rows = reportData.transactions.map(t => [
      t.assetCode,
      t.assetName,
      t.category,
      t.borrowerName,
      t.salesTeam || '-',
      t.department || '-',
      t.organization || '-',
      t.usageDays || 1,
      new Date(t.borrowDate).toLocaleDateString('th-TH'),
      new Date(t.dueDate).toLocaleDateString('th-TH'),
      t.returnLocation || '-',
      t.status
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `DemoTrack_Report_${startDate}_to_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      
      {/* Header + Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-5 rounded-3xl border border-slate-100 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-800">ประวัติการยืมและรายงาน</h1>
            <p className="text-[10px] text-slate-400 font-bold">ข้อมูลสรุปสถิติลูกค้าที่ยืมอุปกรณ์ และรายงานการใช้งาน</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSection('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeSection === 'history' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            ประวัติการยืม
          </button>
          <button
            onClick={() => setActiveSection('report')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeSection === 'report' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            รายงานและสถิติ
          </button>
        </div>
      </div>

      {activeSection === 'history' ? (
        <>
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อลูกค้า หรือหน่วยงาน..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold bg-white text-slate-700"
            />
          </div>

          {/* Borrowers Grid */}
          {filteredBorrowers.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-sm">
              <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-bold">ไม่พบข้อมูลรายชื่อลูกค้าในระบบ</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBorrowers.map((borrower, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-sm font-black text-slate-800 leading-tight">{borrower.name}</h3>
                        {borrower.organization && (
                          <p className="text-[11px] text-slate-400 font-semibold mt-1">{borrower.organization}</p>
                        )}
                        {borrower.salesTeam && (
                          <p className="text-[10px] text-blue-500 font-semibold mt-0.5">ทีม: {borrower.salesTeam}</p>
                        )}
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs">
                        {borrower.name.charAt(0)}
                      </div>
                    </div>

                    {/* Statistics */}
                    <div className="grid grid-cols-3 gap-2 border-t border-b border-slate-50 py-3.5 my-3.5">
                      <div className="text-center">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">ยืมสะสม</p>
                        <p className="text-sm font-black text-slate-700 mt-1 flex items-center justify-center gap-1">
                          <FileText className="w-3 h-3 text-slate-400" />
                          {borrower.totalBorrows}
                        </p>
                      </div>
                      <div className="text-center border-l border-r border-slate-50">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">กำลังยืม</p>
                        <p className="text-sm font-black text-blue-600 mt-1 flex items-center justify-center gap-1">
                          <CheckCircle className="w-3 h-3 text-blue-400" />
                          {borrower.activeBorrows}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">เกินกำหนดคืน</p>
                        <p className="text-sm font-black text-rose-600 mt-1 flex items-center justify-center gap-1">
                          <Clock className="w-3 h-3 text-rose-400 animate-pulse" />
                          {borrower.overdueBorrows}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedBorrower(borrower)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors bg-white"
                    >
                      <Eye className="w-4 h-4" />
                      ประวัติการยืมอุปกรณ์
                    </button>
                    {user?.role === 'ADMIN' && (
                      <button
                        onClick={() => setDeleteTarget(borrower)}
                        className="p-2.5 rounded-xl border border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors bg-white hover:border-red-100 flex items-center justify-center"
                        title="ลบข้อมูลลูกค้า"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Report Section */}
          {/* Date Range Selector */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5 text-slate-500" />
              ช่วงเวลาของรายงาน
            </h3>
            <form onSubmit={(e) => { e.preventDefault(); loadAnalytics(); }} className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span>เริ่มต้น:</span>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold bg-white text-slate-700" />
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span>สิ้นสุด:</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold bg-white text-slate-700" />
              </div>
              <button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-200">
                กรองรายงาน
              </button>
            </form>
          </div>

          {reportData && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                  <p className="text-xs font-bold text-slate-400">จำนวนครั้งการยืม</p>
                  <div className="flex items-baseline gap-1 mt-2.5">
                    <span className="text-3xl font-black text-slate-800">{reportData.summary.totalBorrows}</span>
                    <span className="text-xs text-slate-500 font-bold">ครั้ง</span>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                  <p className="text-xs font-bold text-slate-400">อุปกรณ์ที่ถูกยืมบ่อยสุด</p>
                  <p className="text-sm font-black text-slate-700 mt-3 truncate">{reportData.summary.mostBorrowedAsset}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                  <p className="text-xs font-bold text-slate-400">ลูกค้าที่ยืมบ่อยที่สุด</p>
                  <p className="text-sm font-black text-slate-700 mt-3 truncate">{reportData.summary.topBorrower}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                  <p className="text-xs font-bold text-slate-400">เกินกำหนดส่งคืน</p>
                  <div className="flex items-baseline gap-1 mt-2.5">
                    <span className="text-3xl font-black text-red-600">{reportData.summary.overdueCount}</span>
                    <span className="text-xs text-red-500 font-bold">รายการ</span>
                  </div>
                </div>
              </div>

              {/* Charts Row 1: Daily Activity & Category Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-wider">สถิติการยืมรายวัน</h3>
                  <div className="h-56">
                    {reportData.dailyActivity.length === 0 ? (
                      <p className="text-slate-400 text-xs text-center py-16">ไม่มีข้อมูล</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reportData.dailyActivity} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                          <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '11px', fontWeight: 600 }} formatter={(v) => [`${v} รายการ`, 'จำนวน']} />
                          <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-wider">สัดส่วนตามประเภทอุปกรณ์</h3>
                  <div className="relative flex justify-center items-center h-40">
                    {reportData.categoryDistribution.length === 0 ? (
                      <p className="text-slate-400 text-xs text-center py-12">ไม่มีข้อมูล</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={reportData.categoryDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" paddingAngle={3}>
                            {reportData.categoryDistribution.map((entry, index) => (
                              <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '11px', fontWeight: 600 }} formatter={(v) => [`${v} ครั้ง`]} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div className="space-y-2 mt-4">
                    {reportData.categoryDistribution.map((item, idx) => (
                      <div key={item.name} className="flex items-center justify-between text-xs text-slate-600 font-medium">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                          <span>{item.name}</span>
                        </div>
                        <span className="text-slate-400 font-bold">{item.value} ครั้ง</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Charts Row 2: Department / Organization Borrowing Stats (ข้อ 5) */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <h3 className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  สถิติการยืมของแต่ละหน่วยงาน / แผนก
                </h3>
                {!reportData.departmentDistribution || reportData.departmentDistribution.length === 0 ? (
                  <p className="text-slate-400 text-xs text-center py-8">ไม่มีข้อมูลการยืมรายหน่วยงาน</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {reportData.departmentDistribution.map((dept, index) => (
                      <div key={dept.name} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{dept.name}</p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">หน่วยงานที่ทำรายการ</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-black text-blue-600">{dept.value}</span>
                          <span className="text-[10px] text-slate-400 font-bold ml-1">ครั้ง</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Equipment Usage Stats Table (ข้อ 7) */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-50 pb-3 mb-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-blue-600" />
                    ข้อมูลสรุปการใช้งานอุปกรณ์ที่ถูกยืม (Usage Duration & Frequency)
                  </h3>
                </div>

                {!reportData.assetUsageStats || reportData.assetUsageStats.length === 0 ? (
                  <p className="text-slate-400 text-xs text-center py-8">ไม่มีข้อมูลการใช้งานอุปกรณ์</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-400 font-bold">
                          <th className="px-4 py-3">รหัสอุปกรณ์</th>
                          <th className="px-4 py-3">ชื่ออุปกรณ์</th>
                          <th className="px-4 py-3">หมวดหมู่</th>
                          <th className="px-4 py-3 text-center">จำนวนครั้งที่ถูกยืม</th>
                          <th className="px-4 py-3 text-center">ระยะเวลาใช้งานรวม (วัน)</th>
                          <th className="px-4 py-3">ผู้ยืมล่าสุด</th>
                          <th className="px-4 py-3 text-right">หน่วยงานล่าสุด</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.assetUsageStats.map((usage) => (
                          <tr key={usage.assetCode} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/30 transition-colors">
                            <td className="px-4 py-3 font-bold text-slate-700 font-mono">{usage.assetCode}</td>
                            <td className="px-4 py-3 font-semibold text-slate-800">{usage.assetName}</td>
                            <td className="px-4 py-3 font-semibold text-slate-500">{usage.category}</td>
                            <td className="px-4 py-3 text-center font-black text-blue-600">{usage.totalBorrows} ครั้ง</td>
                            <td className="px-4 py-3 text-center font-bold text-emerald-600">{usage.totalDaysUsed} วัน</td>
                            <td className="px-4 py-3 font-semibold text-slate-700">{usage.lastBorrower}</td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-500">{usage.lastDepartment}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Transaction Table */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-50 pb-3 mb-4">
                  <h3 className="text-sm font-bold text-slate-800">ประวัติการทำรายการยืม-คืนอุปกรณ์</h3>
                  {reportData.transactions.length > 0 && (
                    <button onClick={exportToCSV} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-200">
                      <Download className="w-4.5 h-4.5" />
                      ดาวน์โหลด CSV (รายงานพร้อมข้อมูลการใช้งาน)
                    </button>
                  )}
                </div>

                {reportData.transactions.length === 0 ? (
                  <p className="text-slate-400 text-xs text-center py-8">ไม่มีข้อมูล</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-400 font-bold">
                          <th className="px-4 py-3">รหัส</th>
                          <th className="px-4 py-3">ชื่ออุปกรณ์</th>
                          <th className="px-4 py-3">ชื่อลูกค้า</th>
                          <th className="px-4 py-3">หน่วยงาน/ทีม</th>
                          <th className="px-4 py-3 text-center">ระยะเวลาใช้งาน</th>
                          <th className="px-4 py-3">วันที่ยืม</th>
                          <th className="px-4 py-3">สถานที่ส่งกลับ</th>
                          <th className="px-4 py-3 text-right">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.transactions.map((t) => (
                          <tr key={t.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/30 transition-colors">
                            <td className="px-4 py-3 font-bold text-slate-700 font-mono">{t.assetCode}</td>
                            <td className="px-4 py-3 font-semibold text-slate-800">{t.assetName}</td>
                            <td className="px-4 py-3 font-bold text-slate-700">{t.borrowerName}</td>
                            <td className="px-4 py-3 font-semibold text-slate-500">{t.organization || t.department || t.salesTeam || '-'}</td>
                            <td className="px-4 py-3 text-center font-bold text-blue-600">{t.usageDays || 1} วัน</td>
                            <td className="px-4 py-3 font-bold text-slate-500">{formatDateShort(t.borrowDate)}</td>
                            <td className="px-4 py-3 font-semibold text-slate-500">{t.returnLocation || '-'}</td>
                            <td className="px-4 py-3 text-right">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600">{t.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* History Log Modal */}
      <Modal
        open={!!selectedBorrower}
        onClose={() => setSelectedBorrower(null)}
        title={`ประวัติรายการยืม-คืน: ${selectedBorrower?.name}`}
        size="lg"
      >
        {selectedBorrower && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs font-semibold text-slate-500 border-b border-slate-50 pb-3 gap-2">
              <span>หน่วยงาน: <strong className="text-slate-800">{selectedBorrower.organization || '-'}</strong></span>
              <span>ยืมอุปกรณ์สะสมทั้งหมด: <strong className="text-blue-600">{selectedBorrower.totalBorrows}</strong> รายการ</span>
            </div>

            <div className="overflow-x-auto max-h-[380px] overflow-y-auto pr-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-400 font-bold">
                    <th className="px-4 py-3">รหัสอุปกรณ์</th>
                    <th className="px-4 py-3">ชื่ออุปกรณ์</th>
                    <th className="px-4 py-3">วันที่ยืม</th>
                    <th className="px-4 py-3">กำหนดคืน</th>
                    <th className="px-4 py-3">สถานที่ปลายทาง</th>
                    <th className="px-4 py-3">สถานที่ส่งกลับ</th>
                    <th className="px-4 py-3 text-right">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBorrower.history.map((t) => (
                    <tr key={t.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/30 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-700 font-mono">{t.assetCode}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800 truncate max-w-[150px]">{t.assetName}</td>
                      <td className="px-4 py-3 font-semibold text-slate-500">{formatDateShort(t.borrowDate)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-500">{formatDateShort(t.dueDate)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-600">
                        {t.locationTo ? (
                          <div className="flex items-center gap-1.5">
                            <span className="truncate max-w-[120px]">{t.locationTo}</span>
                            <MapLinkButton location={t.locationTo} showText={false} />
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-600">
                        {t.returnLocation ? (
                          <div className="flex items-center gap-1.5">
                            <span className="truncate max-w-[120px]">{t.returnLocation}</span>
                            <MapLinkButton location={t.returnLocation} showText={false} />
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end">
                          <StatusBadge status={t.status} type="transaction" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end border-t border-slate-50 pt-3">
              <button
                onClick={() => setSelectedBorrower(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="ยืนยันการลบข้อมูลลูกค้า"
        message={`คุณต้องการลบข้อมูลลูกค้า "${deleteTarget?.name}" และประวัติการยืมทั้งหมดหรือไม่? หากอุปกรณ์ยังถูกยืมอยู่ อุปกรณ์นั้นจะเปลี่ยนสถานะกลับเป็นพร้อมใช้งาน`}
        confirmLabel="ยืนยันการลบ"
        danger
      />
    </div>
  );
}

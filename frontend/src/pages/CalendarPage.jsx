import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, User, Building2, Tag, ArrowRight } from 'lucide-react';
import api from '../api/client';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatDateShort, getLocalDateString } from '../utils/helpers';

const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

// Color palette for event bars
const BAR_COLORS = [
  { bg: 'bg-blue-200', text: 'text-blue-800', border: 'border-blue-300' },
  { bg: 'bg-amber-200', text: 'text-amber-800', border: 'border-amber-300' },
  { bg: 'bg-emerald-200', text: 'text-emerald-800', border: 'border-emerald-300' },
  { bg: 'bg-purple-200', text: 'text-purple-800', border: 'border-purple-300' },
  { bg: 'bg-rose-200', text: 'text-rose-800', border: 'border-rose-300' },
  { bg: 'bg-cyan-200', text: 'text-cyan-800', border: 'border-cyan-300' },
  { bg: 'bg-orange-200', text: 'text-orange-800', border: 'border-orange-300' },
];

export default function CalendarPage() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState([]);
  const [selectedDateStr, setSelectedDateStr] = useState('');

  // Drag selection states
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedRange, setSelectedRange] = useState(null);

  useEffect(() => {
    loadTransactions();
  }, []);

  // Global mouseup handler to ensure we stop dragging even if mouse is released outside calendar cells
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, dragStart, dragEnd]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await api.get('/transactions');
      setTransactions(data);
    } catch (err) {
      console.error('Failed to load transactions for calendar', err);
    } finally {
      setLoading(false);
    }
  };

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const calendarCells = [];

  // Previous month buffer days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const day = prevMonthTotalDays - i;
    calendarCells.push({ date: new Date(year, month - 1, day), isCurrentMonth: false, dayNumber: day });
  }

  // Current month days
  for (let i = 1; i <= totalDays; i++) {
    calendarCells.push({ date: new Date(year, month, i), isCurrentMonth: true, dayNumber: i });
  }

  // Next month buffer days
  const remainingCells = 42 - calendarCells.length;
  for (let i = 1; i <= remainingCells; i++) {
    calendarCells.push({ date: new Date(year, month + 1, i), isCurrentMonth: false, dayNumber: i });
  }

  // Get active events that SPAN a specific date (borrowDate to dueDate range)
  const getEventsForDate = (date) => {
    const checkStr = getLocalDateString(date);
    return transactions.filter(t => {
      if (t.status === 'RETURNED') return false;
      const borrowStr = getLocalDateString(t.borrowDate);
      const dueStr = getLocalDateString(t.dueDate);
      return checkStr >= borrowStr && checkStr <= dueStr;
    });
  };

  const isDateBetween = (date, start, end) => {
    const dTime = new Date(date).setHours(0,0,0,0);
    const sTime = new Date(start).setHours(0,0,0,0);
    const eTime = new Date(end).setHours(0,0,0,0);
    const min = Math.min(sTime, eTime);
    const max = Math.max(sTime, eTime);
    return dTime >= min && dTime <= max;
  };

  const handleMouseDown = (date) => {
    setIsDragging(true);
    setDragStart(date);
    setDragEnd(date);
    setSelectedRange(null);
  };

  const handleMouseEnter = (date) => {
    if (isDragging) {
      setDragEnd(date);
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (dragStart && dragEnd) {
      const start = dragStart < dragEnd ? dragStart : dragEnd;
      const end = dragStart < dragEnd ? dragEnd : dragStart;
      
      setSelectedRange({ start, end });
      
      const startStr = getLocalDateString(start);
      const endStr = getLocalDateString(end);
      
      const overlappingEvents = transactions.filter(t => {
        if (t.status === 'RETURNED') return false;
        const borrowStr = getLocalDateString(t.borrowDate);
        const dueStr = getLocalDateString(t.dueDate);
        return borrowStr <= endStr && dueStr >= startStr;
      });
      
      setSelectedDayEvents(overlappingEvents);
      
      if (startStr === endStr) {
        setSelectedDateStr(
          `${start.getDate()} ${THAI_MONTHS_FULL[start.getMonth()]} ${start.getFullYear() + 543}`
        );
      } else {
        setSelectedDateStr(
          `ช่วงวันที่ ${start.getDate()} ${THAI_MONTHS_FULL[start.getMonth()]} ${start.getFullYear() + 543} ถึง ${end.getDate()} ${THAI_MONTHS_FULL[end.getMonth()]} ${end.getFullYear() + 543}`
        );
      }
    }
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayEvents([]);
    setSelectedDateStr('');
    setDragStart(null);
    setDragEnd(null);
    setSelectedRange(null);
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayEvents([]);
    setSelectedDateStr('');
    setDragStart(null);
    setDragEnd(null);
    setSelectedRange(null);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-5 rounded-3xl border border-slate-100 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-800">ปฏิทินการยืมอุปกรณ์</h1>
            <p className="text-[10px] text-slate-400 font-bold">แสดงช่วงวันที่ยืมของแต่ละรายการ (ลากคลุมช่วงวันที่ต้องการบนปฏิทินเพื่อเลือกช่วง)</p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <button onClick={prevMonth} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-black text-slate-800 w-36 text-center select-none">
            {THAI_MONTHS_FULL[month]} {year + 543}
          </span>
          <button onClick={nextMonth} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Calendar Grid (Span 2) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-5 shadow-sm">
          <div className="grid grid-cols-7 text-center mb-3">
            {THAI_DAYS.map(day => (
              <span key={day} className="text-[11px] font-black text-slate-400 py-1">{day}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 border-t border-slate-50 pt-2">
            {calendarCells.map((cell, idx) => {
              const cellEvents = getEventsForDate(cell.date);
              const hasEvents = cellEvents.length > 0;
              const isToday = getLocalDateString(new Date()) === getLocalDateString(cell.date);
              const isSelected = dragStart && dragEnd && isDateBetween(cell.date, dragStart, dragEnd);

              return (
                <div
                  key={idx}
                  onMouseDown={() => handleMouseDown(cell.date)}
                  onMouseEnter={() => handleMouseEnter(cell.date)}
                  className={`min-h-[75px] p-1.5 rounded-xl border flex flex-col cursor-pointer transition-all hover:border-blue-400 select-none
                    ${cell.isCurrentMonth ? 'bg-white border-slate-100' : 'bg-slate-50/50 border-slate-50 text-slate-400'}
                    ${isToday ? 'ring-2 ring-blue-500 ring-offset-1 border-blue-500' : ''}
                    ${isSelected ? 'bg-blue-100/70 border-blue-400 text-blue-900 shadow-inner' : hasEvents ? 'bg-blue-50/20' : ''}
                  `}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs font-black px-1.5 py-0.5 rounded-md
                      ${isToday ? 'bg-blue-600 text-white shadow-sm shadow-blue-200' : 'text-slate-700'}
                      ${!cell.isCurrentMonth && !isToday ? 'text-slate-400' : ''}
                    `}>
                      {cell.dayNumber}
                    </span>
                    {hasEvents && (
                      <span className="text-[8px] font-bold text-blue-500">{cellEvents.length}</span>
                    )}
                  </div>

                  {/* Event bars — stacked/overlapping */}
                  <div className="flex-1 space-y-0.5 overflow-hidden max-h-[48px]">
                    {cellEvents.slice(0, 3).map((event) => {
                      const colorSet = BAR_COLORS[event.id % BAR_COLORS.length];
                      return (
                        <div
                          key={event.id}
                          className={`text-[7px] font-bold px-1 py-0.5 rounded truncate leading-tight border ${colorSet.bg} ${colorSet.text} ${colorSet.border}`}
                          title={`${event.borrowerName} - ${event.asset?.name}`}
                        >
                          {event.borrowerName}
                        </div>
                      );
                    })}
                    {cellEvents.length > 3 && (
                      <div className="text-[7px] font-bold text-slate-400 px-1">
                        +{cellEvents.length - 3} อื่นๆ
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Day Events */}
        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex flex-col min-h-[300px]">
          <div>
            <h3 className="text-sm font-black text-slate-800 mb-1">รายการที่ยืมอยู่ในช่วงที่เลือก</h3>
            <p className="text-[10px] text-slate-400 font-bold mb-4">
              {selectedDateStr ? `${selectedDateStr}` : 'คลิกหรือลากคลุมช่วงวันที่บนปฏิทินเพื่อดูรายการ'}
            </p>

            {selectedDayEvents.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-bold bg-slate-50/50 rounded-2xl border border-dashed border-slate-100">
                ไม่มีรายการยืมอุปกรณ์ในช่วงนี้
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {selectedDayEvents.map(event => {
                  const colorSet = BAR_COLORS[event.id % BAR_COLORS.length];
                  return (
                    <div
                      key={event.id}
                      className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3.5 shadow-sm transition-all hover:shadow-md bg-white border-slate-100`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black font-mono text-slate-800">{event.asset?.assetCode}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${colorSet.bg} ${colorSet.text} ${colorSet.border}`}>
                            {event.status === 'OVERDUE' ? 'เกินกำหนดส่ง' : 'กำลังยืม'}
                          </span>
                        </div>
                        <h4 className="text-xs font-black text-slate-700 mt-1.5">{event.asset?.name}</h4>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1">
                          ยืม: {formatDateShort(event.borrowDate)} → คืน: {formatDateShort(event.dueDate)}
                        </p>
                      </div>

                      <div className="border-t border-slate-100/80 pt-2.5 space-y-1.5 text-[11px] text-slate-600 font-semibold">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{event.borrowerName}</span>
                        </div>
                        {event.organization && (
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{event.organization}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{event.notes || 'ไม่มีหมายเหตุ'}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => navigate(`/assets/${event.assetId}`)}
                          className="flex-1 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-[10px] font-bold text-slate-700 transition-colors"
                        >
                          ดูข้อมูลอุปกรณ์
                        </button>
                        <button
                          onClick={() => navigate('/transactions', { state: { scanCode: event.asset?.assetCode } })}
                          className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-[10px] font-bold text-white transition-all shadow-md shadow-blue-100 flex items-center justify-center gap-1"
                        >
                          ทำเรื่องคืน
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

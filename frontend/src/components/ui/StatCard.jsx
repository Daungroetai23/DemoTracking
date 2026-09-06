import React from 'react';

export default function StatCard({ title, value, subtitle, progress, icon: Icon, color = 'primary' }) {
  const colorMap = {
    primary: 'from-blue-500 to-blue-600 shadow-blue-200/50',
    emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-200/50',
    amber: 'from-orange-400 to-orange-500 shadow-orange-200/50',
    red: 'from-rose-500 to-rose-600 shadow-rose-200/50',
  };

  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} rounded-2xl p-5 text-white shadow-xl hover:scale-[1.02] transition-transform duration-300 relative overflow-hidden`}>
      {/* Light circular decoration */}
      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full pointer-events-none" />
      
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-white/80">{title}</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3.5xl font-extrabold">{value}</span>
            <span className="text-xs text-white/80 font-medium">รายการ</span>
          </div>
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center">
            <Icon className="w-5 h-5 text-white" />
          </div>
        )}
      </div>

      {/* Progress Bar & Subtitle */}
      {progress !== undefined && (
        <div className="space-y-1.5">
          <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-white rounded-full h-full transition-all duration-500" 
              style={{ width: `${progress}%` }} 
            />
          </div>
          <p className="text-[10px] text-white/70 text-right font-medium">
            {subtitle || `${progress}%`}
          </p>
        </div>
      )}
    </div>
  );
}

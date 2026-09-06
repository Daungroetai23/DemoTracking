import { Loader2 } from 'lucide-react';

/**
 * LoadingSpinner — Full-page or inline loading indicator
 */
export default function LoadingSpinner({ fullPage = false, text = 'กำลังโหลด...' }) {
  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">{text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">{text}</p>
      </div>
    </div>
  );
}

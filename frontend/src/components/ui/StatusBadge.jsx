import { getAssetStatus, getTransactionStatus } from '../../utils/helpers';

/**
 * StatusBadge — แสดงสถานะด้วยสีและ dot
 * @param {{ status: string, type?: 'asset' | 'transaction' }} props
 */
export default function StatusBadge({ status, type = 'asset' }) {
  const info = type === 'transaction'
    ? getTransactionStatus(status)
    : getAssetStatus(status);

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${info.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${info.dot}`} />
      {info.label}
    </span>
  );
}

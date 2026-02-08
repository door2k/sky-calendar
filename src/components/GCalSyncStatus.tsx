import { useGCalSync } from '../hooks/useGCalSync';

export function GCalSyncStatus() {
  const { status, isLoading, syncing, syncNow } = useGCalSync();

  if (isLoading) return null;

  const dotColor =
    status?.status === 'connected'
      ? 'bg-green-500'
      : status?.status === 'token_expired'
        ? 'bg-yellow-500'
        : status?.status === 'error'
          ? 'bg-red-500'
          : 'bg-gray-400';

  const label =
    status?.status === 'connected'
      ? `${status.mappedEvents} synced`
      : status?.status === 'not_configured'
        ? 'Not connected'
        : status?.status === 'token_expired'
          ? 'Token expired'
          : 'Error';

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <div className={`w-2 h-2 rounded-full ${dotColor}`} />
      <span>GCal: {label}</span>
      {status?.status === 'connected' && (
        <button
          onClick={() => syncNow()}
          disabled={syncing}
          className="px-2 py-0.5 text-xs rounded border hover:bg-gray-50 disabled:opacity-50"
        >
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
      )}
    </div>
  );
}

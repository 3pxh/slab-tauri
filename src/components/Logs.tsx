import React from 'react';
import { FiBarChart2, FiHome } from 'react-icons/fi';
import { supabase } from '../lib/supabase';
import { useNavigation } from '../utils/navigation';
import { useAuth } from '../hooks/useAuth';
import AppHeader from './AppHeader';

const GEORGE_USER_ID = '3996a43b-86dd-4bda-8807-dc3d8e76e5a7';

interface LogsProps {}

const Logs: React.FC<LogsProps> = () => {
  const { goHome } = useNavigation();
  const { user } = useAuth();
  const [uniqueUsers1Day, setUniqueUsers1Day] = React.useState<number | null>(null);
  const [uniqueUsers7Days, setUniqueUsers7Days] = React.useState<number | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Check if current user is George
  const isGeorge = user?.id === GEORGE_USER_ID;

  React.useEffect(() => {
    // Only fetch logs if user is George
    if (!isGeorge) {
      setIsLoading(false);
      return;
    }

    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Query for unique users who started puzzles in the past 1 day
        const { data: data1Day, error: error1Day } = await supabase
          .from('logs')
          .select('user_id')
          .eq('event_name', 'Puzzle Started')
          .gte('time', oneDayAgo.toISOString())
          .not('user_id', 'is', null);

        if (error1Day) {
          throw new Error(`Failed to fetch 1-day logs: ${error1Day.message}`);
        }

        // Query for unique users who started puzzles in the past 7 days
        const { data: data7Days, error: error7Days } = await supabase
          .from('logs')
          .select('user_id')
          .eq('event_name', 'Puzzle Started')
          .gte('time', sevenDaysAgo.toISOString())
          .not('user_id', 'is', null);

        if (error7Days) {
          throw new Error(`Failed to fetch 7-day logs: ${error7Days.message}`);
        }

        // Count unique users
        const unique1Day = new Set(data1Day?.map(log => log.user_id) || []).size;
        const unique7Days = new Set(data7Days?.map(log => log.user_id) || []).size;

        setUniqueUsers1Day(unique1Day);
        setUniqueUsers7Days(unique7Days);
      } catch (err) {
        console.error('Error fetching logs:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch logs');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [isGeorge]);

  // If not George, show access denied message
  if (!isGeorge) {
    return (
      <div className="w-full max-w-md mx-auto p-4">
        <AppHeader titleSize="large" />
        <div className="mt-6 text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
            <p className="font-semibold mb-2">Access Denied</p>
            <p className="text-sm">You don't have permission to view this page.</p>
          </div>
          <button
            onClick={goHome}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg p-3 transition-colors duration-200"
          >
            <FiHome size={20} />
            <span>Back to Home</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <AppHeader titleSize="large" />
      
      <div className="mt-6 space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <FiBarChart2 size={24} className="text-blue-500" />
          <h2 className="text-2xl font-bold">Analytics</h2>
        </div>

        {isLoading && (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            Error: {error}
          </div>
        )}

        {!isLoading && !error && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="text-sm text-gray-500 mb-2">Past 24 Hours</div>
              <div className="text-3xl font-bold text-blue-600">
                {uniqueUsers1Day !== null ? uniqueUsers1Day : '—'}
              </div>
              <div className="text-sm text-gray-600 mt-1">Unique users who started puzzles</div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="text-sm text-gray-500 mb-2">Past 7 Days</div>
              <div className="text-3xl font-bold text-blue-600">
                {uniqueUsers7Days !== null ? uniqueUsers7Days : '—'}
              </div>
              <div className="text-sm text-gray-600 mt-1">Unique users who started puzzles</div>
            </div>
          </div>
        )}

        <button
          onClick={goHome}
          className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg p-3 transition-colors duration-200"
        >
          <FiHome size={20} />
          <span>Back to Home</span>
        </button>
      </div>
    </div>
  );
};

export default Logs;


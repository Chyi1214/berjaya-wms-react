// Worker Check-In View - Version 4.0 Clock In/Out Management
import { useState, useEffect } from 'react';
import { User, WorkerActivity } from '../../types';
// Worker check-in uses hardcoded English text for efficiency
import { workerActivityService } from '../../services/workerActivityService';

interface WorkerCheckInViewProps {
  user: User;
  zoneId: number;
  onBack: () => void;
  onWorkerStatusChange: (isCheckedIn: boolean) => void;
}

export function WorkerCheckInView({ user, zoneId, onBack, onWorkerStatusChange }: WorkerCheckInViewProps) {
  
  // State
  const [activeActivity, setActiveActivity] = useState<WorkerActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [checkOutNotes, setCheckOutNotes] = useState('');

  useEffect(() => {
    loadWorkerActivity();
  }, []);

  const loadWorkerActivity = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const activity = await workerActivityService.getActiveWorkerActivity(user.email);
      setActiveActivity(activity);
      onWorkerStatusChange(activity !== null);
    } catch (error) {
      console.error('Failed to load worker activity:', error);
      setError(`Failed to load worker status: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const activityId = await workerActivityService.checkWorkerIn(
        user.email,
        user.displayName || user.email,
        zoneId
      );

      // Reload worker activity
      await loadWorkerActivity();
      
      setSuccess(`Successfully checked in to Zone ${zoneId}`);
      console.log('Worker checked in, activity ID:', activityId);
    } catch (error) {
      console.error('Failed to check in worker:', error);
      setError(`Failed to check in: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckOut = async () => {
    if (!activeActivity) {
      setError('No active check-in found');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      await workerActivityService.checkWorkerOut(
        user.email,
        checkOutNotes.trim() || undefined
      );

      // Reload worker activity
      await loadWorkerActivity();
      
      const totalMinutes = activeActivity.totalMinutes || calculateCurrentWorkTime();
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      
      let timeMessage = '';
      if (hours > 0) {
        timeMessage = `${hours}h ${minutes}m`;
      } else {
        timeMessage = `${minutes} minutes`;
      }

      setSuccess(`Successfully checked out from Zone ${activeActivity.zoneId}. Total time worked: ${timeMessage}`);
      setCheckOutNotes('');
    } catch (error) {
      console.error('Failed to check out worker:', error);
      setError(`Failed to check out: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateCurrentWorkTime = () => {
    if (!activeActivity) return 0;
    
    return Math.floor(
      (new Date().getTime() - activeActivity.checkedInAt.getTime()) / (1000 * 60)
    );
  };

  const formatWorkTime = () => {
    const totalMinutes = calculateCurrentWorkTime();
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} minutes`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading worker status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <button
                onClick={onBack}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className={`w-8 h-8 ${activeActivity ? 'bg-green-500' : 'bg-gray-500'} rounded-full flex items-center justify-center`}>
                <span className="text-white font-bold text-sm">
                  {activeActivity ? '⏰' : '🕐'}
                </span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">
                {activeActivity ? 'Checked In' : 'Clock In/Out'}
              </h1>
            </div>
            
            <div className={`${activeActivity ? 'bg-green-100 border-green-200 text-green-800' : 'bg-gray-100 border-gray-200 text-gray-800'} border rounded-lg px-3 py-1`}>
              <span className="text-sm font-medium">
                {activeActivity ? `Zone ${activeActivity.zoneId}` : `Zone ${zoneId}`}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-green-800 font-medium">{success}</span>
              </div>
              <div className="mt-3">
                <button
                  onClick={() => {
                    setSuccess(null);
                    onBack();
                  }}
                  className="btn-primary"
                >
                  Continue to Zone Menu
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          {/* Worker Not Checked In */}
          {!activeActivity && !success && (
            <>
              {/* Check In Section */}
              <div className="text-center">
                <div className="text-4xl mb-4">🕐</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Clock Into Zone {zoneId}
                </h2>
                <p className="text-gray-600">
                  Track your work time and productivity by checking in to this zone
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="text-center space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">Worker Information</h3>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-gray-600">Name:</span> <span className="font-medium">{user.displayName || user.email}</span></p>
                      <p><span className="text-gray-600">Email:</span> <span className="font-medium">{user.email}</span></p>
                      <p><span className="text-gray-600">Zone:</span> <span className="font-medium">Zone {zoneId}</span></p>
                      <p><span className="text-gray-600">Time:</span> <span className="font-medium">{new Date().toLocaleString()}</span></p>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckIn}
                    disabled={isProcessing}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-4 px-6 rounded-lg transition-colors text-lg disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Checking In...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Check In to Zone {zoneId}
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Worker Checked In */}
          {activeActivity && !success && (
            <>
              {/* Current Status */}
              <div className="text-center">
                <div className="text-4xl mb-4">⏰</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Currently Checked In
                </h2>
                <p className="text-gray-600">
                  You are currently working in Zone {activeActivity.zoneId}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  {/* Current Session Info */}
                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3">Current Session</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Zone:</span>
                        <span className="font-medium text-green-600">Zone {activeActivity.zoneId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Checked in at:</span>
                        <span className="font-medium">{activeActivity.checkedInAt.toLocaleTimeString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Time working:</span>
                        <span className="font-medium text-green-600">{formatWorkTime()}</span>
                      </div>
                      {activeActivity.workedOnCar && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Current car:</span>
                          <span className="font-medium">{activeActivity.workedOnCar.vin}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Worker Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3">Worker Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium">{activeActivity.workerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium">{activeActivity.workerEmail}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Session ID:</span>
                        <span className="font-mono text-xs">{activeActivity.id.slice(-8)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Check Out Notes */}
                <div className="mb-6">
                  <label htmlFor="checkout-notes" className="block text-sm font-medium text-gray-700 mb-2">
                    Check-Out Notes (Optional)
                  </label>
                  <textarea
                    id="checkout-notes"
                    value={checkOutNotes}
                    onChange={(e) => setCheckOutNotes(e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Add any notes about work completed, issues encountered, or handover information..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    These notes will be saved with your work session for tracking purposes.
                  </p>
                </div>

                {/* Check Out Button */}
                <div className="flex gap-3">
                  <button
                    onClick={handleCheckOut}
                    disabled={isProcessing}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Checking Out...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Check Out
                      </div>
                    )}
                  </button>
                  
                  <button
                    onClick={onBack}
                    disabled={isProcessing}
                    className="flex-1 btn-secondary disabled:opacity-50"
                  >
                    Continue Working
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Back Button */}
          {!activeActivity && !success && (
            <div className="text-center">
              <button
                onClick={onBack}
                className="btn-secondary"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Zone Menu
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default WorkerCheckInView;
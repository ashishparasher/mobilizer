import { useState, useEffect } from 'react';
import api from '../lib/api';

export function useApplicationStatus(campaignId: string) {
  const [applicationStatus, setApplicationStatus] = useState<'none' | 'pending' | 'confirmed' | 'waitlisted' | 'cancelled' | string>('none');
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const myApps = await api.get('/applications/my');
      const userApp = (myApps || []).find((app: any) => app.campaign_id === campaignId);
      if (userApp) {
        setApplicationStatus(userApp.status);
        setApplicationId(userApp.id);
      } else {
        setApplicationStatus('none');
        setApplicationId(null);
      }
    } catch (err) {
      console.error('Error fetching application status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (campaignId) {
      fetchStatus();
    }
  }, [campaignId]);

  const apply = async () => {
    setIsLoading(true);
    try {
      const response = await api.post('/applications/apply', { campaign_id: campaignId });
      setApplicationStatus(response.status);
      setApplicationId(response.id);
      return response;
    } catch (err: any) {
      console.error('Apply error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const cancelApplication = async () => {
    if (!applicationId) return;
    setIsLoading(true);
    try {
      // Support both backend paradigms: DELETE route or PATCH route to status cancelled
      try {
        await api.delete(`/applications/${applicationId}`);
      } catch (deleteError) {
        // Fallback to PATCH if delete fails
        await api.patch(`/applications/${applicationId}`, { status: 'cancelled' });
      }
      setApplicationStatus('none');
      setApplicationId(null);
    } catch (err: any) {
      console.error('Cancel application error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    applicationStatus,
    applicationId,
    isLoading,
    apply,
    cancelApplication,
    refreshStatus: fetchStatus,
  };
}

export default useApplicationStatus;

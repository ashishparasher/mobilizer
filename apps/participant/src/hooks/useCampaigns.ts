import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { Campaign } from '@mobilize/shared';

export function useCampaigns(lat?: number, lng?: number) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Filters State
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [maxDistance, setMaxDistance] = useState<number>(10); // default 10km
  const [minPayoutFilter, setMinPayoutFilter] = useState<number | null>(null);

  const fetchCampaigns = useCallback(async (pageNum: number, isRefresh = false) => {
    if (lat === undefined || lng === undefined) return;
    
    setLoading(true);
    setError(null);

    try {
      const data = await api.get(
        `/campaigns/feed?lat=${lat}&lng=${lng}&radius=${maxDistance}&page=${pageNum}`
      );

      const newCampaigns = data || [];
      
      if (isRefresh) {
        setCampaigns(newCampaigns);
      } else {
        setCampaigns(prev => {
          // Filter out duplicates just in case
          const existingIds = new Set(prev.map(c => c.id));
          const uniqueNew = newCampaigns.filter((c: Campaign) => !existingIds.has(c.id));
          return [...prev, ...uniqueNew];
        });
      }

      setHasMore(newCampaigns.length === 10); // Page size limit is 10 in backend
    } catch (err: any) {
      console.error('Fetch feed hook error:', err);
      setError(err.message || 'Failed to fetch nearby campaigns');
    } finally {
      setLoading(false);
    }
  }, [lat, lng, maxDistance]);

  // Trigger fetch when location or search radius changes
  useEffect(() => {
    if (lat !== undefined && lng !== undefined) {
      setPage(1);
      fetchCampaigns(1, true);
    }
  }, [lat, lng, maxDistance, fetchCampaigns]);

  const refresh = async () => {
    setPage(1);
    await fetchCampaigns(1, true);
  };

  const loadMore = async () => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchCampaigns(nextPage, false);
  };

  const applyFilters = (category: string, distance: number, payout: number | null) => {
    setSelectedCategory(category);
    setMaxDistance(distance);
    setMinPayoutFilter(payout);
  };

  // Perform client-side filtering for category and payout threshold
  const filteredCampaigns = campaigns.filter(c => {
    if (selectedCategory !== 'All' && c.category !== selectedCategory.toLowerCase().replace(/ & /g, '_').replace(/ /g, '_')) {
      // Map display name back to database enum if needed
      const mappedDbCategory = selectedCategory
        .toLowerCase()
        .replace(/social/g, 'wedding')
        .replace(/gathering/g, 'religious')
        .replace(/shoot/g, 'influencer_shoot')
        .replace(/research/g, 'survey')
        .replace(/ & /g, '_')
        .replace(/ /g, '_');

      if (c.category !== mappedDbCategory) return false;
    }

    if (minPayoutFilter !== null && c.payout < minPayoutFilter) {
      return false;
    }

    return true;
  });

  return {
    campaigns: filteredCampaigns,
    loading,
    error,
    hasMore,
    refresh,
    loadMore,
    applyFilters,
    filters: {
      category: selectedCategory,
      distance: maxDistance,
      payout: minPayoutFilter,
    },
  };
}
export default useCampaigns;

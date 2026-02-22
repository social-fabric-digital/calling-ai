import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { checkSubscriptionStatus } from '@/utils/superwall';

interface SubscriptionContextValue {
  isPremium: boolean;
  isLoading: boolean;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSubscription = useCallback(async () => {
    setIsLoading(true);
    try {
      const status = await checkSubscriptionStatus();
      setIsPremium(status);
    } catch (error) {
      console.error('Subscription status check failed:', error);
      setIsPremium(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  const value = useMemo(
    () => ({ isPremium, isLoading, refreshSubscription }),
    [isPremium, isLoading, refreshSubscription]
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
}

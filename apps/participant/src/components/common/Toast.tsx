import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Animated, Easing } from 'react-native';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  message: string;
  type: ToastType;
  id: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const COLORS: Record<ToastType, { bg: string; text: string }> = {
  success: { bg: '#22C55E', text: '#FFFFFF' },
  error: { bg: '#EF4444', text: '#FFFFFF' },
  info: { bg: '#3B82F6', text: '#FFFFFF' },
};

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;
  const isTop = toast.type === 'error';

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onDismiss());
    }, 3000);
    return () => clearTimeout(timer);
  }, [anim, onDismiss]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [isTop ? -60 : 60, 0],
  });

  const colors = COLORS[toast.type];

  return (
    <Animated.View
      style={{
        position: 'absolute',
        [isTop ? 'top' : 'bottom']: 60,
        left: 16,
        right: 16,
        backgroundColor: colors.bg,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 18,
        opacity: anim,
        transform: [{ translateY }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
        zIndex: 9999,
      }}
    >
      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13, lineHeight: 18 }}>
        {toast.type === 'success' ? '✅ ' : toast.type === 'error' ? '❌ ' : 'ℹ️ '}
        {toast.message}
      </Text>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++idRef.current;
    setToasts(prev => [...prev.slice(-2), { message, type, id }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

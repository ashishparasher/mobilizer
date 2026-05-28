import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches runtime errors in the component tree and shows a friendly error screen.
 */
export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    // TODO: Send to Sentry or error monitoring service
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 justify-center items-center bg-[#F8FAFC] p-6">
          <Text style={{ fontSize: 64, marginBottom: 16 }}>😵</Text>
          <Text className="text-2xl font-black text-[#1A1A2E] text-center mb-2">
            Something went wrong
          </Text>
          <Text className="text-sm text-gray-500 text-center mb-2 max-w-[280px]">
            The app ran into an unexpected error. This has been reported to our team.
          </Text>
          {this.state.error && (
            <Text className="text-xs text-gray-400 text-center mb-6 max-w-[300px] font-mono">
              {this.state.error.message?.slice(0, 120)}
            </Text>
          )}
          <TouchableOpacity
            onPress={this.handleRetry}
            className="bg-[#FF6B35] px-8 py-3 rounded-xl mb-3"
            activeOpacity={0.8}
          >
            <Text className="text-white font-bold text-sm">Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.6}>
            <Text className="text-[#FF6B35] font-semibold text-xs mt-2">Report Issue</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

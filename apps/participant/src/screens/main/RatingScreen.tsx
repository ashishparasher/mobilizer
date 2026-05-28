import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../../lib/api';

export default function RatingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { application_id, campaign_title, event_date } = route.params || {};
  const [stars, setStars] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (stars === 0) {
      Alert.alert('Rating Required', 'Please select a star rating before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/ratings', { application_id, stars, feedback });
      Alert.alert('Thank You! 🙏', 'Your rating helps improve the platform.', [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      {/* Header */}
      <View className="bg-[#1A1A2E] pt-14 pb-6 px-6 rounded-b-3xl">
        <View className="flex-row items-center justify-between">
          <Text className="text-white text-xl font-black">Rate Event</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text className="text-gray-400 text-sm font-semibold">Skip</Text>
          </TouchableOpacity>
        </View>
        {campaign_title && (
          <Text className="text-gray-400 text-sm mt-2 font-medium">{campaign_title}</Text>
        )}
        {event_date && (
          <Text className="text-gray-500 text-xs mt-0.5">
            {new Date(event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        )}
      </View>

      <View className="flex-1 px-6 pt-8 items-center">
        <Text className="text-base font-bold text-[#1A1A2E] text-center mb-2">
          How was your experience?
        </Text>
        <Text className="text-sm text-gray-500 text-center mb-8">
          Your honest feedback helps improve events for everyone
        </Text>

        {/* Star Rating */}
        <View className="flex-row gap-3 mb-8">
          {[1, 2, 3, 4, 5].map(n => (
            <TouchableOpacity
              key={n}
              onPress={() => setStars(n)}
              activeOpacity={0.7}
              style={{
                width: 52, height: 52, borderRadius: 16,
                backgroundColor: n <= stars ? '#FF6B35' : '#F1F5F9',
                justifyContent: 'center', alignItems: 'center',
                borderWidth: 2,
                borderColor: n <= stars ? '#FF6B35' : '#E2E8F0',
              }}
            >
              <Text style={{ fontSize: 24 }}>{n <= stars ? '⭐' : '☆'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="text-sm font-bold text-[#1A1A2E] mb-2">
          {stars === 0 ? 'Tap a star to rate' :
           stars <= 2 ? 'We\'re sorry to hear that' :
           stars === 3 ? 'Thanks for your feedback' :
           stars === 4 ? 'Glad you enjoyed it!' :
           'Amazing! 🎉'}
        </Text>

        {/* Feedback */}
        <TextInput
          value={feedback}
          onChangeText={setFeedback}
          placeholder="Tell us more about your experience (optional)..."
          placeholderTextColor="#94A3B8"
          multiline
          numberOfLines={4}
          className="w-full bg-white border border-gray-200 rounded-xl p-4 text-sm text-[#1A1A2E] mt-4"
          style={{ textAlignVertical: 'top', minHeight: 100 }}
        />

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting || stars === 0}
          className={`w-full mt-6 py-4 rounded-2xl items-center ${stars > 0 ? 'bg-[#FF6B35]' : 'bg-gray-300'}`}
          activeOpacity={0.8}
        >
          <Text className="text-white font-black text-base">
            {submitting ? 'Submitting...' : 'Submit Rating'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { useAuth } from '../../store/authStore';
import api from '../../lib/api';

type RegisterScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
  route: RouteProp<AuthStackParamList, 'Register'>;
};

// Major Indian cities and states mapping
const CITY_TO_STATE: Record<string, string> = {
  'Bengaluru': 'Karnataka',
  'Mumbai': 'Maharashtra',
  'Delhi': 'Delhi',
  'Hyderabad': 'Telangana',
  'Chennai': 'Tamil Nadu',
  'Ahmedabad': 'Gujarat',
  'Kolkata': 'West Bengal',
  'Pune': 'Maharashtra',
  'Jaipur': 'Rajasthan',
  'Lucknow': 'Uttar Pradesh',
  'Patna': 'Bihar',
  'Surat': 'Gujarat',
};

const LANGUAGES = [
  'Hindi', 'English', 'Tamil', 'Telugu', 'Kannada', 
  'Malayalam', 'Bengali', 'Marathi', 'Gujarati', 'Punjabi'
];

const CATEGORIES = [
  { id: 'political', label: 'Political Events', emoji: '🗳️' },
  { id: 'wedding', label: 'Weddings & Social', emoji: '💍' },
  { id: 'brand_activation', label: 'Brand Activations', emoji: '🏷️' },
  { id: 'religious', label: 'Religious Gatherings', emoji: '🙏' },
  { id: 'ngo_volunteer', label: 'NGO & Volunteer', emoji: '🌱' },
  { id: 'influencer_shoot', label: 'Influencer Shoots', emoji: '📸' },
  { id: 'survey', label: 'Surveys & Research', emoji: '📋' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎭' },
  { id: 'startup_launch', label: 'Startup Events', emoji: '💼' },
  { id: 'emergency_response', label: 'Emergency Response', emoji: '🚨' },
];

export function RegisterScreen({ navigation, route }: RegisterScreenProps) {
  const { phone } = route.params;
  const { setUser, setProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | 'prefer_not_to_say' | ''>('');
  
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [minCompensation, setMinCompensation] = useState(500); // default ₹500
  const [travelRadius, setTravelRadius] = useState(15); // default 15km

  const [categoryPreferences, setCategoryPreferences] = useState<string[]>([]);

  // City Selection
  const handleCitySelect = (selectedCity: string) => {
    setCity(selectedCity);
    setState(CITY_TO_STATE[selectedCity] || '');
    setDistrict(selectedCity); // Default district to city name
    setShowCityDropdown(false);
  };

  // Language Toggle
  const toggleLanguage = (lang: string) => {
    if (selectedLanguages.includes(lang)) {
      setSelectedLanguages(prev => prev.filter(l => l !== lang));
    } else {
      setSelectedLanguages(prev => [...prev, lang]);
    }
  };

  // Category Toggle
  const toggleCategory = (catId: string) => {
    if (categoryPreferences.includes(catId)) {
      setCategoryPreferences(prev => prev.filter(c => c !== catId));
    } else {
      setCategoryPreferences(prev => [...prev, catId]);
    }
  };

  // Step Validation
  const validateStep = () => {
    if (step === 1) {
      if (!name.trim()) return 'Please enter your name';
      if (!age || parseInt(age) < 16 || parseInt(age) > 80) return 'Age must be between 16 and 80';
      if (!gender) return 'Please select your gender';
    }
    if (step === 2) {
      if (!city) return 'Please select a city';
      if (!district.trim()) return 'Please enter your district';
      if (!state) return 'Please select your state';
    }
    if (step === 3) {
      if (selectedLanguages.length === 0) return 'Please select at least one language';
    }
    if (step === 4) {
      if (categoryPreferences.length === 0) return 'Please select at least one event type preference';
    }
    return null;
  };

  const handleNext = () => {
    const error = validateStep();
    if (error) {
      Alert.alert('Validation Error', error);
      return;
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => Math.max(1, prev - 1));
  };

  const handleRegister = async () => {
    const error = validateStep();
    if (error) {
      Alert.alert('Validation Error', error);
      return;
    }

    setIsLoading(true);

    try {
      // 1. Trigger API register
      const response = await api.post('/auth/register', {
        phone,
        name,
        age: parseInt(age),
        gender,
        city,
        district,
        state,
        role: 'participant',
      });

      if (!response || !response.id) {
        throw new Error('Registration failed to return user data');
      }

      // 2. Perform participant profile updates (compensation, travel radius, preferences, languages)
      const updatedProfile = await api.patch('/user/participant-profile', {
        languages: selectedLanguages,
        category_preferences: categoryPreferences,
        min_compensation: minCompensation,
        travel_radius: travelRadius,
      });

      // 3. Save to auth state store. Context will direct user to AppStack
      await setUser(response);
      await setProfile(updatedProfile);
    } catch (err: any) {
      console.error('Registration failed:', err);
      Alert.alert('Registration Error', err.message || 'An unexpected error occurred during account creation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6 py-6" keyboardShouldPersistTaps="handled">
          
          {/* Header & Step Indicator */}
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-bold text-gray-400">Step {step}/4</Text>
            <View className="flex-row space-x-1">
              {[1, 2, 3, 4].map(s => (
                <View key={s} className={`h-1.5 w-6 rounded-full ${s === step ? 'bg-[#FF6B35]' : 'bg-gray-200'}`} />
              ))}
            </View>
          </View>

          {/* STEP 1: BASIC INFORMATION */}
          {step === 1 && (
            <View className="flex-1">
              <Text className="text-28px font-extrabold text-[#1A1A2E] mb-2">Basic Info</Text>
              <Text className="text-base text-gray-500 mb-6">Tell us about yourself to help campaigners discover you.</Text>

              <Text className="text-sm font-semibold text-[#1A1A2E] mb-2">Full Name</Text>
              <TextInput
                className="border border-[#E2E8F0] rounded-2xl px-4 py-3 bg-[#F8FAFC] text-base text-[#1A1A2E] mb-4"
                placeholder="Ashish Kumar"
                value={name}
                onChangeText={setName}
              />

              <Text className="text-sm font-semibold text-[#1A1A2E] mb-2">Age</Text>
              <TextInput
                className="border border-[#E2E8F0] rounded-2xl px-4 py-3 bg-[#F8FAFC] text-base text-[#1A1A2E] mb-4"
                placeholder="24"
                keyboardType="numeric"
                maxLength={2}
                value={age}
                onChangeText={setAge}
              />

              <Text className="text-sm font-semibold text-[#1A1A2E] mb-2">Gender</Text>
              <View className="flex-row flex-wrap gap-2">
                {(['male', 'female', 'other', 'prefer_not_to_say'] as const).map(g => (
                  <TouchableOpacity
                    key={g}
                    onPress={() => setGender(g)}
                    className={`px-4 py-3 rounded-full border ${
                      gender === g 
                        ? 'bg-[#FF6B35] border-[#FF6B35]' 
                        : 'bg-[#F8FAFC] border-[#E2E8F0]'
                    }`}
                  >
                    <Text className={`font-semibold ${gender === g ? 'text-white' : 'text-[#1A1A2E]'}`}>
                      {g === 'prefer_not_to_say' ? 'Prefer not to say' : g.charAt(0).toUpperCase() + g.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* STEP 2: LOCATION */}
          {step === 2 && (
            <View className="flex-1">
              <Text className="text-28px font-extrabold text-[#1A1A2E] mb-2">Where are you located?</Text>
              <Text className="text-base text-gray-500 mb-6">We search for mobilization campaigns within your travel radius.</Text>

              <Text className="text-sm font-semibold text-[#1A1A2E] mb-2">City</Text>
              <TouchableOpacity
                onPress={() => setShowCityDropdown(!showCityDropdown)}
                className="border border-[#E2E8F0] rounded-2xl px-4 py-3 bg-[#F8FAFC] flex-row justify-between items-center mb-4"
              >
                <Text className={`text-base ${city ? 'text-[#1A1A2E] font-medium' : 'text-gray-400'}`}>
                  {city || 'Select your City'}
                </Text>
                <Text className="text-gray-400 text-xs">▼</Text>
              </TouchableOpacity>

              {showCityDropdown && (
                <View className="border border-[#E2E8F0] rounded-2xl bg-white mb-4 max-h-48 overflow-hidden">
                  <ScrollView nestedScrollEnabled>
                    {Object.keys(CITY_TO_STATE).map(c => (
                      <TouchableOpacity
                        key={c}
                        onPress={() => handleCitySelect(c)}
                        className="px-4 py-3 border-b border-[#F1F5F9]"
                      >
                        <Text className="text-base text-[#1A1A2E]">{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text className="text-sm font-semibold text-[#1A1A2E] mb-2">District</Text>
              <TextInput
                className="border border-[#E2E8F0] rounded-2xl px-4 py-3 bg-[#F8FAFC] text-base text-[#1A1A2E] mb-4"
                placeholder="District name"
                value={district}
                onChangeText={setDistrict}
              />

              <Text className="text-sm font-semibold text-[#1A1A2E] mb-2">State</Text>
              <TextInput
                className="border border-[#E2E8F0] rounded-2xl px-4 py-3 bg-gray-100 text-base text-gray-600 mb-4"
                placeholder="State name"
                value={state}
                editable={false} // Auto-filled from city map
              />
            </View>
          )}

          {/* STEP 3: PREFERENCES */}
          {step === 3 && (
            <View className="flex-1">
              <Text className="text-28px font-extrabold text-[#1A1A2E] mb-2">Preferences</Text>
              <Text className="text-base text-gray-500 mb-6">Setup languages and baseline payouts.</Text>

              <Text className="text-sm font-semibold text-[#1A1A2E] mb-2">Languages Spoken</Text>
              <View className="flex-row flex-wrap gap-2 mb-6">
                {LANGUAGES.map(lang => {
                  const isSelected = selectedLanguages.includes(lang);
                  return (
                    <TouchableOpacity
                      key={lang}
                      onPress={() => toggleLanguage(lang)}
                      className={`px-3 py-2 rounded-full border ${
                        isSelected 
                          ? 'bg-[#FF6B35] border-[#FF6B35]' 
                          : 'bg-[#F8FAFC] border-[#E2E8F0]'
                      }`}
                    >
                      <Text className={`text-sm ${isSelected ? 'text-white font-bold' : 'text-[#1A1A2E]'}`}>
                        {lang}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom compensation picker */}
              <Text className="text-sm font-semibold text-[#1A1A2E] mb-2">
                Minimum Payout: <Text className="text-[#FF6B35] font-extrabold">₹{minCompensation}/event</Text>
              </Text>
              <View className="flex-row items-center justify-between bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl px-4 py-2 mb-6">
                <TouchableOpacity
                  onPress={() => setMinCompensation(prev => Math.max(0, prev - 50))}
                  className="w-12 h-12 bg-white rounded-xl items-center justify-center border border-[#E2E8F0] shadow-sm"
                >
                  <Text className="text-2xl font-bold text-[#1A1A2E]">-</Text>
                </TouchableOpacity>
                <Text className="text-xl font-extrabold text-[#1A1A2E]">₹{minCompensation}</Text>
                <TouchableOpacity
                  onPress={() => setMinCompensation(prev => Math.min(2000, prev + 50))}
                  className="w-12 h-12 bg-white rounded-xl items-center justify-center border border-[#E2E8F0] shadow-sm"
                >
                  <Text className="text-2xl font-bold text-[#1A1A2E]">+</Text>
                </TouchableOpacity>
              </View>

              {/* Custom travel radius picker */}
              <Text className="text-sm font-semibold text-[#1A1A2E] mb-2">
                Travel Radius Limit: <Text className="text-[#FF6B35] font-extrabold">{travelRadius} km</Text>
              </Text>
              <View className="flex-row items-center justify-between bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl px-4 py-2">
                <TouchableOpacity
                  onPress={() => setTravelRadius(prev => Math.max(1, prev - 5))}
                  className="w-12 h-12 bg-white rounded-xl items-center justify-center border border-[#E2E8F0] shadow-sm"
                >
                  <Text className="text-2xl font-bold text-[#1A1A2E]">-</Text>
                </TouchableOpacity>
                <Text className="text-xl font-extrabold text-[#1A1A2E]">{travelRadius} km</Text>
                <TouchableOpacity
                  onPress={() => setTravelRadius(prev => Math.min(50, prev + 5))}
                  className="w-12 h-12 bg-white rounded-xl items-center justify-center border border-[#E2E8F0] shadow-sm"
                >
                  <Text className="text-2xl font-bold text-[#1A1A2E]">+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 4: CATEGORIES */}
          {step === 4 && (
            <View className="flex-1">
              <Text className="text-28px font-extrabold text-[#1A1A2E] mb-2">Event Types</Text>
              <Text className="text-base text-gray-500 mb-6">Select the types of mobilization opportunities you are open to joining.</Text>

              <View className="flex-row flex-wrap justify-between gap-y-3">
                {CATEGORIES.map(cat => {
                  const isSelected = categoryPreferences.includes(cat.id);
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => toggleCategory(cat.id)}
                      className={`w-[48%] p-4 rounded-2xl border flex-col items-center justify-center space-y-2 ${
                        isSelected 
                          ? 'bg-orange-50 border-[#FF6B35]' 
                          : 'bg-[#F8FAFC] border-[#E2E8F0]'
                      }`}
                      activeOpacity={0.8}
                    >
                      <Text className="text-3xl mb-1">{cat.emoji}</Text>
                      <Text className={`text-xs font-bold text-center ${isSelected ? 'text-[#FF6B35]' : 'text-gray-600'}`}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Navigation Action Buttons */}
          <View className="flex-row space-x-3 mt-8 pt-4">
            {step > 1 && (
              <TouchableOpacity
                onPress={handleBack}
                disabled={isLoading}
                className="flex-1 border border-[#E2E8F0] py-4 rounded-2xl items-center bg-white"
                activeOpacity={0.8}
              >
                <Text className="text-[#1A1A2E] text-base font-bold">Back</Text>
              </TouchableOpacity>
            )}

            {step < 4 ? (
              <TouchableOpacity
                onPress={handleNext}
                className="flex-2 bg-[#FF6B35] py-4 rounded-2xl items-center justify-center shadow-md shadow-orange-500/10 flex-grow"
                activeOpacity={0.85}
              >
                <Text className="text-white text-base font-bold">Next</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleRegister}
                disabled={isLoading}
                className={`flex-2 py-4 rounded-2xl items-center justify-center shadow-md flex-grow ${
                  isLoading ? 'bg-orange-300' : 'bg-[#FF6B35] shadow-orange-500/20'
                }`}
                activeOpacity={0.85}
              >
                <Text className="text-white text-base font-bold">
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export default RegisterScreen;

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Alert, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../store/authStore';
import { useTranslation, setLanguage } from '../../i18n';
import api from '../../lib/api';

const CATEGORIES = [
  { key: 'political_event', label: '🗳️ Political', labelHi: '🗳️ राजनीतिक' },
  { key: 'wedding_social', label: '💍 Wedding', labelHi: '💍 शादी' },
  { key: 'brand_activation', label: '🏷️ Brand', labelHi: '🏷️ ब्रांड' },
  { key: 'religious_gathering', label: '🙏 Religious', labelHi: '🙏 धार्मिक' },
  { key: 'ngo_volunteer', label: '🌱 NGO', labelHi: '🌱 स्वयंसेवक' },
  { key: 'influencer_shoot', label: '📸 Influencer', labelHi: '📸 इंफ्लुएंसर' },
  { key: 'survey_research', label: '📋 Survey', labelHi: '📋 सर्वे' },
  { key: 'entertainment', label: '🎭 Entertainment', labelHi: '🎭 मनोरंजन' },
];

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-6 mb-2 px-1">
      {title}
    </Text>
  );
}

function Row({ label, value, icon, onPress, isDestructive }: {
  label: string; value?: string; icon?: string;
  onPress?: () => void; isDestructive?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
      className="flex-row items-center justify-between bg-white rounded-xl px-4 py-3.5 mb-2 border border-gray-100"
    >
      <View className="flex-row items-center flex-1">
        {icon && <Text className="text-base mr-3">{icon}</Text>}
        <Text className={`text-sm font-semibold ${isDestructive ? 'text-red-500' : 'text-[#1A1A2E]'}`}>
          {label}
        </Text>
      </View>
      {value && <Text className="text-sm text-gray-400 mr-1">{value}</Text>}
      {onPress && <Ionicons name="chevron-forward" size={16} color="#94A3B8" />}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { user, participantProfile, logout, updateProfile } = useAuth();
  const { t, language } = useTranslation();
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingUPI, setEditingUPI] = useState(false);
  const [nameValue, setNameValue] = useState(user?.name || '');
  const [upiValue, setUpiValue] = useState(participantProfile?.upi_id || '');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const profile = await api.get('/user/profile');
      if (profile) await updateProfile(profile);
    } catch { /* ignore */ }
    setRefreshing(false);
  }, [updateProfile]);

  const handleSaveName = async () => {
    try {
      await api.patch('/user/profile', { name: nameValue });
      setEditingName(false);
    } catch { Alert.alert('Error', 'Failed to save name'); }
  };

  const handleSaveUPI = async () => {
    try {
      await api.patch('/user/profile', { upi_id: upiValue });
      await updateProfile({ upi_id: upiValue } as any);
      setEditingUPI(false);
    } catch { Alert.alert('Error', 'Failed to save UPI'); }
  };

  const handleGoOffline = async () => {
    Alert.alert('Go Offline', 'You will not appear in heatmaps or receive new opportunities.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Go Offline',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.patch('/user/profile', { is_online: false });
            await updateProfile({ is_online: false } as any);
          } catch { /* ignore */ }
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert(t('profile.logout'), 'Are you sure you want to log out?', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.logout'), style: 'destructive', onPress: logout },
    ]);
  };

  const handleAvatarPress = () => {
    Alert.alert('Update Photo', 'Choose an option', [
      { text: '📷 Take Photo', onPress: () => Alert.alert('Camera', 'Camera integration requires expo-image-picker dev build') },
      { text: '🖼️ Choose from Gallery', onPress: () => Alert.alert('Gallery', 'Gallery integration requires expo-image-picker dev build') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const initials = (user?.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const reliabilityScore = (participantProfile as any)?.reliability_score ?? 0;
  const categoryPrefs = (participantProfile as any)?.category_preferences || [];

  return (
    <ScrollView
      className="flex-1 bg-[#F8FAFC]"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" colors={['#FF6B35']} />}
    >
      {/* Header */}
      <View className="bg-[#1A1A2E] pt-14 pb-8 px-6 items-center rounded-b-3xl">
        <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.8}>
          <View
            style={{
              width: 80, height: 80, borderRadius: 40,
              backgroundColor: '#FF6B35', justifyContent: 'center', alignItems: 'center',
              borderWidth: 3, borderColor: '#FFFFFF30',
            }}
          >
            <Text style={{ color: '#FFF', fontSize: 28, fontWeight: '900' }}>{initials}</Text>
          </View>
          <View
            style={{
              position: 'absolute', bottom: 0, right: -2,
              backgroundColor: '#FFF', borderRadius: 12, padding: 4,
            }}
          >
            <Ionicons name="camera" size={14} color="#FF6B35" />
          </View>
        </TouchableOpacity>
        <Text className="text-white text-xl font-black mt-3">{user?.name || 'Participant'}</Text>
        <Text className="text-gray-400 text-sm mt-0.5">{user?.phone}</Text>
      </View>

      <View className="px-4 pb-8">
        {/* Account Section */}
        <SectionHeader title={language === 'hi' ? 'खाता' : 'Account'} />
        {editingName ? (
          <View className="bg-white rounded-xl px-4 py-3 mb-2 border border-orange-200 flex-row items-center">
            <TextInput
              value={nameValue}
              onChangeText={setNameValue}
              className="flex-1 text-sm text-[#1A1A2E] font-semibold"
              autoFocus
            />
            <TouchableOpacity onPress={handleSaveName} className="ml-2 bg-[#FF6B35] px-4 py-1.5 rounded-lg">
              <Text className="text-white text-xs font-bold">{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Row label={language === 'hi' ? 'नाम' : 'Name'} value={user?.name} icon="👤" onPress={() => setEditingName(true)} />
        )}
        <Row label={language === 'hi' ? 'शहर' : 'City'} value={(participantProfile as any)?.city || '—'} icon="📍" />
        <Row label={language === 'hi' ? 'फोन' : 'Phone'} value={user?.phone} icon="📱" />

        {/* Language Section */}
        <SectionHeader title={t('profile.language')} />
        <View className="flex-row gap-3 mb-2">
          <TouchableOpacity
            onPress={() => setLanguage('en')}
            className={`flex-1 py-3 rounded-xl border-2 items-center ${language === 'en' ? 'border-[#FF6B35] bg-orange-50' : 'border-gray-200 bg-white'}`}
            activeOpacity={0.7}
          >
            <Text className={`text-sm font-bold ${language === 'en' ? 'text-[#FF6B35]' : 'text-gray-500'}`}>
              EN English
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setLanguage('hi')}
            className={`flex-1 py-3 rounded-xl border-2 items-center ${language === 'hi' ? 'border-[#FF6B35] bg-orange-50' : 'border-gray-200 bg-white'}`}
            activeOpacity={0.7}
          >
            <Text className={`text-sm font-bold ${language === 'hi' ? 'text-[#FF6B35]' : 'text-gray-500'}`}>
              हिंदी Hindi
            </Text>
          </TouchableOpacity>
        </View>

        {/* Reliability Score */}
        <SectionHeader title={t('profile.reliabilityScore')} />
        <View className="bg-white rounded-xl px-4 py-4 mb-2 border border-gray-100">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-2xl font-black text-[#1A1A2E]">{reliabilityScore}%</Text>
            <View style={{ backgroundColor: reliabilityScore >= 80 ? '#22C55E20' : reliabilityScore >= 60 ? '#F59E0B20' : '#EF444420', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: reliabilityScore >= 80 ? '#16A34A' : reliabilityScore >= 60 ? '#D97706' : '#DC2626' }}>
                {reliabilityScore >= 80 ? 'Excellent' : reliabilityScore >= 60 ? 'Good' : 'Needs Improvement'}
              </Text>
            </View>
          </View>
          <View style={{ height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ height: 8, width: `${reliabilityScore}%` as any, backgroundColor: reliabilityScore >= 80 ? '#22C55E' : reliabilityScore >= 60 ? '#F59E0B' : '#EF4444', borderRadius: 4 }} />
          </View>
          <Text className="text-xs text-gray-400 mt-2">
            Based on attendance (40%), punctuality (20%), ratings (25%), completeness (5%), responsiveness (10%)
          </Text>
        </View>

        {/* Category Preferences */}
        <SectionHeader title={t('profile.categories')} />
        <View className="flex-row flex-wrap gap-2 mb-2">
          {CATEGORIES.map(cat => {
            const isPreferred = categoryPrefs.includes(cat.key);
            return (
              <View
                key={cat.key}
                style={{
                  backgroundColor: isPreferred ? '#FFF7ED' : '#F8FAFC',
                  borderWidth: 1,
                  borderColor: isPreferred ? '#FB923C' : '#E2E8F0',
                  paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: isPreferred ? '700' : '500', color: isPreferred ? '#EA580C' : '#94A3B8' }}>
                  {language === 'hi' ? cat.labelHi : cat.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Payment */}
        <SectionHeader title={t('profile.paymentSettings')} />
        {editingUPI ? (
          <View className="bg-white rounded-xl px-4 py-3 mb-2 border border-orange-200 flex-row items-center">
            <TextInput
              value={upiValue}
              onChangeText={setUpiValue}
              placeholder="yourname@upi"
              className="flex-1 text-sm text-[#1A1A2E] font-mono"
              autoFocus
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={handleSaveUPI} className="ml-2 bg-[#FF6B35] px-4 py-1.5 rounded-lg">
              <Text className="text-white text-xs font-bold">{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Row label={t('profile.upiId')} value={upiValue || 'Not set'} icon="💳" onPress={() => setEditingUPI(true)} />
        )}
        <Row
          label={language === 'hi' ? 'कमाई देखें' : 'View Earnings'}
          icon="💰"
          onPress={() => navigation.navigate('Earnings')}
        />

        {/* Danger Zone */}
        <SectionHeader title={language === 'hi' ? 'अन्य विकल्प' : 'Danger Zone'} />
        <Row label={t('profile.goOffline')} icon="🔴" onPress={handleGoOffline} />
        <Row label={t('profile.logout')} icon="🚪" onPress={handleLogout} isDestructive />
      </View>
    </ScrollView>
  );
}

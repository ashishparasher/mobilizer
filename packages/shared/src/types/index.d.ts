export interface User {
    id: string;
    phone: string;
    name: string;
    age: number;
    gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    city: string;
    district: string;
    state: string;
    verified: boolean;
    aadhaar_verified: boolean;
    reliability_score: number;
    profile_complete: number;
    avatar_url?: string;
    role?: 'participant' | 'campaigner' | 'admin';
    is_banned?: boolean;
    created_at: string;
}
export interface ParticipantProfile {
    user_id: string;
    languages: string[];
    education: string;
    profession: string;
    interests: string[];
    category_preferences: CampaignCategory[];
    blocked_categories: CampaignCategory[];
    min_compensation: number;
    travel_radius: number;
    is_online: boolean;
    is_discoverable: boolean;
    availability_schedule: AvailabilitySchedule;
    lat?: number;
    lng?: number;
    last_location_update?: string;
}
export interface AvailabilitySchedule {
    monday: TimeWindow[];
    tuesday: TimeWindow[];
    wednesday: TimeWindow[];
    thursday: TimeWindow[];
    friday: TimeWindow[];
    saturday: TimeWindow[];
    sunday: TimeWindow[];
}
export interface TimeWindow {
    start: string;
    end: string;
}
export type CampaignCategory = 'political' | 'wedding' | 'brand_activation' | 'religious' | 'ngo_volunteer' | 'influencer_shoot' | 'survey' | 'entertainment' | 'flash_mob' | 'startup_launch' | 'emergency_response';
export type CampaignStatus = 'draft' | 'pending_approval' | 'active' | 'paused' | 'completed' | 'cancelled';
export type ApplicationStatus = 'pending' | 'confirmed' | 'rejected' | 'waitlisted' | 'cancelled' | 'no_show';
export interface Campaign {
    id: string;
    campaigner_id: string;
    title: string;
    description: string;
    category: CampaignCategory;
    date: string;
    start_time: string;
    duration_hrs: number;
    location_name: string;
    location_address: string;
    lat: number;
    lng: number;
    payout: number;
    payout_type: 'cash' | 'non_monetary';
    slots_total: number;
    slots_filled: number;
    slots_waitlist: number;
    status: CampaignStatus;
    dress_code?: string;
    requirements: CampaignRequirements;
    visibility_radius: number;
    is_urgent: boolean;
    created_at: string;
    campaigner?: Campaigner;
}
export interface CampaignRequirements {
    min_age: number;
    max_age: number;
    gender: 'male' | 'female' | 'any';
    languages: string[];
    min_reliability_score: number;
    education?: string;
    interests?: string[];
    min_events_attended?: number;
}
export interface Campaigner {
    id: string;
    user_id: string;
    org_name: string;
    org_type: string;
    verified: boolean;
    wallet_balance: number;
    rating: number;
    total_campaigns: number;
    payment_reliability: number;
    logo_url?: string;
}
export interface Application {
    id: string;
    campaign_id: string;
    user_id: string;
    status: ApplicationStatus;
    applied_at: string;
    confirmed_at?: string;
    auto_qualified: boolean;
    campaign?: Campaign;
    user?: User;
}
export interface CheckIn {
    id: string;
    application_id: string;
    user_id: string;
    campaign_id: string;
    checkin_time: string;
    checkout_time?: string;
    checkin_lat: number;
    checkin_lng: number;
    checkout_lat?: number;
    checkout_lng?: number;
    verified: boolean;
    hours_attended?: number;
}
export interface Payout {
    id: string;
    user_id: string;
    campaign_id: string;
    amount: number;
    status: 'pending' | 'processing' | 'completed' | 'disputed' | 'cancelled';
    upi_id?: string;
    released_at?: string;
    created_at: string;
}
export interface Rating {
    id: string;
    from_user_id: string;
    to_user_id: string;
    campaign_id: string;
    score: number;
    tags: string[];
    comment?: string;
    created_at: string;
}

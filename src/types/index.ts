export interface Location {
  lat: number;
  lng: number;
  address: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'donor' | 'collector' | 'volunteer';
  orgName?: string;
  phone: string;
  location: Location;
  avatarUrl?: string;
  trustScore: number;
  totalRescues: number;
  isVerified: boolean;
  createdAt: string;
}

export interface FoodListing {
  id: string;
  donorId: string;
  donorName: string;
  foodType: string;
  description: string;
  quantity: number;
  unit: 'kg' | 'portions' | 'packets';
  category: 'cooked' | 'raw' | 'packaged' | 'beverages';
  pickupWindowStart: string;
  pickupWindowEnd: string;
  address: string;
  location: Location;
  photos: string[];
  status: 'active' | 'claimed' | 'picked_up' | 'delivered' | 'expired';
  claimedBy?: string;
  dietaryTags: string[];
  urgencyLevel: 'low' | 'medium' | 'high';
  createdAt: string;
}

export interface Claim {
  id: string;
  listingId: string;
  collectorId: string;
  collectorName: string;
  status: 'pending' | 'approved' | 'rejected';
  claimedAt: string;
}

export interface Delivery {
  id: string;
  listingId: string;
  volunteerId: string;
  donorId: string;
  status: 'assigned' | 'en_route' | 'picked_up' | 'delivered';
  pickupAddress: string;
  dropAddress: string;
  estimatedTime: string;
  distanceKm: number;
  foodDetails: string;
  createdAt: string;
}

export interface Rating {
  id: string;
  fromUserId: string;
  toUserId: string;
  listingId: string;
  score: number;
  review: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'claim' | 'pickup_reminder' | 'rating' | 'new_listing' | 'delivery_assigned';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

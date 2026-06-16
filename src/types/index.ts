export interface TourGroup {
  id: number
  group_name: string
  route_name: string
  departure_date: string
  return_date: string
  total_seats: number
  base_price: number
  guide_language_requirement: string
  hotel_star_requirement: number
  hotel_id?: number
  flight_id?: number
  status: 'draft' | 'allocated' | 'confirmed' | 'completed' | 'cancelled'
  created_at: string
  updated_at?: string
}

export interface Tourist {
  id: number
  group_id: number
  name: string
  id_card: string
  phone: string
  age: number
  gender: string
  special_needs: string
  dietary_requirements: string
  status: 'registered' | 'paid' | 'ticketed' | 'departed' | 'returned' | 'cancelled'
  payment_status: 'unpaid' | 'partial' | 'paid'
  amount_paid: number
  seat_number?: number
  hotel_room?: string
  hotel_id?: number
  flight_id?: number
  is_locked?: number
  locked_at?: string
  lock_reason?: string
  created_at: string
  updated_at?: string
}

export interface Hotel {
  id: number
  name: string
  city: string
  address: string
  star_rating: number
  total_rooms: number
  available_rooms: number
  price_per_night: number
  facilities: string
  created_at: string
  updated_at?: string
}

export interface Flight {
  id: number
  flight_number: string
  airline: string
  departure_city: string
  arrival_city: string
  departure_time: string
  arrival_time: string
  total_seats: number
  available_seats: number
  price_per_seat: number
  created_at: string
  updated_at?: string
}

export interface Guide {
  id: number
  name: string
  phone: string
  id_card: string
  languages: string
  years_of_experience: number
  rating: number
  max_monthly_hours: number
  current_month_hours: number
  status: string
  created_at: string
  updated_at?: string
}

export interface GuideSchedule {
  id: number
  group_id: number
  guide_id: number
  guide_name?: string
  group_name?: string
  original_guide_id?: number
  original_guide_name?: string
  swap_reason?: string
  swapped_at?: string
  start_date: string
  end_date: string
  estimated_hours: number
  status: string
  created_at: string
  updated_at?: string
}

export interface ShiftSwap {
  id: number
  requester_guide_id: number
  target_guide_id: number
  schedule_id: number
  requester_name?: string
  target_guide_name?: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  reject_reason?: string
  approved_at?: string
  rejected_at?: string
  created_at: string
}

export interface FinanceSettlement {
  id: number
  group_id: number
  group_name?: string
  route_name?: string
  total_fee: number
  total_paid: number
  total_self_paid: number
  total_refund: number
  net_amount: number
  tourist_count: number
  status: 'pending' | 'approved' | 'rejected'
  reject_reason?: string
  approved_at?: string
  rejected_at?: string
  created_at: string
}

export interface SelfPaidItem {
  id: number
  group_id: number
  tourist_id: number
  tourist_name?: string
  item_name: string
  amount: number
  description: string
  created_at: string
}

export interface Refund {
  id: number
  group_id: number
  tourist_id: number
  tourist_name?: string
  amount: number
  reason: string
  status: string
  approved_at?: string
  created_at: string
}

export interface Reminder {
  id: number
  type: string
  title: string
  content: string
  related_id: number
  related_type: string
  is_read: number
  created_at: string
}

export interface StatisticsOverview {
  totalGroups: number
  totalTourists: number
  totalRevenue: number
  pendingSettlements: number
}

export interface RouteStatistics {
  route_name: string
  group_count: number
  tourist_count: number
  avg_spending: number
  total_revenue: number
}

export interface GuideStatistics {
  guide_name: string
  group_count: number
  total_hours: number
  rating: number
  complaint_count: number
}

export interface ItineraryData {
  group: TourGroup
  tourists: Tourist[]
  hotel?: Hotel
  flight?: Flight
  guide?: {
    guide_name: string
    guide_phone: string
    start_date: string
    end_date: string
  }
  push_status: {
    push_status: 'pushed' | 'not_pushed'
    pushed_at: string | null
    pushed_to: string | null
    remark: string | null
    group_id?: number
    group_name?: string
  }
}

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

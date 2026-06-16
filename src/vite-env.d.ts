/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    tourGroups: {
      list: (params?: any) => Promise<any>
      get: (id: number) => Promise<any>
      create: (data: any) => Promise<any>
      update: (id: number, data: any) => Promise<any>
      delete: (id: number) => Promise<any>
    }
    tourists: {
      list: (params?: any) => Promise<any>
      get: (id: number) => Promise<any>
      create: (data: any) => Promise<any>
      update: (id: number, data: any) => Promise<any>
      delete: (id: number) => Promise<any>
      updateStatus: (id: number, status: string) => Promise<any>
    }
    hotels: {
      list: (params?: any) => Promise<any>
      all: () => Promise<any>
      create: (data: any) => Promise<any>
      update: (id: number, data: any) => Promise<any>
    }
    flights: {
      list: (params?: any) => Promise<any>
      all: () => Promise<any>
      create: (data: any) => Promise<any>
      update: (id: number, data: any) => Promise<any>
    }
    guides: {
      list: (params?: any) => Promise<any>
      all: () => Promise<any>
      create: (data: any) => Promise<any>
      update: (id: number, data: any) => Promise<any>
    }
    guideSchedules: {
      list: (params?: any) => Promise<any>
      create: (data: any) => Promise<any>
      update: (id: number, data: any) => Promise<any>
    }
    shiftSwaps: {
      list: (params?: any) => Promise<any>
      create: (data: any) => Promise<any>
      approve: (id: number) => Promise<any>
      reject: (id: number, reason: string) => Promise<any>
    }
    finance: {
      settlements: (params?: any) => Promise<any>
      createSettlement: (groupId: number) => Promise<any>
      approveSettlement: (id: number) => Promise<any>
      rejectSettlement: (id: number, reason: string) => Promise<any>
    }
    selfPaid: {
      list: (groupId: number) => Promise<any>
      create: (data: any) => Promise<any>
    }
    refunds: {
      list: (groupId: number) => Promise<any>
      create: (data: any) => Promise<any>
    }
    resource: {
      allocate: (groupId: number) => Promise<any>
    }
    statistics: {
      overview: () => Promise<any>
      byRoute: () => Promise<any>
      byGuide: () => Promise<any>
    }
    reminders: {
      list: (params?: any) => Promise<any>
      markAsRead: (id: number) => Promise<any>
      unreadCount: () => Promise<any>
      checkPaymentOverdue: () => Promise<any>
      checkDepartureSoon: () => Promise<any>
    }
    itinerary: {
      generate: (groupId: number) => Promise<any>
    }
  }
}

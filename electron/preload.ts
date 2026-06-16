import { contextBridge, ipcRenderer } from 'electron'

const api = {
  tourGroups: {
    list: (params?: any) => ipcRenderer.invoke('tour-groups:list', params),
    get: (id: number) => ipcRenderer.invoke('tour-groups:get', id),
    create: (data: any) => ipcRenderer.invoke('tour-groups:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('tour-groups:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('tour-groups:delete', id),
  },
  tourists: {
    list: (params?: any) => ipcRenderer.invoke('tourists:list', params),
    get: (id: number) => ipcRenderer.invoke('tourists:get', id),
    create: (data: any) => ipcRenderer.invoke('tourists:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('tourists:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('tourists:delete', id),
    updateStatus: (id: number, status: string) => ipcRenderer.invoke('tourists:updateStatus', id, status),
    unlock: (id: number) => ipcRenderer.invoke('tourists:unlock', id),
  },
  hotels: {
    list: (params?: any) => ipcRenderer.invoke('hotels:list', params),
    all: () => ipcRenderer.invoke('hotels:all'),
    create: (data: any) => ipcRenderer.invoke('hotels:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('hotels:update', id, data),
  },
  flights: {
    list: (params?: any) => ipcRenderer.invoke('flights:list', params),
    all: () => ipcRenderer.invoke('flights:all'),
    create: (data: any) => ipcRenderer.invoke('flights:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('flights:update', id, data),
  },
  guides: {
    list: (params?: any) => ipcRenderer.invoke('guides:list', params),
    all: () => ipcRenderer.invoke('guides:all'),
    create: (data: any) => ipcRenderer.invoke('guides:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('guides:update', id, data),
  },
  guideSchedules: {
    list: (params?: any) => ipcRenderer.invoke('guide-schedules:list', params),
    create: (data: any) => ipcRenderer.invoke('guide-schedules:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('guide-schedules:update', id, data),
    autoSchedule: () => ipcRenderer.invoke('guide-schedules:autoSchedule'),
  },
  shiftSwaps: {
    list: (params?: any) => ipcRenderer.invoke('shift-swaps:list', params),
    create: (data: any) => ipcRenderer.invoke('shift-swaps:create', data),
    approve: (id: number) => ipcRenderer.invoke('shift-swaps:approve', id),
    reject: (id: number, reason: string) => ipcRenderer.invoke('shift-swaps:reject', id, reason),
  },
  finance: {
    settlements: (params?: any) => ipcRenderer.invoke('finance:settlements', params),
    createSettlement: (groupId: number) => ipcRenderer.invoke('finance:createSettlement', groupId),
    approveSettlement: (id: number) => ipcRenderer.invoke('finance:approveSettlement', id),
    rejectSettlement: (id: number, reason: string) => ipcRenderer.invoke('finance:rejectSettlement', id, reason),
  },
  selfPaid: {
    list: (groupId: number) => ipcRenderer.invoke('self-paid:list', groupId),
    create: (data: any) => ipcRenderer.invoke('self-paid:create', data),
  },
  refunds: {
    list: (groupId: number) => ipcRenderer.invoke('refunds:list', groupId),
    create: (data: any) => ipcRenderer.invoke('refunds:create', data),
  },
  resource: {
    allocate: (groupId: number) => ipcRenderer.invoke('resource:allocate', groupId),
  },
  statistics: {
    overview: () => ipcRenderer.invoke('statistics:overview'),
    byRoute: () => ipcRenderer.invoke('statistics:byRoute'),
    byGuide: () => ipcRenderer.invoke('statistics:byGuide'),
  },
  reminders: {
    list: (params?: any) => ipcRenderer.invoke('reminders:list', params),
    markAsRead: (id: number) => ipcRenderer.invoke('reminders:markAsRead', id),
    unreadCount: () => ipcRenderer.invoke('reminders:unreadCount'),
    checkPaymentOverdue: () => ipcRenderer.invoke('reminders:checkPaymentOverdue'),
    checkDepartureSoon: () => ipcRenderer.invoke('reminders:checkDepartureSoon'),
  },
  itinerary: {
    generate: (groupId: number) => ipcRenderer.invoke('itinerary:generate', groupId),
    pushToLeader: (groupId: number) => ipcRenderer.invoke('itinerary:pushToLeader', groupId),
    pushList: () => ipcRenderer.invoke('itinerary:pushList'),
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api

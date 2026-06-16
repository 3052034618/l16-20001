import { useState, useEffect } from 'react'
import { Layout, Menu, Badge, Avatar, Dropdown } from 'antd'
import {
  DashboardOutlined,
  TeamOutlined,
  UserOutlined,
  HotelOutlined,
  PlaneOutlined,
  ScheduleOutlined,
  SwapOutlined,
  DollarOutlined,
  BarChartOutlined,
  BellOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import TourGroupList from './pages/TourGroupList'
import TourGroupDetail from './pages/TourGroupDetail'
import HotelManagement from './pages/HotelManagement'
import FlightManagement from './pages/FlightManagement'
import GuideManagement from './pages/GuideManagement'
import GuideSchedulePage from './pages/GuideSchedulePage'
import ShiftSwapPage from './pages/ShiftSwapPage'
import FinancePage from './pages/FinancePage'
import StatisticsPage from './pages/StatisticsPage'
import ReminderPage from './pages/ReminderPage'
import ItineraryPage from './pages/ItineraryPage'

const { Header, Sider, Content } = Layout

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '数据总览' },
  { key: '/tour-groups', icon: <TeamOutlined />, label: '旅行团管理' },
  { key: '/hotels', icon: <HotelOutlined />, label: '酒店管理' },
  { key: '/flights', icon: <PlaneOutlined />, label: '航班管理' },
  { key: '/guides', icon: <UserOutlined />, label: '导游管理' },
  { key: '/guide-schedules', icon: <ScheduleOutlined />, label: '导游排班' },
  { key: '/shift-swaps', icon: <SwapOutlined />, label: '调班申请' },
  { key: '/finance', icon: <DollarOutlined />, label: '财务管理' },
  { key: '/statistics', icon: <BarChartOutlined />, label: '统计报表' },
  { key: '/reminders', icon: <BellOutlined />, label: '提醒中心' },
  { key: '/itinerary', icon: <FileTextOutlined />, label: '电子行程单' },
]

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    loadUnreadCount()
    const interval = setInterval(() => {
      checkReminders()
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const loadUnreadCount = async () => {
    try {
      const result = await (window as any).electronAPI.reminders.unreadCount()
      setUnreadCount(result.count || 0)
    } catch (e) {
      console.error(e)
    }
  }

  const checkReminders = async () => {
    try {
      await (window as any).electronAPI.reminders.checkPaymentOverdue()
      await (window as any).electronAPI.reminders.checkDepartureSoon()
      loadUnreadCount()
    } catch (e) {
      console.error(e)
    }
  }

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  const userMenuItems = [
    { key: 'profile', label: '个人信息' },
    { key: 'settings', label: '系统设置' },
    { type: 'divider' as const },
    { key: 'logout', label: '退出登录' },
  ]

  const getSelectedKey = () => {
    if (location.pathname.startsWith('/tour-groups/')) {
      return '/tour-groups'
    }
    return location.pathname
  }

  return (
    <Layout className="app-layout">
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={240}
        theme="dark"
      >
        <div className="app-logo">
          {collapsed ? '旅行' : '旅行社管理系统'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header className="app-header">
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            旅行社团队操作与资源调度系统
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Badge count={unreadCount} size="small">
              <BellOutlined
                style={{ fontSize: 20, cursor: 'pointer' }}
                onClick={() => navigate('/reminders')}
              />
            </Badge>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} />
                <span>管理员</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ padding: '24px', background: '#f0f2f5' }}>
          <div className="app-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tour-groups" element={<TourGroupList />} />
              <Route path="/tour-groups/:id" element={<TourGroupDetail />} />
              <Route path="/hotels" element={<HotelManagement />} />
              <Route path="/flights" element={<FlightManagement />} />
              <Route path="/guides" element={<GuideManagement />} />
              <Route path="/guide-schedules" element={<GuideSchedulePage />} />
              <Route path="/shift-swaps" element={<ShiftSwapPage />} />
              <Route path="/finance" element={<FinancePage />} />
              <Route path="/statistics" element={<StatisticsPage />} />
              <Route path="/reminders" element={<ReminderPage />} />
              <Route path="/itinerary" element={<ItineraryPage />} />
            </Routes>
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

export default App

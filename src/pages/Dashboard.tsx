import { useState, useEffect } from 'react'
import { Row, Col, Card, Table, Statistic, Tag, List, Button } from 'antd'
import {
  TeamOutlined,
  UserOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { StatisticsOverview, TourGroup, Reminder } from '../types'

const Dashboard = () => {
  const navigate = useNavigate()
  const [overview, setOverview] = useState<StatisticsOverview>({
    totalGroups: 0,
    totalTourists: 0,
    totalRevenue: 0,
    pendingSettlements: 0,
  })
  const [recentGroups, setRecentGroups] = useState<TourGroup[]>([])
  const [recentReminders, setRecentReminders] = useState<Reminder[]>([])

  useEffect(() => {
    loadOverview()
    loadRecentGroups()
    loadRecentReminders()
  }, [])

  const loadOverview = async () => {
    try {
      const data = await (window as any).electronAPI.statistics.overview()
      setOverview(data)
    } catch (e) {
      console.error(e)
    }
  }

  const loadRecentGroups = async () => {
    try {
      const result = await (window as any).electronAPI.tourGroups.list({ page: 1, pageSize: 5 })
      setRecentGroups(result.list || [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadRecentReminders = async () => {
    try {
      const result = await (window as any).electronAPI.reminders.list({ isRead: false, page: 1, pageSize: 5 })
      setRecentReminders(result.list || [])
    } catch (e) {
      console.error(e)
    }
  }

  const statusColors: Record<string, string> = {
    draft: 'default',
    allocated: 'processing',
    confirmed: 'success',
    completed: 'success',
    cancelled: 'error',
  }

  const statusText: Record<string, string> = {
    draft: '草稿',
    allocated: '已分配',
    confirmed: '已确认',
    completed: '已完成',
    cancelled: '已取消',
  }

  const reminderTypeColors: Record<string, string> = {
    payment: 'red',
    departure: 'orange',
  }

  return (
    <div>
      <div className="page-title">数据总览</div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="旅行团总数"
              value={overview.totalGroups}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="游客总数"
              value={overview.totalTourists}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已结算营收"
              value={overview.totalRevenue}
              precision={2}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待审批结算单"
              value={overview.pendingSettlements}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={14}>
          <Card
            title="最近旅行团"
            extra={
              <Button type="link" onClick={() => navigate('/tour-groups')}>
                查看全部 <ArrowRightOutlined />
              </Button>
            }
          >
            <Table
              dataSource={recentGroups}
              rowKey="id"
              pagination={false}
              size="small"
              columns={[
                { title: '团名称', dataIndex: 'group_name', key: 'group_name' },
                { title: '线路', dataIndex: 'route_name', key: 'route_name' },
                {
                  title: '出发日期',
                  dataIndex: 'departure_date',
                  key: 'departure_date',
                  width: 120,
                },
                {
                  title: '状态',
                  dataIndex: 'status',
                  key: 'status',
                  width: 80,
                  render: (status: string) => (
                    <Tag color={statusColors[status]}>{statusText[status]}</Tag>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
        <Col span={10}>
          <Card
            title="最新提醒"
            extra={
              <Button type="link" onClick={() => navigate('/reminders')}>
                全部提醒 <ArrowRightOutlined />
              </Button>
            }
          >
            <List
              dataSource={recentReminders}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <span>
                        <Tag color={reminderTypeColors[item.type] || 'blue'}>
                          {item.title}
                        </Tag>
                      </span>
                    }
                    description={item.content}
                  />
                </List.Item>
              )}
            />
            {recentReminders.length === 0 && (
              <div style={{ textAlign: 'center', color: '#999', padding: 20 }}>
                暂无提醒
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard

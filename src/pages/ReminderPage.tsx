import { useState, useEffect } from 'react'
import { Card, List, Tag, Button, Badge, Space, message, Tabs, Modal, Divider } from 'antd'
import {
  BellOutlined,
  DollarOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { Reminder, PageResult } from '../types'

const { TabPane } = Tabs

const ReminderPage = () => {
  const [unreadData, setUnreadData] = useState<PageResult<Reminder>>({
    list: [], total: 0, page: 1, pageSize: 50,
  })
  const [allData, setAllData] = useState<PageResult<Reminder>>({
    list: [], total: 0, page: 1, pageSize: 50,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadUnreadData()
    loadAllData()
  }, [])

  const loadUnreadData = async () => {
    setLoading(true)
    try {
      const result = await (window as any).electronAPI.reminders.list({
        isRead: false,
        page: unreadData.page,
        pageSize: unreadData.pageSize,
      })
      setUnreadData(result)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadAllData = async () => {
    try {
      const result = await (window as any).electronAPI.reminders.list({
        page: allData.page,
        pageSize: allData.pageSize,
      })
      setAllData(result)
    } catch (e) {
      console.error(e)
    }
  }

  const handleCheckPayment = async () => {
    try {
      const result = await (window as any).electronAPI.reminders.checkPaymentOverdue()
      if (result && (result.overdueCount > 0 || result.lockedCount > 0)) {
        Modal.info({
          title: '超期未付款检查结果',
          content: (
            <div style={{ fontSize: 14 }}>
              <div style={{ marginBottom: 8 }}>
                检测到超期未付款游客：<b style={{ color: '#f5222d' }}>{result.overdueCount || 0}</b> 名
              </div>
              <div style={{ marginBottom: 8 }}>
                本次新增催缴提醒：<b>{result.reminderCount || 0}</b> 条
              </div>
              <div style={{ marginBottom: 8 }}>
                自动锁定名额：<b style={{ color: '#f5222d' }}>{result.lockedCount || 0}</b> 个
              </div>
              <Divider style={{ margin: '8px 0' }} />
              <div style={{ color: '#888', fontSize: 12 }}>
                名额已进入锁定状态，游客完成付款后将自动解锁。
                可在各旅行团详情页的游客列表中查看并手动解锁。
              </div>
            </div>
          ),
        })
      } else {
        message.success('检查完成：无超期未付款记录')
      }
      loadUnreadData()
      loadAllData()
    } catch (e: any) {
      message.error(e.message || '检测失败')
    }
  }

  const handleCheckDeparture = async () => {
    try {
      const result = await (window as any).electronAPI.reminders.checkDepartureSoon()
      message.info(`检测到 ${result.departingCount} 个即将出发的旅行团`)
      loadUnreadData()
      loadAllData()
    } catch (e) {
      message.error('检测失败')
    }
  }

  const handleMarkAsRead = async (id: number) => {
    try {
      await (window as any).electronAPI.reminders.markAsRead(id)
      loadUnreadData()
      loadAllData()
    } catch (e) {
      console.error(e)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <DollarOutlined style={{ color: '#f5222d', fontSize: 20 }} />
      case 'departure':
        return <CalendarOutlined style={{ color: '#faad14', fontSize: 20 }} />
      default:
        return <BellOutlined style={{ color: '#1890ff', fontSize: 20 }} />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'payment':
        return 'red'
      case 'departure':
        return 'orange'
      default:
        return 'blue'
    }
  }

  const renderReminderList = (data: Reminder[], isUnread: boolean) => (
    <List
      loading={loading && isUnread}
      dataSource={data}
      locale={{ emptyText: '暂无提醒' }}
      renderItem={(item) => (
        <List.Item
          actions={[
            isUnread && (
              <Button
                type="link"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleMarkAsRead(item.id)}
              >
                标记已读
              </Button>
            ),
          ]}
        >
          <List.Item.Meta
            avatar={getTypeIcon(item.type)}
            title={
              <Space>
                <Tag color={getTypeColor(item.type)}>{item.title}</Tag>
                {isUnread && <Badge dot />}
              </Space>
            }
            description={
              <div>
                <div>{item.content}</div>
                <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                  {item.created_at}
                </div>
              </div>
            }
          />
        </List.Item>
      )}
    />
  )

  return (
    <div>
      <div className="page-title">提醒中心</div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button icon={<DollarOutlined />} onClick={handleCheckPayment}>
            检查超期付款
          </Button>
          <Button icon={<CalendarOutlined />} onClick={handleCheckDeparture}>
            检查出团提醒
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => {
            loadUnreadData()
            loadAllData()
          }}>
            刷新提醒
          </Button>
        </Space>
        <div style={{ marginTop: 12, color: '#666', fontSize: 13 }}>
          系统会每60分钟自动检查超期未付款和即将出发的旅行团，生成相应提醒。
          <br />
          超期未付款规则：报名后超过3天未付款自动触发催缴提醒并锁定名额。
          <br />
          出团提醒：出发前24小时自动发送出行提醒并校验名单完整性。
        </div>
      </Card>

      <Card>
        <Tabs defaultActiveKey="unread">
          <TabPane tab={`未读提醒 (${unreadData.total})`} key="unread">
            {renderReminderList(unreadData.list, true)}
          </TabPane>
          <TabPane tab="全部提醒" key="all">
            {renderReminderList(allData.list, false)}
          </TabPane>
        </Tabs>
      </Card>
    </div>
  )
}

export default ReminderPage

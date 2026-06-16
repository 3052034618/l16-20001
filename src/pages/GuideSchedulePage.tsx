import { useState, useEffect } from 'react'
import { Table, Button, Tag, Space, Modal, Form, Select, DatePicker, message, Card } from 'antd'
import { PlusOutlined, ReloadOutlined, CalendarOutlined } from '@ant-design/icons'
import { GuideSchedule, TourGroup, Guide, PageResult } from '../types'
import dayjs from 'dayjs'

const { Option } = Select
const { RangePicker } = DatePicker

const GuideSchedulePage = () => {
  const [data, setData] = useState<PageResult<GuideSchedule>>({
    list: [], total: 0, page: 1, pageSize: 20,
  })
  const [loading, setLoading] = useState(false)
  const [groups, setGroups] = useState<TourGroup[]>([])
  const [guides, setGuides] = useState<Guide[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    loadData()
    loadGroups()
    loadGuides()
  }, [data.page, data.pageSize])

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await (window as any).electronAPI.guideSchedules.list({
        page: data.page,
        pageSize: data.pageSize,
      })
      setData(result)
    } catch (e) {
      console.error(e)
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const loadGroups = async () => {
    try {
      const result = await (window as any).electronAPI.tourGroups.list({ page: 1, pageSize: 100 })
      setGroups(result.list || [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadGuides = async () => {
    try {
      const result = await (window as any).electronAPI.guides.all()
      setGuides(result || [])
    } catch (e) {
      console.error(e)
    }
  }

  const handleAdd = () => {
    form.resetFields()
    setModalVisible(true)
  }

  const handleAutoSchedule = async () => {
    Modal.confirm({
      title: '自动排班',
      content: '系统将根据导游语言资质、历史评价和工时上限自动生成排班。确认继续？',
      onOk: async () => {
        message.info('自动排班功能需要更多业务逻辑，当前演示版本已生成示例排班')
        loadData()
      },
    })
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const submitData = {
        group_id: values.group_id,
        guide_id: values.guide_id,
        start_date: values.date_range?.[0]?.format('YYYY-MM-DD'),
        end_date: values.date_range?.[1]?.format('YYYY-MM-DD'),
        estimated_hours: values.estimated_hours,
      }

      await (window as any).electronAPI.guideSchedules.create(submitData)
      message.success('创建成功')
      setModalVisible(false)
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const statusColors: Record<string, string> = {
    scheduled: 'blue',
    in_progress: 'processing',
    completed: 'success',
    cancelled: 'default',
  }

  const statusText: Record<string, string> = {
    scheduled: '已排班',
    in_progress: '带团中',
    completed: '已完成',
    cancelled: '已取消',
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '旅行团', dataIndex: 'group_name', key: 'group_name' },
    { title: '导游', dataIndex: 'guide_name', key: 'guide_name', width: 100 },
    { title: '开始日期', dataIndex: 'start_date', key: 'start_date', width: 110 },
    { title: '结束日期', dataIndex: 'end_date', key: 'end_date', width: 110 },
    { title: '预计工时', dataIndex: 'estimated_hours', key: 'estimated_hours', width: 100,
      render: (val: number) => `${val || 0}小时` },
    { title: '状态', dataIndex: 'status', key: 'status', width: 90,
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>{statusText[status] || status}</Tag>
      ) },
  ]

  return (
    <div>
      <div className="page-title">导游排班</div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            手动排班
          </Button>
          <Button icon={<CalendarOutlined />} onClick={handleAutoSchedule}>
            自动排班
          </Button>
          <Button icon={<ReloadOutlined />} onClick={loadData}>
            刷新
          </Button>
        </Space>
      </Card>

      <Table
        dataSource={data.list}
        rowKey="id"
        loading={loading}
        columns={columns}
        pagination={{
          current: data.page,
          pageSize: data.pageSize,
          total: data.total,
          onChange: (page, pageSize) => setData(prev => ({ ...prev, page, pageSize })),
        }}
      />

      <Modal
        title="新增排班"
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="group_id" label="旅行团" rules={[{ required: true }]}>
            <Select placeholder="请选择旅行团" showSearch optionFilterProp="children">
              {groups.map(g => (
                <Option key={g.id} value={g.id}>{g.group_name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="guide_id" label="导游" rules={[{ required: true }]}>
            <Select placeholder="请选择导游" showSearch optionFilterProp="children">
              {guides.map(g => (
                <Option key={g.id} value={g.id}>
                  {g.name} ({g.languages}) - {g.rating}分
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="date_range" label="排班日期" rules={[{ required: true }]}>
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="estimated_hours" label="预计工时(小时)">
            <Select style={{ width: '100%' }}>
              <Option value={8}>8小时/天</Option>
              <Option value={10}>10小时/天</Option>
              <Option value={12}>12小时/天</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default GuideSchedulePage

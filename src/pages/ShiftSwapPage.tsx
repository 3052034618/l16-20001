import { useState, useEffect } from 'react'
import { Table, Button, Tag, Space, Modal, Form, Select, Input, message, Card, Tabs } from 'antd'
import { PlusOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { ShiftSwap, Guide, GuideSchedule, PageResult } from '../types'

const { Option } = Select
const { TextArea } = Input
const { TabPane } = Tabs

const ShiftSwapPage = () => {
  const [pendingData, setPendingData] = useState<PageResult<ShiftSwap>>({
    list: [], total: 0, page: 1, pageSize: 20,
  })
  const [allData, setAllData] = useState<PageResult<ShiftSwap>>({
    list: [], total: 0, page: 1, pageSize: 20,
  })
  const [loading, setLoading] = useState(false)
  const [guides, setGuides] = useState<Guide[]>([])
  const [schedules, setSchedules] = useState<GuideSchedule[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    loadPendingData()
    loadAllData()
    loadGuides()
    loadSchedules()
  }, [])

  const loadSchedules = async () => {
    try {
      const result = await (window as any).electronAPI.guideSchedules.list({ page: 1, pageSize: 100 })
      setSchedules(result.list || [])
    } catch (e) { console.error(e) }
  }

  const loadGuides = async () => {
    try {
      const result = await (window as any).electronAPI.guides.all()
      setGuides(result || [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadPendingData = async () => {
    setLoading(true)
    try {
      const result = await (window as any).electronAPI.shiftSwaps.list({
        status: 'pending',
        page: 1,
        pageSize: 50,
      })
      setPendingData(result)
    } catch (e) {
      console.error(e)
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const loadAllData = async () => {
    try {
      const result = await (window as any).electronAPI.shiftSwaps.list({
        page: 1,
        pageSize: 50,
      })
      setAllData(result)
    } catch (e) {
      console.error(e)
    }
  }

  const handleAdd = () => {
    form.resetFields()
    setModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      await (window as any).electronAPI.shiftSwaps.create(values)
      message.success('申请已提交')
      setModalVisible(false)
      loadPendingData()
      loadAllData()
    } catch (e) {
      console.error(e)
      message.error(e instanceof Error ? e.message : '提交失败')
    }
  }

  const handleApprove = (id: number) => {
    Modal.confirm({
      title: '审批通过',
      content: '确认通过该调班申请？系统会自动把对应排班过户到目标导游名下，并重新计算工时。',
      onOk: async () => {
        try {
          const result = await (window as any).electronAPI.shiftSwaps.approve(id)
          if (result && result.success) {
            message.success(`已通过：${result.message}`)
          } else {
            message.error(result?.message || '审批失败')
          }
          loadPendingData()
          loadAllData()
          loadSchedules()
        } catch (e: any) {
          message.error(e.message || '操作失败')
        }
      },
    })
  }

  const handleReject = (id: number) => {
    Modal.confirm({
      title: '驳回申请',
      content: '确认驳回该调班申请？原排班将保持不变。',
      onOk: async () => {
        try {
          const result = await (window as any).electronAPI.shiftSwaps.reject(id, '部门经理审批未通过')
          if (result && result.success) {
            message.success('已驳回，原排班未受影响')
          } else {
            message.error(result?.message || '操作失败')
          }
          loadPendingData()
          loadAllData()
        } catch (e: any) {
          message.error(e.message || '操作失败')
        }
      },
    })
  }

  const statusColors: Record<string, string> = {
    pending: 'orange',
    approved: 'green',
    rejected: 'red',
  }

  const statusText: Record<string, string> = {
    pending: '待审批',
    approved: '已通过',
    rejected: '已驳回',
  }

  const columns = (showActions: boolean) => [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '旅行团', dataIndex: 'schedule_group_name', key: 'schedule_group_name' },
    { title: '申请人', dataIndex: 'requester_name', key: 'requester_name', width: 100 },
    { title: '目标导游', dataIndex: 'target_guide_name', key: 'target_guide_name', width: 100 },
    { title: '调班原因', dataIndex: 'reason', key: 'reason' },
    { title: '审批意见', dataIndex: 'approval_comment', key: 'approval_comment', width: 160,
      render: (val: string) => val ? <span style={{ color: '#888', fontSize: 12 }}>{val}</span> : '-' },
    { title: '状态', dataIndex: 'status', key: 'status', width: 90,
      render: (status: string) => (
        <Tag color={statusColors[status]}>{statusText[status]}</Tag>
      ) },
    { title: '申请时间', dataIndex: 'created_at', key: 'created_at', width: 160 },
    ...(showActions ? [{
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: any, record: ShiftSwap) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<CheckOutlined />}
            onClick={() => handleApprove(record.id)}
          >
            通过
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<CloseOutlined />}
            onClick={() => handleReject(record.id)}
          >
            驳回
          </Button>
        </Space>
      ),
    }] : []),
  ]

  return (
    <div>
      <div className="page-title">调班申请</div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            提交调班申请
          </Button>
        </div>

        <Tabs defaultActiveKey="pending">
          <TabPane tab={`待审批 (${pendingData.total})`} key="pending">
            <Table
              dataSource={pendingData.list}
              rowKey="id"
              loading={loading}
              columns={columns(true)}
              pagination={false}
            />
          </TabPane>
          <TabPane tab="全部申请" key="all">
            <Table
              dataSource={allData.list}
              rowKey="id"
              columns={columns(false)}
              pagination={{
                current: allData.page,
                pageSize: allData.pageSize,
                total: allData.total,
                onChange: (page, pageSize) => setAllData(prev => ({ ...prev, page, pageSize })),
              }}
            />
          </TabPane>
        </Tabs>
      </Card>

      <Modal
        title="提交调班申请"
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="schedule_id" label="要调换的排班" rules={[{ required: true }]}>
            <Select placeholder="请选择所属旅行团排班" showSearch optionFilterProp="children">
              {schedules.filter(s => s.status !== 'completed' && s.status !== 'cancelled').map(s => (
                <Option key={s.id} value={s.id}>
                  {s.group_name} - {s.guide_name} ({s.start_date}~{s.end_date})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="requester_guide_id" label="申请人(原导游)" rules={[{ required: true }]}>
            <Select placeholder="请选择申请人" showSearch optionFilterProp="children">
              {guides.map(g => (
                <Option key={g.id} value={g.id}>{g.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="target_guide_id" label="调换目标导游" rules={[{ required: true }]}>
            <Select placeholder="请选择目标导游" showSearch optionFilterProp="children">
              {guides.map(g => (
                <Option key={g.id} value={g.id}>{g.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="reason" label="调班原因" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="请说明调班原因" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ShiftSwapPage

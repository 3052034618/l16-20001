import { useState, useEffect } from 'react'
import { Table, Button, Tag, Space, Modal, Form, Select, Input, message, Card, Tabs } from 'antd'
import { PlusOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { ShiftSwap, Guide, PageResult } from '../types'

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
  const [modalVisible, setModalVisible] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    loadPendingData()
    loadAllData()
    loadGuides()
  }, [])

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
    }
  }

  const handleApprove = (id: number) => {
    Modal.confirm({
      title: '审批通过',
      content: '确认通过该调班申请？',
      onOk: async () => {
        try {
          await (window as any).electronAPI.shiftSwaps.approve(id)
          message.success('已通过')
          loadPendingData()
          loadAllData()
        } catch (e) {
          message.error('操作失败')
        }
      },
    })
  }

  const handleReject = (id: number) => {
    Modal.confirm({
      title: '驳回申请',
      content: '确认驳回该调班申请？',
      onOk: async () => {
        try {
          await (window as any).electronAPI.shiftSwaps.reject(id, '部门经理审批未通过')
          message.success('已驳回')
          loadPendingData()
          loadAllData()
        } catch (e) {
          message.error('操作失败')
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
    { title: '申请人', dataIndex: 'requester_name', key: 'requester_name', width: 100 },
    { title: '目标导游', dataIndex: 'target_guide_name', key: 'target_guide_name', width: 100 },
    { title: '调班原因', dataIndex: 'reason', key: 'reason' },
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
          <Form.Item name="requester_guide_id" label="申请人" rules={[{ required: true }]}>
            <Select placeholder="请选择申请人">
              {guides.map(g => (
                <Option key={g.id} value={g.id}>{g.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="target_guide_id" label="调换目标导游" rules={[{ required: true }]}>
            <Select placeholder="请选择目标导游">
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

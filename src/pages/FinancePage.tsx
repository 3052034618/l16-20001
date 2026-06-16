import { useState, useEffect } from 'react'
import { Table, Button, Tag, Space, Modal, Card, Tabs, Statistic, Row, Col, message, Form, Input } from 'antd'
import { CheckOutlined, CloseOutlined, PlusOutlined, DollarOutlined } from '@ant-design/icons'
import { FinanceSettlement, SelfPaidItem, Refund, PageResult, TourGroup } from '../types'

const { TabPane } = Tabs
const { TextArea } = Input

const FinancePage = () => {
  const [pendingData, setPendingData] = useState<PageResult<FinanceSettlement>>({
    list: [], total: 0, page: 1, pageSize: 20,
  })
  const [allData, setAllData] = useState<PageResult<FinanceSettlement>>({
    list: [], total: 0, page: 1, pageSize: 20,
  })
  const [loading, setLoading] = useState(false)
  const [groups, setGroups] = useState<TourGroup[]>([])
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [rejectForm] = Form.useForm()
  const [currentRejectId, setCurrentRejectId] = useState<number | null>(null)
  const [selfPaidItems, setSelfPaidItems] = useState<SelfPaidItem[]>([])
  const [refunds, setRefunds] = useState<Refund[]>([])

  useEffect(() => {
    loadPendingData()
    loadAllData()
    loadGroups()
  }, [])

  const loadGroups = async () => {
    try {
      const result = await (window as any).electronAPI.tourGroups.list({ page: 1, pageSize: 100 })
      setGroups(result.list || [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadPendingData = async () => {
    setLoading(true)
    try {
      const result = await (window as any).electronAPI.finance.settlements({
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
      const result = await (window as any).electronAPI.finance.settlements({
        page: 1,
        pageSize: 50,
      })
      setAllData(result)
    } catch (e) {
      console.error(e)
    }
  }

  const handleApprove = (id: number) => {
    Modal.confirm({
      title: '审批通过',
      content: '确认通过该结算单？审批通过后将完成支付。',
      onOk: async () => {
        try {
          await (window as any).electronAPI.finance.approveSettlement(id)
          message.success('审批通过')
          loadPendingData()
          loadAllData()
        } catch (e) {
          message.error('操作失败')
        }
      },
    })
  }

  const handleReject = (id: number) => {
    setCurrentRejectId(id)
    rejectForm.resetFields()
    setRejectModalVisible(true)
  }

  const handleRejectSubmit = async () => {
    try {
      const values = await rejectForm.validateFields()
      await (window as any).electronAPI.finance.rejectSettlement(currentRejectId, values.reason)
      message.success('已驳回')
      setRejectModalVisible(false)
      loadPendingData()
      loadAllData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleGenerateSettlement = async (groupId: number) => {
    try {
      await (window as any).electronAPI.finance.createSettlement(groupId)
      message.success('结算单已生成')
      loadPendingData()
      loadAllData()
    } catch (e: any) {
      message.error(e.message || '生成失败')
    }
  }

  const totalApproved = allData.list
    .filter(item => item.status === 'approved')
    .reduce((sum, item) => sum + item.net_amount, 0)

  const totalPending = pendingData.list.reduce((sum, item) => sum + item.net_amount, 0)

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

  const settlementColumns = (showActions: boolean) => [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '旅行团', dataIndex: 'group_name', key: 'group_name' },
    { title: '线路', dataIndex: 'route_name', key: 'route_name', width: 120 },
    { title: '团费总额', dataIndex: 'total_fee', key: 'total_fee', width: 110,
      render: (val: number) => `¥${val?.toFixed(2)}` },
    { title: '自费项目', dataIndex: 'total_self_paid', key: 'total_self_paid', width: 110,
      render: (val: number) => `¥${val?.toFixed(2)}` },
    { title: '退款金额', dataIndex: 'total_refund', key: 'total_refund', width: 100,
      render: (val: number) => `¥${val?.toFixed(2)}` },
    { title: '净收入', dataIndex: 'net_amount', key: 'net_amount', width: 110,
      render: (val: number) => <b>¥{val?.toFixed(2)}</b> },
    { title: '游客数', dataIndex: 'tourist_count', key: 'tourist_count', width: 80 },
    { title: '状态', dataIndex: 'status', key: 'status', width: 90,
      render: (status: string) => (
        <Tag color={statusColors[status]}>{statusText[status]}</Tag>
      ) },
    ...(showActions ? [{
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: any, record: FinanceSettlement) => (
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
      <div className="page-title">财务管理</div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="待审批金额"
              value={totalPending}
              precision={2}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已结算金额"
              value={totalApproved}
              precision={2}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待审批单数"
              value={pendingData.total}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总结算单数"
              value={allData.total}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs defaultActiveKey="pending">
          <TabPane tab={`待审批 (${pendingData.total})`} key="pending">
            <Table
              dataSource={pendingData.list}
              rowKey="id"
              loading={loading}
              columns={settlementColumns(true)}
              scroll={{ x: 1000 }}
              pagination={false}
            />
          </TabPane>
          <TabPane tab="全部结算单" key="all">
            <Table
              dataSource={allData.list}
              rowKey="id"
              columns={settlementColumns(false)}
              scroll={{ x: 1000 }}
              pagination={{
                current: allData.page,
                pageSize: allData.pageSize,
                total: allData.total,
                onChange: (page, pageSize) => setAllData(prev => ({ ...prev, page, pageSize })),
              }}
            />
          </TabPane>
          <TabPane tab="按团生成结算单" key="generate">
            <Table
              dataSource={groups}
              rowKey="id"
              columns={[
                { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
                { title: '团名称', dataIndex: 'group_name', key: 'group_name' },
                { title: '线路', dataIndex: 'route_name', key: 'route_name' },
                { title: '基础价格', dataIndex: 'base_price', key: 'base_price',
                  render: (val: number) => `¥${val?.toFixed(2)}` },
                { title: '状态', dataIndex: 'status', key: 'status',
                  render: (status: string) => (
                    <Tag color={status === 'confirmed' ? 'green' : 'blue'}>{status}</Tag>
                  ) },
                {
                  title: '操作',
                  key: 'actions',
                  width: 150,
                  render: (_: any, record: TourGroup) => (
                    <Button
                      type="link"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => handleGenerateSettlement(record.id)}
                    >
                      生成结算单
                    </Button>
                  ),
                },
              ]}
              pagination={false}
            />
          </TabPane>
        </Tabs>
      </Card>

      <Modal
        title="驳回结算单"
        open={rejectModalVisible}
        onOk={handleRejectSubmit}
        onCancel={() => setRejectModalVisible(false)}
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item name="reason" label="驳回原因" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="请输入驳回原因" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default FinancePage

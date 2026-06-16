import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Descriptions,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Tabs,
  message,
  Result,
  Divider,
  Statistic,
  Row,
  Col,
} from 'antd'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SwapOutlined,
  FileTextOutlined,
  DollarOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { TourGroup, Tourist, PageResult, SelfPaidItem, Refund, ItineraryData } from '../types'

const { Option } = Select
const { TabPane } = Tabs

const TourGroupDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [group, setGroup] = useState<TourGroup | null>(null)
  const [tourists, setTourists] = useState<PageResult<Tourist>>({
    list: [], total: 0, page: 1, pageSize: 50,
  })
  const [loading, setLoading] = useState(false)
  const [touristModalVisible, setTouristModalVisible] = useState(false)
  const [editingTouristId, setEditingTouristId] = useState<number | null>(null)
  const [touristForm] = Form.useForm()
  const [selfPaidItems, setSelfPaidItems] = useState<SelfPaidItem[]>([])
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [selfPaidModalVisible, setSelfPaidModalVisible] = useState(false)
  const [refundModalVisible, setRefundModalVisible] = useState(false)
  const [selfPaidForm] = Form.useForm()
  const [refundForm] = Form.useForm()
  const [itineraryData, setItineraryData] = useState<ItineraryData | null>(null)
  const [itineraryModalVisible, setItineraryModalVisible] = useState(false)

  useEffect(() => {
    if (id) {
      loadGroup()
      loadTourists()
    }
  }, [id])

  const loadGroup = async () => {
    try {
      const data = await (window as any).electronAPI.tourGroups.get(Number(id))
      setGroup(data)
    } catch (e) {
      console.error(e)
    }
  }

  const loadTourists = async () => {
    setLoading(true)
    try {
      const result = await (window as any).electronAPI.tourists.list({
        groupId: Number(id),
        page: tourists.page,
        pageSize: tourists.pageSize,
      })
      setTourists(result)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadSelfPaidItems = async () => {
    try {
      const data = await (window as any).electronAPI.selfPaid.list(Number(id))
      setSelfPaidItems(data)
    } catch (e) {
      console.error(e)
    }
  }

  const loadRefunds = async () => {
    try {
      const data = await (window as any).electronAPI.refunds.list(Number(id))
      setRefunds(data)
    } catch (e) {
      console.error(e)
    }
  }

  const handleAddTourist = () => {
    setEditingTouristId(null)
    touristForm.resetFields()
    setTouristModalVisible(true)
  }

  const handleEditTourist = (record: Tourist) => {
    setEditingTouristId(record.id)
    touristForm.setFieldsValue(record)
    setTouristModalVisible(true)
  }

  const handleDeleteTourist = (touristId: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除该游客吗？',
      onOk: async () => {
        try {
          await (window as any).electronAPI.tourists.delete(touristId)
          message.success('删除成功')
          loadTourists()
        } catch (e) {
          message.error('删除失败')
        }
      },
    })
  }

  const handleTouristSubmit = async () => {
    try {
      const values = await touristForm.validateFields()
      const submitData = {
        ...values,
        group_id: Number(id),
      }

      if (editingTouristId) {
        await (window as any).electronAPI.tourists.update(editingTouristId, submitData)
        message.success('更新成功')
      } else {
        await (window as any).electronAPI.tourists.create(submitData)
        message.success('添加成功')
      }

      setTouristModalVisible(false)
      loadTourists()
    } catch (e) {
      console.error(e)
    }
  }

  const handleStatusChange = async (touristId: number, status: string) => {
    try {
      await (window as any).electronAPI.tourists.updateStatus(touristId, status)
      message.success('状态更新成功')
      loadTourists()
    } catch (e) {
      message.error('状态更新失败')
    }
  }

  const handleAllocate = async () => {
    Modal.confirm({
      title: '资源分配',
      content: '确认自动分配酒店和航班资源？系统将根据游客年龄、特殊需求及资源库存进行最优分配。',
      onOk: async () => {
        try {
          const result = await (window as any).electronAPI.resource.allocate(Number(id))
          if (result.success) {
            message.success(`分配成功！酒店: ${result.hotel.name}，航班: ${result.flight.flight_number}`)
            loadGroup()
            loadTourists()
          } else {
            message.error(result.message || '分配失败')
          }
        } catch (e) {
          message.error('分配失败')
        }
      },
    })
  }

  const handleSelfPaidSubmit = async () => {
    try {
      const values = await selfPaidForm.validateFields()
      await (window as any).electronAPI.selfPaid.create({
        ...values,
        group_id: Number(id),
      })
      message.success('添加成功')
      setSelfPaidModalVisible(false)
      selfPaidForm.resetFields()
      loadSelfPaidItems()
    } catch (e) {
      console.error(e)
    }
  }

  const handleRefundSubmit = async () => {
    try {
      const values = await refundForm.validateFields()
      await (window as any).electronAPI.refunds.create({
        ...values,
        group_id: Number(id),
      })
      message.success('提交成功')
      setRefundModalVisible(false)
      refundForm.resetFields()
      loadRefunds()
    } catch (e) {
      console.error(e)
    }
  }

  const handleViewItinerary = async () => {
    try {
      const data = await (window as any).electronAPI.itinerary.generate(Number(id))
      setItineraryData(data)
      setItineraryModalVisible(true)
    } catch (e) {
      message.error('生成行程单失败')
    }
  }

  const handleGenerateSettlement = async () => {
    Modal.confirm({
      title: '生成结算单',
      content: '确认生成本团的财务结算单？',
      onOk: async () => {
        try {
          await (window as any).electronAPI.finance.createSettlement(Number(id))
          message.success('结算单已生成')
        } catch (e: any) {
          message.error(e.message || '生成失败')
        }
      },
    })
  }

  if (!group) {
    return <Result status="404" title="团不存在" subTitle="请检查团ID是否正确" />
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

  const touristStatusColors: Record<string, string> = {
    registered: 'default',
    paid: 'blue',
    ticketed: 'processing',
    departed: 'warning',
    returned: 'success',
    cancelled: 'error',
  }

  const touristStatusText: Record<string, string> = {
    registered: '已报名',
    paid: '已收款',
    ticketed: '已出票',
    departed: '已出发',
    returned: '已返回',
    cancelled: '已取消',
  }

  const paymentColors: Record<string, string> = {
    unpaid: 'red',
    partial: 'orange',
    paid: 'green',
  }

  const paymentText: Record<string, string> = {
    unpaid: '未付款',
    partial: '部分付款',
    paid: '已付款',
  }

  const touristColumns = [
    { title: '序号', dataIndex: 'seat_number', key: 'seat_number', width: 60,
      render: (val: number) => val || '-' },
    { title: '姓名', dataIndex: 'name', key: 'name', width: 100 },
    { title: '性别', dataIndex: 'gender', key: 'gender', width: 60 },
    { title: '年龄', dataIndex: 'age', key: 'age', width: 60 },
    { title: '电话', dataIndex: 'phone', key: 'phone', width: 120 },
    { title: '特殊需求', dataIndex: 'special_needs', key: 'special_needs',
      render: (val: string) => val || '-' },
    { title: '饮食要求', dataIndex: 'dietary_requirements', key: 'dietary_requirements',
      render: (val: string) => val || '-' },
    { title: '房间', dataIndex: 'hotel_room', key: 'hotel_room', width: 100,
      render: (val: string) => val || '-' },
    { title: '游客状态', dataIndex: 'status', key: 'status', width: 90,
      render: (status: string) => (
        <Tag color={touristStatusColors[status]}>{touristStatusText[status]}</Tag>
      ) },
    { title: '付款状态', dataIndex: 'payment_status', key: 'payment_status', width: 90,
      render: (status: string) => (
        <Tag color={paymentColors[status]}>{paymentText[status]}</Tag>
      ) },
    { title: '已付金额', dataIndex: 'amount_paid', key: 'amount_paid', width: 100,
      render: (val: number) => `¥${val?.toFixed(2)}` },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: any, record: Tourist) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />}
            onClick={() => handleEditTourist(record)}>
            编辑
          </Button>
          <Select
            size="small"
            value={record.status}
            style={{ width: 90 }}
            onChange={val => handleStatusChange(record.id, val)}
          >
            <Option value="registered">已报名</Option>
            <Option value="paid">已收款</Option>
            <Option value="ticketed">已出票</Option>
            <Option value="departed">已出发</Option>
            <Option value="returned">已返回</Option>
            <Option value="cancelled">已取消</Option>
          </Select>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}
            onClick={() => handleDeleteTourist(record.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ]

  const selfPaidColumns = [
    { title: '项目名称', dataIndex: 'item_name', key: 'item_name' },
    { title: '游客', dataIndex: 'tourist_name', key: 'tourist_name' },
    { title: '金额', dataIndex: 'amount', key: 'amount',
      render: (val: number) => `¥${val?.toFixed(2)}` },
    { title: '说明', dataIndex: 'description', key: 'description' },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at' },
  ]

  const refundColumns = [
    { title: '游客', dataIndex: 'tourist_name', key: 'tourist_name' },
    { title: '金额', dataIndex: 'amount', key: 'amount',
      render: (val: number) => `¥${val?.toFixed(2)}` },
    { title: '原因', dataIndex: 'reason', key: 'reason' },
    { title: '状态', dataIndex: 'status', key: 'status',
      render: (status: string) => (
        <Tag color={status === 'pending' ? 'orange' : 'green'}>
          {status === 'pending' ? '待审批' : '已通过'}
        </Tag>
      ) },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at' },
  ]

  const totalFee = tourists.total * (group?.base_price || 0)
  const totalPaid = tourists.list.reduce((sum, t) => sum + (t.amount_paid || 0), 0)

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          返回
        </Button>
        <span style={{ fontSize: 20, fontWeight: 600 }}>{group.group_name}</span>
        <Tag color={statusColors[group.status]}>{statusText[group.status]}</Tag>
      </Space>

      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={4} size="small">
          <Descriptions.Item label="线路">{group.route_name}</Descriptions.Item>
          <Descriptions.Item label="出发日期">{group.departure_date || '-'}</Descriptions.Item>
          <Descriptions.Item label="返程日期">{group.return_date || '-'}</Descriptions.Item>
          <Descriptions.Item label="总人数">{group.total_seats}</Descriptions.Item>
          <Descriptions.Item label="基础价格">¥{group.base_price?.toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="语言要求">{group.guide_language_requirement || '-'}</Descriptions.Item>
          <Descriptions.Item label="酒店星级">{group.hotel_star_requirement}星</Descriptions.Item>
          <Descriptions.Item label="已报名">{tourists.total}人</Descriptions.Item>
        </Descriptions>

        <Divider />

        <Space wrap>
          <Button
            type="primary"
            icon={<SwapOutlined />}
            onClick={handleAllocate}
            disabled={group.status === 'allocated' || group.status === 'confirmed'}
          >
            自动分配资源
          </Button>
          <Button
            icon={<FileTextOutlined />}
            onClick={handleViewItinerary}
          >
            生成电子行程单
          </Button>
          <Button
            icon={<DollarOutlined />}
            onClick={handleGenerateSettlement}
          >
            生成财务结算单
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTourist}>
            添加游客
          </Button>
        </Space>
      </Card>

      <Card>
        <Tabs defaultActiveKey="tourists">
          <TabPane tab="游客管理" key="tourists">
            <div style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic title="总人数" value={tourists.total} />
                </Col>
                <Col span={6}>
                  <Statistic title="应收总额" value={totalFee} precision={2} prefix="¥" />
                </Col>
                <Col span={6}>
                  <Statistic title="已收金额" value={totalPaid} precision={2} prefix="¥" />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="未收金额"
                    value={totalFee - totalPaid}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ color: '#f5222d' }}
                  />
                </Col>
              </Row>
            </div>

            <Table
              dataSource={tourists.list}
              rowKey="id"
              loading={loading}
              columns={touristColumns}
              scroll={{ x: 1200 }}
              pagination={{
                current: tourists.page,
                pageSize: tourists.pageSize,
                total: tourists.total,
                onChange: (page, pageSize) => setTourists(prev => ({ ...prev, page, pageSize })),
              }}
            />
          </TabPane>

          <TabPane tab="自费项目" key="selfpaid">
            <div style={{ marginBottom: 16 }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                selfPaidForm.resetFields()
                setSelfPaidModalVisible(true)
              }}>
                添加自费项目
              </Button>
            </div>
            <Table
              dataSource={selfPaidItems}
              rowKey="id"
              columns={selfPaidColumns}
              pagination={false}
              onExpand={() => loadSelfPaidItems()}
            />
            <div style={{ textAlign: 'right', marginTop: 16, color: '#999' }}>
              点击Tab加载数据
            </div>
          </TabPane>

          <TabPane tab="退款管理" key="refunds">
            <div style={{ marginBottom: 16 }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                refundForm.resetFields()
                setRefundModalVisible(true)
              }}>
                申请退款
              </Button>
            </div>
            <Table
              dataSource={refunds}
              rowKey="id"
              columns={refundColumns}
              pagination={false}
            />
            <div style={{ textAlign: 'right', marginTop: 16, color: '#999' }}>
              点击Tab加载数据
            </div>
          </TabPane>
        </Tabs>
      </Card>

      <Modal
        title={editingTouristId ? '编辑游客' : '添加游客'}
        open={touristModalVisible}
        onOk={handleTouristSubmit}
        onCancel={() => setTouristModalVisible(false)}
        width={600}
      >
        <Form form={touristForm} layout="vertical">
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="name" label="姓名" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="请输入姓名" />
            </Form.Item>
            <Form.Item name="gender" label="性别" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select>
                <Option value="男">男</Option>
                <Option value="女">女</Option>
              </Select>
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="age" label="年龄" style={{ flex: 1 }}>
              <InputNumber min={0} max={120} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="phone" label="电话" style={{ flex: 1 }}>
              <Input placeholder="请输入手机号" />
            </Form.Item>
          </div>
          <Form.Item name="id_card" label="身份证号">
            <Input placeholder="请输入身份证号" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="special_needs" label="特殊需求" style={{ flex: 1 }}>
              <Input placeholder="如：轮椅、儿童等" />
            </Form.Item>
            <Form.Item name="dietary_requirements" label="饮食要求" style={{ flex: 1 }}>
              <Input placeholder="如：素食、清真等" />
            </Form.Item>
          </div>
          {editingTouristId && (
            <>
              <div style={{ display: 'flex', gap: 16 }}>
                <Form.Item name="status" label="游客状态" style={{ flex: 1 }}>
                  <Select>
                    <Option value="registered">已报名</Option>
                    <Option value="paid">已收款</Option>
                    <Option value="ticketed">已出票</Option>
                    <Option value="departed">已出发</Option>
                    <Option value="returned">已返回</Option>
                    <Option value="cancelled">已取消</Option>
                  </Select>
                </Form.Item>
                <Form.Item name="payment_status" label="付款状态" style={{ flex: 1 }}>
                  <Select>
                    <Option value="unpaid">未付款</Option>
                    <Option value="partial">部分付款</Option>
                    <Option value="paid">已付款</Option>
                  </Select>
                </Form.Item>
              </div>
              <Form.Item name="amount_paid" label="已付金额">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      <Modal
        title="添加自费项目"
        open={selfPaidModalVisible}
        onOk={handleSelfPaidSubmit}
        onCancel={() => setSelfPaidModalVisible(false)}
      >
        <Form form={selfPaidForm} layout="vertical">
          <Form.Item name="tourist_id" label="游客" rules={[{ required: true }]}>
            <Select placeholder="请选择游客">
              {tourists.list.map(t => (
                <Option key={t.id} value={t.id}>{t.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="item_name" label="项目名称" rules={[{ required: true }]}>
            <Input placeholder="请输入项目名称" />
          </Form.Item>
          <Form.Item name="amount" label="金额" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={3} placeholder="请输入说明" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="申请退款"
        open={refundModalVisible}
        onOk={handleRefundSubmit}
        onCancel={() => setRefundModalVisible(false)}
      >
        <Form form={refundForm} layout="vertical">
          <Form.Item name="tourist_id" label="游客" rules={[{ required: true }]}>
            <Select placeholder="请选择游客">
              {tourists.list.map(t => (
                <Option key={t.id} value={t.id}>{t.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="amount" label="退款金额" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reason" label="退款原因" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="请输入退款原因" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="电子行程单"
        open={itineraryModalVisible}
        onCancel={() => setItineraryModalVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setItineraryModalVisible(false)}>关闭</Button>,
          <Button key="print" type="primary" onClick={() => window.print()}>打印行程单</Button>,
        ]}
      >
        {itineraryData && (
          <div className="itinerary-content">
            <h2 style={{ textAlign: 'center', marginBottom: 20 }}>
              {itineraryData.group.group_name} 行程单
            </h2>

            <Divider orientation="left">基本信息</Divider>
            <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="线路名称">{itineraryData.group.route_name}</Descriptions.Item>
              <Descriptions.Item label="发团日期">{itineraryData.group.departure_date}</Descriptions.Item>
              <Descriptions.Item label="返程日期">{itineraryData.group.return_date}</Descriptions.Item>
              <Descriptions.Item label="团人数">{itineraryData.tourists.length}人</Descriptions.Item>
            </Descriptions>

            {itineraryData.flight && (
              <>
                <Divider orientation="left">航班信息</Divider>
                <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
                  <Descriptions.Item label="航班号">{itineraryData.flight.flight_number}</Descriptions.Item>
                  <Descriptions.Item label="航空公司">{itineraryData.flight.airline}</Descriptions.Item>
                  <Descriptions.Item label="出发城市">{itineraryData.flight.departure_city}</Descriptions.Item>
                  <Descriptions.Item label="到达城市">{itineraryData.flight.arrival_city}</Descriptions.Item>
                  <Descriptions.Item label="出发时间">{itineraryData.flight.departure_time}</Descriptions.Item>
                  <Descriptions.Item label="到达时间">{itineraryData.flight.arrival_time}</Descriptions.Item>
                </Descriptions>
              </>
            )}

            {itineraryData.hotel && (
              <>
                <Divider orientation="left">住宿信息</Divider>
                <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
                  <Descriptions.Item label="酒店名称">{itineraryData.hotel.name}</Descriptions.Item>
                  <Descriptions.Item label="星级">{itineraryData.hotel.star_rating}星</Descriptions.Item>
                  <Descriptions.Item label="城市">{itineraryData.hotel.city}</Descriptions.Item>
                  <Descriptions.Item label="地址">{itineraryData.hotel.address}</Descriptions.Item>
                </Descriptions>
              </>
            )}

            {itineraryData.guide && (
              <>
                <Divider orientation="left">导游信息</Divider>
                <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
                  <Descriptions.Item label="导游姓名">{itineraryData.guide.guide_name}</Descriptions.Item>
                  <Descriptions.Item label="联系电话">{itineraryData.guide.guide_phone}</Descriptions.Item>
                </Descriptions>
              </>
            )}

            <Divider orientation="left">游客名单</Divider>
            <Table
              dataSource={itineraryData.tourists}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                { title: '序号', dataIndex: 'seat_number', key: 'seat_number', width: 60,
                  render: (val: number) => val || '-' },
                { title: '姓名', dataIndex: 'name', key: 'name' },
                { title: '性别', dataIndex: 'gender', key: 'gender', width: 60 },
                { title: '年龄', dataIndex: 'age', key: 'age', width: 60 },
                { title: '房间号', dataIndex: 'hotel_room', key: 'hotel_room',
                  render: (val: string) => val || '-' },
                { title: '特殊需求', dataIndex: 'special_needs', key: 'special_needs',
                  render: (val: string) => val || '-' },
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}

export default TourGroupDetail

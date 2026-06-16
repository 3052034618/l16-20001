import { useState, useEffect } from 'react'
import { Table, Button, Input, Tag, Space, Modal, Form, InputNumber, message } from 'antd'
import { PlusOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons'
import { Flight, PageResult } from '../types'

const FlightManagement = () => {
  const [data, setData] = useState<PageResult<Flight>>({
    list: [], total: 0, page: 1, pageSize: 20,
  })
  const [loading, setLoading] = useState(false)
  const [departureCity, setDepartureCity] = useState('')
  const [arrivalCity, setArrivalCity] = useState('')
  const [modalVisible, setModalVisible] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadData()
  }, [data.page, data.pageSize])

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await (window as any).electronAPI.flights.list({
        page: data.page,
        pageSize: data.pageSize,
        departure_city: departureCity,
        arrival_city: arrivalCity,
      })
      setData(result)
    } catch (e) {
      console.error(e)
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingId(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record: Flight) => {
    setEditingId(record.id)
    form.setFieldsValue(record)
    setModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingId) {
        await (window as any).electronAPI.flights.update(editingId, values)
        message.success('更新成功')
      } else {
        await (window as any).electronAPI.flights.create(values)
        message.success('创建成功')
      }
      setModalVisible(false)
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '航班号', dataIndex: 'flight_number', key: 'flight_number', width: 100 },
    { title: '航空公司', dataIndex: 'airline', key: 'airline', width: 120 },
    { title: '出发城市', dataIndex: 'departure_city', key: 'departure_city', width: 100 },
    { title: '到达城市', dataIndex: 'arrival_city', key: 'arrival_city', width: 100 },
    { title: '出发时间', dataIndex: 'departure_time', key: 'departure_time', width: 150 },
    { title: '到达时间', dataIndex: 'arrival_time', key: 'arrival_time', width: 150 },
    { title: '总座位', dataIndex: 'total_seats', key: 'total_seats', width: 80 },
    { title: '可用座位', dataIndex: 'available_seats', key: 'available_seats', width: 90,
      render: (val: number) => (
        <Tag color={val > 30 ? 'green' : val > 0 ? 'orange' : 'red'}>
          {val}
        </Tag>
      ) },
    { title: '票价', dataIndex: 'price_per_seat', key: 'price_per_seat', width: 100,
      render: (val: number) => `¥${val?.toFixed(2)}` },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_: any, record: Flight) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />}
            onClick={() => handleEdit(record)}>
            编辑
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className="page-title">航班管理</div>

      <div className="table-toolbar">
        <div className="table-toolbar-left">
          <Input
            placeholder="出发城市"
            value={departureCity}
            onChange={e => setDepartureCity(e.target.value)}
            style={{ width: 150 }}
            prefix={<SearchOutlined />}
          />
          <Input
            placeholder="到达城市"
            value={arrivalCity}
            onChange={e => setArrivalCity(e.target.value)}
            style={{ width: 150 }}
          />
          <Button type="primary" onClick={loadData}>搜索</Button>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增航班
        </Button>
      </div>

      <Table
        dataSource={data.list}
        rowKey="id"
        loading={loading}
        columns={columns}
        scroll={{ x: 1100 }}
        pagination={{
          current: data.page,
          pageSize: data.pageSize,
          total: data.total,
          onChange: (page, pageSize) => setData(prev => ({ ...prev, page, pageSize })),
        }}
      />

      <Modal
        title={editingId ? '编辑航班' : '新增航班'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="flight_number" label="航班号" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="请输入航班号" />
            </Form.Item>
            <Form.Item name="airline" label="航空公司" style={{ flex: 1 }}>
              <Input placeholder="请输入航空公司" />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="departure_city" label="出发城市" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="请输入出发城市" />
            </Form.Item>
            <Form.Item name="arrival_city" label="到达城市" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="请输入到达城市" />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="departure_time" label="出发时间" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="YYYY-MM-DD HH:mm" />
            </Form.Item>
            <Form.Item name="arrival_time" label="到达时间" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="YYYY-MM-DD HH:mm" />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="total_seats" label="总座位数" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="available_seats" label="可用座位" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="price_per_seat" label="票价(元)" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  )
}

export default FlightManagement

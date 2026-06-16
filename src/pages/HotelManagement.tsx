import { useState, useEffect } from 'react'
import { Table, Button, Input, Tag, Space, Modal, Form, InputNumber, Select, message } from 'antd'
import { PlusOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons'
import { Hotel, PageResult } from '../types'

const { Option } = Select

const HotelManagement = () => {
  const [data, setData] = useState<PageResult<Hotel>>({
    list: [], total: 0, page: 1, pageSize: 20,
  })
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [starFilter, setStarFilter] = useState<number | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadData()
  }, [data.page, data.pageSize, starFilter])

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await (window as any).electronAPI.hotels.list({
        page: data.page,
        pageSize: data.pageSize,
        star: starFilter,
        city: keyword,
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

  const handleEdit = (record: Hotel) => {
    setEditingId(record.id)
    form.setFieldsValue(record)
    setModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingId) {
        await (window as any).electronAPI.hotels.update(editingId, values)
        message.success('更新成功')
      } else {
        await (window as any).electronAPI.hotels.create(values)
        message.success('创建成功')
      }
      setModalVisible(false)
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const renderStars = (count: number) => {
    return '★'.repeat(count) + '☆'.repeat(5 - count)
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '酒店名称', dataIndex: 'name', key: 'name' },
    { title: '城市', dataIndex: 'city', key: 'city', width: 100 },
    { title: '星级', dataIndex: 'star_rating', key: 'star_rating', width: 100,
      render: (val: number) => (
        <span style={{ color: '#faad14' }}>{renderStars(val)}</span>
      ) },
    { title: '总房间数', dataIndex: 'total_rooms', key: 'total_rooms', width: 100 },
    { title: '可用房间', dataIndex: 'available_rooms', key: 'available_rooms', width: 100,
      render: (val: number) => (
        <Tag color={val > 10 ? 'green' : val > 0 ? 'orange' : 'red'}>
          {val}间
        </Tag>
      ) },
    { title: '每晚价格', dataIndex: 'price_per_night', key: 'price_per_night', width: 100,
      render: (val: number) => `¥${val?.toFixed(2)}` },
    { title: '设施', dataIndex: 'facilities', key: 'facilities',
      render: (val: string) => val || '-' },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_: any, record: Hotel) => (
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
      <div className="page-title">酒店管理</div>

      <div className="table-toolbar">
        <div className="table-toolbar-left">
          <Input
            placeholder="搜索城市"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            style={{ width: 200 }}
            prefix={<SearchOutlined />}
          />
          <Select
            placeholder="星级筛选"
            style={{ width: 120 }}
            value={starFilter}
            onChange={setStarFilter}
            allowClear
          >
            <Option value={3}>三星级</Option>
            <Option value={4}>四星级</Option>
            <Option value={5}>五星级</Option>
          </Select>
          <Button type="primary" onClick={loadData}>搜索</Button>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增酒店
        </Button>
      </div>

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
        title={editingId ? '编辑酒店' : '新增酒店'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="酒店名称" rules={[{ required: true }]}>
            <Input placeholder="请输入酒店名称" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="city" label="城市" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="请输入城市" />
            </Form.Item>
            <Form.Item name="star_rating" label="星级" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select>
                <Option value={3}>三星级</Option>
                <Option value={4}>四星级</Option>
                <Option value={5}>五星级</Option>
              </Select>
            </Form.Item>
          </div>
          <Form.Item name="address" label="地址">
            <Input placeholder="请输入地址" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="total_rooms" label="总房间数" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="available_rooms" label="可用房间" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item name="price_per_night" label="每晚价格(元)">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="facilities" label="设施">
            <Input placeholder="用逗号分隔，如：游泳池,健身房,餐厅" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default HotelManagement

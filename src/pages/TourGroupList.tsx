import { useState, useEffect } from 'react'
import { Table, Button, Input, Tag, Space, Modal, Form, InputNumber, Select, DatePicker, message } from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { TourGroup, PageResult } from '../types'
import dayjs from 'dayjs'

const { Option } = Select
const { RangePicker } = DatePicker

const TourGroupList = () => {
  const navigate = useNavigate()
  const [data, setData] = useState<PageResult<TourGroup>>({
    list: [],
    total: 0,
    page: 1,
    pageSize: 20,
  })
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [modalVisible, setModalVisible] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadData()
  }, [data.page, data.pageSize])

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await (window as any).electronAPI.tourGroups.list({
        page: data.page,
        pageSize: data.pageSize,
        keyword,
      })
      setData(result)
    } catch (e) {
      console.error(e)
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setData(prev => ({ ...prev, page: 1 }))
    loadData()
  }

  const handleAdd = () => {
    setEditingId(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record: TourGroup) => {
    setEditingId(record.id)
    form.setFieldsValue({
      group_name: record.group_name,
      route_name: record.route_name,
      date_range: record.departure_date && record.return_date
        ? [dayjs(record.departure_date), dayjs(record.return_date)]
        : undefined,
      total_seats: record.total_seats,
      base_price: record.base_price,
      guide_language_requirement: record.guide_language_requirement,
      hotel_star_requirement: record.hotel_star_requirement,
      status: record.status,
    })
    setModalVisible(true)
  }

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个旅行团吗？',
      onOk: async () => {
        try {
          await (window as any).electronAPI.tourGroups.delete(id)
          message.success('删除成功')
          loadData()
        } catch (e) {
          message.error('删除失败')
        }
      },
    })
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const submitData = {
        group_name: values.group_name,
        route_name: values.route_name,
        departure_date: values.date_range?.[0]?.format('YYYY-MM-DD'),
        return_date: values.date_range?.[1]?.format('YYYY-MM-DD'),
        total_seats: values.total_seats,
        base_price: values.base_price,
        guide_language_requirement: values.guide_language_requirement,
        hotel_star_requirement: values.hotel_star_requirement,
        status: values.status,
      }

      if (editingId) {
        await (window as any).electronAPI.tourGroups.update(editingId, submitData)
        message.success('更新成功')
      } else {
        await (window as any).electronAPI.tourGroups.create(submitData)
        message.success('创建成功')
      }

      setModalVisible(false)
      loadData()
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

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '团名称', dataIndex: 'group_name', key: 'group_name' },
    { title: '线路', dataIndex: 'route_name', key: 'route_name' },
    { title: '出发日期', dataIndex: 'departure_date', key: 'departure_date', width: 110 },
    { title: '返程日期', dataIndex: 'return_date', key: 'return_date', width: 110 },
    { title: '总人数', dataIndex: 'total_seats', key: 'total_seats', width: 80 },
    { title: '基础价格', dataIndex: 'base_price', key: 'base_price', width: 100,
      render: (val: number) => `¥${val?.toFixed(2)}` },
    { title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: (status: string) => (
        <Tag color={statusColors[status]}>{statusText[status]}</Tag>
      ) },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_: any, record: TourGroup) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />}
            onClick={() => navigate(`/tour-groups/${record.id}`)}>
            详情
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />}
            onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className="page-title">旅行团管理</div>

      <div className="table-toolbar">
        <div className="table-toolbar-left">
          <Input
            placeholder="搜索团名称/线路"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            style={{ width: 240 }}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
          />
          <Button type="primary" onClick={handleSearch}>
            搜索
          </Button>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新建旅行团
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
        title={editingId ? '编辑旅行团' : '新建旅行团'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="group_name" label="团名称" rules={[{ required: true }]}>
            <Input placeholder="请输入团名称" />
          </Form.Item>
          <Form.Item name="route_name" label="线路名称" rules={[{ required: true }]}>
            <Input placeholder="请输入线路名称" />
          </Form.Item>
          <Form.Item name="date_range" label="行程日期" rules={[{ required: true }]}>
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="total_seats" label="总人数" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber min={1} max={100} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="base_price" label="基础价格(元)" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="guide_language_requirement" label="导游语言要求" style={{ flex: 1 }}>
              <Select placeholder="请选择语言要求">
                <Option value="中文">中文</Option>
                <Option value="中文,英语">中文+英语</Option>
                <Option value="中文,日语">中文+日语</Option>
                <Option value="中文,韩语">中文+韩语</Option>
                <Option value="中文,英语,日语">中英日</Option>
              </Select>
            </Form.Item>
            <Form.Item name="hotel_star_requirement" label="酒店星级要求" style={{ flex: 1 }}>
              <Select placeholder="请选择星级">
                <Option value={3}>三星级</Option>
                <Option value={4}>四星级</Option>
                <Option value={5}>五星级</Option>
              </Select>
            </Form.Item>
          </div>
          <Form.Item name="status" label="状态">
            <Select>
              <Option value="draft">草稿</Option>
              <Option value="allocated">已分配</Option>
              <Option value="confirmed">已确认</Option>
              <Option value="completed">已完成</Option>
              <Option value="cancelled">已取消</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default TourGroupList

import { useState, useEffect } from 'react'
import { Table, Button, Input, Tag, Space, Modal, Form, InputNumber, Select, message, Rate } from 'antd'
import { PlusOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons'
import { Guide, PageResult } from '../types'

const { Option } = Select

const GuideManagement = () => {
  const [data, setData] = useState<PageResult<Guide>>({
    list: [], total: 0, page: 1, pageSize: 20,
  })
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [languageFilter, setLanguageFilter] = useState('')
  const [modalVisible, setModalVisible] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadData()
  }, [data.page, data.pageSize, languageFilter])

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await (window as any).electronAPI.guides.list({
        page: data.page,
        pageSize: data.pageSize,
        language: languageFilter,
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

  const handleEdit = (record: Guide) => {
    setEditingId(record.id)
    form.setFieldsValue(record)
    setModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingId) {
        await (window as any).electronAPI.guides.update(editingId, values)
        message.success('更新成功')
      } else {
        await (window as any).electronAPI.guides.create(values)
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
    { title: '姓名', dataIndex: 'name', key: 'name', width: 100 },
    { title: '电话', dataIndex: 'phone', key: 'phone', width: 120 },
    { title: '语言', dataIndex: 'languages', key: 'languages',
      render: (val: string) => val?.split(',').map((lang, i) => (
        <Tag key={i} color="blue">{lang}</Tag>
      )) },
    { title: '从业年限', dataIndex: 'years_of_experience', key: 'years_of_experience', width: 100,
      render: (val: number) => `${val}年` },
    { title: '评分', dataIndex: 'rating', key: 'rating', width: 120,
      render: (val: number) => <Rate disabled value={val} allowHalf style={{ fontSize: 14 }} /> },
    { title: '月工时上限', dataIndex: 'max_monthly_hours', key: 'max_monthly_hours', width: 110,
      render: (val: number) => `${val}小时` },
    { title: '本月已排班', dataIndex: 'current_month_hours', key: 'current_month_hours', width: 110,
      render: (val: number) => `${val}小时` },
    { title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '在职' : '离职'}
        </Tag>
      ) },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_: any, record: Guide) => (
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
      <div className="page-title">导游管理</div>

      <div className="table-toolbar">
        <div className="table-toolbar-left">
          <Input
            placeholder="搜索姓名"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            style={{ width: 200 }}
            prefix={<SearchOutlined />}
          />
          <Select
            placeholder="语言筛选"
            style={{ width: 150 }}
            value={languageFilter}
            onChange={setLanguageFilter}
            allowClear
          >
            <Option value="中文">中文</Option>
            <Option value="英语">英语</Option>
            <Option value="日语">日语</Option>
            <Option value="韩语">韩语</Option>
            <Option value="法语">法语</Option>
          </Select>
          <Button type="primary" onClick={loadData}>搜索</Button>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增导游
        </Button>
      </div>

      <Table
        dataSource={data.list}
        rowKey="id"
        loading={loading}
        columns={columns}
        scroll={{ x: 1000 }}
        pagination={{
          current: data.page,
          pageSize: data.pageSize,
          total: data.total,
          onChange: (page, pageSize) => setData(prev => ({ ...prev, page, pageSize })),
        }}
      />

      <Modal
        title={editingId ? '编辑导游' : '新增导游'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="name" label="姓名" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="请输入姓名" />
            </Form.Item>
            <Form.Item name="phone" label="电话" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="请输入电话" />
            </Form.Item>
          </div>
          <Form.Item name="id_card" label="身份证号">
            <Input placeholder="请输入身份证号" />
          </Form.Item>
          <Form.Item name="languages" label="语言能力" rules={[{ required: true }]}>
            <Select mode="tags" placeholder="请选择/输入语言" tokenSeparators={[',']}>
              <Option value="中文">中文</Option>
              <Option value="英语">英语</Option>
              <Option value="日语">日语</Option>
              <Option value="韩语">韩语</Option>
              <Option value="法语">法语</Option>
              <Option value="德语">德语</Option>
              <Option value="西班牙语">西班牙语</Option>
            </Select>
          </Form.Item>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="years_of_experience" label="从业年限" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="rating" label="评分" style={{ flex: 1 }}>
              <InputNumber min={0} max={5} step={0.5} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="max_monthly_hours" label="月工时上限" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="status" label="状态" style={{ flex: 1 }}>
              <Select>
                <Option value="active">在职</Option>
                <Option value="inactive">离职</Option>
              </Select>
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  )
}

export default GuideManagement

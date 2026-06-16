import { useState, useEffect } from 'react'
import { Card, Select, Button, Descriptions, Table, Divider, message, Space } from 'antd'
import { FileTextOutlined, PrinterOutlined, SearchOutlined } from '@ant-design/icons'
import { TourGroup, ItineraryData } from '../types'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const { Option } = Select

const ItineraryPage = () => {
  const [groups, setGroups] = useState<TourGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [itineraryData, setItineraryData] = useState<ItineraryData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
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

  const handleGenerate = async () => {
    if (!selectedGroupId) {
      message.warning('请选择旅行团')
      return
    }

    setLoading(true)
    try {
      const data = await (window as any).electronAPI.itinerary.generate(selectedGroupId)
      setItineraryData(data)
      message.success('行程单已生成')
    } catch (e: any) {
      message.error(e.message || '生成失败')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExportPDF = () => {
    if (!itineraryData) return

    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.text(itineraryData.group.group_name + ' 行程单', 105, 20, { align: 'center' })

    doc.setFontSize(10)
    doc.text('旅行社团队操作与资源调度系统', 105, 28, { align: 'center' })

    let currentY = 40

    doc.setFontSize(12)
    doc.setTextColor(24, 144, 255)
    doc.text('一、基本信息', 14, currentY)
    currentY += 8

    const basicInfo = [
      ['团名称', itineraryData.group.group_name],
      ['线路名称', itineraryData.group.route_name],
      ['出发日期', itineraryData.group.departure_date || '-'],
      ['返程日期', itineraryData.group.return_date || '-'],
      ['团队人数', itineraryData.tourists.length + ' 人'],
      ['基础价格', '¥' + (itineraryData.group.base_price || 0).toFixed(2)],
    ]

    autoTable(doc, {
      startY: currentY,
      body: basicInfo,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: {
        0: { fillColor: [240, 248, 255], textColor: 51, fontStyle: 'bold', cellWidth: 40 },
        1: { cellWidth: 60 },
      },
    })

    currentY = (doc as any).lastAutoTable.finalY + 15

    if (itineraryData.flight) {
      doc.setFontSize(12)
      doc.setTextColor(82, 196, 26)
      doc.text('二、航班信息', 14, currentY)
      currentY += 8

      const flightInfo = [
        ['航班号', itineraryData.flight.flight_number],
        ['航空公司', itineraryData.flight.airline || '-'],
        ['出发城市', itineraryData.flight.departure_city || '-'],
        ['到达城市', itineraryData.flight.arrival_city || '-'],
        ['出发时间', itineraryData.flight.departure_time || '-'],
        ['到达时间', itineraryData.flight.arrival_time || '-'],
        ['票价', '¥' + (itineraryData.flight.price_per_seat || 0).toFixed(2)],
      ]

      autoTable(doc, {
        startY: currentY,
        body: flightInfo,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: {
          0: { fillColor: [240, 255, 240], textColor: 51, fontStyle: 'bold', cellWidth: 40 },
          1: { cellWidth: 60 },
        },
      })

      currentY = (doc as any).lastAutoTable.finalY + 15
    }

    if (itineraryData.hotel) {
      if (currentY > 230) {
        doc.addPage()
        currentY = 20
      }

      doc.setFontSize(12)
      doc.setTextColor(250, 173, 20)
      doc.text('三、住宿信息', 14, currentY)
      currentY += 8

      const hotelInfo = [
        ['酒店名称', itineraryData.hotel.name],
        ['星级', itineraryData.hotel.star_rating + ' 星'],
        ['城市', itineraryData.hotel.city || '-'],
        ['地址', itineraryData.hotel.address || '-'],
        ['价格', '¥' + (itineraryData.hotel.price_per_night || 0).toFixed(2) + ' / 晚'],
        ['设施', itineraryData.hotel.facilities || '-'],
      ]

      autoTable(doc, {
        startY: currentY,
        body: hotelInfo,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: {
          0: { fillColor: [255, 251, 230], textColor: 51, fontStyle: 'bold', cellWidth: 40 },
          1: { cellWidth: 60 },
        },
      })

      currentY = (doc as any).lastAutoTable.finalY + 15
    }

    if (itineraryData.guide) {
      if (currentY > 230) {
        doc.addPage()
        currentY = 20
      }

      doc.setFontSize(12)
      doc.setTextColor(114, 46, 209)
      doc.text('四、导游信息', 14, currentY)
      currentY += 8

      const guideInfo = [
        ['导游姓名', itineraryData.guide.guide_name || '-'],
        ['联系电话', itineraryData.guide.guide_phone || '-'],
        ['带团日期', (itineraryData.guide as any).start_date || '-' + ' ~ ' + (itineraryData.guide as any).end_date || '-'],
      ]

      autoTable(doc, {
        startY: currentY,
        body: guideInfo,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: {
          0: { fillColor: [245, 240, 255], textColor: 51, fontStyle: 'bold', cellWidth: 40 },
          1: { cellWidth: 60 },
        },
      })

      currentY = (doc as any).lastAutoTable.finalY + 15
    }

    if (currentY > 220) {
      doc.addPage()
      currentY = 20
    }

    doc.setFontSize(12)
    doc.setTextColor(245, 34, 45)
    doc.text('五、游客名单', 14, currentY)
    currentY += 8

    const touristTableData = itineraryData.tourists.map((t, index) => [
      t.seat_number || index + 1,
      t.name,
      t.gender,
      t.age,
      t.hotel_room || '-',
      t.special_needs || '-',
      t.dietary_requirements || '-',
    ])

    autoTable(doc, {
      startY: currentY,
      head: [['序号', '姓名', '性别', '年龄', '房间号', '特殊需求', '饮食要求']],
      body: touristTableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [245, 34, 45], textColor: 255 },
    })

    const finalY = (doc as any).lastAutoTable.finalY + 20
    doc.setFontSize(9)
    doc.setTextColor(128)
    doc.text('生成时间: ' + new Date().toLocaleString(), 105, finalY, { align: 'center' })
    doc.text('本行程单由旅行社团队操作与资源调度系统自动生成', 105, finalY + 6, { align: 'center' })

    doc.save(`${itineraryData.group.group_name}_行程单.pdf`)
    message.success('PDF行程单已导出')
  }

  const touristColumns = [
    { title: '序号', dataIndex: 'seat_number', key: 'seat_number', width: 60,
      render: (val: number, _: any, index: number) => val || index + 1 },
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '性别', dataIndex: 'gender', key: 'gender', width: 60 },
    { title: '年龄', dataIndex: 'age', key: 'age', width: 60 },
    { title: '身份证号', dataIndex: 'id_card', key: 'id_card', width: 160 },
    { title: '联系电话', dataIndex: 'phone', key: 'phone', width: 120 },
    { title: '房间号', dataIndex: 'hotel_room', key: 'hotel_room', width: 100,
      render: (val: string) => val || '-' },
    { title: '特殊需求', dataIndex: 'special_needs', key: 'special_needs',
      render: (val: string) => val || '-' },
    { title: '饮食要求', dataIndex: 'dietary_requirements', key: 'dietary_requirements',
      render: (val: string) => val || '-' },
  ]

  return (
    <div>
      <div className="page-title">电子行程单</div>

      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Select
            placeholder="请选择旅行团"
            style={{ width: 300 }}
            value={selectedGroupId}
            onChange={setSelectedGroupId}
            showSearch
            optionFilterProp="children"
          >
            {groups.map(g => (
              <Option key={g.id} value={g.id}>{g.group_name}</Option>
            ))}
          </Select>
          <Button
            type="primary"
            icon={<FileTextOutlined />}
            loading={loading}
            onClick={handleGenerate}
          >
            生成行程单
          </Button>
          {itineraryData && (
            <>
              <Button icon={<PrinterOutlined />} onClick={handlePrint}>
                打印
              </Button>
              <Button icon={<SearchOutlined />} onClick={handleExportPDF}>
                导出PDF
              </Button>
            </>
          )}
        </Space>
      </Card>

      {itineraryData && (
        <Card className="itinerary-print-area">
          <h2 style={{ textAlign: 'center', marginBottom: 20, color: '#1890ff' }}>
            {itineraryData.group.group_name} 行程单
          </h2>
          <p style={{ textAlign: 'center', color: '#999', marginBottom: 20 }}>
            旅行社团队操作与资源调度系统
          </p>

          <Divider orientation="left" style={{ color: '#1890ff', fontWeight: 'bold' }}>
            一、基本信息
          </Divider>
          <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
            <Descriptions.Item label="团名称">{itineraryData.group.group_name}</Descriptions.Item>
            <Descriptions.Item label="线路名称">{itineraryData.group.route_name}</Descriptions.Item>
            <Descriptions.Item label="出发日期">{itineraryData.group.departure_date || '-'}</Descriptions.Item>
            <Descriptions.Item label="返程日期">{itineraryData.group.return_date || '-'}</Descriptions.Item>
            <Descriptions.Item label="团队人数">{itineraryData.tourists.length} 人</Descriptions.Item>
            <Descriptions.Item label="基础价格">¥{itineraryData.group.base_price?.toFixed(2)}</Descriptions.Item>
          </Descriptions>

          {itineraryData.flight && (
            <>
              <Divider orientation="left" style={{ color: '#52c41a', fontWeight: 'bold' }}>
                二、航班信息
              </Divider>
              <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
                <Descriptions.Item label="航班号">{itineraryData.flight.flight_number}</Descriptions.Item>
                <Descriptions.Item label="航空公司">{itineraryData.flight.airline || '-'}</Descriptions.Item>
                <Descriptions.Item label="出发城市">{itineraryData.flight.departure_city || '-'}</Descriptions.Item>
                <Descriptions.Item label="到达城市">{itineraryData.flight.arrival_city || '-'}</Descriptions.Item>
                <Descriptions.Item label="出发时间">{itineraryData.flight.departure_time || '-'}</Descriptions.Item>
                <Descriptions.Item label="到达时间">{itineraryData.flight.arrival_time || '-'}</Descriptions.Item>
              </Descriptions>
            </>
          )}

          {itineraryData.hotel && (
            <>
              <Divider orientation="left" style={{ color: '#faad14', fontWeight: 'bold' }}>
                三、住宿信息
              </Divider>
              <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
                <Descriptions.Item label="酒店名称">{itineraryData.hotel.name}</Descriptions.Item>
                <Descriptions.Item label="星级">
                  <span style={{ color: '#faad14' }}>
                    {'★'.repeat(itineraryData.hotel.star_rating)}
                    {'☆'.repeat(5 - itineraryData.hotel.star_rating)}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="城市">{itineraryData.hotel.city || '-'}</Descriptions.Item>
                <Descriptions.Item label="地址">{itineraryData.hotel.address || '-'}</Descriptions.Item>
                <Descriptions.Item label="每晚价格">¥{itineraryData.hotel.price_per_night?.toFixed(2)}</Descriptions.Item>
                <Descriptions.Item label="设施">{itineraryData.hotel.facilities || '-'}</Descriptions.Item>
              </Descriptions>
            </>
          )}

          {itineraryData.guide && (
            <>
              <Divider orientation="left" style={{ color: '#722ed1', fontWeight: 'bold' }}>
                四、导游信息
              </Divider>
              <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
                <Descriptions.Item label="导游姓名">{(itineraryData.guide as any).guide_name || '-'}</Descriptions.Item>
                <Descriptions.Item label="联系电话">{(itineraryData.guide as any).guide_phone || '-'}</Descriptions.Item>
              </Descriptions>
            </>
          )}

          <Divider orientation="left" style={{ color: '#f5222d', fontWeight: 'bold' }}>
            五、游客名单
          </Divider>
          <Table
            dataSource={itineraryData.tourists}
            rowKey="id"
            columns={touristColumns}
            pagination={false}
            size="small"
            scroll={{ x: 1000 }}
          />

          <div style={{ textAlign: 'right', marginTop: 20, color: '#999', fontSize: 12 }}>
            生成时间：{new Date().toLocaleString()}
            <br />
            本行程单由旅行社团队操作与资源调度系统自动生成
          </div>
        </Card>
      )}

      {!itineraryData && (
        <Card style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
          <FileTextOutlined style={{ fontSize: 48, marginBottom: 16 }} />
          <p>请选择旅行团后点击"生成行程单"</p>
        </Card>
      )}
    </div>
  )
}

export default ItineraryPage

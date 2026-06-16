import { useState, useEffect } from 'react'
import { Card, Tabs, Table, Button, message, Statistic, Row, Col, Rate } from 'antd'
import { FilePdfOutlined, BarChartOutlined } from '@ant-design/icons'
import { RouteStatistics, GuideStatistics, StatisticsOverview } from '../types'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const { TabPane } = Tabs

const StatisticsPage = () => {
  const [overview, setOverview] = useState<StatisticsOverview>({
    totalGroups: 0,
    totalTourists: 0,
    totalRevenue: 0,
    pendingSettlements: 0,
  })
  const [routeData, setRouteData] = useState<RouteStatistics[]>([])
  const [guideData, setGuideData] = useState<GuideStatistics[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadOverview()
    loadRouteData()
    loadGuideData()
  }, [])

  const loadOverview = async () => {
    try {
      const data = await (window as any).electronAPI.statistics.overview()
      setOverview(data)
    } catch (e) {
      console.error(e)
    }
  }

  const loadRouteData = async () => {
    try {
      const data = await (window as any).electronAPI.statistics.byRoute()
      setRouteData(data)
    } catch (e) {
      console.error(e)
    }
  }

  const loadGuideData = async () => {
    try {
      const data = await (window as any).electronAPI.statistics.byGuide()
      setGuideData(data)
    } catch (e) {
      console.error(e)
    }
  }

  const exportPDF = () => {
    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.text('旅行社月度运营报告', 105, 20, { align: 'center' })

    doc.setFontSize(12)
    doc.text(`报告时间: ${new Date().toLocaleDateString()}`, 14, 35)

    const overviewData = [
      ['旅行团总数', overview.totalGroups + ' 个'],
      ['游客总数', overview.totalTourists + ' 人'],
      ['已结算营收', '¥' + overview.totalRevenue.toFixed(2)],
      ['待审批结算单', overview.pendingSettlements + ' 单'],
    ]

    autoTable(doc, {
      startY: 45,
      head: [['指标', '数值']],
      body: overviewData,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [24, 144, 255] },
    })

    const yAfterOverview = (doc as any).lastAutoTable.finalY + 20

    doc.setFontSize(14)
    doc.text('一、线路统计', 14, yAfterOverview)

    const routeTableData = routeData.map(item => [
      item.route_name,
      item.group_count + ' 个',
      item.tourist_count + ' 人',
      '¥' + item.avg_spending.toFixed(2),
      '¥' + item.total_revenue.toFixed(2),
    ])

    autoTable(doc, {
      startY: yAfterOverview + 8,
      head: [['线路名称', '团数', '接待人次', '人均消费', '总营收']],
      body: routeTableData,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [82, 196, 26] },
    })

    const yAfterRoute = (doc as any).lastAutoTable.finalY + 20

    if (yAfterRoute > 250) {
      doc.addPage()
      doc.setFontSize(14)
      doc.text('二、导游统计', 14, 20)
    } else {
      doc.setFontSize(14)
      doc.text('二、导游统计', 14, yAfterRoute)
    }

    const guideTableData = guideData.map(item => [
      item.guide_name,
      item.group_count + ' 个',
      item.total_hours + ' 小时',
      item.rating + ' 分',
      item.complaint_count + ' 起',
    ])

    autoTable(doc, {
      startY: yAfterRoute > 250 ? 30 : yAfterRoute + 8,
      head: [['导游姓名', '带团数', '总工时', '评分', '投诉数']],
      body: guideTableData,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [114, 46, 209] },
    })

    doc.save('月度运营报告.pdf')
    message.success('PDF报告已导出')
  }

  const routeColumns = [
    { title: '线路名称', dataIndex: 'route_name', key: 'route_name' },
    { title: '团数', dataIndex: 'group_count', key: 'group_count', width: 80 },
    { title: '接待人次', dataIndex: 'tourist_count', key: 'tourist_count', width: 100 },
    { title: '人均消费', dataIndex: 'avg_spending', key: 'avg_spending', width: 120,
      render: (val: number) => `¥${val?.toFixed(2)}` },
    { title: '总营收', dataIndex: 'total_revenue', key: 'total_revenue', width: 140,
      render: (val: number) => <b>¥{val?.toFixed(2)}</b> },
  ]

  const guideColumns = [
    { title: '导游姓名', dataIndex: 'guide_name', key: 'guide_name', width: 100 },
    { title: '带团数', dataIndex: 'group_count', key: 'group_count', width: 80 },
    { title: '总工时', dataIndex: 'total_hours', key: 'total_hours', width: 100,
      render: (val: number) => `${val}小时` },
    { title: '评分', dataIndex: 'rating', key: 'rating', width: 150,
      render: (val: number) => <Rate disabled value={val} allowHalf style={{ fontSize: 14 }} /> },
    { title: '投诉数', dataIndex: 'complaint_count', key: 'complaint_count', width: 80,
      render: (val: number) => (
        <span style={{ color: val > 0 ? '#f5222d' : '#52c41a' }}>{val} 起</span>
      ) },
  ]

  return (
    <div>
      <div className="page-title">统计报表</div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="旅行团总数"
              value={overview.totalGroups}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="游客总数"
              value={overview.totalTourists}
              suffix="人"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已结算营收"
              value={overview.totalRevenue}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待审批结算单"
              value={overview.pendingSettlements}
              suffix="单"
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        extra={
          <Button type="primary" icon={<FilePdfOutlined />} onClick={exportPDF}>
            导出PDF月度报告
          </Button>
        }
      >
        <Tabs defaultActiveKey="route">
          <TabPane tab="按线路统计" key="route">
            <Table
              dataSource={routeData}
              rowKey="route_name"
              columns={routeColumns}
              pagination={false}
            />
          </TabPane>
          <TabPane tab="按导游统计" key="guide">
            <Table
              dataSource={guideData}
              rowKey="guide_name"
              columns={guideColumns}
              pagination={false}
            />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  )
}

export default StatisticsPage

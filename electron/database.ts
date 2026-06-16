import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'

let db: Database.Database | null = null

export function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'travel_agency.db')
  db = new Database(dbPath)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  createTables()
  seedData()

  return db
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

function createTables() {
  if (!db) return

  db.exec(`
    CREATE TABLE IF NOT EXISTS tour_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_name TEXT NOT NULL,
      route_name TEXT NOT NULL,
      departure_date TEXT,
      return_date TEXT,
      total_seats INTEGER DEFAULT 30,
      base_price REAL DEFAULT 0,
      guide_language_requirement TEXT,
      hotel_star_requirement INTEGER DEFAULT 3,
      hotel_id INTEGER,
      flight_id INTEGER,
      status TEXT DEFAULT 'draft',
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS tourists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER,
      name TEXT NOT NULL,
      id_card TEXT,
      phone TEXT,
      age INTEGER,
      gender TEXT,
      special_needs TEXT,
      dietary_requirements TEXT,
      status TEXT DEFAULT 'registered',
      payment_status TEXT DEFAULT 'unpaid',
      amount_paid REAL DEFAULT 0,
      seat_number INTEGER,
      hotel_room TEXT,
      hotel_id INTEGER,
      flight_id INTEGER,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (group_id) REFERENCES tour_groups(id)
    );

    CREATE TABLE IF NOT EXISTS hotels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      city TEXT,
      address TEXT,
      star_rating INTEGER DEFAULT 3,
      total_rooms INTEGER DEFAULT 50,
      available_rooms INTEGER DEFAULT 50,
      price_per_night REAL DEFAULT 300,
      facilities TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS flights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flight_number TEXT NOT NULL,
      airline TEXT,
      departure_city TEXT,
      arrival_city TEXT,
      departure_time TEXT,
      arrival_time TEXT,
      total_seats INTEGER DEFAULT 150,
      available_seats INTEGER DEFAULT 150,
      price_per_seat REAL DEFAULT 800,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS guides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      id_card TEXT,
      languages TEXT,
      years_of_experience INTEGER DEFAULT 0,
      rating REAL DEFAULT 5.0,
      max_monthly_hours INTEGER DEFAULT 160,
      current_month_hours INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS guide_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER,
      guide_id INTEGER,
      start_date TEXT,
      end_date TEXT,
      estimated_hours INTEGER DEFAULT 0,
      status TEXT DEFAULT 'scheduled',
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (group_id) REFERENCES tour_groups(id),
      FOREIGN KEY (guide_id) REFERENCES guides(id)
    );

    CREATE TABLE IF NOT EXISTS shift_swaps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requester_guide_id INTEGER,
      target_guide_id INTEGER,
      schedule_id INTEGER,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      reject_reason TEXT,
      approved_at TEXT,
      rejected_at TEXT,
      created_at TEXT,
      FOREIGN KEY (requester_guide_id) REFERENCES guides(id),
      FOREIGN KEY (target_guide_id) REFERENCES guides(id),
      FOREIGN KEY (schedule_id) REFERENCES guide_schedules(id)
    );

    CREATE TABLE IF NOT EXISTS finance_settlements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER,
      total_fee REAL DEFAULT 0,
      total_paid REAL DEFAULT 0,
      total_self_paid REAL DEFAULT 0,
      total_refund REAL DEFAULT 0,
      net_amount REAL DEFAULT 0,
      tourist_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      reject_reason TEXT,
      approved_at TEXT,
      rejected_at TEXT,
      created_at TEXT,
      FOREIGN KEY (group_id) REFERENCES tour_groups(id)
    );

    CREATE TABLE IF NOT EXISTS self_paid_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER,
      tourist_id INTEGER,
      item_name TEXT,
      amount REAL DEFAULT 0,
      description TEXT,
      created_at TEXT,
      FOREIGN KEY (group_id) REFERENCES tour_groups(id),
      FOREIGN KEY (tourist_id) REFERENCES tourists(id)
    );

    CREATE TABLE IF NOT EXISTS refunds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER,
      tourist_id INTEGER,
      amount REAL DEFAULT 0,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      approved_at TEXT,
      created_at TEXT,
      FOREIGN KEY (group_id) REFERENCES tour_groups(id),
      FOREIGN KEY (tourist_id) REFERENCES tourists(id)
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      title TEXT,
      content TEXT,
      related_id INTEGER,
      related_type TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER,
      guide_id INTEGER,
      tourist_id INTEGER,
      content TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT,
      FOREIGN KEY (group_id) REFERENCES tour_groups(id),
      FOREIGN KEY (guide_id) REFERENCES guides(id),
      FOREIGN KEY (tourist_id) REFERENCES tourists(id)
    );
  `)
}

function seedData() {
  if (!db) return

  const hotelCountStmt = db.prepare('SELECT COUNT(*) as count FROM hotels')
  const { count: hotelCount } = hotelCountStmt.get() as { count: number }

  if (hotelCount === 0) {
    const insertHotelStmt = db.prepare(`
      INSERT INTO hotels (name, city, address, star_rating, total_rooms, available_rooms, price_per_night, facilities, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `)

    insertHotelStmt.run('北京王府井希尔顿酒店', '北京', '北京市东城区王府井大街', 5, 200, 150, 880, '游泳池,健身房,餐厅,免费WiFi')
    insertHotelStmt.run('上海外滩华尔道夫酒店', '上海', '上海市黄浦区中山东一路', 5, 180, 120, 1200, '游泳池,健身房,SPA,餐厅,免费WiFi')
    insertHotelStmt.run('三亚海棠湾喜来登度假酒店', '三亚', '海南省三亚市海棠湾', 5, 300, 200, 680, '私人海滩,游泳池,健身房,餐厅,免费WiFi')
    insertHotelStmt.run('杭州西湖国宾馆', '杭州', '浙江省杭州市西湖区', 4, 150, 100, 580, '健身房,餐厅,免费WiFi,花园')
    insertHotelStmt.run('成都锦江宾馆', '成都', '四川省成都市锦江区', 4, 250, 180, 450, '健身房,餐厅,免费WiFi,商务中心')
    insertHotelStmt.run('西安大雁塔假日酒店', '西安', '陕西省西安市雁塔区', 4, 200, 150, 380, '健身房,餐厅,免费WiFi')
    insertHotelStmt.run('桂林阳朔山水酒店', '桂林', '广西桂林市阳朔县', 3, 100, 80, 280, '餐厅,免费WiFi,山景')
    insertHotelStmt.run('厦门鼓浪屿海景酒店', '厦门', '福建省厦门市思明区', 3, 120, 90, 320, '餐厅,免费WiFi,海景')
  }

  const flightCountStmt = db.prepare('SELECT COUNT(*) as count FROM flights')
  const { count: flightCount } = flightCountStmt.get() as { count: number }

  if (flightCount === 0) {
    const insertFlightStmt = db.prepare(`
      INSERT INTO flights (flight_number, airline, departure_city, arrival_city, departure_time, arrival_time, total_seats, available_seats, price_per_seat, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `)

    insertFlightStmt.run('CA1234', '中国国际航空', '北京', '上海', '2025-01-15 08:00', '2025-01-15 10:30', 150, 120, 850)
    insertFlightStmt.run('MU5678', '中国东方航空', '上海', '北京', '2025-01-20 14:00', '2025-01-20 16:30', 180, 150, 780)
    insertFlightStmt.run('CZ9012', '中国南方航空', '北京', '三亚', '2025-01-15 09:00', '2025-01-15 12:30', 200, 180, 1200)
    insertFlightStmt.run('HU3456', '海南航空', '北京', '杭州', '2025-01-16 07:30', '2025-01-16 09:45', 160, 140, 680)
    insertFlightStmt.run('SC7890', '山东航空', '上海', '成都', '2025-01-17 10:00', '2025-01-17 13:00', 140, 110, 920)
    insertFlightStmt.run('ZH2345', '深圳航空', '北京', '西安', '2025-01-18 08:30', '2025-01-18 10:45', 170, 150, 720)
  }

  const guideCountStmt = db.prepare('SELECT COUNT(*) as count FROM guides')
  const { count: guideCount } = guideCountStmt.get() as { count: number }

  if (guideCount === 0) {
    const insertGuideStmt = db.prepare(`
      INSERT INTO guides (name, phone, id_card, languages, years_of_experience, rating, max_monthly_hours, current_month_hours, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'active', datetime('now'))
    `)

    insertGuideStmt.run('张伟', '13800138001', '110101198001011234', '中文,英语', 10, 4.8, 160)
    insertGuideStmt.run('李娜', '13800138002', '110101198502022345', '中文,日语,英语', 8, 4.9, 160)
    insertGuideStmt.run('王强', '13800138003', '110101199003033456', '中文,英语,韩语', 5, 4.6, 160)
    insertGuideStmt.run('刘芳', '13800138004', '110101198804044567', '中文,法语,英语', 7, 4.7, 160)
    insertGuideStmt.run('陈明', '13800138005', '110101199205055678', '中文,英语', 3, 4.5, 160)
    insertGuideStmt.run('赵丽', '13800138006', '110101198706066789', '中文,粤语,英语', 9, 4.9, 160)
  }

  const groupCountStmt = db.prepare('SELECT COUNT(*) as count FROM tour_groups')
  const { count: groupCount } = groupCountStmt.get() as { count: number }

  if (groupCount === 0) {
    const insertGroupStmt = db.prepare(`
      INSERT INTO tour_groups (group_name, route_name, departure_date, return_date, total_seats, base_price, guide_language_requirement, hotel_star_requirement, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `)

    const result1 = insertGroupStmt.run('北京-上海5日精华游', '北京-上海', '2025-01-15', '2025-01-19', 30, 2999, '中文,英语', 4, 'confirmed')
    const result2 = insertGroupStmt.run('北京-三亚6日度假游', '北京-三亚', '2025-02-01', '2025-02-06', 40, 4599, '中文', 5, 'allocated')
    const result3 = insertGroupStmt.run('上海-成都4日美食游', '上海-成都', '2025-01-20', '2025-01-23', 25, 2299, '中文', 4, 'draft')
    const result4 = insertGroupStmt.run('杭州-上海3日休闲游', '杭州-上海', '2025-01-25', '2025-01-27', 20, 1599, '中文,英语', 3, 'draft')

    const insertTouristStmt = db.prepare(`
      INSERT INTO tourists (group_id, name, id_card, phone, age, gender, special_needs, dietary_requirements, status, payment_status, amount_paid, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'registered', ?, ?, datetime('now'))
    `)

    const sampleTourists = [
      { name: '张三', id_card: '110101199001011234', phone: '13900139001', age: 35, gender: '男', special_needs: '', dietary: '' },
      { name: '李四', id_card: '110101199202022345', phone: '13900139002', age: 33, gender: '女', special_needs: '', dietary: '素食' },
      { name: '王五', id_card: '110101198503033456', phone: '13900139003', age: 40, gender: '男', special_needs: '轮椅', dietary: '' },
      { name: '赵六', id_card: '110101198804044567', phone: '13900139004', age: 37, gender: '女', special_needs: '', dietary: '' },
      { name: '孙七', id_card: '110101199505055678', phone: '13900139005', age: 30, gender: '男', special_needs: '', dietary: '' },
      { name: '周八', id_card: '110101199306066789', phone: '13900139006', age: 32, gender: '女', special_needs: '', dietary: '清真' },
      { name: '吴九', id_card: '110101198007077890', phone: '13900139007', age: 45, gender: '男', special_needs: '', dietary: '' },
      { name: '郑十', id_card: '110101198208088901', phone: '13900139008', age: 43, gender: '女', special_needs: '', dietary: '' },
    ]

    sampleTourists.forEach((t, index) => {
      insertTouristStmt.run(
        result1.lastInsertRowid,
        t.name,
        t.id_card,
        t.phone,
        t.age,
        t.gender,
        t.special_needs,
        t.dietary,
        index < 5 ? 'paid' : 'unpaid',
        index < 5 ? 2999 : 0
      )
    })

    sampleTourists.slice(0, 4).forEach((t, index) => {
      insertTouristStmt.run(
        result2.lastInsertRowid,
        t.name + '_2',
        t.id_card,
        t.phone,
        t.age,
        t.gender,
        '',
        t.dietary,
        'paid',
        4599
      )
    })
  }
}

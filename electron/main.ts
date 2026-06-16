import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { initDatabase, getDatabase } from './database'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: '旅行社团队操作与资源调度系统',
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  initDatabase()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

function registerIpcHandlers() {
  const db = getDatabase()

  ipcMain.handle('tour-groups:list', (_event, params) => {
    const { page = 1, pageSize = 20, keyword = '' } = params || {}
    const offset = (page - 1) * pageSize
    let whereClause = ''
    const stmtParams: any[] = []

    if (keyword) {
      whereClause = 'WHERE group_name LIKE ? OR route_name LIKE ?'
      stmtParams.push(`%${keyword}%`, `%${keyword}%`)
    }

    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM tour_groups ${whereClause}`)
    const { total } = countStmt.get(...stmtParams) as { total: number }

    const listStmt = db.prepare(`
      SELECT * FROM tour_groups ${whereClause}
      ORDER BY departure_date DESC
      LIMIT ? OFFSET ?
    `)
    const list = listStmt.all(...stmtParams, pageSize, offset)

    return { list, total, page, pageSize }
  })

  ipcMain.handle('tour-groups:get', (_event, id) => {
    const stmt = db.prepare('SELECT * FROM tour_groups WHERE id = ?')
    return stmt.get(id)
  })

  ipcMain.handle('tour-groups:create', (_event, data) => {
    const stmt = db.prepare(`
      INSERT INTO tour_groups (
        group_name, route_name, departure_date, return_date,
        total_seats, base_price, guide_language_requirement,
        hotel_star_requirement, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `)
    const result = stmt.run(
      data.group_name,
      data.route_name,
      data.departure_date,
      data.return_date,
      data.total_seats,
      data.base_price,
      data.guide_language_requirement,
      data.hotel_star_requirement,
      data.status || 'draft'
    )
    return { id: result.lastInsertRowid }
  })

  ipcMain.handle('tour-groups:update', (_event, id, data) => {
    const stmt = db.prepare(`
      UPDATE tour_groups SET
        group_name = ?, route_name = ?, departure_date = ?,
        return_date = ?, total_seats = ?, base_price = ?,
        guide_language_requirement = ?, hotel_star_requirement = ?,
        status = ?, updated_at = datetime('now')
      WHERE id = ?
    `)
    const result = stmt.run(
      data.group_name,
      data.route_name,
      data.departure_date,
      data.return_date,
      data.total_seats,
      data.base_price,
      data.guide_language_requirement,
      data.hotel_star_requirement,
      data.status,
      id
    )
    return { changes: result.changes }
  })

  ipcMain.handle('tour-groups:delete', (_event, id) => {
    const stmt = db.prepare('DELETE FROM tour_groups WHERE id = ?')
    const result = stmt.run(id)
    return { changes: result.changes }
  })

  ipcMain.handle('tourists:list', (_event, params) => {
    const { groupId, page = 1, pageSize = 50 } = params || {}
    const offset = (page - 1) * pageSize
    let whereClause = ''
    const stmtParams: any[] = []

    if (groupId) {
      whereClause = 'WHERE group_id = ?'
      stmtParams.push(groupId)
    }

    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM tourists ${whereClause}`)
    const { total } = countStmt.get(...stmtParams) as { total: number }

    const listStmt = db.prepare(`
      SELECT * FROM tourists ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `)
    const list = listStmt.all(...stmtParams, pageSize, offset)

    return { list, total, page, pageSize }
  })

  ipcMain.handle('tourists:get', (_event, id) => {
    const stmt = db.prepare('SELECT * FROM tourists WHERE id = ?')
    return stmt.get(id)
  })

  ipcMain.handle('tourists:create', (_event, data) => {
    const stmt = db.prepare(`
      INSERT INTO tourists (
        group_id, name, id_card, phone, age, gender,
        special_needs, dietary_requirements, status,
        payment_status, amount_paid, seat_number, hotel_room,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'registered', 'unpaid', 0, NULL, NULL, datetime('now'))
    `)
    const result = stmt.run(
      data.group_id,
      data.name,
      data.id_card,
      data.phone,
      data.age,
      data.gender,
      data.special_needs,
      data.dietary_requirements
    )
    return { id: result.lastInsertRowid }
  })

  ipcMain.handle('tourists:update', (_event, id, data) => {
    const stmt = db.prepare(`
      UPDATE tourists SET
        group_id = ?, name = ?, id_card = ?, phone = ?,
        age = ?, gender = ?, special_needs = ?,
        dietary_requirements = ?, status = ?,
        payment_status = ?, amount_paid = ?,
        seat_number = ?, hotel_room = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `)
    const result = stmt.run(
      data.group_id,
      data.name,
      data.id_card,
      data.phone,
      data.age,
      data.gender,
      data.special_needs,
      data.dietary_requirements,
      data.status,
      data.payment_status,
      data.amount_paid,
      data.seat_number,
      data.hotel_room,
      id
    )
    return { changes: result.changes }
  })

  ipcMain.handle('tourists:delete', (_event, id) => {
    const stmt = db.prepare('DELETE FROM tourists WHERE id = ?')
    const result = stmt.run(id)
    return { changes: result.changes }
  })

  ipcMain.handle('tourists:updateStatus', (_event, id, status) => {
    const stmt = db.prepare(`
      UPDATE tourists SET status = ?, updated_at = datetime('now') WHERE id = ?
    `)
    const result = stmt.run(status, id)
    return { changes: result.changes }
  })

  ipcMain.handle('hotels:list', (_event, params) => {
    const { page = 1, pageSize = 50, star = null, city = '' } = params || {}
    const offset = (page - 1) * pageSize
    let whereClause = 'WHERE 1=1'
    const stmtParams: any[] = []

    if (star) {
      whereClause += ' AND star_rating = ?'
      stmtParams.push(star)
    }
    if (city) {
      whereClause += ' AND city LIKE ?'
      stmtParams.push(`%${city}%`)
    }

    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM hotels ${whereClause}`)
    const { total } = countStmt.get(...stmtParams) as { total: number }

    const listStmt = db.prepare(`
      SELECT * FROM hotels ${whereClause}
      ORDER BY star_rating DESC, name ASC
      LIMIT ? OFFSET ?
    `)
    const list = listStmt.all(...stmtParams, pageSize, offset)

    return { list, total, page, pageSize }
  })

  ipcMain.handle('hotels:all', () => {
    const stmt = db.prepare('SELECT * FROM hotels ORDER BY star_rating DESC, name ASC')
    return stmt.all()
  })

  ipcMain.handle('hotels:create', (_event, data) => {
    const stmt = db.prepare(`
      INSERT INTO hotels (
        name, city, address, star_rating, total_rooms,
        available_rooms, price_per_night, facilities, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `)
    const result = stmt.run(
      data.name,
      data.city,
      data.address,
      data.star_rating,
      data.total_rooms,
      data.available_rooms,
      data.price_per_night,
      data.facilities
    )
    return { id: result.lastInsertRowid }
  })

  ipcMain.handle('hotels:update', (_event, id, data) => {
    const stmt = db.prepare(`
      UPDATE hotels SET
        name = ?, city = ?, address = ?, star_rating = ?,
        total_rooms = ?, available_rooms = ?, price_per_night = ?,
        facilities = ?, updated_at = datetime('now')
      WHERE id = ?
    `)
    const result = stmt.run(
      data.name,
      data.city,
      data.address,
      data.star_rating,
      data.total_rooms,
      data.available_rooms,
      data.price_per_night,
      data.facilities,
      id
    )
    return { changes: result.changes }
  })

  ipcMain.handle('flights:list', (_event, params) => {
    const { page = 1, pageSize = 50, departure_city = '', arrival_city = '' } = params || {}
    const offset = (page - 1) * pageSize
    let whereClause = 'WHERE 1=1'
    const stmtParams: any[] = []

    if (departure_city) {
      whereClause += ' AND departure_city LIKE ?'
      stmtParams.push(`%${departure_city}%`)
    }
    if (arrival_city) {
      whereClause += ' AND arrival_city LIKE ?'
      stmtParams.push(`%${arrival_city}%`)
    }

    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM flights ${whereClause}`)
    const { total } = countStmt.get(...stmtParams) as { total: number }

    const listStmt = db.prepare(`
      SELECT * FROM flights ${whereClause}
      ORDER BY departure_time ASC
      LIMIT ? OFFSET ?
    `)
    const list = listStmt.all(...stmtParams, pageSize, offset)

    return { list, total, page, pageSize }
  })

  ipcMain.handle('flights:all', () => {
    const stmt = db.prepare('SELECT * FROM flights ORDER BY departure_time ASC')
    return stmt.all()
  })

  ipcMain.handle('flights:create', (_event, data) => {
    const stmt = db.prepare(`
      INSERT INTO flights (
        flight_number, airline, departure_city, arrival_city,
        departure_time, arrival_time, total_seats, available_seats,
        price_per_seat, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `)
    const result = stmt.run(
      data.flight_number,
      data.airline,
      data.departure_city,
      data.arrival_city,
      data.departure_time,
      data.arrival_time,
      data.total_seats,
      data.available_seats,
      data.price_per_seat
    )
    return { id: result.lastInsertRowid }
  })

  ipcMain.handle('flights:update', (_event, id, data) => {
    const stmt = db.prepare(`
      UPDATE flights SET
        flight_number = ?, airline = ?, departure_city = ?,
        arrival_city = ?, departure_time = ?, arrival_time = ?,
        total_seats = ?, available_seats = ?, price_per_seat = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `)
    const result = stmt.run(
      data.flight_number,
      data.airline,
      data.departure_city,
      data.arrival_city,
      data.departure_time,
      data.arrival_time,
      data.total_seats,
      data.available_seats,
      data.price_per_seat,
      id
    )
    return { changes: result.changes }
  })

  ipcMain.handle('guides:list', (_event, params) => {
    const { page = 1, pageSize = 50, language = '' } = params || {}
    const offset = (page - 1) * pageSize
    let whereClause = ''
    const stmtParams: any[] = []

    if (language) {
      whereClause = 'WHERE languages LIKE ?'
      stmtParams.push(`%${language}%`)
    }

    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM guides ${whereClause}`)
    const { total } = countStmt.get(...stmtParams) as { total: number }

    const listStmt = db.prepare(`
      SELECT * FROM guides ${whereClause}
      ORDER BY rating DESC, name ASC
      LIMIT ? OFFSET ?
    `)
    const list = listStmt.all(...stmtParams, pageSize, offset)

    return { list, total, page, pageSize }
  })

  ipcMain.handle('guides:all', () => {
    const stmt = db.prepare('SELECT * FROM guides ORDER BY rating DESC, name ASC')
    return stmt.all()
  })

  ipcMain.handle('guides:create', (_event, data) => {
    const stmt = db.prepare(`
      INSERT INTO guides (
        name, phone, id_card, languages,
        years_of_experience, rating, max_monthly_hours,
        current_month_hours, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'active', datetime('now'))
    `)
    const result = stmt.run(
      data.name,
      data.phone,
      data.id_card,
      data.languages,
      data.years_of_experience,
      data.rating || 5.0,
      data.max_monthly_hours || 160
    )
    return { id: result.lastInsertRowid }
  })

  ipcMain.handle('guides:update', (_event, id, data) => {
    const stmt = db.prepare(`
      UPDATE guides SET
        name = ?, phone = ?, id_card = ?, languages = ?,
        years_of_experience = ?, rating = ?, max_monthly_hours = ?,
        status = ?, updated_at = datetime('now')
      WHERE id = ?
    `)
    const result = stmt.run(
      data.name,
      data.phone,
      data.id_card,
      data.languages,
      data.years_of_experience,
      data.rating,
      data.max_monthly_hours,
      data.status,
      id
    )
    return { changes: result.changes }
  })

  ipcMain.handle('guide-schedules:list', (_event, params) => {
    const { groupId, guideId, page = 1, pageSize = 50 } = params || {}
    const offset = (page - 1) * pageSize
    let whereClause = 'WHERE 1=1'
    const stmtParams: any[] = []

    if (groupId) {
      whereClause += ' AND group_id = ?'
      stmtParams.push(groupId)
    }
    if (guideId) {
      whereClause += ' AND guide_id = ?'
      stmtParams.push(guideId)
    }

    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM guide_schedules ${whereClause}`)
    const { total } = countStmt.get(...stmtParams) as { total: number }

    const listStmt = db.prepare(`
      SELECT gs.*, g.name as guide_name, tg.group_name
      FROM guide_schedules gs
      LEFT JOIN guides g ON gs.guide_id = g.id
      LEFT JOIN tour_groups tg ON gs.group_id = tg.id
      ${whereClause}
      ORDER BY gs.start_date DESC
      LIMIT ? OFFSET ?
    `)
    const list = listStmt.all(...stmtParams, pageSize, offset)

    return { list, total, page, pageSize }
  })

  ipcMain.handle('guide-schedules:create', (_event, data) => {
    const stmt = db.prepare(`
      INSERT INTO guide_schedules (
        group_id, guide_id, start_date, end_date,
        estimated_hours, status, created_at
      ) VALUES (?, ?, ?, ?, ?, 'scheduled', datetime('now'))
    `)
    const result = stmt.run(
      data.group_id,
      data.guide_id,
      data.start_date,
      data.end_date,
      data.estimated_hours
    )
    return { id: result.lastInsertRowid }
  })

  ipcMain.handle('guide-schedules:update', (_event, id, data) => {
    const stmt = db.prepare(`
      UPDATE guide_schedules SET
        group_id = ?, guide_id = ?, start_date = ?,
        end_date = ?, estimated_hours = ?, status = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `)
    const result = stmt.run(
      data.group_id,
      data.guide_id,
      data.start_date,
      data.end_date,
      data.estimated_hours,
      data.status,
      id
    )
    return { changes: result.changes }
  })

  ipcMain.handle('shift-swaps:list', (_event, params) => {
    const { status, page = 1, pageSize = 50 } = params || {}
    const offset = (page - 1) * pageSize
    let whereClause = ''
    const stmtParams: any[] = []

    if (status) {
      whereClause = 'WHERE ss.status = ?'
      stmtParams.push(status)
    }

    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM shift_swaps ss ${whereClause}`)
    const { total } = countStmt.get(...stmtParams) as { total: number }

    const listStmt = db.prepare(`
      SELECT ss.*, g1.name as requester_name, g2.name as target_guide_name
      FROM shift_swaps ss
      LEFT JOIN guides g1 ON ss.requester_guide_id = g1.id
      LEFT JOIN guides g2 ON ss.target_guide_id = g2.id
      ${whereClause}
      ORDER BY ss.created_at DESC
      LIMIT ? OFFSET ?
    `)
    const list = listStmt.all(...stmtParams, pageSize, offset)

    return { list, total, page, pageSize }
  })

  ipcMain.handle('shift-swaps:create', (_event, data) => {
    const stmt = db.prepare(`
      INSERT INTO shift_swaps (
        requester_guide_id, target_guide_id, schedule_id,
        reason, status, created_at
      ) VALUES (?, ?, ?, ?, 'pending', datetime('now'))
    `)
    const result = stmt.run(
      data.requester_guide_id,
      data.target_guide_id,
      data.schedule_id,
      data.reason
    )
    return { id: result.lastInsertRowid }
  })

  ipcMain.handle('shift-swaps:approve', (_event, id) => {
    const db = getDatabase()
    const stmt = db.prepare(`
      UPDATE shift_swaps SET status = 'approved', approved_at = datetime('now')
      WHERE id = ?
    `)
    const result = stmt.run(id)
    return { changes: result.changes }
  })

  ipcMain.handle('shift-swaps:reject', (_event, id, rejectReason) => {
    const stmt = db.prepare(`
      UPDATE shift_swaps SET status = 'rejected', reject_reason = ?, rejected_at = datetime('now')
      WHERE id = ?
    `)
    const result = stmt.run(rejectReason, id)
    return { changes: result.changes }
  })

  ipcMain.handle('finance:settlements', (_event, params) => {
    const { page = 1, pageSize = 20, status = '' } = params || {}
    const offset = (page - 1) * pageSize
    let whereClause = ''
    const stmtParams: any[] = []

    if (status) {
      whereClause = 'WHERE fs.status = ?'
      stmtParams.push(status)
    }

    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM finance_settlements fs ${whereClause}`)
    const { total } = countStmt.get(...stmtParams) as { total: number }

    const listStmt = db.prepare(`
      SELECT fs.*, tg.group_name, tg.route_name
      FROM finance_settlements fs
      LEFT JOIN tour_groups tg ON fs.group_id = tg.id
      ${whereClause}
      ORDER BY fs.created_at DESC
      LIMIT ? OFFSET ?
    `)
    const list = listStmt.all(...stmtParams, pageSize, offset)

    return { list, total, page, pageSize }
  })

  ipcMain.handle('finance:createSettlement', (_event, groupId) => {
    const db = getDatabase()
    const groupStmt = db.prepare('SELECT * FROM tour_groups WHERE id = ?')
    const group = groupStmt.get(groupId) as any

    if (!group) {
      throw new Error('团不存在')
    }

    const touristsStmt = db.prepare('SELECT * FROM tourists WHERE group_id = ?')
    const tourists = touristsStmt.all(groupId) as any[]

    const totalFee = tourists.length * group.base_price
    let totalPaid = 0
    tourists.forEach(t => { totalPaid += t.amount_paid || 0 })

    const selfPaidStmt = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM self_paid_items WHERE group_id = ?')
    const { total: totalSelfPaid } = selfPaidStmt.get(groupId) as { total: number }

    const refundStmt = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM refunds WHERE group_id = ?')
    const { total: totalRefund } = refundStmt.get(groupId) as { total: number }

    const netAmount = totalFee + totalSelfPaid - totalRefund

    const insertStmt = db.prepare(`
      INSERT INTO finance_settlements (
        group_id, total_fee, total_paid, total_self_paid,
        total_refund, net_amount, tourist_count, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
    `)
    const result = insertStmt.run(
      groupId,
      totalFee,
      totalPaid,
      totalSelfPaid,
      totalRefund,
      netAmount,
      tourists.length
    )
    return { id: result.lastInsertRowid }
  })

  ipcMain.handle('finance:approveSettlement', (_event, id) => {
    const stmt = db.prepare(`
      UPDATE finance_settlements SET status = 'approved', approved_at = datetime('now')
      WHERE id = ?
    `)
    const result = stmt.run(id)
    return { changes: result.changes }
  })

  ipcMain.handle('finance:rejectSettlement', (_event, id, reason) => {
    const stmt = db.prepare(`
      UPDATE finance_settlements SET status = 'rejected', reject_reason = ?, rejected_at = datetime('now')
      WHERE id = ?
    `)
    const result = stmt.run(reason, id)
    return { changes: result.changes }
  })

  ipcMain.handle('self-paid:list', (_event, groupId) => {
    const stmt = db.prepare(`
      SELECT spi.*, t.name as tourist_name
      FROM self_paid_items spi
      LEFT JOIN tourists t ON spi.tourist_id = t.id
      WHERE spi.group_id = ?
      ORDER BY spi.created_at DESC
    `)
    return stmt.all(groupId)
  })

  ipcMain.handle('self-paid:create', (_event, data) => {
    const stmt = db.prepare(`
      INSERT INTO self_paid_items (
        group_id, tourist_id, item_name, amount, description, created_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))
    `)
    const result = stmt.run(
      data.group_id,
      data.tourist_id,
      data.item_name,
      data.amount,
      data.description
    )
    return { id: result.lastInsertRowid }
  })

  ipcMain.handle('refunds:list', (_event, groupId) => {
    const stmt = db.prepare(`
      SELECT r.*, t.name as tourist_name
      FROM refunds r
      LEFT JOIN tourists t ON r.tourist_id = t.id
      WHERE r.group_id = ?
      ORDER BY r.created_at DESC
    `)
    return stmt.all(groupId)
  })

  ipcMain.handle('refunds:create', (_event, data) => {
    const stmt = db.prepare(`
      INSERT INTO refunds (
        group_id, tourist_id, amount, reason, status, created_at
      ) VALUES (?, ?, ?, ?, 'pending', datetime('now'))
    `)
    const result = stmt.run(
      data.group_id,
      data.tourist_id,
      data.amount,
      data.reason
    )
    return { id: result.lastInsertRowid }
  })

  ipcMain.handle('resource:allocate', (_event, groupId) => {
    const db = getDatabase()

    const groupStmt = db.prepare('SELECT * FROM tour_groups WHERE id = ?')
    const group = groupStmt.get(groupId) as any

    if (!group) {
      throw new Error('团不存在')
    }

    const touristsStmt = db.prepare('SELECT * FROM tourists WHERE group_id = ?')
    const tourists = touristsStmt.all(groupId) as any[]

    if (tourists.length === 0) {
      return { success: false, message: '该团暂无游客' }
    }

    const hotelsStmt = db.prepare(`
      SELECT * FROM hotels
      WHERE star_rating >= ? AND available_rooms >= ?
      ORDER BY star_rating ASC, price_per_night ASC
      LIMIT 1
    `)
    const hotel = hotelsStmt.get(group.hotel_star_requirement || 3, Math.ceil(tourists.length / 2)) as any

    if (!hotel) {
      return { success: false, message: '没有符合条件的酒店房源' }
    }

    const flightsStmt = db.prepare(`
      SELECT * FROM flights
      WHERE available_seats >= ?
      ORDER BY price_per_seat ASC
      LIMIT 1
    `)
    const flight = flightsStmt.get(tourists.length) as any

    if (!flight) {
      return { success: false, message: '没有足够的机位' }
    }

    const sortedTourists = [...tourists].sort((a, b) => {
      if (a.special_needs && !b.special_needs) return -1
      if (!a.special_needs && b.special_needs) return 1
      return b.age - a.age
    })

    const updateTouristStmt = db.prepare(`
      UPDATE tourists SET
        seat_number = ?, hotel_room = ?,
        flight_id = ?, hotel_id = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `)

    const roomAssignments: { [key: string]: string[] } = {}
    let currentRoom = 101
    let currentRoomOccupants: string[] = []

    for (let i = 0; i < sortedTourists.length; i++) {
      const tourist = sortedTourists[i]
      const seatNumber = i + 1

      if (tourist.special_needs) {
        const roomKey = `单人房${currentRoom}`
        roomAssignments[roomKey] = [tourist.name]
        updateTouristStmt.run(seatNumber, roomKey, flight.id, hotel.id, tourist.id)
        currentRoom++
      } else {
        currentRoomOccupants.push(tourist.name)
        if (currentRoomOccupants.length === 2 || i === sortedTourists.length - 1) {
          const roomKey = `标准房${currentRoom}`
          roomAssignments[roomKey] = [...currentRoomOccupants]
          currentRoomOccupants.forEach((name) => {
            const t = sortedTourists.find(x => x.name === name)
            if (t) {
              updateTouristStmt.run(sortedTourists.indexOf(t) + 1, roomKey, flight.id, hotel.id, t.id)
            }
          })
          currentRoom++
          currentRoomOccupants = []
        }
      }
    }

    const updateHotelStmt = db.prepare(`
      UPDATE hotels SET available_rooms = available_rooms - ? WHERE id = ?
    `)
    updateHotelStmt.run(currentRoom - 101, hotel.id)

    const updateFlightStmt = db.prepare(`
      UPDATE flights SET available_seats = available_seats - ? WHERE id = ?
    `)
    updateFlightStmt.run(tourists.length, flight.id)

    const groupUpdateStmt = db.prepare(`
      UPDATE tour_groups SET hotel_id = ?, flight_id = ?, status = 'allocated'
      WHERE id = ?
    `)
    groupUpdateStmt.run(hotel.id, flight.id, groupId)

    return {
      success: true,
      hotel: { id: hotel.id, name: hotel.name, star_rating: hotel.star_rating },
      flight: { id: flight.id, flight_number: flight.flight_number, airline: flight.airline },
      touristCount: tourists.length,
      roomAssignments
    }
  })

  ipcMain.handle('statistics:overview', () => {
    const db = getDatabase()

    const groupCountStmt = db.prepare('SELECT COUNT(*) as count FROM tour_groups')
    const { count: totalGroups } = groupCountStmt.get() as { count: number }

    const touristCountStmt = db.prepare('SELECT COUNT(*) as count FROM tourists')
    const { count: totalTourists } = touristCountStmt.get() as { count: number }

    const revenueStmt = db.prepare(`
      SELECT COALESCE(SUM(net_amount), 0) as total
      FROM finance_settlements
      WHERE status = 'approved'
    `)
    const { total: totalRevenue } = revenueStmt.get() as { total: number }

    const pendingSettlementsStmt = db.prepare(`
      SELECT COUNT(*) as count FROM finance_settlements WHERE status = 'pending'
    `)
    const { count: pendingSettlements } = pendingSettlementsStmt.get() as { count: number }

    return {
      totalGroups,
      totalTourists,
      totalRevenue,
      pendingSettlements
    }
  })

  ipcMain.handle('statistics:byRoute', () => {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT
        tg.route_name,
        COUNT(DISTINCT tg.id) as group_count,
        COUNT(t.id) as tourist_count,
        COALESCE(AVG(t.amount_paid), 0) as avg_spending,
        COALESCE(SUM(t.amount_paid), 0) as total_revenue
      FROM tour_groups tg
      LEFT JOIN tourists t ON tg.id = t.group_id
      GROUP BY tg.route_name
      ORDER BY tourist_count DESC
    `)
    return stmt.all()
  })

  ipcMain.handle('statistics:byGuide', () => {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT
        g.name as guide_name,
        COUNT(DISTINCT gs.group_id) as group_count,
        COALESCE(SUM(gs.estimated_hours), 0) as total_hours,
        g.rating,
        (SELECT COUNT(*) FROM complaints c WHERE c.guide_id = g.id) as complaint_count
      FROM guides g
      LEFT JOIN guide_schedules gs ON g.id = gs.guide_id
      GROUP BY g.id
      ORDER BY group_count DESC
    `)
    return stmt.all()
  })

  ipcMain.handle('reminders:list', (_event, params) => {
    const { isRead = null, page = 1, pageSize = 50 } = params || {}
    const offset = (page - 1) * pageSize
    let whereClause = ''
    const stmtParams: any[] = []

    if (isRead !== null) {
      whereClause = 'WHERE is_read = ?'
      stmtParams.push(isRead ? 1 : 0)
    }

    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM reminders ${whereClause}`)
    const { total } = countStmt.get(...stmtParams) as { total: number }

    const listStmt = db.prepare(`
      SELECT * FROM reminders ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `)
    const list = listStmt.all(...stmtParams, pageSize, offset)

    return { list, total, page, pageSize }
  })

  ipcMain.handle('reminders:markAsRead', (_event, id) => {
    const stmt = db.prepare('UPDATE reminders SET is_read = 1 WHERE id = ?')
    const result = stmt.run(id)
    return { changes: result.changes }
  })

  ipcMain.handle('reminders:unreadCount', () => {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM reminders WHERE is_read = 0')
    return stmt.get()
  })

  ipcMain.handle('reminders:checkPaymentOverdue', () => {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT t.*, tg.group_name, tg.departure_date, tg.base_price
      FROM tourists t
      JOIN tour_groups tg ON t.group_id = tg.id
      WHERE t.payment_status = 'unpaid'
        AND t.status = 'registered'
        AND julianday('now') - julianday(t.created_at) > 3
    `)
    const overdueTourists = stmt.all() as any[]

    const insertStmt = db.prepare(`
      INSERT INTO reminders (type, title, content, related_id, related_type, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, 0, datetime('now'))
    `)

    overdueTourists.forEach(tourist => {
      const existingStmt = db.prepare(`
        SELECT id FROM reminders
        WHERE related_id = ? AND related_type = 'payment_reminder' AND is_read = 0
      `)
      const existing = existingStmt.get(tourist.id)

      if (!existing) {
        insertStmt.run(
          'payment',
          '付款催缴提醒',
          `游客 ${tourist.name} 报名${tourist.group_name}已超过3天未付款，请及时催缴。应缴金额：¥${tourist.base_price}`,
          tourist.id,
          'payment_reminder'
        )
      }
    })

    return { overdueCount: overdueTourists.length }
  })

  ipcMain.handle('reminders:checkDepartureSoon', () => {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT tg.*, COUNT(t.id) as tourist_count
      FROM tour_groups tg
      LEFT JOIN tourists t ON tg.id = t.group_id
      WHERE tg.status IN ('allocated', 'confirmed')
        AND julianday(tg.departure_date) - julianday('now') BETWEEN 0 AND 1
      GROUP BY tg.id
    `)
    const departingGroups = stmt.all() as any[]

    const insertStmt = db.prepare(`
      INSERT INTO reminders (type, title, content, related_id, related_type, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, 0, datetime('now'))
    `)

    departingGroups.forEach(group => {
      const existingStmt = db.prepare(`
        SELECT id FROM reminders
        WHERE related_id = ? AND related_type = 'departure_reminder' AND is_read = 0
      `)
      const existing = existingStmt.get(group.id)

      if (!existing) {
        insertStmt.run(
          'departure',
          '出团提醒',
          `${group.group_name} 将于 ${group.departure_date} 出发，当前报名 ${group.tourist_count} 人，请检查名单完整性。`,
          group.id,
          'departure_reminder'
        )
      }
    })

    return { departingCount: departingGroups.length }
  })

  ipcMain.handle('itinerary:generate', (_event, groupId) => {
    const db = getDatabase()

    const groupStmt = db.prepare('SELECT * FROM tour_groups WHERE id = ?')
    const group = groupStmt.get(groupId) as any

    if (!group) {
      throw new Error('团不存在')
    }

    const touristsStmt = db.prepare(`
      SELECT * FROM tourists WHERE group_id = ? ORDER BY seat_number ASC
    `)
    const tourists = touristsStmt.all(groupId)

    const hotelStmt = db.prepare('SELECT * FROM hotels WHERE id = ?')
    const hotel = group.hotel_id ? hotelStmt.get(group.hotel_id) : null

    const flightStmt = db.prepare('SELECT * FROM flights WHERE id = ?')
    const flight = group.flight_id ? flightStmt.get(group.flight_id) : null

    const guideScheduleStmt = db.prepare(`
      SELECT gs.*, g.name as guide_name, g.phone as guide_phone
      FROM guide_schedules gs
      LEFT JOIN guides g ON gs.guide_id = g.id
      WHERE gs.group_id = ? AND gs.status = 'scheduled'
      LIMIT 1
    `)
    const guideSchedule = guideScheduleStmt.get(groupId)

    return {
      group,
      tourists,
      hotel,
      flight,
      guide: guideSchedule
    }
  })
}

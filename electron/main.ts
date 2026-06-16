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

function normalizeLanguages(val: any): string {
  if (Array.isArray(val)) {
    return val.map((x: any) => String(x).trim()).filter(Boolean).join(',')
  }
  if (typeof val === 'string') {
    return val
  }
  return String(val || '')
}

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
        is_locked, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'registered', 'unpaid', 0, NULL, NULL, 0, datetime('now'))
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
    const getTouristStmt = db.prepare('SELECT * FROM tourists WHERE id = ?')
    const existing: any = getTouristStmt.get(id)
    if (!existing) {
      return { success: false, message: '游客不存在', changes: 0 }
    }

    const groupStmt = db.prepare('SELECT base_price FROM tour_groups WHERE id = ?')
    const group: any = groupStmt.get(existing.group_id)
    const basePrice = group?.base_price || 0

    const fields: string[] = []
    const values: any[] = []

    if (data.group_id !== undefined) { fields.push('group_id = ?'); values.push(data.group_id) }
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
    if (data.id_card !== undefined) { fields.push('id_card = ?'); values.push(data.id_card) }
    if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone) }
    if (data.age !== undefined) { fields.push('age = ?'); values.push(data.age) }
    if (data.gender !== undefined) { fields.push('gender = ?'); values.push(data.gender) }
    if (data.special_needs !== undefined) { fields.push('special_needs = ?'); values.push(data.special_needs) }
    if (data.dietary_requirements !== undefined) { fields.push('dietary_requirements = ?'); values.push(data.dietary_requirements) }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status) }
    if (data.payment_status !== undefined) { fields.push('payment_status = ?'); values.push(data.payment_status) }
    if (data.amount_paid !== undefined) { fields.push('amount_paid = ?'); values.push(data.amount_paid) }
    if (data.seat_number !== undefined) { fields.push('seat_number = ?'); values.push(data.seat_number) }
    if (data.hotel_room !== undefined) { fields.push('hotel_room = ?'); values.push(data.hotel_room) }
    if (data.hotel_id !== undefined) { fields.push('hotel_id = ?'); values.push(data.hotel_id) }
    if (data.flight_id !== undefined) { fields.push('flight_id = ?'); values.push(data.flight_id) }

    const paymentStatus = data.payment_status !== undefined ? data.payment_status : existing.payment_status
    const amountPaid = data.amount_paid !== undefined ? Number(data.amount_paid) : Number(existing.amount_paid || 0)

    if (paymentStatus === 'paid' || (amountPaid >= basePrice && basePrice > 0)) {
      fields.push('is_locked = ?')
      values.push(0)
      fields.push('lock_reason = ?')
      values.push(null)
      fields.push('locked_at = ?')
      values.push(null)
    } else if (data.is_locked !== undefined) {
      fields.push('is_locked = ?')
      values.push(data.is_locked)
      if (data.lock_reason !== undefined) {
        fields.push('lock_reason = ?')
        values.push(data.lock_reason)
      }
      if (data.locked_at !== undefined) {
        fields.push('locked_at = ?')
        values.push(data.locked_at)
      }
    }

    if (fields.length === 0) {
      return { success: true, message: '无字段需要更新', changes: 0 }
    }

    fields.push('updated_at = datetime(\'now\')')
    values.push(id)

    const sql = `UPDATE tourists SET ${fields.join(', ')} WHERE id = ?`
    const stmt = db.prepare(sql)
    const result = stmt.run(...values)

    const updatedTourist = getTouristStmt.get(id)
    return { success: true, changes: result.changes, tourist: updatedTourist }
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

  ipcMain.handle('tourists:unlock', (_event, id) => {
    const stmt = db.prepare(`
      UPDATE tourists SET is_locked = 0, lock_reason = NULL, locked_at = NULL, updated_at = datetime('now')
      WHERE id = ?
    `)
    const result = stmt.run(id)
    if (result.changes > 0) {
      return { success: true, message: '名额已解锁', changes: result.changes }
    }
    return { success: false, message: '解锁失败', changes: 0 }
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
    const languagesStr = normalizeLanguages(data.languages)
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
      languagesStr,
      data.years_of_experience,
      data.rating || 5.0,
      data.max_monthly_hours || 160
    )
    return { id: result.lastInsertRowid }
  })

  ipcMain.handle('guides:update', (_event, id, data) => {
    const languagesStr = normalizeLanguages(data.languages)
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
      languagesStr,
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
      whereClause += ' AND gs.group_id = ?'
      stmtParams.push(groupId)
    }
    if (guideId) {
      whereClause += ' AND gs.guide_id = ?'
      stmtParams.push(guideId)
    }

    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM guide_schedules gs ${whereClause}`)
    const { total } = countStmt.get(...stmtParams) as { total: number }

    const listStmt = db.prepare(`
      SELECT gs.*, g.name as guide_name, tg.group_name,
             og.name as original_guide_name
      FROM guide_schedules gs
      LEFT JOIN guides g ON gs.guide_id = g.id
      LEFT JOIN tour_groups tg ON gs.group_id = tg.id
      LEFT JOIN guides og ON gs.original_guide_id = og.id
      ${whereClause}
      ORDER BY gs.created_at DESC
      LIMIT ? OFFSET ?
    `)
    const list = listStmt.all(...stmtParams, pageSize, offset)

    return { list, total, page, pageSize }
  })

  ipcMain.handle('guide-schedules:create', (_event, data) => {
    const insertStmt = db.prepare(`
      INSERT INTO guide_schedules (
        group_id, guide_id, start_date, end_date,
        estimated_hours, status, created_at
      ) VALUES (?, ?, ?, ?, ?, 'scheduled', datetime('now'))
    `)
    const result = insertStmt.run(
      data.group_id,
      data.guide_id,
      data.start_date,
      data.end_date,
      data.estimated_hours
    )
    if (data.estimated_hours) {
      const updateGuideStmt = db.prepare(`
        UPDATE guides SET current_month_hours = current_month_hours + ?, updated_at = datetime('now')
        WHERE id = ?
      `)
      updateGuideStmt.run(Number(data.estimated_hours), data.guide_id)
    }
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

  ipcMain.handle('guide-schedules:autoSchedule', async () => {
    const unscheduledGroupsStmt = db.prepare(`
      SELECT tg.*
      FROM tour_groups tg
      LEFT JOIN guide_schedules gs ON tg.id = gs.group_id
      WHERE gs.id IS NULL
        AND tg.status IN ('draft','allocated','confirmed')
        AND tg.departure_date IS NOT NULL
      ORDER BY tg.departure_date ASC
    `)
    const groups: any[] = unscheduledGroupsStmt.all()

    if (groups.length === 0) {
      return { success: true, message: '暂无可排班的旅行团', created: 0, skipped: [] }
    }

    const allGuidesStmt = db.prepare(`
      SELECT * FROM guides WHERE status = 'active'
    `)
    const guides: any[] = allGuidesStmt.all()

    const insertScheduleStmt = db.prepare(`
      INSERT INTO guide_schedules (
        group_id, guide_id, start_date, end_date,
        estimated_hours, status, created_at
      ) VALUES (?, ?, ?, ?, ?, 'scheduled', datetime('now'))
    `)
    const updateHoursStmt = db.prepare(`
      UPDATE guides SET current_month_hours = current_month_hours + ?, updated_at = datetime('now')
      WHERE id = ?
    `)

    let createdCount = 0
    const skipped: any[] = []

    const txn = db.transaction(() => {
      for (const group of groups) {
        const requiredLangs = (group.guide_language_requirement || '中文')
          .split(/[,，]/)
          .map((s: string) => s.trim())
          .filter(Boolean)

        let days = 5
        if (group.departure_date && group.return_date) {
          const d1 = new Date(group.departure_date).getTime()
          const d2 = new Date(group.return_date).getTime()
          const diff = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24))
          if (diff > 0) days = diff
        }
        const estimatedHours = days * 10

        let matchedGuide: any = null
        for (const guide of guides) {
          const guideLangs = (guide.languages || '')
            .split(/[,，]/)
            .map((s: string) => s.trim())
            .filter(Boolean)
          const allMatch = requiredLangs.every((rl: string) =>
            guideLangs.some(gl => gl === rl || gl.includes(rl) || rl.includes(gl))
          )
          if (!allMatch) continue
          const totalHours = (guide.current_month_hours || 0) + estimatedHours
          if (totalHours > (guide.max_monthly_hours || 160)) continue
          if (!matchedGuide || (guide.rating || 0) > (matchedGuide.rating || 0)) {
            matchedGuide = guide
          }
        }

        if (!matchedGuide) {
          skipped.push({
            group_id: group.id,
            group_name: group.group_name,
            reason: requiredLangs.length > 0
              ? `无符合语言要求（${requiredLangs.join('/')}）且工时未超限的导游`
              : '无可用导游'
          })
          continue
        }

        insertScheduleStmt.run(
          group.id,
          matchedGuide.id,
          group.departure_date,
          group.return_date,
          estimatedHours
        )
        updateHoursStmt.run(estimatedHours, matchedGuide.id)
        matchedGuide.current_month_hours = (matchedGuide.current_month_hours || 0) + estimatedHours
        createdCount++
      }
    })

    try {
      txn()
      return {
        success: true,
        message: `排班完成，成功生成 ${createdCount} 条排班`,
        created: createdCount,
        skipped,
      }
    } catch (e: any) {
      return {
        success: false,
        message: '排班失败: ' + (e.message || String(e)),
        created: 0,
        skipped: [],
      }
    }
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
      SELECT ss.*, g1.name as requester_name, g2.name as target_guide_name,
             tg.group_name as schedule_group_name
      FROM shift_swaps ss
      LEFT JOIN guides g1 ON ss.requester_guide_id = g1.id
      LEFT JOIN guides g2 ON ss.target_guide_id = g2.id
      LEFT JOIN guide_schedules gs ON ss.schedule_id = gs.id
      LEFT JOIN tour_groups tg ON gs.group_id = tg.id
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
    const getSwapStmt = db.prepare('SELECT * FROM shift_swaps WHERE id = ?')
    const swap: any = getSwapStmt.get(id)
    if (!swap) {
      return { success: false, message: '调班申请不存在', changes: 0 }
    }
    if (swap.status !== 'pending') {
      return { success: false, message: '该申请已被处理', changes: 0 }
    }
    const getScheduleStmt = db.prepare('SELECT * FROM guide_schedules WHERE id = ?')
    const schedule: any = getScheduleStmt.get(swap.schedule_id)
    if (!schedule) {
      return { success: false, message: '排班记录不存在', changes: 0 }
    }
    const originalGuideId = schedule.guide_id
    if (Number(originalGuideId) !== Number(swap.requester_guide_id)) {
      return { success: false, message: '申请人与当前排班导游不符，无法审批', changes: 0 }
    }
    const targetGuideStmt = db.prepare('SELECT * FROM guides WHERE id = ?')
    const targetGuide: any = targetGuideStmt.get(swap.target_guide_id)
    if (!targetGuide) {
      return { success: false, message: '目标导游不存在', changes: 0 }
    }
    const estHours = Number(schedule.estimated_hours || 0)
    const newHours = (targetGuide.current_month_hours || 0) + estHours
    if (newHours > (targetGuide.max_monthly_hours || 160)) {
      return { success: false, message: `目标导游本月工时将超过上限${targetGuide.max_monthly_hours}小时，无法调班`, changes: 0 }
    }

    const txn = db.transaction(() => {
      const updateSwapStmt = db.prepare(`
        UPDATE shift_swaps SET status = 'approved', approved_at = datetime('now') WHERE id = ?
      `)
      updateSwapStmt.run(id)

      const updateReqStmt = db.prepare(`
        UPDATE guides SET current_month_hours = current_month_hours - ?, updated_at = datetime('now')
        WHERE id = ? AND current_month_hours >= ?
      `)
      updateReqStmt.run(estHours, originalGuideId, estHours)

      const updateTgtStmt = db.prepare(`
        UPDATE guides SET current_month_hours = current_month_hours + ?, updated_at = datetime('now')
        WHERE id = ?
      `)
      updateTgtStmt.run(estHours, swap.target_guide_id)

      const updateScheduleStmt = db.prepare(`
        UPDATE guide_schedules SET
          guide_id = ?,
          original_guide_id = ?,
          swap_reason = ?,
          swapped_at = datetime('now'),
          updated_at = datetime('now')
        WHERE id = ?
      `)
      updateScheduleStmt.run(
        swap.target_guide_id,
        originalGuideId,
        swap.reason,
        swap.schedule_id
      )
    })

    try {
      txn()
      return { success: true, message: '审批通过，排班已变更到目标导游名下', changes: 1 }
    } catch (e: any) {
      return { success: false, message: e.message || String(e), changes: 0 }
    }
  })

  ipcMain.handle('shift-swaps:reject', (_event, id, rejectReason) => {
    const getSwapStmt = db.prepare('SELECT * FROM shift_swaps WHERE id = ?')
    const swap: any = getSwapStmt.get(id)
    if (!swap) {
      return { success: false, message: '调班申请不存在', changes: 0 }
    }
    if (swap.status !== 'pending') {
      return { success: false, message: '该申请已被处理', changes: 0 }
    }
    const stmt = db.prepare(`
      UPDATE shift_swaps SET status = 'rejected', reject_reason = ?, rejected_at = datetime('now')
      WHERE id = ? AND status = 'pending'
    `)
    const result = stmt.run(rejectReason, id)
    if (result.changes > 0) {
      return { success: true, message: '已驳回，原排班保持不变', changes: result.changes }
    }
    return { success: false, message: '驳回失败', changes: 0 }
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
    const groupStmt = db.prepare('SELECT * FROM tour_groups WHERE id = ?')
    const group = groupStmt.get(groupId) as any

    if (!group) {
      throw new Error('团不存在')
    }

    const touristsStmt = db.prepare('SELECT * FROM tourists WHERE group_id = ?')
    const tourists = touristsStmt.all(groupId) as any[]

    const totalFee = tourists.length * Number(group.base_price || 0)
    let totalPaid = 0
    tourists.forEach(t => { totalPaid += Number(t.amount_paid || 0) })

    const selfPaidStmt = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM self_paid_items WHERE group_id = ?')
    const { total: totalSelfPaid } = selfPaidStmt.get(groupId) as { total: number }

    const refundStmt = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM refunds WHERE group_id = ?')
    const { total: totalRefund } = refundStmt.get(groupId) as { total: number }

    const netAmount = Number(totalFee) + Number(totalSelfPaid || 0) - Number(totalRefund || 0)

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
      totalSelfPaid || 0,
      totalRefund || 0,
      netAmount,
      tourists.length
    )
    return {
      success: true,
      settlementId: result.lastInsertRowid,
      totalFee,
      totalPaid,
      totalSelfPaid: totalSelfPaid || 0,
      totalRefund: totalRefund || 0,
      netAmount,
      touristCount: tourists.length,
    }
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
      Number(data.amount || 0),
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
      Number(data.amount || 0),
      data.reason
    )
    return { id: result.lastInsertRowid }
  })

  ipcMain.handle('resource:allocate', (_event, groupId) => {
    const groupStmt = db.prepare('SELECT * FROM tour_groups WHERE id = ?')
    const group = groupStmt.get(groupId) as any

    if (!group) {
      return { success: false, message: '团不存在' }
    }

    const touristsStmt = db.prepare('SELECT * FROM tourists WHERE group_id = ?')
    const tourists = touristsStmt.all(groupId) as any[]

    if (tourists.length === 0) {
      return { success: false, message: '该团暂无游客' }
    }

    const specialCount = tourists.filter(t => t.special_needs && t.special_needs.length > 0).length
    const normalCount = tourists.length - specialCount
    const neededRooms = specialCount + Math.ceil(normalCount / 2)

    if (neededRooms <= 0) {
      return { success: false, message: '房间数计算异常' }
    }

    const hotelsStmt = db.prepare(`
      SELECT * FROM hotels
      WHERE star_rating >= ? AND available_rooms >= ?
      ORDER BY star_rating ASC, price_per_night ASC
      LIMIT 1
    `)
    const hotel = hotelsStmt.get(
      group.hotel_star_requirement || 3,
      neededRooms
    ) as any

    if (!hotel) {
      const checkStmt = db.prepare(`
        SELECT name, available_rooms, star_rating FROM hotels
        WHERE star_rating >= ?
        ORDER BY available_rooms DESC
        LIMIT 3
      `)
      const candidates = checkStmt.all(group.hotel_star_requirement || 3) as any[]
      const detail = candidates.length > 0
        ? '最高可用: ' + candidates.map(c => `${c.name}(${c.star_rating}星,剩${c.available_rooms}间)`).join('; ')
        : '无符合星级的酒店'
      return {
        success: false,
        message: `酒店库存不足，需要 ${neededRooms} 间（特殊需求${specialCount}人需单人房+普通${normalCount}人需${Math.ceil(normalCount/2)}间标准房）。${detail}`,
      }
    }

    if (hotel.available_rooms < neededRooms) {
      return {
        success: false,
        message: `酒店可用房间(${hotel.available_rooms}间)不足，需要${neededRooms}间`,
      }
    }

    const flightsStmt = db.prepare(`
      SELECT * FROM flights
      WHERE available_seats >= ?
      ORDER BY price_per_seat ASC
      LIMIT 1
    `)
    const flight = flightsStmt.get(tourists.length) as any

    if (!flight) {
      return { success: false, message: `没有足够的机位(需要${tourists.length}个)` }
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
    let currentRoomNum = 101
    let currentRoomOccupants: { id: number; name: string; idx: number }[] = []

    const txn = db.transaction(() => {
      for (let i = 0; i < sortedTourists.length; i++) {
        const tourist = sortedTourists[i]
        const seatNumber = i + 1

        if (tourist.special_needs) {
          const roomKey = `单人房${currentRoomNum}`
          roomAssignments[roomKey] = [tourist.name]
          updateTouristStmt.run(seatNumber, roomKey, flight.id, hotel.id, tourist.id)
          currentRoomNum++
        } else {
          currentRoomOccupants.push({ id: tourist.id, name: tourist.name, idx: i })
          if (currentRoomOccupants.length === 2 || i === sortedTourists.length - 1) {
            const roomKey = `标准房${currentRoomNum}`
            roomAssignments[roomKey] = currentRoomOccupants.map(x => x.name)
            currentRoomOccupants.forEach(person => {
              const actualSeat = person.idx + 1
              updateTouristStmt.run(actualSeat, roomKey, flight.id, hotel.id, person.id)
            })
            currentRoomNum++
            currentRoomOccupants = []
          }
        }
      }

      const roomsConsumed = currentRoomNum - 101
      if (roomsConsumed !== neededRooms) {
        throw new Error(`房间分配异常:计算${neededRooms}间，实际${roomsConsumed}间`)
      }

      const updateHotelStmt = db.prepare(`
        UPDATE hotels SET
          available_rooms = available_rooms - ?,
          updated_at = datetime('now')
        WHERE id = ? AND available_rooms >= ?
      `)
      const hotelRes = updateHotelStmt.run(roomsConsumed, hotel.id, roomsConsumed)
      if (hotelRes.changes !== 1) {
        throw new Error('酒店库存变更失败，可能库存已被占用')
      }

      const updateFlightStmt = db.prepare(`
        UPDATE flights SET
          available_seats = available_seats - ?,
          updated_at = datetime('now')
        WHERE id = ? AND available_seats >= ?
      `)
      const flightRes = updateFlightStmt.run(tourists.length, flight.id, tourists.length)
      if (flightRes.changes !== 1) {
        throw new Error('航班库存变更失败')
      }

      const groupUpdateStmt = db.prepare(`
        UPDATE tour_groups SET hotel_id = ?, flight_id = ?, status = 'allocated'
        WHERE id = ?
      `)
      groupUpdateStmt.run(hotel.id, flight.id, groupId)
    })

    try {
      txn()
      return {
        success: true,
        hotel: {
          id: hotel.id,
          name: hotel.name,
          star_rating: hotel.star_rating,
          rooms_booked: neededRooms,
          remaining_rooms: hotel.available_rooms - neededRooms,
        },
        flight: {
          id: flight.id,
          flight_number: flight.flight_number,
          airline: flight.airline,
          seats_booked: tourists.length,
          remaining_seats: flight.available_seats - tourists.length,
        },
        touristCount: tourists.length,
        roomAssignments,
      }
    } catch (e: any) {
      return { success: false, message: e.message || '资源分配事务失败，请重试' }
    }
  })

  ipcMain.handle('statistics:overview', () => {
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
      totalRevenue: Number(totalRevenue || 0),
      pendingSettlements,
    }
  })

  ipcMain.handle('statistics:byRoute', () => {
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
    const stmt = db.prepare(`
      SELECT t.*, tg.group_name, tg.departure_date, tg.base_price
      FROM tourists t
      JOIN tour_groups tg ON t.group_id = tg.id
      WHERE t.payment_status != 'paid'
        AND COALESCE(t.is_locked, 0) = 0
        AND julianday('now') - julianday(t.created_at) > 3
    `)
    const overdueTourists = stmt.all() as any[]

    const insertReminderStmt = db.prepare(`
      INSERT INTO reminders (type, title, content, related_id, related_type, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, 0, datetime('now'))
    `)
    const lockTouristStmt = db.prepare(`
      UPDATE tourists SET
        is_locked = 1,
        lock_reason = '超期未付款催缴锁定名额',
        locked_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ? AND COALESCE(is_locked, 0) = 0
    `)

    let lockedCount = 0
    let reminderCount = 0

    const txn = db.transaction(() => {
      for (const tourist of overdueTourists) {
        const lockRes = lockTouristStmt.run(tourist.id)
        if (lockRes.changes > 0) lockedCount++

        const existingStmt = db.prepare(`
          SELECT id FROM reminders
          WHERE related_id = ? AND related_type = 'payment_reminder' AND is_read = 0
        `)
        const existing = existingStmt.get(tourist.id)

        if (!existing) {
          insertReminderStmt.run(
            'payment',
            '付款催缴提醒',
            `游客 ${tourist.name} 报名${tourist.group_name}已超过3天未付款，名额已锁定，收款后自动解锁。应缴金额：¥${tourist.base_price}`,
            tourist.id,
            'payment_reminder'
          )
          reminderCount++
        }
      }
    })

    try {
      txn()
      return { overdueCount: overdueTourists.length, lockedCount, reminderCount }
    } catch (e) {
      return { overdueCount: overdueTourists.length, lockedCount: 0, reminderCount: 0, error: String(e) }
    }
  })

  ipcMain.handle('reminders:checkDepartureSoon', () => {
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

    let count = 0
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
        count++
      }
    })

    return { departingCount: departingGroups.length, generated: count }
  })

  ipcMain.handle('itinerary:generate', (_event, groupId) => {
    const groupStmt = db.prepare('SELECT * FROM tour_groups WHERE id = ?')
    const group = groupStmt.get(groupId) as any

    if (!group) {
      throw new Error('团不存在')
    }

    const touristsStmt = db.prepare(`
      SELECT * FROM tourists WHERE group_id = ? ORDER BY COALESCE(seat_number, id) ASC
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
      ORDER BY gs.created_at DESC
      LIMIT 1
    `)
    const guideSchedule = guideScheduleStmt.get(groupId)

    const pushRecordStmt = db.prepare(`
      SELECT * FROM itinerary_push_records
      WHERE group_id = ?
      ORDER BY pushed_at DESC
      LIMIT 1
    `)
    const pushRecord = pushRecordStmt.get(groupId) as any

    const pushStatus = pushRecord
      ? {
          push_status: (pushRecord.push_status === 'pushed' || pushRecord.push_status === 'success') ? 'pushed' : pushRecord.push_status,
          pushed_at: pushRecord.pushed_at,
          pushed_to: pushRecord.pushed_to,
          remark: pushRecord.remark,
          group_id: pushRecord.group_id,
          group_name: pushRecord.group_name,
        }
      : {
          push_status: 'not_pushed',
          pushed_at: null,
          pushed_to: null,
          remark: null,
        }

    return {
      group,
      tourists,
      hotel,
      flight,
      guide: guideSchedule,
      push_status: pushStatus,
    }
  })

  ipcMain.handle('itinerary:pushToLeader', (_event, groupId) => {
    const groupStmt = db.prepare('SELECT * FROM tour_groups WHERE id = ?')
    const group = groupStmt.get(groupId) as any
    if (!group) {
      return { success: false, message: '团不存在' }
    }

    const insertPushStmt = db.prepare(`
      INSERT INTO itinerary_push_records (
        group_id, group_name, pushed_at, pushed_to, push_status, remark, created_at
      ) VALUES (?, ?, datetime('now'), '领队终端', 'pushed', '已成功推送至领队设备', datetime('now'))
    `)
    const result = insertPushStmt.run(
      groupId,
      group.group_name
    )

    const pushRecord = {
      id: result.lastInsertRowid,
      group_id: groupId,
      group_name: group.group_name,
    }

    return {
      success: true,
      message: '行程单已成功推送至领队终端',
      pushRecord,
    }
  })

  ipcMain.handle('itinerary:pushList', () => {
    const stmt = db.prepare(`
      SELECT * FROM itinerary_push_records
      ORDER BY pushed_at DESC
      LIMIT 100
    `)
    const list = stmt.all() as any[]
    return list.map(r => ({
      ...r,
      push_status: (r.push_status === 'pushed' || r.push_status === 'success') ? 'pushed' : r.push_status,
    }))
  })
}

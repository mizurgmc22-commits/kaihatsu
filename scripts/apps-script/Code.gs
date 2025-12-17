/**
 * Google Apps Script for Equipment Booking System
 * Syncs data from Cloud SQL (via Cloud Run API) to Google Spreadsheet
 * 
 * Setup:
 * 1. Create a new Google Spreadsheet
 * 2. Go to Extensions > Apps Script
 * 3. Copy this code into Code.gs
 * 4. Set up Script Properties (see CONFIG section)
 * 5. Set up time-based triggers for automatic sync
 */

// ============================================
// CONFIGURATION
// ============================================

/**
 * Get configuration from Script Properties
 * Set these in Project Settings > Script Properties:
 * - API_BASE_URL: Your Cloud Run API URL (e.g., https://your-api-xxxxx-an.a.run.app)
 * - API_KEY: Optional API key for authentication
 */
function getConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    apiBaseUrl: props.getProperty('API_BASE_URL') || '',
    apiKey: props.getProperty('API_KEY') || '',
  };
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Main sync function - call this from trigger
 */
function syncAllData() {
  try {
    Logger.log('Starting data sync...');
    
    syncReservations();
    syncEquipment();
    syncStatistics();
    
    Logger.log('Data sync completed successfully');
  } catch (error) {
    Logger.log('Sync failed: ' + error.message);
    // Send email notification on failure
    sendErrorNotification(error);
  }
}

/**
 * Sync reservations to spreadsheet
 */
function syncReservations() {
  const config = getConfig();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Get or create sheet
  let sheet = ss.getSheetByName('予約一覧');
  if (!sheet) {
    sheet = ss.insertSheet('予約一覧');
  }
  
  // Fetch data from API
  const url = config.apiBaseUrl + '/api/admin/export/reservations?format=json';
  const options = {
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
    },
    muteHttpExceptions: true,
  };
  
  // Add API key if configured
  if (config.apiKey) {
    options.headers['Authorization'] = 'Bearer ' + config.apiKey;
  }
  
  const response = UrlFetchApp.fetch(url, options);
  const data = JSON.parse(response.getContentText());
  
  if (!data.success) {
    throw new Error('API returned error: ' + (data.error || 'Unknown error'));
  }
  
  const reservations = data.data || [];
  
  // Clear existing data
  sheet.clear();
  
  // Set headers
  const headers = [
    'ID', '資機材', '申請者', '部署', '連絡先', 
    '開始日時', '終了日時', '数量', '目的', 'ステータス', 
    '備考', '作成日時'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.getRange(1, 1, 1, headers.length).setBackground('#4285f4');
  sheet.getRange(1, 1, 1, headers.length).setFontColor('white');
  
  // Add data rows
  if (reservations.length > 0) {
    const rows = reservations.map(function(r) {
      return [
        r.id,
        r.equipment_name || r.custom_equipment_name || '',
        r.applicant_name,
        r.department,
        r.contact_info,
        formatDateTime(r.start_time),
        formatDateTime(r.end_time),
        r.quantity,
        r.purpose || '',
        translateStatus(r.status),
        r.notes || '',
        formatDateTime(r.created_at),
      ];
    });
    
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  
  // Auto-resize columns
  for (var i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }
  
  // Add last updated timestamp
  sheet.getRange(reservations.length + 3, 1).setValue('最終更新: ' + new Date().toLocaleString('ja-JP'));
  
  Logger.log('Synced ' + reservations.length + ' reservations');
}

/**
 * Sync equipment to spreadsheet
 */
function syncEquipment() {
  const config = getConfig();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  let sheet = ss.getSheetByName('資機材一覧');
  if (!sheet) {
    sheet = ss.insertSheet('資機材一覧');
  }
  
  const url = config.apiBaseUrl + '/api/equipment?include_inactive=true';
  const options = {
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
    },
    muteHttpExceptions: true,
  };
  
  if (config.apiKey) {
    options.headers['Authorization'] = 'Bearer ' + config.apiKey;
  }
  
  const response = UrlFetchApp.fetch(url, options);
  const data = JSON.parse(response.getContentText());
  
  if (!data.success) {
    throw new Error('API returned error: ' + (data.error || 'Unknown error'));
  }
  
  const equipment = data.data || [];
  
  sheet.clear();
  
  const headers = ['ID', 'カテゴリ', '名称', '説明', '数量', '無制限', '保管場所', 'ステータス'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.getRange(1, 1, 1, headers.length).setBackground('#34a853');
  sheet.getRange(1, 1, 1, headers.length).setFontColor('white');
  
  if (equipment.length > 0) {
    const rows = equipment.map(function(e) {
      return [
        e.id,
        e.category ? e.category.name : '',
        e.name,
        e.description || '',
        e.quantity,
        e.is_unlimited ? '○' : '',
        e.location || '',
        e.status === 'active' ? '有効' : '無効',
      ];
    });
    
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  
  for (var i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }
  
  sheet.getRange(equipment.length + 3, 1).setValue('最終更新: ' + new Date().toLocaleString('ja-JP'));
  
  Logger.log('Synced ' + equipment.length + ' equipment items');
}

/**
 * Create statistics summary sheet
 */
function syncStatistics() {
  const config = getConfig();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  let sheet = ss.getSheetByName('統計サマリー');
  if (!sheet) {
    sheet = ss.insertSheet('統計サマリー');
  }
  
  const url = config.apiBaseUrl + '/api/admin/dashboard';
  const options = {
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
    },
    muteHttpExceptions: true,
  };
  
  if (config.apiKey) {
    options.headers['Authorization'] = 'Bearer ' + config.apiKey;
  }
  
  const response = UrlFetchApp.fetch(url, options);
  const data = JSON.parse(response.getContentText());
  
  if (!data.success) {
    throw new Error('API returned error: ' + (data.error || 'Unknown error'));
  }
  
  const dashboard = data.data;
  
  sheet.clear();
  
  // Title
  sheet.getRange('A1').setValue('予約システム統計サマリー');
  sheet.getRange('A1').setFontSize(16);
  sheet.getRange('A1').setFontWeight('bold');
  
  // Counts section
  sheet.getRange('A3').setValue('概要');
  sheet.getRange('A3').setFontWeight('bold');
  sheet.getRange('A3').setBackground('#fbbc04');
  
  const counts = [
    ['承認待ち予約', dashboard.counts.pending_reservations],
    ['本日の予約', dashboard.counts.today_reservations],
    ['有効な資機材', dashboard.counts.active_equipment],
    ['登録ユーザー', dashboard.counts.total_users],
  ];
  sheet.getRange(4, 1, counts.length, 2).setValues(counts);
  
  // Status breakdown
  sheet.getRange('A9').setValue('ステータス別予約数');
  sheet.getRange('A9').setFontWeight('bold');
  sheet.getRange('A9').setBackground('#fbbc04');
  
  const statusStats = dashboard.status_stats || {};
  const statusRows = [
    ['承認待ち', statusStats.pending || 0],
    ['承認済み', statusStats.approved || 0],
    ['却下', statusStats.rejected || 0],
    ['キャンセル', statusStats.cancelled || 0],
    ['完了', statusStats.completed || 0],
  ];
  sheet.getRange(10, 1, statusRows.length, 2).setValues(statusRows);
  
  // Timestamp
  sheet.getRange('A16').setValue('最終更新: ' + new Date().toLocaleString('ja-JP'));
  
  // Auto-resize
  sheet.autoResizeColumn(1);
  sheet.autoResizeColumn(2);
  
  Logger.log('Statistics summary updated');
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDateTime(isoString) {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');
  } catch (e) {
    return isoString;
  }
}

function translateStatus(status) {
  const statusMap = {
    'pending': '承認待ち',
    'approved': '承認済み',
    'rejected': '却下',
    'cancelled': 'キャンセル',
    'completed': '完了',
  };
  return statusMap[status] || status;
}

function sendErrorNotification(error) {
  try {
    const email = Session.getActiveUser().getEmail();
    if (email) {
      MailApp.sendEmail({
        to: email,
        subject: '[予約システム] データ同期エラー',
        body: 'スプレッドシート同期中にエラーが発生しました。\n\nエラー: ' + error.message + '\n\n日時: ' + new Date().toLocaleString('ja-JP'),
      });
    }
  } catch (e) {
    Logger.log('Failed to send error notification: ' + e.message);
  }
}

// ============================================
// TRIGGER SETUP
// ============================================

/**
 * Set up automatic daily sync trigger
 * Run this function once to create the trigger
 */
function setupDailyTrigger() {
  // Remove existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'syncAllData') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new daily trigger at 6:00 AM
  ScriptApp.newTrigger('syncAllData')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();
  
  Logger.log('Daily sync trigger created for 6:00 AM');
}

/**
 * Set up hourly sync trigger
 */
function setupHourlyTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'syncAllData') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  ScriptApp.newTrigger('syncAllData')
    .timeBased()
    .everyHours(1)
    .create();
  
  Logger.log('Hourly sync trigger created');
}

/**
 * Remove all sync triggers
 */
function removeTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'syncAllData') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  Logger.log('All sync triggers removed');
}

// ============================================
// MENU
// ============================================

/**
 * Add custom menu to spreadsheet
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('予約システム')
    .addItem('今すぐ同期', 'syncAllData')
    .addSeparator()
    .addItem('予約のみ同期', 'syncReservations')
    .addItem('資機材のみ同期', 'syncEquipment')
    .addItem('統計のみ同期', 'syncStatistics')
    .addSeparator()
    .addSubMenu(ui.createMenu('トリガー設定')
      .addItem('毎日6時に同期', 'setupDailyTrigger')
      .addItem('1時間ごとに同期', 'setupHourlyTrigger')
      .addItem('トリガーを削除', 'removeTriggers'))
    .addToUi();
}

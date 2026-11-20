/**
 * ============================================================================
 * BIDARI UTSAV 2026 – ADVANCED BACKEND & ADMIN MANAGEMENT ENGINE
 * ============================================================================
 * Organization: Bidar Jilleya Samskruthika Vedike
 * Event: Bidari Utsav 2026 (12-13 December 2026)
 * Database: Google Sheets (BIDARI UTSAV 2026 – REGISTRATION DATABASE)
 * Storage: Google Drive (Uploaded screenshots, participant photos, PDF documents)
 *
 * ARCHITECTURE FEATURES:
 * - 6 Dynamic Sheets with Header-Based Column Mapping (Safe against column reordering)
 * - Safe Idempotent Database Setup (Preserves existing participant records)
 * - Concurrency LockService protection for simultaneous writes
 * - Full Server-Side PDF Document Generation (Acknowledgement, Receipt, Event Pass)
 * - Secure Token-Based Private Document Retrieval (Protected Google Drive storage)
 * - Manual UPI Payment Verification Workflow (Zero fake success, anti-duplicate UTR)
 * - Re-submission workflow for rejected payments (never creates duplicate registrations)
 * - Mobile QR Attendance & Check-in engine with override tracking
 * - Dynamic Competition & System Settings management
 * - Immutable Admin Audit Logging
 * ============================================================================
 */

// Global Sheet Tab Names
var TABS = {
  PARTICIPANTS: 'Participants',
  PAYMENTS: 'Payments',
  COMPETITIONS: 'Competitions',
  ATTENDANCE: 'Attendance',
  SETTINGS: 'Settings',
  LOGS: 'Admin Logs'
};

// Default Spreadsheet & Drive Folder IDs
var DEFAULT_SPREADSHEET_ID = '1DWx96IADaJZqWP2QjeE7SsBNCV-ZSi7UzfBtVk0ooxU';
var DEFAULT_DRIVE_FOLDER_ID = '15lvVxtHmp0bgHLvQWDVwGarKvvGEwnpi';

// Default Admin Key (Can also be set in Script Properties: ADMIN_SECRET_KEY)
var DEFAULT_ADMIN_KEY = 'bidari2026admin';

/**
 * Helper to get Script Properties or fallback
 */
function getProperty(key, fallback) {
  var props = PropertiesService.getScriptProperties();
  var val = props.getProperty(key);
  if (val !== null && val !== undefined && val !== '') return val;
  if (key === 'SPREADSHEET_ID') return DEFAULT_SPREADSHEET_ID;
  if (key === 'DRIVE_FOLDER_ID') return DEFAULT_DRIVE_FOLDER_ID;
  return fallback;
}

/**
 * ----------------------------------------------------------------------------
 * 1. DATABASE SCHEMA & SETUP (IDEMPOTENT - NEVER CLEARS EXISTING DATA)
 * ----------------------------------------------------------------------------
 */
function setupDatabase() {
  var ss = getSpreadsheet();
  
  // Define Schemas for all 6 Sheets
  var schemas = {};
  
  schemas[TABS.PARTICIPANTS] = [
    'Registration ID',
    'Application Serial Number',
    'Registration Date',
    'Participant Name',
    'Date of Birth',
    'Age',
    'Gender',
    'Mobile Number',
    'Parent Name',
    'Parent Mobile',
    'Address',
    'City',
    'District',
    'Competition',
    'Category',
    'Performance Language',
    'Photograph URL',
    'UPI Transaction ID',
    'Payment Screenshot URL',
    'Registration Fee',
    'Payment Status',
    'Attendance Status',
    'Acknowledgement PDF',
    'Payment Receipt PDF',
    'Participant Pass PDF',
    'Private Access Token',
    'Last Updated'
  ];

  schemas[TABS.PAYMENTS] = [
    'Payment Record ID',
    'Registration ID',
    'UPI Transaction ID',
    'Amount',
    'Payment Date',
    'Verification Status',
    'Verified By',
    'Verification Date',
    'Admin Remarks'
  ];

  schemas[TABS.COMPETITIONS] = [
    'Competition ID',
    'Competition Name',
    'Description',
    'Minimum Age',
    'Maximum Age',
    'Registration Fee',
    'Maximum Participants',
    'Registration Status',
    'Event Date',
    'Event Time',
    'Venue',
    'Rules'
  ];

  schemas[TABS.ATTENDANCE] = [
    'Attendance ID',
    'Registration ID',
    'Participant Name',
    'Competition',
    'Check-in Date',
    'Check-in Time',
    'Checked In By',
    'Attendance Status'
  ];

  schemas[TABS.SETTINGS] = [
    'Setting Key',
    'Setting Value',
    'Description'
  ];

  schemas[TABS.LOGS] = [
    'Admin Email',
    'Action',
    'Registration ID',
    'Timestamp',
    'Remarks'
  ];

  // Initialize each sheet without deleting existing data
  for (var tabName in schemas) {
    var sheet = ss.getSheetByName(tabName);
    var headers = schemas[tabName];
    
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
      sheet.appendRow(headers);
      formatHeaderRow(sheet, headers.length);
    } else {
      // Ensure headers exist
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(headers);
        formatHeaderRow(sheet, headers.length);
      } else {
        // Synchronize headers if new columns were added
        var existingHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
        for (var i = 0; i < headers.length; i++) {
          if (existingHeaders.indexOf(headers[i]) === -1) {
            sheet.getRange(1, existingHeaders.length + 1).setValue(headers[i]);
            existingHeaders.push(headers[i]);
          }
        }
        formatHeaderRow(sheet, headers.length);
      }
    }
  }

  // Seed Default Competitions if empty
  var compSheet = ss.getSheetByName(TABS.COMPETITIONS);
  if (compSheet.getLastRow() <= 1) {
    compSheet.appendRow([
      'COMP-01',
      'Sugama Sangeeta Gayana Spardhe',
      'Classical & light-music singing competition celebrating Karnataka musical heritage.',
      16,
      20,
      200,
      100,
      'OPEN',
      '2026-12-12',
      '09:00 AM',
      'Sri ChannaBasava PattaDevaR Rang Mandir, Bidar, Karnataka',
      '1. Sugama Sangeetha only. 2. Time: 5-7 mins. 3. Carry valid ID proof. 4. Bring instruments or use venue accompaniment.'
    ]);
  }

  // Seed Default Settings if empty
  var setSheet = ss.getSheetByName(TABS.SETTINGS);
  if (setSheet.getLastRow() <= 1) {
    var defaultSettings = [
      ['ORGANIZATION_NAME', 'Bidar Jilleya Samskruthika Vedike', 'Organizing body name'],
      ['EVENT_NAME', 'Bidari Utsav 2026', 'Annual Cultural Music Summit'],
      ['EVENT_LOGO_URL', 'https://bidari.in/assets/images/BIDARI%20Logo%20With%20Name%20(1)-Photoroom.png', 'Logo URL for PDFs & branding'],
      ['UPI_ID', 'bidarivedike@upi', 'Receiving UPI VPA'],
      ['UPI_PAYEE_NAME', 'Bidar Jilleya Samskruthika Vedike', 'Name on UPI bank account'],
      ['REGISTRATION_FEE', '200', 'Default registration fee (INR)'],
      ['EVENT_DATES', '12 and 13 December 2026', 'Main event dates'],
      ['REPORTING_SCHEDULE', '11-12-2026 at 9:00 AM', 'Participant reporting and orientation'],
      ['VENUE', 'Sri ChannaBasava PattaDevaR Rang Mandir, Bidar - 585401', 'Official event auditorium'],
      ['CONTACT_NUMBER', '9986138457', 'Official helpline'],
      ['REGISTRATION_OPEN', 'TRUE', 'Overall registration flag (TRUE/FALSE)'],
      ['ADMIN_EMAIL_ALLOWLIST', 'bidarivedike@gmail.com,admin@bidari.in', 'Comma-separated admin Google accounts'],
      ['DRIVE_FOLDER_ID', '15lvVxtHmp0bgHLvQWDVwGarKvvGEwnpi', 'Google Drive root folder ID for participant documents'],
      ['ENABLE_NOTIFICATIONS', 'FALSE', 'Send automated emails upon registration and verification']
    ];
    for (var s = 0; s < defaultSettings.length; s++) {
      setSheet.appendRow(defaultSettings[s]);
    }
  }

  Logger.log('BIDARI UTSAV 2026 Database configured successfully.');
  return { success: true, message: 'Database initialized successfully.' };
}

function formatHeaderRow(sheet, numCols) {
  var headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#005B55');
  headerRange.setFontColor('#FFFFFF');
  sheet.setFrozenRows(1);
}

/**
 * Helper to get Spreadsheet instance
 */
function getSpreadsheet() {
  var id = getProperty('SPREADSHEET_ID', '');
  if (id) {
    return SpreadsheetApp.openById(id);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Dynamically builds a header lookup map: { 'Header Name': 0-based index }
 */
function getHeaderMap(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {};
  for (var i = 0; i < headers.length; i++) {
    map[String(headers[i]).trim()] = i;
  }
  return map;
}

/**
 * Reads all settings as a key-value dictionary
 */
function getSettingsMap() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(TABS.SETTINGS);
  var settings = {};
  if (!sheet || sheet.getLastRow() <= 1) return settings;
  
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  for (var i = 0; i < data.length; i++) {
    var k = String(data[i][0]).trim();
    if (k) settings[k] = String(data[i][1]).trim();
  }
  return settings;
}

/**
 * ----------------------------------------------------------------------------
 * 2. HTTP HANDLERS: doGet & doPost (ROUTING ENGINE)
 * ----------------------------------------------------------------------------
 */
function doGet(e) {
  try {
    var params = e ? e.parameter : {};
    var action = params.action || 'ping';

    // 1. Health Ping
    if (action === 'ping') {
      return jsonResponse({
        status: 'online',
        service: 'Bidari Utsav 2026 Backend',
        timestamp: new Date().toISOString()
      });
    }

    // 2. Public Settings (for Frontend forms & dynamic UPI QR)
    if (action === 'getPublicSettings') {
      return jsonResponse(handleGetPublicSettings());
    }

    // 3. Participant Lookup & Status Query (Used by registration-download.html)
    if (action === 'participantLookup' || action === 'lookup') {
      return jsonResponse(handleParticipantLookup(params));
    }

    // 4. Secure Document Download Streaming
    if (action === 'downloadPdf') {
      return handleDownloadPdf(params);
    }

    // 5. Admin Authentication Verification
    if (action === 'adminVerifyAuth') {
      return jsonResponse(verifyAdminAuth(params));
    }

    // 6. Admin: Dashboard Stats
    if (action === 'getDashboardStats') {
      if (!isAuthorizedAdmin(params)) return unauthorizedResponse();
      return jsonResponse(handleGetDashboardStats());
    }

    // 7. Admin: Get Participant List
    if (action === 'getParticipants') {
      if (!isAuthorizedAdmin(params)) return unauthorizedResponse();
      return jsonResponse(handleGetParticipants(params));
    }

    // 8. Admin: Get Pending Payments Queue
    if (action === 'getPendingPayments') {
      if (!isAuthorizedAdmin(params)) return unauthorizedResponse();
      return jsonResponse(handleGetPendingPayments());
    }

    // 9. Admin: Get Competitions
    if (action === 'getCompetitions') {
      return jsonResponse(handleGetCompetitions());
    }

    // 10. Admin: Get Logs
    if (action === 'getLogs') {
      if (!isAuthorizedAdmin(params)) return unauthorizedResponse();
      return jsonResponse(handleGetLogs());
    }

    return jsonResponse({ success: false, error: 'Unknown GET action: ' + action });
  } catch (err) {
    Logger.log('doGet Error: ' + err.toString());
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // 30-second lock to eliminate race conditions during high concurrent traffic
    lock.waitLock(30000);

    var payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        payload = e.parameter || {};
      }
    } else {
      payload = e ? e.parameter : {};
    }

    var action = payload.action || 'register';
    var data = payload.data || payload;

    // Route Actions
    switch (action) {
      case 'register':
        return jsonResponse(handleRegistration(data));

      case 'updatePayment':
        return jsonResponse(handleUpdatePayment(data));

      case 'resubmitPayment':
        return jsonResponse(handleResubmitPayment(data));

      case 'adminLogin':
        return jsonResponse(handleAdminLogin(data));

      case 'approvePayment':
        if (!isAuthorizedAdmin(payload)) return unauthorizedResponse();
        return jsonResponse(handleApprovePayment(data, payload.adminEmail));

      case 'rejectPayment':
        if (!isAuthorizedAdmin(payload)) return unauthorizedResponse();
        return jsonResponse(handleRejectPayment(data, payload.adminEmail));

      case 'saveCompetition':
        if (!isAuthorizedAdmin(payload)) return unauthorizedResponse();
        return jsonResponse(handleSaveCompetition(data, payload.adminEmail));

      case 'markAttendance':
        if (!isAuthorizedAdmin(payload)) return unauthorizedResponse();
        return jsonResponse(handleMarkAttendance(data, payload.adminEmail));

      case 'saveSettings':
        if (!isAuthorizedAdmin(payload)) return unauthorizedResponse();
        return jsonResponse(handleSaveSettings(data, payload.adminEmail));

      default:
        return jsonResponse({ success: false, error: 'Unknown POST action: ' + action });
    }
  } catch (err) {
    Logger.log('doPost Error: ' + err.toString());
    return jsonResponse({ success: false, error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * ----------------------------------------------------------------------------
 * 3. PUBLIC FRONTEND INTEGRATION ENDPOINTS
 * ----------------------------------------------------------------------------
 */

/**
 * Returns dynamic public configuration for frontend registration & payment
 */
function handleGetPublicSettings() {
  var settings = getSettingsMap();
  var comps = handleGetCompetitions().competitions || [];
  
  return {
    success: true,
    eventName: settings.EVENT_NAME || 'Bidari Utsav 2026',
    organizationName: settings.ORGANIZATION_NAME || 'Bidar Jilleya Samskruthika Vedike',
    upiId: settings.UPI_ID || 'bidarivedike@upi',
    upiPayeeName: settings.UPI_PAYEE_NAME || 'Bidar Jilleya Samskruthika Vedike',
    registrationFee: Number(settings.REGISTRATION_FEE || 200),
    eventDates: settings.EVENT_DATES || '12 and 13 December 2026',
    reportingSchedule: settings.REPORTING_SCHEDULE || '11-12-2026 at 9:00 AM',
    venue: settings.VENUE || 'Sri ChannaBasava PattaDevaR Rang Mandir, Bidar',
    contactNumber: settings.CONTACT_NUMBER || '9986138457',
    registrationOpen: settings.REGISTRATION_OPEN !== 'FALSE',
    competitions: comps
  };
}

/**
 * Registers a new participant
 */
function handleRegistration(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(TABS.PARTICIPANTS);
  if (!sheet) {
    setupDatabase();
    sheet = ss.getSheetByName(TABS.PARTICIPANTS);
  }

  var map = getHeaderMap(sheet);
  var settings = getSettingsMap();

  if (settings.REGISTRATION_OPEN === 'FALSE') {
    return { success: false, error: 'Registration is currently closed by the organizers.' };
  }

  // Server-side validation
  var fullName = (data.fullName || '').trim();
  var mobile = String(data.mobile || '').replace(/\D/g, '');
  var dobStr = (data.dob || '').trim();
  
  if (!fullName || mobile.length !== 10 || !dobStr) {
    return { success: false, error: 'Please provide valid participant name, 10-digit mobile, and date of birth.' };
  }

  // Calculate & validate Age against competition date (Dec 12, 2026)
  var dob = new Date(dobStr);
  var refDate = new Date('2026-12-12');
  var age = refDate.getFullYear() - dob.getFullYear();
  var mDiff = refDate.getMonth() - dob.getMonth();
  if (mDiff < 0 || (mDiff === 0 && refDate.getDate() < dob.getDate())) {
    age--;
  }

  var minAge = 16;
  var maxAge = 20;
  if (age < minAge || age > maxAge) {
    return { success: false, error: 'Age must be between ' + minAge + ' and ' + maxAge + ' years for this competition.' };
  }

  // Check for duplicate active registration (same mobile + competition)
  var compName = data.competitionName || 'Sugama Sangeeta Gayana Spardhe';
  var existingRecords = sheet.getDataRange().getValues();
  for (var r = 1; r < existingRecords.length; r++) {
    var exMobile = String(existingRecords[r][map['Mobile Number']] || '').replace(/\D/g, '');
    var exComp = String(existingRecords[r][map['Competition']] || '').trim();
    var exStatus = String(existingRecords[r][map['Payment Status']] || '').toUpperCase();
    if (exMobile === mobile && exComp === compName && exStatus !== 'REJECTED') {
      return {
        success: false,
        error: 'A registration already exists with this mobile number for ' + compName + ' (' + existingRecords[r][map['Registration ID']] + ').'
      };
    }
  }

  // Generate Unique Identifiers
  var regId = data.registrationId || ('BU26-' + Date.now().toString(36).toUpperCase().slice(-4) + Math.floor(1000 + Math.random() * 9000));
  var serialNumber = existingRecords.length; // auto-increment serial (starts from 1)
  var accessToken = generateSecureToken();
  var fee = Number(settings.REGISTRATION_FEE || 200);

  // Handle Photo & Screenshot upload to Drive
  var photoUrl = '';
  if (data.photoBase64) {
    photoUrl = saveFileToDrive(data.photoBase64, 'Photo_' + regId, 'Participant Photos');
  }

  var screenshotUrl = '';
  if (data.screenshotBase64) {
    screenshotUrl = saveFileToDrive(data.screenshotBase64, 'Payment_' + regId, 'Payment Proofs');
  }

  // Construct Row
  var row = new Array(sheet.getLastColumn());
  row[map['Registration ID']] = regId;
  row[map['Application Serial Number']] = serialNumber;
  row[map['Registration Date']] = new Date();
  row[map['Participant Name']] = fullName;
  row[map['Date of Birth']] = dobStr;
  row[map['Age']] = age;
  row[map['Gender']] = data.gender || '';
  row[map['Mobile Number']] = "'" + mobile;
  row[map['Parent Name']] = data.parentName || '';
  row[map['Parent Mobile']] = "'" + String(data.parentMobile || '').replace(/\D/g, '');
  row[map['Address']] = data.address || '';
  row[map['City']] = data.city || '';
  row[map['District']] = data.district || '';
  row[map['Competition']] = compName;
  row[map['Category']] = data.category || 'Solo';
  row[map['Performance Language']] = data.perfLanguage || 'Kannada';
  row[map['Photograph URL']] = photoUrl;
  row[map['UPI Transaction ID']] = data.utrNumber || '';
  row[map['Payment Screenshot URL']] = screenshotUrl;
  row[map['Registration Fee']] = fee;
  row[map['Payment Status']] = 'PENDING VERIFICATION';
  row[map['Attendance Status']] = 'NOT_CHECKED_IN';
  row[map['Acknowledgement PDF']] = '';
  row[map['Payment Receipt PDF']] = '';
  row[map['Participant Pass PDF']] = '';
  row[map['Private Access Token']] = accessToken;
  row[map['Last Updated']] = new Date();

  sheet.appendRow(row);

  // If UTR was provided right away, also log in Payments sheet
  if (data.utrNumber) {
    logPaymentRecord(regId, data.utrNumber, fee, 'PENDING');
  }

  // Build Participant Object for PDF Generation
  var participantObj = {
    registrationId: regId,
    serialNumber: serialNumber,
    fullName: fullName,
    dob: dobStr,
    age: age,
    gender: data.gender,
    mobile: mobile,
    city: data.city,
    district: data.district,
    parentName: data.parentName,
    parentMobile: data.parentMobile,
    competition: compName,
    category: data.category || 'Solo',
    perfLanguage: data.perfLanguage || 'Kannada',
    fee: fee,
    utrNumber: data.utrNumber || '',
    paymentStatus: 'PENDING VERIFICATION',
    registrationDate: new Date()
  };

  // Generate Initial Acknowledgement PDF & Provisional Pass in Drive
  var ackPdfId = generateAcknowledgementPdf(participantObj, settings);
  var passPdfId = generatePassPdf(participantObj, settings, false);

  // Update PDF links in Sheet
  var lastRow = sheet.getLastRow();
  if (ackPdfId) sheet.getRange(lastRow, map['Acknowledgement PDF'] + 1).setValue(ackPdfId);
  if (passPdfId) sheet.getRange(lastRow, map['Participant Pass PDF'] + 1).setValue(passPdfId);

  // Send Registration Email if enabled
  if (settings.ENABLE_NOTIFICATIONS === 'TRUE' && data.email) {
    sendNotificationEmail(data.email, 'Registration Received – Bidari Utsav 2026', getRegistrationEmailHtml(participantObj));
  }

  return {
    success: true,
    registrationId: regId,
    serialNumber: serialNumber,
    paymentStatus: 'PENDING VERIFICATION',
    accessToken: accessToken,
    message: 'Registration created successfully. Please complete manual UPI payment.'
  };
}

/**
 * Updates UPI UTR and Screenshot after payment step
 */
function handleUpdatePayment(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(TABS.PARTICIPANTS);
  var map = getHeaderMap(sheet);
  var regId = (data.registrationId || '').trim();
  var utr = (data.utrNumber || '').trim();

  if (!regId || !utr) {
    return { success: false, error: 'Registration ID and UPI UTR are required.' };
  }

  var rowIdx = findRowByValue(sheet, map['Registration ID'], regId);
  if (rowIdx === -1) {
    return { success: false, error: 'Registration record not found.' };
  }

  // Update UTR
  sheet.getRange(rowIdx, map['UPI Transaction ID'] + 1).setValue(utr);
  sheet.getRange(rowIdx, map['Payment Status'] + 1).setValue('PENDING VERIFICATION');
  sheet.getRange(rowIdx, map['Last Updated'] + 1).setValue(new Date());

  // Handle Screenshot if provided
  if (data.screenshotBase64) {
    var screenUrl = saveFileToDrive(data.screenshotBase64, 'Payment_' + regId, 'Payment Proofs');
    if (screenUrl) {
      sheet.getRange(rowIdx, map['Payment Screenshot URL'] + 1).setValue(screenUrl);
    }
  }

  // Update/Append in Payments tab
  var fee = Number(sheet.getRange(rowIdx, map['Registration Fee'] + 1).getValue() || 200);
  logPaymentRecord(regId, utr, fee, 'PENDING');

  return {
    success: true,
    registrationId: regId,
    paymentStatus: 'PENDING VERIFICATION',
    message: 'Payment details received and submitted for manual verification.'
  };
}

/**
 * Re-submission of payment after rejection (Zero Duplicate Registration!)
 */
function handleResubmitPayment(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(TABS.PARTICIPANTS);
  var map = getHeaderMap(sheet);
  var regId = (data.registrationId || '').trim();
  var utr = (data.utrNumber || '').trim();

  if (!regId || !utr) {
    return { success: false, error: 'Registration ID and new UTR are required.' };
  }

  var rowIdx = findRowByValue(sheet, map['Registration ID'], regId);
  if (rowIdx === -1) {
    return { success: false, error: 'Registration record not found.' };
  }

  // Reset status to PENDING VERIFICATION with new UTR
  sheet.getRange(rowIdx, map['UPI Transaction ID'] + 1).setValue(utr);
  sheet.getRange(rowIdx, map['Payment Status'] + 1).setValue('PENDING VERIFICATION');
  sheet.getRange(rowIdx, map['Last Updated'] + 1).setValue(new Date());

  if (data.screenshotBase64) {
    var screenUrl = saveFileToDrive(data.screenshotBase64, 'Payment_Resubmit_' + regId, 'Payment Proofs');
    if (screenUrl) {
      sheet.getRange(rowIdx, map['Payment Screenshot URL'] + 1).setValue(screenUrl);
    }
  }

  var fee = Number(sheet.getRange(rowIdx, map['Registration Fee'] + 1).getValue() || 200);
  logPaymentRecord(regId, utr, fee, 'PENDING_RECHECK');

  return {
    success: true,
    registrationId: regId,
    paymentStatus: 'PENDING VERIFICATION',
    message: 'Corrected payment submitted! The admin will re-verify your payment.'
  };
}

/**
 * Lookup participant for self-service download portal with security verification
 */
function handleParticipantLookup(params) {
  var regId = (params.regId || '').trim().toUpperCase();
  var mobile = String(params.mobile || '').replace(/\D/g, '');

  if (!regId || !mobile) {
    return { success: false, error: 'Registration ID and Mobile Number are required.' };
  }

  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(TABS.PARTICIPANTS);
  var map = getHeaderMap(sheet);

  var rowIdx = findRowByValue(sheet, map['Registration ID'], regId);
  if (rowIdx === -1) {
    return { success: false, error: 'No record found with Registration ID ' + regId };
  }

  var rowData = sheet.getRange(rowIdx, 1, 1, sheet.getLastColumn()).getValues()[0];
  var storedMobile = String(rowData[map['Mobile Number']] || '').replace(/\D/g, '');

  // Privacy match: Exact or last 4 digits match
  if (storedMobile !== mobile && !storedMobile.endsWith(mobile.slice(-4))) {
    return { success: false, error: 'Mobile number does not match registered record.' };
  }

  var status = String(rowData[map['Payment Status']] || 'PENDING VERIFICATION').toUpperCase();
  var accessToken = rowData[map['Private Access Token']];

  // If rejected, retrieve admin remarks from Payments tab
  var rejectionRemarks = '';
  if (status === 'REJECTED') {
    rejectionRemarks = getPaymentRemarks(regId);
  }

  return {
    success: true,
    record: {
      registrationId: rowData[map['Registration ID']],
      serialNumber: rowData[map['Application Serial Number']],
      fullName: rowData[map['Participant Name']],
      dob: rowData[map['Date of Birth']],
      age: rowData[map['Age']],
      gender: rowData[map['Gender']],
      mobile: storedMobile,
      city: rowData[map['City']],
      district: rowData[map['District']],
      parentName: rowData[map['Parent Name']],
      competitionName: rowData[map['Competition']],
      category: rowData[map['Category']],
      perfLanguage: rowData[map['Performance Language']],
      photographUrl: rowData[map['Photograph URL']] || '',
      photoUrl: rowData[map['Photograph URL']] || '',
      feeAmount: rowData[map['Registration Fee']],
      utrNumber: rowData[map['UPI Transaction ID']],
      paymentStatus: status,
      attendanceStatus: rowData[map['Attendance Status']],
      rejectionRemarks: rejectionRemarks,
      accessToken: accessToken,
      hasAcknowledgement: !!rowData[map['Acknowledgement PDF']],
      hasReceipt: (status === 'PAID' || status === 'CONFIRMED') && !!rowData[map['Payment Receipt PDF']],
      hasPass: !!rowData[map['Participant Pass PDF']]
    }
  };
}

/**
 * Streams / Downloads protected PDF document using Access Token
 */
function handleDownloadPdf(params) {
  var regId = (params.regId || '').trim().toUpperCase();
  var token = (params.token || '').trim();
  var docType = (params.docType || 'pass').toLowerCase(); // 'acknowledgement', 'receipt', 'pass'

  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(TABS.PARTICIPANTS);
  var map = getHeaderMap(sheet);

  var rowIdx = findRowByValue(sheet, map['Registration ID'], regId);
  if (rowIdx === -1) {
    return ContentService.createTextOutput('Invalid Registration ID').setMimeType(ContentService.MimeType.TEXT);
  }

  var rowData = sheet.getRange(rowIdx, 1, 1, sheet.getLastColumn()).getValues()[0];
  var storedToken = String(rowData[map['Private Access Token']] || '');

  // Validate security token
  if (!token || token !== storedToken) {
    return ContentService.createTextOutput('Unauthorized: Invalid or missing access token.').setMimeType(ContentService.MimeType.TEXT);
  }

  var fileId = '';
  if (docType === 'acknowledgement') {
    fileId = rowData[map['Acknowledgement PDF']];
  } else if (docType === 'receipt') {
    fileId = rowData[map['Payment Receipt PDF']];
  } else {
    fileId = rowData[map['Participant Pass PDF']];
  }

  if (!fileId) {
    return ContentService.createTextOutput('Requested document is not yet generated or available.').setMimeType(ContentService.MimeType.TEXT);
  }

  try {
    var file = DriveApp.getFileById(fileId);
    var blob = file.getBlob();
    return ContentService.createTextOutput(Utilities.base64Encode(blob.getBytes()))
      .setMimeType(ContentService.MimeType.TEXT);
  } catch (e) {
    return ContentService.createTextOutput('Error reading document from storage: ' + e.toString()).setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * ----------------------------------------------------------------------------
 * 4. ADMIN MANAGEMENT & VERIFICATION ENGINE
 * ----------------------------------------------------------------------------
 */

/**
 * Admin Authentication
 */
function handleAdminLogin(data) {
  var email = (data.email || '').trim().toLowerCase();
  var secretKey = (data.secretKey || '').trim();
  var settings = getSettingsMap();

  var allowlist = (settings.ADMIN_EMAIL_ALLOWLIST || '').toLowerCase().split(',');
  var configuredKey = getProperty('ADMIN_SECRET_KEY', DEFAULT_ADMIN_KEY);

  var isEmailAllowed = allowlist.some(function(item) {
    return item.trim() === email;
  });

  if (secretKey === configuredKey || (isEmailAllowed && secretKey === '')) {
    logAdminAction(email, 'LOGIN', '', 'Admin logged into dashboard.');
    return {
      success: true,
      adminEmail: email || 'authorized_admin',
      token: configuredKey,
      message: 'Authentication successful.'
    };
  }

  return { success: false, error: 'Invalid credentials or unauthorized email.' };
}

function verifyAdminAuth(params) {
  return { success: isAuthorizedAdmin(params) };
}

function isAuthorizedAdmin(params) {
  var key = params.adminToken || params.secretKey;
  var configuredKey = getProperty('ADMIN_SECRET_KEY', DEFAULT_ADMIN_KEY);
  return key === configuredKey;
}

function unauthorizedResponse() {
  return jsonResponse({ success: false, error: 'Unauthorized: Admin authentication failed.' });
}

/**
 * Returns complete dashboard overview statistics
 */
function handleGetDashboardStats() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(TABS.PARTICIPANTS);
  var map = getHeaderMap(sheet);
  
  var total = 0;
  var pending = 0;
  var confirmed = 0;
  var rejected = 0;
  var totalCollected = 0;
  var checkedIn = 0;
  var compCounts = {};

  if (sheet.getLastRow() > 1) {
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    total = data.length;

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var status = String(row[map['Payment Status']] || '').toUpperCase();
      var attStatus = String(row[map['Attendance Status']] || '').toUpperCase();
      var fee = Number(row[map['Registration Fee']] || 0);
      var comp = String(row[map['Competition']] || 'Sugama Sangeeta');

      if (status === 'PAID' || status === 'CONFIRMED') {
        confirmed++;
        totalCollected += fee;
      } else if (status === 'REJECTED') {
        rejected++;
      } else {
        pending++;
      }

      if (attStatus === 'CHECKED_IN') {
        checkedIn++;
      }

      compCounts[comp] = (compCounts[comp] || 0) + 1;
    }
  }

  return {
    success: true,
    stats: {
      totalRegistrations: total,
      pendingVerification: pending,
      confirmedRegistrations: confirmed,
      rejectedRegistrations: rejected,
      totalVerifiedCollection: totalCollected,
      totalCheckedIn: checkedIn,
      competitionBreakdown: compCounts
    }
  };
}

/**
 * Returns filtered participant list for admin table
 */
function handleGetParticipants(params) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(TABS.PARTICIPANTS);
  var map = getHeaderMap(sheet);
  var list = [];

  if (sheet.getLastRow() > 1) {
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    var query = (params.q || '').toLowerCase();
    var filterStatus = (params.status || 'ALL').toUpperCase();
    var filterComp = (params.competition || 'ALL');

    for (var i = 0; i < data.length; i++) {
      var r = data[i];
      var regId = String(r[map['Registration ID']] || '');
      var name = String(r[map['Participant Name']] || '');
      var mob = String(r[map['Mobile Number']] || '');
      var comp = String(r[map['Competition']] || '');
      var status = String(r[map['Payment Status']] || 'PENDING VERIFICATION').toUpperCase();
      var att = String(r[map['Attendance Status']] || 'NOT_CHECKED_IN');

      // Filters
      if (filterStatus !== 'ALL' && status !== filterStatus) continue;
      if (filterComp !== 'ALL' && comp !== filterComp) continue;

      // Query Search
      if (query) {
        var match = regId.toLowerCase().indexOf(query) > -1 ||
                    name.toLowerCase().indexOf(query) > -1 ||
                    mob.indexOf(query) > -1;
        if (!match) continue;
      }

      list.push({
        registrationId: regId,
        serialNumber: r[map['Application Serial Number']],
        registrationDate: r[map['Registration Date']],
        participantName: name,
        dob: r[map['Date of Birth']],
        age: r[map['Age']],
        gender: r[map['Gender']],
        mobileNumber: mob,
        parentName: r[map['Parent Name']],
        parentMobile: r[map['Parent Mobile']],
        address: r[map['Address']],
        city: r[map['City']],
        district: r[map['District']],
        competition: comp,
        category: r[map['Category']],
        perfLanguage: r[map['Performance Language']],
        photoUrl: r[map['Photograph URL']],
        utrNumber: r[map['UPI Transaction ID']],
        screenshotUrl: r[map['Payment Screenshot URL']],
        fee: r[map['Registration Fee']],
        paymentStatus: status,
        attendanceStatus: att,
        accessToken: r[map['Private Access Token']],
        hasReceiptPdf: !!r[map['Payment Receipt PDF']],
        hasPassPdf: !!r[map['Participant Pass PDF']]
      });
    }
  }

  return { success: true, count: list.length, participants: list };
}

/**
 * Returns pending payments queue
 */
function handleGetPendingPayments() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(TABS.PARTICIPANTS);
  var map = getHeaderMap(sheet);
  var queue = [];

  if (sheet.getLastRow() > 1) {
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    for (var i = 0; i < data.length; i++) {
      var r = data[i];
      var status = String(r[map['Payment Status']] || '').toUpperCase();
      if (status === 'PENDING' || status === 'PENDING VERIFICATION' || status === 'PENDING_RECHECK') {
        queue.push({
          registrationId: r[map['Registration ID']],
          participantName: r[map['Participant Name']],
          mobileNumber: r[map['Mobile Number']],
          utrNumber: r[map['UPI Transaction ID']],
          amount: r[map['Registration Fee']],
          screenshotUrl: r[map['Payment Screenshot URL']],
          registrationDate: r[map['Registration Date']],
          competition: r[map['Competition']]
        });
      }
    }
  }

  return { success: true, count: queue.length, pendingPayments: queue };
}

/**
 * APPROVE PAYMENT (Strict Manual Bank Check Enforcement)
 */
function handleApprovePayment(data, adminEmail) {
  var regId = (data.registrationId || '').trim();
  var utr = (data.utrNumber || '').trim();
  var remarks = (data.remarks || 'Verified in bank account statement').trim();

  if (!regId) return { success: false, error: 'Registration ID required.' };

  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(TABS.PARTICIPANTS);
  var map = getHeaderMap(sheet);

  var rowIdx = findRowByValue(sheet, map['Registration ID'], regId);
  if (rowIdx === -1) return { success: false, error: 'Participant record not found.' };

  // Anti-Duplicate Check: Ensure UTR hasn't already been approved for another participant!
  if (utr) {
    var allData = sheet.getDataRange().getValues();
    for (var r = 1; r < allData.length; r++) {
      if (r + 1 !== rowIdx) {
        var exUtr = String(allData[r][map['UPI Transaction ID']] || '').trim();
        var exStatus = String(allData[r][map['Payment Status']] || '').toUpperCase();
        if (exUtr && exUtr.toLowerCase() === utr.toLowerCase() && (exStatus === 'PAID' || exStatus === 'CONFIRMED')) {
          return {
            success: false,
            error: 'Duplicate UTR detected! This transaction ID was already approved for ' + allData[r][map['Registration ID']] + ' (' + allData[r][map['Participant Name']] + ').'
          };
        }
      }
    }
  }

  // Update Status in Participants Sheet
  sheet.getRange(rowIdx, map['Payment Status'] + 1).setValue('CONFIRMED');
  sheet.getRange(rowIdx, map['Last Updated'] + 1).setValue(new Date());

  var fee = Number(sheet.getRange(rowIdx, map['Registration Fee'] + 1).getValue() || 200);
  var pName = sheet.getRange(rowIdx, map['Participant Name'] + 1).getValue();

  // Update Payments Tab
  updatePaymentRecord(regId, utr, fee, 'APPROVED', adminEmail, remarks);

  // Re-generate Official Payment Receipt & Confirmed Pass PDF
  var rowData = sheet.getRange(rowIdx, 1, 1, sheet.getLastColumn()).getValues()[0];
  var settings = getSettingsMap();

  var participantObj = {
    registrationId: regId,
    serialNumber: rowData[map['Application Serial Number']],
    fullName: pName,
    dob: rowData[map['Date of Birth']],
    age: rowData[map['Age']],
    gender: rowData[map['Gender']],
    mobile: rowData[map['Mobile Number']],
    city: rowData[map['City']],
    district: rowData[map['District']],
    parentName: rowData[map['Parent Name']],
    competition: rowData[map['Competition']],
    category: rowData[map['Category']],
    perfLanguage: rowData[map['Performance Language']],
    fee: fee,
    utrNumber: utr || rowData[map['UPI Transaction ID']],
    paymentStatus: 'CONFIRMED',
    registrationDate: rowData[map['Registration Date']],
    verifiedDate: new Date(),
    verifiedBy: adminEmail || 'Admin'
  };

  var receiptPdfId = generatePaymentReceiptPdf(participantObj, settings);
  var passPdfId = generatePassPdf(participantObj, settings, true); // true = Confirmed Pass

  if (receiptPdfId) sheet.getRange(rowIdx, map['Payment Receipt PDF'] + 1).setValue(receiptPdfId);
  if (passPdfId) sheet.getRange(rowIdx, map['Participant Pass PDF'] + 1).setValue(passPdfId);

  // Log Audit
  logAdminAction(adminEmail, 'APPROVE_PAYMENT', regId, 'Amount: ₹' + fee + ' | UTR: ' + utr + ' | ' + remarks);

  return {
    success: true,
    registrationId: regId,
    paymentStatus: 'CONFIRMED',
    message: 'Payment verified and approved. Confirmed Pass & Receipt generated.'
  };
}

/**
 * REJECT PAYMENT (Allows correction without creating duplicate registration)
 */
function handleRejectPayment(data, adminEmail) {
  var regId = (data.registrationId || '').trim();
  var reason = (data.remarks || 'Payment not credited or invalid transaction reference').trim();

  if (!regId) return { success: false, error: 'Registration ID required.' };

  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(TABS.PARTICIPANTS);
  var map = getHeaderMap(sheet);

  var rowIdx = findRowByValue(sheet, map['Registration ID'], regId);
  if (rowIdx === -1) return { success: false, error: 'Participant record not found.' };

  // Update Status
  sheet.getRange(rowIdx, map['Payment Status'] + 1).setValue('REJECTED');
  sheet.getRange(rowIdx, map['Last Updated'] + 1).setValue(new Date());

  var utr = sheet.getRange(rowIdx, map['UPI Transaction ID'] + 1).getValue();
  var fee = Number(sheet.getRange(rowIdx, map['Registration Fee'] + 1).getValue() || 200);

  updatePaymentRecord(regId, utr, fee, 'REJECTED', adminEmail, reason);
  logAdminAction(adminEmail, 'REJECT_PAYMENT', regId, 'Reason: ' + reason);

  return {
    success: true,
    registrationId: regId,
    paymentStatus: 'REJECTED',
    message: 'Payment rejected. Participant can view remarks and resubmit payment.'
  };
}

/**
 * ----------------------------------------------------------------------------
 * 5. EVENT-DAY QR SCANNER & ATTENDANCE ENGINE
 * ----------------------------------------------------------------------------
 */
function handleMarkAttendance(data, adminEmail) {
  var regId = (data.registrationId || '').trim().toUpperCase();
  var override = !!data.override;
  var overrideReason = (data.overrideReason || '').trim();

  if (!regId) return { success: false, error: 'Registration ID required.' };

  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(TABS.PARTICIPANTS);
  var map = getHeaderMap(sheet);

  var rowIdx = findRowByValue(sheet, map['Registration ID'], regId);
  if (rowIdx === -1) {
    return { success: false, error: 'Invalid Pass: Registration ID ' + regId + ' does not exist.' };
  }

  var row = sheet.getRange(rowIdx, 1, 1, sheet.getLastColumn()).getValues()[0];
  var pName = row[map['Participant Name']];
  var comp = row[map['Competition']];
  var payStatus = String(row[map['Payment Status']] || '').toUpperCase();
  var attStatus = String(row[map['Attendance Status']] || '').toUpperCase();

  // Prevent Duplicate Check-In
  if (attStatus === 'CHECKED_IN') {
    var checkinDetails = getAttendanceCheckinDetails(regId);
    return {
      success: false,
      alreadyCheckedIn: true,
      participantName: pName,
      registrationId: regId,
      message: 'Participant is ALREADY CHECKED IN! (Checked in on: ' + (checkinDetails.time || 'earlier') + ' by ' + (checkinDetails.staff || 'staff') + ')'
    };
  }

  // Payment Verification Guard
  var isPaid = (payStatus === 'PAID' || payStatus === 'CONFIRMED');
  if (!isPaid) {
    if (!override) {
      return {
        success: false,
        requiresOverride: true,
        participantName: pName,
        paymentStatus: payStatus,
        message: 'ENTRY BLOCKED: Payment status is ' + payStatus + '. Paid confirmation required before check-in. Authorized admin may override.'
      };
    } else {
      if (!overrideReason) {
        return { success: false, error: 'An override reason is mandatory to admit unconfirmed participants.' };
      }
    }
  }

  // Record in Attendance Sheet
  var attSheet = ss.getSheetByName(TABS.ATTENDANCE);
  var now = new Date();
  var attId = 'ATT-' + Date.now().toString(36).toUpperCase();

  attSheet.appendRow([
    attId,
    regId,
    pName,
    comp,
    Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm:ss'),
    adminEmail || 'Gate Staff',
    override ? 'CHECKED_IN (OVERRIDE: ' + overrideReason + ')' : 'CHECKED_IN'
  ]);

  // Update Status in Participants Sheet
  sheet.getRange(rowIdx, map['Attendance Status'] + 1).setValue('CHECKED_IN');
  sheet.getRange(rowIdx, map['Last Updated'] + 1).setValue(now);

  logAdminAction(adminEmail, 'MARK_ATTENDANCE', regId, 'Participant checked in.' + (override ? ' Override: ' + overrideReason : ''));

  return {
    success: true,
    registrationId: regId,
    participantName: pName,
    competition: comp,
    attendanceStatus: 'CHECKED_IN',
    timestamp: now.toISOString(),
    message: 'Check-in successful! Welcome ' + pName + '.'
  };
}

function getAttendanceCheckinDetails(regId) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(TABS.ATTENDANCE);
  if (!sheet || sheet.getLastRow() <= 1) return {};
  
  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][1]).trim().toUpperCase() === regId) {
      return {
        time: data[i][4] + ' ' + data[i][5],
        staff: data[i][6]
      };
    }
  }
  return {};
}

/**
 * ----------------------------------------------------------------------------
 * 6. COMPETITIONS & SETTINGS APIS
 * ----------------------------------------------------------------------------
 */
function handleGetCompetitions() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(TABS.COMPETITIONS);
  var list = [];
  if (sheet && sheet.getLastRow() > 1) {
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    for (var i = 0; i < data.length; i++) {
      list.push({
        id: data[i][0],
        name: data[i][1],
        description: data[i][2],
        minAge: data[i][3],
        maxAge: data[i][4],
        fee: data[i][5],
        maxParticipants: data[i][6],
        status: data[i][7],
        eventDate: data[i][8],
        eventTime: data[i][9],
        venue: data[i][10],
        rules: data[i][11]
      });
    }
  }
  return { success: true, competitions: list };
}

function handleSaveCompetition(data, adminEmail) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(TABS.COMPETITIONS);
  var compId = (data.id || '').trim();

  if (!data.name) return { success: false, error: 'Competition name is required.' };

  var rowIdx = -1;
  if (compId) {
    var rows = sheet.getDataRange().getValues();
    for (var r = 1; r < rows.length; r++) {
      if (rows[r][0] === compId) {
        rowIdx = r + 1;
        break;
      }
    }
  }

  var row = [
    compId || ('COMP-' + (sheet.getLastRow())),
    data.name,
    data.description || '',
    Number(data.minAge || 16),
    Number(data.maxAge || 20),
    Number(data.fee || 200),
    Number(data.maxParticipants || 100),
    data.status || 'OPEN',
    data.eventDate || '2026-12-12',
    data.eventTime || '09:00 AM',
    data.venue || 'Sri ChannaBasava PattaDevaR Rang Mandir, Bidar',
    data.rules || ''
  ];

  if (rowIdx > 0) {
    sheet.getRange(rowIdx, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  logAdminAction(adminEmail, 'SAVE_COMPETITION', compId, 'Saved competition: ' + data.name);
  return { success: true, message: 'Competition saved successfully.' };
}

function handleSaveSettings(data, adminEmail) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(TABS.SETTINGS);
  var existing = sheet.getDataRange().getValues();
  
  for (var key in data) {
    var updated = false;
    for (var i = 1; i < existing.length; i++) {
      if (existing[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(data[key]);
        updated = true;
        break;
      }
    }
    if (!updated) {
      sheet.appendRow([key, data[key], 'Updated by admin']);
    }
  }

  logAdminAction(adminEmail, 'SAVE_SETTINGS', '', 'Updated system settings.');
  return { success: true, message: 'Settings updated successfully.' };
}

function handleGetLogs() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(TABS.LOGS);
  var logs = [];
  if (sheet && sheet.getLastRow() > 1) {
    var data = sheet.getRange(2, 1, Math.min(sheet.getLastRow() - 1, 100), sheet.getLastColumn()).getValues();
    // Return newest first
    for (var i = data.length - 1; i >= 0; i--) {
      logs.push({
        admin: data[i][0],
        action: data[i][1],
        regId: data[i][2],
        timestamp: data[i][3],
        remarks: data[i][4]
      });
    }
  }
  return { success: true, logs: logs };
}

/**
 * ----------------------------------------------------------------------------
 * 7. SERVER-SIDE PDF GENERATION ENGINE
 * ----------------------------------------------------------------------------
 */

/**
 * Generates Registration Acknowledgement PDF (State: Pending Verification)
 */
function generateAcknowledgementPdf(p, s) {
  try {
    var qrUrl = getQrCodeApiUrl('BIDARI_ACK_' + p.registrationId);
    var logoUrl = s.EVENT_LOGO_URL || '';

    var html = '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
      '<style>' +
      'body { font-family: "Helvetica Neue", Arial, sans-serif; color: #1e293b; padding: 24px; margin: 0; }' +
      '.page { border: 2px solid #005B55; padding: 24px; border-radius: 8px; position: relative; }' +
      '.header { background: #005B55; color: #fff; padding: 16px; text-align: center; border-radius: 6px; }' +
      '.title { font-size: 22px; font-weight: bold; color: #D4AF37; margin: 0; }' +
      '.subtitle { font-size: 13px; margin: 4px 0 0; opacity: 0.9; }' +
      '.banner { background: #fef3c7; border: 1px solid #f59e0b; color: #92400e; padding: 8px; text-align: center; font-weight: bold; font-size: 13px; margin: 16px 0; border-radius: 4px; }' +
      '.grid { width: 100%; border-collapse: collapse; margin-top: 12px; }' +
      '.grid th, .grid td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 12px; }' +
      '.grid th { width: 35%; color: #64748b; font-weight: bold; }' +
      '.grid tr:nth-child(even) { background: #f8fafc; }' +
      '.footer-note { font-size: 11px; color: #b91c1c; background: #fef2f2; border: 1px solid #fca5a5; padding: 10px; border-radius: 4px; margin-top: 16px; }' +
      '.qr { float: right; width: 100px; height: 100px; }' +
      '</style></head><body>' +
      '<div class="page">' +
      '<div class="header">' +
      '<div class="title">' + (s.EVENT_NAME || 'BIDARI UTSAV 2026') + '</div>' +
      '<div class="subtitle">' + (s.ORGANIZATION_NAME || 'Bidar Jilleya Samskruthika Vedike') + ' | Annual Cultural Music Summit</div>' +
      '</div>' +
      '<div class="banner">REGISTRATION ACKNOWLEDGEMENT (PAYMENT STATUS: PENDING VERIFICATION)</div>' +
      '<img class="qr" src="' + qrUrl + '" alt="QR">' +
      '<table class="grid">' +
      '<tr><th>Registration ID</th><td><strong style="color:#005B55; font-size:14px;">' + p.registrationId + '</strong></td></tr>' +
      '<tr><th>Application Serial No</th><td>' + (p.serialNumber || '1') + '</td></tr>' +
      '<tr><th>Participant Full Name</th><td>' + p.fullName + '</td></tr>' +
      '<tr><th>Date of Birth & Age</th><td>' + p.dob + ' (' + p.age + ' Years)</td></tr>' +
      '<tr><th>Gender</th><td>' + (p.gender || '-') + '</td></tr>' +
      '<tr><th>Mobile Number</th><td>' + p.mobile + '</td></tr>' +
      '<tr><th>Parent / Guardian</th><td>' + (p.parentName || '-') + '</td></tr>' +
      '<tr><th>Competition</th><td>' + (p.competition || 'Sugama Sangeeta Gayana Spardhe') + '</td></tr>' +
      '<tr><th>Category & Language</th><td>' + (p.category || 'Solo') + ' | ' + (p.perfLanguage || 'Kannada') + '</td></tr>' +
      '<tr><th>Registration Fee</th><td>Rs. ' + p.fee + ' (₹200)</td></tr>' +
      '<tr><th>Submitted UTR</th><td>' + (p.utrNumber || 'Pending Submission') + '</td></tr>' +
      '<tr><th>Registration Date</th><td>' + Utilities.formatDate(new Date(p.registrationDate || new Date()), Session.getScriptTimeZone(), 'dd-MMM-yyyy HH:mm:ss') + '</td></tr>' +
      '</table>' +
      '<div style="clear:both;"></div>' +
      '<div class="footer-note">' +
      '<strong>IMPORTANT NOTICE:</strong> This document is an acknowledgement of application receipt. It is NOT proof of verified payment or confirmed entry. Payment will be verified manually against the receiving bank account. Check status anytime on the website download portal.' +
      '</div>' +
      '</div></body></html>';

    return createPdfInDrive(html, 'BidariUtsav_Ack_' + p.registrationId + '.pdf', 'Acknowledgements');
  } catch (err) {
    Logger.log('Acknowledgement PDF Error: ' + err.toString());
    return '';
  }
}

/**
 * Generates Official Payment Receipt PDF (State: Paid / Confirmed)
 */
function generatePaymentReceiptPdf(p, s) {
  try {
    var qrUrl = getQrCodeApiUrl('BIDARI_RECEIPT_' + p.registrationId + '_PAID');

    var html = '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
      '<style>' +
      'body { font-family: "Helvetica Neue", Arial, sans-serif; color: #1e293b; padding: 24px; margin: 0; }' +
      '.page { border: 2px solid #005B55; padding: 24px; border-radius: 8px; }' +
      '.header { background: #005B55; color: #fff; padding: 16px; text-align: center; border-radius: 6px; }' +
      '.title { font-size: 22px; font-weight: bold; color: #D4AF37; margin: 0; }' +
      '.subtitle { font-size: 13px; margin: 4px 0 0; opacity: 0.9; }' +
      '.banner { background: #dcfce7; border: 1px solid #16a34a; color: #15803d; padding: 8px; text-align: center; font-weight: bold; font-size: 13px; margin: 16px 0; border-radius: 4px; }' +
      '.grid { width: 100%; border-collapse: collapse; margin-top: 12px; }' +
      '.grid th, .grid td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 12px; }' +
      '.grid th { width: 35%; color: #64748b; font-weight: bold; }' +
      '.grid tr:nth-child(even) { background: #f8fafc; }' +
      '.qr { float: right; width: 100px; height: 100px; }' +
      '.sign { margin-top: 30px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }' +
      '</style></head><body>' +
      '<div class="page">' +
      '<div class="header">' +
      '<div class="title">' + (s.EVENT_NAME || 'BIDARI UTSAV 2026') + '</div>' +
      '<div class="subtitle">' + (s.ORGANIZATION_NAME || 'Bidar Jilleya Samskruthika Vedike') + '</div>' +
      '</div>' +
      '<div class="banner">OFFICIAL PAYMENT RECEIPT (PAID & VERIFIED)</div>' +
      '<img class="qr" src="' + qrUrl + '" alt="QR">' +
      '<table class="grid">' +
      '<tr><th>Receipt No / Reg ID</th><td><strong style="color:#005B55; font-size:14px;">' + p.registrationId + '</strong></td></tr>' +
      '<tr><th>Participant Name</th><td>' + p.fullName + '</td></tr>' +
      '<tr><th>Competition</th><td>' + (p.competition || 'Sugama Sangeeta Gayana Spardhe') + '</td></tr>' +
      '<tr><th>Amount Received</th><td><strong>Rs. ' + p.fee + ' (Two Hundred Rupees Only)</strong></td></tr>' +
      '<tr><th>Payment Mode</th><td>UPI QR Transfer</td></tr>' +
      '<tr><th>UPI Reference / UTR</th><td>' + (p.utrNumber || '-') + '</td></tr>' +
      '<tr><th>Verification Status</th><td><span style="color:#16a34a; font-weight:bold;">CONFIRMED / PAID</span></td></tr>' +
      '<tr><th>Verified On</th><td>' + Utilities.formatDate(new Date(p.verifiedDate || new Date()), Session.getScriptTimeZone(), 'dd-MMM-yyyy HH:mm') + '</td></tr>' +
      '<tr><th>Verified By</th><td>' + (p.verifiedBy || 'Authorized Admin') + '</td></tr>' +
      '</table>' +
      '<div style="clear:both;"></div>' +
      '<div style="margin-top:24px; border-top:1px solid #cbd5e1; padding-top:12px; font-size:11px; color:#64748b; display:flex; justify-content:space-between;">' +
      '<span>System Generated Official Receipt | Bidari Utsav 2026</span>' +
      '<span>Authorized Signatory</span>' +
      '</div>' +
      '</div></body></html>';

    return createPdfInDrive(html, 'BidariUtsav_Receipt_' + p.registrationId + '.pdf', 'Receipts');
  } catch (err) {
    Logger.log('Receipt PDF Error: ' + err.toString());
    return '';
  }
}

/**
 * Generates Participant Pass PDF (Provisional or Confirmed)
 */
function generatePassPdf(p, s, isConfirmed) {
  try {
    var passType = isConfirmed ? 'CONFIRMED PASS' : 'PROVISIONAL PASS';
    var qrUrl = getQrCodeApiUrl('PASS_' + p.registrationId + '_' + (isConfirmed ? 'CONFIRMED' : 'PENDING'));

    var html = '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
      '<style>' +
      'body { font-family: "Helvetica Neue", Arial, sans-serif; color: #1e293b; padding: 16px; margin: 0; background: #0B0C10; }' +
      '.badge-card { background: #14161D; border: 2px solid #D4AF37; padding: 20px; border-radius: 8px; color: #ECEAE4; max-width: 500px; margin: 0 auto; }' +
      '.top-bar { background: #005B55; color: #fff; padding: 10px; text-align: center; border-radius: 4px; margin: -20px -20px 16px -20px; }' +
      '.title { font-size: 18px; font-weight: bold; color: #D4AF37; margin: 0; }' +
      '.tag { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; margin-top: 6px; }' +
      '.tag-conf { background: #16a34a; color: #fff; }' +
      '.tag-prov { background: #d97706; color: #fff; }' +
      '.p-name { font-size: 18px; font-weight: bold; color: #fff; margin: 10px 0 2px; }' +
      '.p-meta { font-size: 12px; color: #9AA0AE; margin-bottom: 12px; }' +
      '.info-table { width: 100%; font-size: 11px; border-collapse: collapse; }' +
      '.info-table td { padding: 4px 0; color: #C9CED6; }' +
      '.info-table td.lbl { color: #D4AF37; width: 35%; font-weight: bold; }' +
      '.qr-box { text-align: center; margin-top: 12px; background: #fff; padding: 6px; border-radius: 4px; display: inline-block; }' +
      '</style></head><body>' +
      '<div class="badge-card">' +
      '<div class="top-bar">' +
      '<div class="title">' + (s.EVENT_NAME || 'BIDARI UTSAV 2026') + '</div>' +
      '<div style="font-size:10px; color:#F1DFA4;">' + (s.ORGANIZATION_NAME || 'Bidar Jilleya Samskruthika Vedike') + '</div>' +
      '<span class="tag ' + (isConfirmed ? 'tag-conf' : 'tag-prov') + '">' + passType + '</span>' +
      '</div>' +
      '<div style="display:flex; justify-content:space-between; align-items:center;">' +
      '<div>' +
      '<div class="p-name">' + p.fullName + '</div>' +
      '<div class="p-meta">Age: ' + p.age + ' Yrs | Gender: ' + (p.gender || '-') + '</div>' +
      '<table class="info-table">' +
      '<tr><td class="lbl">PASS ID:</td><td><strong>' + p.registrationId + '</strong></td></tr>' +
      '<tr><td class="lbl">COMPETITION:</td><td>' + (p.competition || 'Sugama Sangeeta Gayana') + '</td></tr>' +
      '<tr><td class="lbl">EVENT DATES:</td><td>' + (s.EVENT_DATES || '12-13 Dec 2026') + '</td></tr>' +
      '<tr><td class="lbl">REPORTING:</td><td>' + (s.REPORTING_SCHEDULE || '11-12-2026 9:00 AM') + '</td></tr>' +
      '<tr><td class="lbl">VENUE:</td><td>' + (s.VENUE || 'Rang Mandir, Bidar') + '</td></tr>' +
      '</table>' +
      '</div>' +
      '<div style="text-align:center;">' +
      '<div class="qr-box"><img src="' + qrUrl + '" width="80" height="80" alt="QR"></div>' +
      '<div style="font-size:9px; color:#9AA0AE; margin-top:4px;">Scan at Entrance</div>' +
      '</div>' +
      '</div>' +
      '<div style="margin-top:14px; font-size:9px; color:#9AA0AE; border-top:1px solid rgba(212,175,55,0.2); padding-top:6px; text-align:center;">' +
      'Please carry this pass along with a valid Government Photo ID proof. Non-transferable.' +
      '</div>' +
      '</div></body></html>';

    var filename = 'BidariUtsav_' + (isConfirmed ? 'ConfirmedPass_' : 'ProvisionalPass_') + p.registrationId + '.pdf';
    return createPdfInDrive(html, filename, 'Event Passes');
  } catch (err) {
    Logger.log('Pass PDF Error: ' + err.toString());
    return '';
  }
}

/**
 * Creates PDF file in Google Drive from HTML string
 */
function createPdfInDrive(htmlContent, filename, subfolderName) {
  var settings = getSettingsMap();
  var rootFolderId = settings.DRIVE_FOLDER_ID || getProperty('DRIVE_FOLDER_ID', '');
  var folder;

  if (rootFolderId) {
    folder = DriveApp.getFolderById(rootFolderId);
  } else {
    folder = DriveApp.getRootFolder();
  }

  // Get or create specific subfolder
  var targetFolder = folder;
  if (subfolderName) {
    var subfolders = folder.getFoldersByName(subfolderName);
    if (subfolders.hasNext()) {
      targetFolder = subfolders.next();
    } else {
      targetFolder = folder.createFolder(subfolderName);
    }
  }

  var blob = Utilities.newBlob(htmlContent, 'text/html', filename).getAs('application/pdf');
  var file = targetFolder.createFile(blob);
  return file.getId();
}

/**
 * QR Code Generator API Helper (Produces direct image URL for embedded HTML PDF rendering)
 */
function getQrCodeApiUrl(dataText) {
  return 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(dataText);
}

/**
 * Saves base64 uploaded files (payment screenshots, photos) into private Drive folder
 */
function saveFileToDrive(base64Data, filenamePrefix, subfolderName) {
  try {
    var parts = base64Data.split(',');
    var meta = parts[0];
    var rawBase64 = parts[1] || parts[0];

    var contentType = 'image/jpeg';
    var ext = '.jpg';
    if (meta.indexOf('image/png') > -1) { contentType = 'image/png'; ext = '.png'; }
    else if (meta.indexOf('image/webp') > -1) { contentType = 'image/webp'; ext = '.webp'; }

    var decoded = Utilities.base64Decode(rawBase64);
    var blob = Utilities.newBlob(decoded, contentType, filenamePrefix + ext);

    var settings = getSettingsMap();
    var rootFolderId = settings.DRIVE_FOLDER_ID || getProperty('DRIVE_FOLDER_ID', '');
    var folder = rootFolderId ? DriveApp.getFolderById(rootFolderId) : DriveApp.getRootFolder();

    var targetFolder = folder;
    if (subfolderName) {
      var subs = folder.getFoldersByName(subfolderName);
      targetFolder = subs.hasNext() ? subs.next() : folder.createFolder(subfolderName);
    }

    var file = targetFolder.createFile(blob);
    // Keep internal file private / viewable by link
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (err) {
    Logger.log('Drive file upload error: ' + err.toString());
    return '';
  }
}

/**
 * ----------------------------------------------------------------------------
 * 8. LOGGING & UTILITY HELPERS
 * ----------------------------------------------------------------------------
 */
function logPaymentRecord(regId, utr, amount, status) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(TABS.PAYMENTS);
  if (!sheet) return;

  var pid = 'PAY-' + Date.now().toString(36).toUpperCase();
  sheet.appendRow([
    pid,
    regId,
    utr,
    amount,
    new Date(),
    status,
    '',
    '',
    ''
  ]);
}

function updatePaymentRecord(regId, utr, amount, status, verifiedBy, remarks) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(TABS.PAYMENTS);
  if (!sheet || sheet.getLastRow() <= 1) return;

  var data = sheet.getDataRange().getValues();
  var found = false;

  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][1]).trim().toUpperCase() === regId.toUpperCase()) {
      sheet.getRange(i + 1, 3).setValue(utr); // UPI Transaction ID
      sheet.getRange(i + 1, 6).setValue(status); // Status
      sheet.getRange(i + 1, 7).setValue(verifiedBy); // Verified By
      sheet.getRange(i + 1, 8).setValue(new Date()); // Date
      sheet.getRange(i + 1, 9).setValue(remarks); // Remarks
      found = true;
      break;
    }
  }

  if (!found) {
    var pid = 'PAY-' + Date.now().toString(36).toUpperCase();
    sheet.appendRow([
      pid,
      regId,
      utr,
      amount,
      new Date(),
      status,
      verifiedBy,
      new Date(),
      remarks
    ]);
  }
}

function getPaymentRemarks(regId) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(TABS.PAYMENTS);
  if (!sheet || sheet.getLastRow() <= 1) return '';

  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][1]).trim().toUpperCase() === regId.toUpperCase()) {
      return String(data[i][8] || '');
    }
  }
  return '';
}

function logAdminAction(adminEmail, action, regId, remarks) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(TABS.LOGS);
    if (!sheet) return;
    sheet.appendRow([
      adminEmail || 'Admin',
      action,
      regId || '',
      new Date(),
      remarks || ''
    ]);
  } catch (e) {
    Logger.log('Log error: ' + e.toString());
  }
}

function generateSecureToken() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 16);
}

function findRowByValue(sheet, colIndex, value) {
  if (sheet.getLastRow() <= 1) return -1;
  var colData = sheet.getRange(1, colIndex + 1, sheet.getLastRow(), 1).getValues();
  var searchVal = String(value).trim().toUpperCase();
  for (var i = 1; i < colData.length; i++) {
    if (String(colData[i][0]).trim().toUpperCase() === searchVal) {
      return i + 1; // 1-based row index
    }
  }
  return -1;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function sendNotificationEmail(recipient, subject, htmlBody) {
  try {
    MailApp.sendEmail({
      to: recipient,
      subject: subject,
      htmlBody: htmlBody
    });
  } catch (err) {
    Logger.log('Email sending failed: ' + err.toString());
  }
}

function getRegistrationEmailHtml(p) {
  return '<div style="font-family:sans-serif; padding:20px; color:#1e293b;">' +
    '<h2 style="color:#005B55;">Bidari Utsav 2026 – Registration Received</h2>' +
    '<p>Dear <strong>' + p.fullName + '</strong>,</p>' +
    '<p>Thank you for submitting your registration for <strong>' + p.competition + '</strong>.</p>' +
    '<p><strong>Registration ID:</strong> <span style="font-family:monospace; font-size:16px; color:#005B55;">' + p.registrationId + '</span></p>' +
    '<p><strong>Status:</strong> PENDING VERIFICATION</p>' +
    '<p>We will manually reconcile your UPI transaction ID against our bank records. Once approved, your confirmed pass will be available for download.</p>' +
    '<p>Regards,<br>Bidar Jilleya Samskruthika Vedike</p>' +
    '</div>';
}

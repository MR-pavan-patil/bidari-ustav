/**
 * ============================================================================
 * BIDARI UTSAV 2026 - ADMIN MANAGEMENT DASHBOARD CLIENT
 * ============================================================================
 * Handles:
 * - Admin Authentication
 * - Metrics & Statistics
 * - Pending Payment Verification & Rejection with remarks
 * - Participant Directory (Search, Filter, Export CSV, Document Download)
 * - Competition Configuration
 * - System Settings & Allowlist
 * - QR Attendance Check-In with Override Guards
 * ============================================================================
 */

(function () {
  'use strict';

  var DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz_K5nyRY4M5_I1DLfpznN1EO6tVAOwaBJq3sLq6ecmly9C8V8FW8NN8ZfJzVIjWYJk/exec';

  // Config: Uses window.BidariReg.CONFIG.APPS_SCRIPT_URL or fallback
  var getApiUrl = function () {
    return (window.BidariReg && window.BidariReg.CONFIG && window.BidariReg.CONFIG.APPS_SCRIPT_URL) || DEFAULT_APPS_SCRIPT_URL;
  };

  var state = {
    adminToken: localStorage.getItem('bidari_admin_token') || '',
    adminEmail: localStorage.getItem('bidari_admin_email') || '',
    participants: [],
    pendingPayments: [],
    competitions: [],
    stats: {},
    activeTab: 'overview',
    qrScanner: null
  };

  document.addEventListener('DOMContentLoaded', function () {
    initAuth();
    initTabNavigation();
    initModals();
    initSearchAndFilters();
  });

  // --------------------------------------------------------------------------
  // 1. AUTHENTICATION & SESSION
  // --------------------------------------------------------------------------
  function initAuth() {
    var loginModal = document.getElementById('adminLoginModal');
    var emailSpan = document.getElementById('adminDisplayEmail');
    var logoutBtn = document.getElementById('adminLogoutBtn');

    if (!state.adminToken) {
      if (loginModal) loginModal.classList.add('active');
    } else {
      if (emailSpan) emailSpan.textContent = state.adminEmail || 'Authorized Admin';
      loadDashboardData();
    }

    var loginForm = document.getElementById('adminLoginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = (document.getElementById('adminLoginEmail').value || '').trim();
        var key = (document.getElementById('adminLoginKey').value || '').trim();

        showLoading('Authenticating admin...');
        var apiUrl = getApiUrl();

        // If key matches default admin key, allow immediate local & session access
        if (key === 'bidari2026admin') {
          state.adminToken = 'bidari2026admin';
          state.adminEmail = email || 'admin@bidari.in';
          localStorage.setItem('bidari_admin_token', state.adminToken);
          localStorage.setItem('bidari_admin_email', state.adminEmail);
          if (loginModal) loginModal.classList.remove('active');
          if (emailSpan) emailSpan.textContent = state.adminEmail;
          hideLoading();
          loadDashboardData();
          showToast('Welcome, Admin! Login successful.', 'success');
          return;
        }

        if (!apiUrl) {
          hideLoading();
          showToast('Invalid Secret Access Key. Use: bidari2026admin', 'error');
          return;
        }

        // Avoid CORS preflight OPTIONS request by using text/plain
        fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'adminLogin',
            data: { email: email, secretKey: key }
          })
        })
          .then(function (r) { return r.json(); })
          .then(function (res) {
            hideLoading();
            if (res.success) {
              state.adminToken = res.token || key;
              state.adminEmail = res.adminEmail || email;
              localStorage.setItem('bidari_admin_token', state.adminToken);
              localStorage.setItem('bidari_admin_email', state.adminEmail);
              if (loginModal) loginModal.classList.remove('active');
              if (emailSpan) emailSpan.textContent = state.adminEmail;
              loadDashboardData();
              showToast('Login successful!', 'success');
            } else {
              showToast(res.error || 'Authentication failed', 'error');
            }
          })
          .catch(function (err) {
            hideLoading();
            // Fallback for default key
            if (key === 'bidari2026admin') {
              state.adminToken = key;
              state.adminEmail = email || 'admin@bidari.in';
              localStorage.setItem('bidari_admin_token', state.adminToken);
              localStorage.setItem('bidari_admin_email', state.adminEmail);
              if (loginModal) loginModal.classList.remove('active');
              if (emailSpan) emailSpan.textContent = state.adminEmail;
              loadDashboardData();
              showToast('Logged in!', 'success');
            } else {
              showToast('Invalid Secret Key. Use: bidari2026admin', 'error');
            }
          });
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        localStorage.removeItem('bidari_admin_token');
        localStorage.removeItem('bidari_admin_email');
        window.location.reload();
      });
    }
  }

  // --------------------------------------------------------------------------
  // 2. TAB NAVIGATION
  // --------------------------------------------------------------------------
  function initTabNavigation() {
    var tabs = document.querySelectorAll('.admin-tab-btn');
    tabs.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var targetId = btn.getAttribute('data-tab');
        switchTab(targetId);
      });
    });
  }

  function switchTab(tabId) {
    state.activeTab = tabId;
    document.querySelectorAll('.admin-tab-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
    });
    document.querySelectorAll('.admin-tab-panel').forEach(function (p) {
      p.classList.toggle('active', p.id === 'tab-' + tabId);
    });

    if (tabId === 'attendance') {
      initQrScanner();
    } else {
      stopQrScanner();
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  // --------------------------------------------------------------------------
  // 3. DATA LOADING & METRICS
  // --------------------------------------------------------------------------
  function loadDashboardData() {
    loadOverviewStats();
    loadPendingPayments();
    loadParticipants();
    loadCompetitions();
  }

  function loadOverviewStats() {
    var apiUrl = getApiUrl();
    if (!apiUrl) {
      // Load from local storage
      var all = JSON.parse(localStorage.getItem('bidari_registrations') || '[]');
      var confirmed = all.filter(function (r) { return r.paymentStatus === 'PAID' || r.paymentStatus === 'CONFIRMED'; }).length;
      var pending = all.filter(function (r) { return r.paymentStatus === 'PENDING' || r.paymentStatus === 'PENDING VERIFICATION'; }).length;
      var rejected = all.filter(function (r) { return r.paymentStatus === 'REJECTED'; }).length;

      renderStats({
        totalRegistrations: all.length,
        pendingVerification: pending,
        confirmedRegistrations: confirmed,
        rejectedRegistrations: rejected,
        totalVerifiedCollection: confirmed * 200,
        totalCheckedIn: all.filter(function (r) { return r.attendanceStatus === 'CHECKED_IN'; }).length
      });
      return;
    }

    fetch(apiUrl + '?action=getDashboardStats&adminToken=' + encodeURIComponent(state.adminToken))
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.success && res.stats) {
          state.stats = res.stats;
          renderStats(res.stats);
        }
      })
      .catch(function (e) { console.warn(e); });
  }

  function renderStats(s) {
    setTxt('statTotal', s.totalRegistrations || 0);
    setTxt('statPending', s.pendingVerification || 0);
    setTxt('statConfirmed', s.confirmedRegistrations || 0);
    setTxt('statRejected', s.rejectedRegistrations || 0);
    setTxt('statCollected', '₹' + (s.totalVerifiedCollection || 0).toLocaleString('en-IN'));
    setTxt('statCheckedIn', s.totalCheckedIn || 0);

    var badge = document.getElementById('pendingCountBadge');
    if (badge) {
      badge.textContent = s.pendingVerification || 0;
      badge.style.display = s.pendingVerification > 0 ? 'inline-block' : 'none';
    }
  }

  // --------------------------------------------------------------------------
  // 4. PENDING PAYMENTS VERIFICATION QUEUE
  // --------------------------------------------------------------------------
  function loadPendingPayments() {
    var apiUrl = getApiUrl();
    if (!apiUrl) {
      var all = JSON.parse(localStorage.getItem('bidari_registrations') || '[]');
      var pending = all.filter(function (r) {
        return r.paymentStatus === 'PENDING' || r.paymentStatus === 'PENDING VERIFICATION' || r.paymentStatus === 'PENDING_RECHECK';
      });
      renderPendingPayments(pending);
      return;
    }

    fetch(apiUrl + '?action=getPendingPayments&adminToken=' + encodeURIComponent(state.adminToken))
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.success && res.pendingPayments) {
          state.pendingPayments = res.pendingPayments;
          renderPendingPayments(res.pendingPayments);
        }
      })
      .catch(function (e) { console.warn(e); });
  }

  function renderPendingPayments(list) {
    var tbody = document.getElementById('pendingPaymentsTableBody');
    if (!tbody) return;

    if (!list || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 2rem; color: #9AA0AE;">🎉 No pending payments to verify. All registrations are up to date!</td></tr>';
      return;
    }

    var html = list.map(function (p) {
      var screenBtn = p.screenshotUrl ?
        '<button class="btn btn-outline" style="padding:0.25rem 0.6rem; font-size:0.75rem;" onclick="viewScreenshot(\'' + escapeAttr(p.screenshotUrl) + '\', \'' + p.registrationId + '\')"><i data-lucide="image"></i> View Proof</button>' :
        '<span style="color:#9AA0AE; font-size:0.75rem;">None</span>';

      return '<tr>' +
        '<td><strong style="color:var(--admin-gold); font-family:monospace;">' + p.registrationId + '</strong></td>' +
        '<td><strong>' + escapeHtml(p.participantName) + '</strong></td>' +
        '<td>' + p.mobileNumber + '</td>' +
        '<td><strong style="color:#FFF; font-family:monospace; background:#1C1F29; padding:2px 6px; border-radius:4px;">' + (p.utrNumber || 'Awaiting UTR') + '</strong></td>' +
        '<td>₹' + (p.amount || 200) + '</td>' +
        '<td>' + screenBtn + '</td>' +
        '<td>' +
          '<div style="display:flex; gap:0.4rem;">' +
            '<button class="btn btn-teal" style="padding:0.3rem 0.8rem; font-size:0.8rem;" onclick="promptApprovePayment(\'' + p.registrationId + '\', \'' + escapeAttr(p.utrNumber) + '\')">✓ Approve</button>' +
            '<button class="btn btn-outline" style="padding:0.3rem 0.8rem; font-size:0.8rem; border-color:var(--admin-red); color:#F87171;" onclick="promptRejectPayment(\'' + p.registrationId + '\')">✕ Reject</button>' +
          '</div>' +
        '</td>' +
      '</tr>';
    }).join('');

    tbody.innerHTML = html;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  window.promptApprovePayment = function (regId, utr) {
    var remarks = prompt('Verify in bank account: Confirm ₹200 received from UTR ' + (utr || 'N/A') + '?\n\nEnter optional approval remarks:', 'Verified against receiving UPI statement');
    if (remarks === null) return; // User cancelled

    showLoading('Approving payment & generating official confirmed documents...');
    var apiUrl = getApiUrl();

    if (!apiUrl) {
      // Local mode
      var all = JSON.parse(localStorage.getItem('bidari_registrations') || '[]');
      var idx = all.findIndex(function (r) { return r.registrationId === regId; });
      if (idx > -1) {
        all[idx].paymentStatus = 'CONFIRMED';
        all[idx].utrNumber = utr;
        localStorage.setItem('bidari_registrations', JSON.stringify(all));
      }
      hideLoading();
      loadDashboardData();
      showToast('Payment approved (Local Mode)!', 'success');
      return;
    }

    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'approvePayment',
        adminToken: state.adminToken,
        adminEmail: state.adminEmail,
        data: { registrationId: regId, utrNumber: utr, remarks: remarks }
      })
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        hideLoading();
        if (res.success) {
          // Sync local storage on this machine
          try {
            var all = JSON.parse(localStorage.getItem('bidari_registrations') || '[]');
            var idx = all.findIndex(function (r) { return r.registrationId === regId; });
            if (idx > -1) {
              all[idx].paymentStatus = 'CONFIRMED';
              if (utr) all[idx].utrNumber = utr;
              localStorage.setItem('bidari_registrations', JSON.stringify(all));
            }
            var cur = JSON.parse(localStorage.getItem('bidari_current_reg') || 'null');
            if (cur && cur.registrationId === regId) {
              cur.paymentStatus = 'CONFIRMED';
              if (utr) cur.utrNumber = utr;
              localStorage.setItem('bidari_current_reg', JSON.stringify(cur));
            }
          } catch(e) {}

          showToast('Payment confirmed for ' + regId + '! Updated pass & receipt ready.', 'success');
          loadDashboardData();
        } else {
          showToast(res.error || 'Approval failed.', 'error');
        }
      })
      .catch(function (e) {
        hideLoading();
        showToast('Approval error: ' + e.toString(), 'error');
      });
  };

  window.promptRejectPayment = function (regId) {
    var reason = prompt('Please enter the reason for rejecting payment (this will be displayed to participant on the download portal):', 'Transaction reference could not be located in bank records. Please re-enter correct UTR.');
    if (!reason) return;

    showLoading('Rejecting payment...');
    var apiUrl = getApiUrl();

    if (!apiUrl) {
      var all = JSON.parse(localStorage.getItem('bidari_registrations') || '[]');
      var idx = all.findIndex(function (r) { return r.registrationId === regId; });
      if (idx > -1) {
        all[idx].paymentStatus = 'REJECTED';
        all[idx].rejectionRemarks = reason;
        localStorage.setItem('bidari_registrations', JSON.stringify(all));
      }
      hideLoading();
      loadDashboardData();
      showToast('Payment rejected (Local Mode).', 'warning');
      return;
    }

    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'rejectPayment',
        adminToken: state.adminToken,
        adminEmail: state.adminEmail,
        data: { registrationId: regId, remarks: reason }
      })
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        hideLoading();
        if (res.success) {
          showToast('Payment marked as rejected. Participant can resubmit corrected details.', 'warning');
          loadDashboardData();
        } else {
          showToast(res.error || 'Rejection failed.', 'error');
        }
      })
      .catch(function (e) {
        hideLoading();
        showToast('Error: ' + e.toString(), 'error');
      });
  };

  // --------------------------------------------------------------------------
  // 5. PARTICIPANT DIRECTORY & SEARCH
  // --------------------------------------------------------------------------
  function loadParticipants() {
    var apiUrl = getApiUrl();
    if (!apiUrl) {
      var all = JSON.parse(localStorage.getItem('bidari_registrations') || '[]');
      state.participants = all;
      renderParticipantsTable(all);
      return;
    }

    fetch(apiUrl + '?action=getParticipants&adminToken=' + encodeURIComponent(state.adminToken))
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.success && res.participants) {
          state.participants = res.participants;
          renderParticipantsTable(res.participants);
        }
      })
      .catch(function (e) { console.warn(e); });
  }

  function renderParticipantsTable(list) {
    var tbody = document.getElementById('participantsTableBody');
    if (!tbody) return;

    if (!list || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 2rem; color: #9AA0AE;">No matching participants found.</td></tr>';
      return;
    }

    var html = list.map(function (p) {
      var st = (p.paymentStatus || 'PENDING VERIFICATION').toUpperCase();
      var badgeClass = 'admin-badge-pending';
      if (st === 'PAID' || st === 'CONFIRMED') badgeClass = 'admin-badge-paid';
      else if (st === 'REJECTED') badgeClass = 'admin-badge-rejected';

      var attClass = p.attendanceStatus === 'CHECKED_IN' ? 'admin-badge-checked' : 'admin-badge-pending';
      var attText = p.attendanceStatus === 'CHECKED_IN' ? '✓ Checked In' : 'Pending';

      return '<tr>' +
        '<td><strong style="color:var(--admin-gold); font-family:monospace;">' + p.registrationId + '</strong></td>' +
        '<td>' + (p.serialNumber || '-') + '</td>' +
        '<td><strong>' + escapeHtml(p.participantName || p.fullName) + '</strong></td>' +
        '<td>' + (p.age || '-') + ' / ' + (p.gender || '-') + '</td>' +
        '<td>' + (p.mobileNumber || p.mobile) + '</td>' +
        '<td>' + escapeHtml(p.city || '-') + '</td>' +
        '<td><span class="admin-badge ' + badgeClass + '">' + st + '</span></td>' +
        '<td><span class="admin-badge ' + attClass + '">' + attText + '</span></td>' +
        '<td>' +
          '<div style="display:flex; gap:0.4rem;">' +
            '<button class="btn btn-outline" style="padding:0.25rem 0.6rem; font-size:0.75rem;" onclick="viewParticipantDetails(\'' + p.registrationId + '\')"><i data-lucide="eye"></i> Details</button>' +
            '<button class="btn btn-outline" style="padding:0.25rem 0.6rem; font-size:0.75rem;" onclick="downloadParticipantDoc(\'' + p.registrationId + '\', \'pass\')"><i data-lucide="ticket"></i> Pass</button>' +
          '</div>' +
        '</td>' +
      '</tr>';
    }).join('');

    tbody.innerHTML = html;
    setTxt('participantCountBadge', list.length);
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function initSearchAndFilters() {
    var searchInput = document.getElementById('participantSearch');
    var statusSelect = document.getElementById('filterPaymentStatus');
    var compSelect = document.getElementById('filterCompetition');

    function applyFilters() {
      var q = (searchInput ? searchInput.value : '').toLowerCase().trim();
      var st = (statusSelect ? statusSelect.value : 'ALL').toUpperCase();
      var cp = (compSelect ? compSelect.value : 'ALL');

      var filtered = state.participants.filter(function (p) {
        var pName = (p.participantName || p.fullName || '').toLowerCase();
        var pId = (p.registrationId || '').toLowerCase();
        var pMob = String(p.mobileNumber || p.mobile || '');
        var pStatus = (p.paymentStatus || 'PENDING VERIFICATION').toUpperCase();
        var pComp = p.competition || 'Sugama Sangeeta Gayana Spardhe';

        if (st !== 'ALL' && pStatus !== st) return false;
        if (cp !== 'ALL' && pComp !== cp) return false;
        if (q) {
          return pName.indexOf(q) > -1 || pId.indexOf(q) > -1 || pMob.indexOf(q) > -1;
        }
        return true;
      });

      renderParticipantsTable(filtered);
    }

    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (statusSelect) statusSelect.addEventListener('change', applyFilters);
    if (compSelect) compSelect.addEventListener('change', applyFilters);

    var exportBtn = document.getElementById('btnExportCsv');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportParticipantsCsv);
    }
  }

  function exportParticipantsCsv() {
    if (!state.participants || state.participants.length === 0) {
      showToast('No participants to export.', 'warning');
      return;
    }

    var headers = ['Registration ID', 'Serial No', 'Name', 'DOB', 'Age', 'Gender', 'Mobile', 'Parent Name', 'Parent Mobile', 'City', 'District', 'Competition', 'Category', 'Language', 'UTR', 'Fee', 'Payment Status', 'Attendance Status'];
    var rows = state.participants.map(function (p) {
      return [
        p.registrationId,
        p.serialNumber || '',
        '"' + (p.participantName || p.fullName || '').replace(/"/g, '""') + '"',
        p.dob || '',
        p.age || '',
        p.gender || '',
        p.mobileNumber || p.mobile || '',
        '"' + (p.parentName || '').replace(/"/g, '""') + '"',
        p.parentMobile || '',
        '"' + (p.city || '').replace(/"/g, '""') + '"',
        '"' + (p.district || '').replace(/"/g, '""') + '"',
        '"' + (p.competition || '').replace(/"/g, '""') + '"',
        p.category || 'Solo',
        p.perfLanguage || 'Kannada',
        p.utrNumber || '',
        p.fee || 200,
        p.paymentStatus || 'PENDING',
        p.attendanceStatus || 'NOT_CHECKED_IN'
      ];
    });

    var csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(',')].concat(rows.map(function (e) { return e.join(','); })).join('\n');
    var encodedUri = encodeURI(csvContent);
    var link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'BidariUtsav2026_Participants_' + new Date().toISOString().slice(0, 10) + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Participant CSV exported successfully!', 'success');
  }

  window.viewParticipantDetails = function (regId) {
    var p = state.participants.find(function (r) { return r.registrationId === regId; });
    if (!p) return;

    var modal = document.getElementById('participantDetailsModal');
    var body = document.getElementById('participantDetailsBody');
    if (!modal || !body) return;

    var rows = [
      ['Registration ID', p.registrationId],
      ['Application Serial Number', p.serialNumber || '-'],
      ['Participant Full Name', p.participantName || p.fullName],
      ['Date of Birth & Age', (p.dob || '-') + ' (' + (p.age || '-') + ' Years)'],
      ['Gender', p.gender || '-'],
      ['Mobile Number', p.mobileNumber || p.mobile],
      ['Parent / Guardian', (p.parentName || '-') + ' (Ph: ' + (p.parentMobile || '-') + ')'],
      ['Address', (p.address || '-') + ', ' + (p.city || '-') + ', ' + (p.district || '-')],
      ['Competition', p.competition || 'Sugama Sangeeta Gayana Spardhe'],
      ['Category & Language', (p.category || 'Solo') + ' | ' + (p.perfLanguage || 'Kannada')],
      ['Registration Fee', '₹' + (p.fee || 200)],
      ['UPI Transaction Ref (UTR)', p.utrNumber || 'None'],
      ['Payment Status', p.paymentStatus || 'PENDING VERIFICATION'],
      ['Attendance Status', p.attendanceStatus || 'NOT_CHECKED_IN'],
      ['Registration Date', p.registrationDate ? new Date(p.registrationDate).toLocaleString('en-IN') : '-']
    ];

    var html = '<table class="admin-table" style="margin-top:1rem;">' +
      rows.map(function (r) {
        return '<tr><th style="width:35%;">' + r[0] + '</th><td><strong>' + escapeHtml(String(r[1])) + '</strong></td></tr>';
      }).join('') +
      '</table>';

    if (p.screenshotUrl) {
      html += '<div style="margin-top:1.5rem;"><h4>Payment Screenshot</h4><img src="' + escapeAttr(p.screenshotUrl) + '" class="admin-screenshot-preview" alt="Proof"></div>';
    }

    html += '<div style="display:flex; gap:0.8rem; margin-top:1.5rem; flex-wrap:wrap;">' +
      '<button class="btn btn-teal" onclick="downloadParticipantDoc(\'' + p.registrationId + '\', \'receipt\')"><i data-lucide=\"file-text\"></i> Official Receipt</button>' +
      '<button class="btn btn-gold" onclick="downloadParticipantDoc(\'' + p.registrationId + '\', \'pass\')"><i data-lucide=\"ticket\"></i> Event Pass</button>' +
      '</div>';

    body.innerHTML = html;
    modal.classList.add('active');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  };

  window.downloadParticipantDoc = function (regId, docType) {
    var p = state.participants.find(function (r) { return r.registrationId === regId; });
    if (!p) return;

    // Normalize participant fields
    p.fullName = p.fullName || p.participantName || p.name || 'Participant';
    p.competitionName = p.competitionName || p.competition || 'Sugama Sangeeta Gayana Spardhe';
    p.mobile = p.mobile || p.mobileNumber || '';

    // Check if photoBase64 exists in local storage
    if (!p.photoBase64) {
      try {
        var all = JSON.parse(localStorage.getItem('bidari_registrations') || '[]');
        var matched = all.find(function (r) { return (r.registrationId || '').toUpperCase() === (regId || '').toUpperCase(); });
        if (matched && matched.photoBase64) {
          p.photoBase64 = matched.photoBase64;
        }
      } catch(e) {}
    }

    if (window.PdfEngine) {
      if (docType === 'receipt') {
        window.PdfEngine.generateReceipt(p);
      } else {
        window.PdfEngine.generatePass(p);
      }
    } else {
      showToast('Generating document...', 'info');
      var apiUrl = getApiUrl();
      if (apiUrl && p.accessToken) {
        window.open(apiUrl + '?action=downloadPdf&regId=' + encodeURIComponent(regId) + '&token=' + encodeURIComponent(p.accessToken) + '&docType=' + docType, '_blank');
      }
    }
  };

  // --------------------------------------------------------------------------
  // 6. EVENT-DAY QR ATTENDANCE SCANNER
  // --------------------------------------------------------------------------
  function initQrScanner() {
    var qrElement = document.getElementById('qrReader');
    if (!qrElement) return;

    if (typeof Html5QrcodeScanner !== 'undefined' && !state.qrScanner) {
      try {
        state.qrScanner = new Html5QrcodeScanner('qrReader', {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        });
        state.qrScanner.render(onScanSuccess, onScanError);
      } catch (err) {
        console.warn('QR Scanner init error:', err);
      }
    }
  }

  function stopQrScanner() {
    if (state.qrScanner) {
      try {
        state.qrScanner.clear();
      } catch (e) {}
      state.qrScanner = null;
    }
  }

  function onScanSuccess(decodedText) {
    // Expected QR formats: 'PASS_BU26-XXXX_CONFIRMED' or json or plain BU26-XXXX
    var regId = '';
    if (decodedText.indexOf('PASS_') === 0) {
      var parts = decodedText.split('_');
      regId = parts[1];
    } else if (decodedText.indexOf('{') === 0) {
      try {
        var obj = JSON.parse(decodedText);
        regId = obj.id || obj.registrationId;
      } catch (e) {}
    } else {
      regId = decodedText.trim();
    }

    if (regId) {
      handleCheckin(regId, false);
    }
  }

  function onScanError(err) {
    // Ignore frequent scanning noise
  }

  window.handleManualCheckin = function () {
    var input = document.getElementById('manualRegIdInput');
    if (!input || !input.value) {
      showToast('Please enter a Registration ID.', 'error');
      return;
    }
    handleCheckin(input.value.trim().toUpperCase(), false);
  };

  function handleCheckin(regId, override, reason) {
    showLoading('Validating pass & attendance...');
    var apiUrl = getApiUrl();

    if (!apiUrl) {
      var all = JSON.parse(localStorage.getItem('bidari_registrations') || '[]');
      var p = all.find(function (r) { return r.registrationId === regId; });
      hideLoading();

      if (!p) {
        renderScanResult(false, 'Invalid Pass: ' + regId + ' not found in registration database.');
        return;
      }

      if (p.attendanceStatus === 'CHECKED_IN') {
        renderScanResult(false, '⚠️ ALREADY CHECKED IN: ' + p.fullName + ' was already admitted.');
        return;
      }

      var isPaid = p.paymentStatus === 'PAID' || p.paymentStatus === 'CONFIRMED';
      if (!isPaid && !override) {
        renderScanResult(false, '⛔ ENTRY BLOCKED: Payment is ' + p.paymentStatus + '. Paid confirmation required.', regId, true);
        return;
      }

      p.attendanceStatus = 'CHECKED_IN';
      localStorage.setItem('bidari_registrations', JSON.stringify(all));
      renderScanResult(true, '✓ ADMITTED: ' + p.fullName + ' (' + p.registrationId + ')');
      loadDashboardData();
      return;
    }

    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'markAttendance',
        adminToken: state.adminToken,
        adminEmail: state.adminEmail,
        data: { registrationId: regId, override: override, overrideReason: reason || '' }
      })
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        hideLoading();
        if (res.success) {
          renderScanResult(true, '✓ SUCCESS: ' + res.participantName + ' admitted successfully!');
          loadDashboardData();
        } else {
          if (res.requiresOverride) {
            renderScanResult(false, res.message, regId, true);
          } else {
            renderScanResult(false, res.message || res.error);
          }
        }
      })
      .catch(function (e) {
        hideLoading();
        renderScanResult(false, 'Check-in error: ' + e.toString());
      });
  }

  function renderScanResult(success, message, regId, canOverride) {
    var resBox = document.getElementById('scanResultBox');
    if (!resBox) return;

    resBox.style.display = 'block';
    resBox.style.background = success ? 'rgba(34, 197, 94, 0.15)' : 'rgba(229, 57, 53, 0.15)';
    resBox.style.border = '1px solid ' + (success ? 'var(--admin-green)' : 'var(--admin-red)');
    resBox.style.color = success ? '#86EFAC' : '#FCA5A5';

    var html = '<h3 style="margin:0 0 0.5rem; font-size:1.15rem;">' + (success ? '🎉 Check-in Approved' : '⚠️ Gate Alert') + '</h3>' +
      '<p style="margin:0; font-size:0.95rem;">' + escapeHtml(message) + '</p>';

    if (canOverride && regId) {
      html += '<div style="margin-top:1rem; border-top:1px solid rgba(229,57,53,0.3); padding-top:0.8rem;">' +
        '<p style="font-size:0.82rem; color:#FFF; margin-bottom:0.5rem;">Organizer Override Authorization:</p>' +
        '<button class="btn btn-gold" style="font-size:0.8rem; padding:0.4rem 1rem;" onclick="promptOverrideAttendance(\'' + regId + '\')">Authorize Override Entry</button>' +
        '</div>';
    }

    resBox.innerHTML = html;
    resBox.scrollIntoView({ behavior: 'smooth' });
  }

  window.promptOverrideAttendance = function (regId) {
    var reason = prompt('Please enter explicit reason for admitting participant with unconfirmed payment status:', 'Cash payment made at entrance / Verified by Smt. Rekha Sowdi');
    if (!reason) return;
    handleCheckin(regId, true, reason);
  };

  // --------------------------------------------------------------------------
  // 7. COMPETITIONS & SETTINGS
  // --------------------------------------------------------------------------
  function loadCompetitions() {
    var apiUrl = getApiUrl();
    if (!apiUrl) return;

    fetch(apiUrl + '?action=getCompetitions')
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.success && res.competitions) {
          state.competitions = res.competitions;
          renderCompetitions(res.competitions);
        }
      })
      .catch(function (e) { console.warn(e); });
  }

  function renderCompetitions(list) {
    var container = document.getElementById('competitionsListContainer');
    if (!container) return;

    var html = list.map(function (c) {
      return '<div class="admin-stat-card" style="margin-bottom:1.2rem;">' +
        '<div style="display:flex; justify-content:space-between; align-items:flex-start;">' +
          '<div>' +
            '<h3 style="color:#FFF; font-size:1.2rem; margin:0 0 0.3rem;">' + escapeHtml(c.name) + '</h3>' +
            '<p style="color:var(--admin-gold); font-size:0.85rem; margin:0 0 0.6rem;">Age Limit: ' + c.minAge + '–' + c.maxAge + ' Years | Fee: ₹' + c.fee + ' | Max: ' + c.maxParticipants + ' participants</p>' +
            '<p style="color:#C9CED6; font-size:0.88rem; line-height:1.5;">' + escapeHtml(c.description || '') + '</p>' +
          '</div>' +
          '<div>' +
            '<span class="admin-badge ' + (c.status === 'OPEN' ? 'admin-badge-paid' : 'admin-badge-rejected') + '">' + c.status + '</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    container.innerHTML = html;
  }

  // --------------------------------------------------------------------------
  // 8. SCREENSHOT & MODAL UTILITIES
  // --------------------------------------------------------------------------
  window.viewScreenshot = function (url, regId) {
    var modal = document.getElementById('screenshotModal');
    var img = document.getElementById('screenshotModalImg');
    var title = document.getElementById('screenshotModalTitle');
    if (!modal || !img) return;

    img.src = url;
    if (title) title.textContent = 'Payment Proof - ' + regId;
    modal.classList.add('active');
  };

  function initModals() {
    document.querySelectorAll('.admin-modal-close, [data-modal-close]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.admin-modal-overlay').forEach(function (m) {
          m.classList.remove('active');
        });
      });
    });
  }

  function showLoading(text) {
    var overlay = document.getElementById('adminLoading');
    var lbl = document.getElementById('adminLoadingText');
    if (overlay) overlay.classList.add('show');
    if (lbl) lbl.textContent = text || 'Processing...';
  }

  function hideLoading() {
    var overlay = document.getElementById('adminLoading');
    if (overlay) overlay.classList.remove('show');
  }

  function showToast(msg, type) {
    var toast = document.getElementById('adminToast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = 'reg-toast ' + (type || 'success') + ' show';
    setTimeout(function () { toast.classList.remove('show'); }, 4000);
  }

  function setTxt(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    if (!str) return '';
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

})();


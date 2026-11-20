/* ==========================================================================
   BIDARI UTSAV 2026 - REGISTRATION MODULE CORE JS
   Handles: form validation, step navigation, submission, payment
   ========================================================================== */

(function () {
  'use strict';

  // ===== CONFIGURATION (Admin-editable) =====
  const CONFIG = {
    // Google Apps Script Web App URL — replace with your deployed URL
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbz_K5nyRY4M5_I1DLfpznN1EO6tVAOwaBJq3sLq6ecmly9C8V8FW8NN8ZfJzVIjWYJk/exec',

    // UPI Payment Config
    UPI_ID: 'bidarivedike@upi',
    UPI_PAYEE: 'Bidar Jilleya Samskruthika Vedike',
    UPI_AMOUNT: 200,

    // Event Config
    EVENT_NAME: 'Bidari Utsav 2026',
    COMPETITION_NAME: 'Sugama Sangeeta Gayana Spardhe',
    EVENT_DATES: '12 & 13 December 2026',
    VENUE: 'Sri ChannaBasava PattaDevaR Rang Mandir, Bidar, Karnataka 585401',

    // Feature Flags
    AADHAAR_ENABLED: false,
    PHOTO_REQUIRED: false,

    // Validation
    MIN_AGE: 16,
    MAX_AGE: 20,
    COMPETITION_DATE: new Date('2026-12-12'),

    // Duplicate Prevention
    SUBMISSION_KEY: 'bidari_reg_submitted',
  };

  // ===== STATE =====
  let currentStep = 1;
  let registrationId = null;
  let isSubmitting = false;
  let formData = {};

  // ===== INITIALIZATION =====
  document.addEventListener('DOMContentLoaded', () => {
    fetchPublicSettings();
    initFormEvents();
    initFileUploads();
    initAadhaarToggle();
    generateUPIQr();
    initLucideIcons();
  });

  function fetchPublicSettings() {
    if (!CONFIG.APPS_SCRIPT_URL) return;
    fetch(CONFIG.APPS_SCRIPT_URL + '?action=getPublicSettings')
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          if (data.upiId) CONFIG.UPI_ID = data.upiId;
          if (data.upiPayeeName) CONFIG.UPI_PAYEE = data.upiPayeeName;
          if (data.registrationFee) CONFIG.UPI_AMOUNT = data.registrationFee;
          if (data.eventDates) CONFIG.EVENT_DATES = data.eventDates;
          if (data.venue) CONFIG.VENUE = data.venue;
          generateUPIQr();

          const upiDisplay = document.getElementById('displayUpiId');
          if (upiDisplay) upiDisplay.textContent = CONFIG.UPI_ID;
        }
      })
      .catch(err => console.warn('Public settings fetch failed:', err));
  }

  function initLucideIcons() {
    if (typeof lucide !== 'undefined') {
      setTimeout(() => lucide.createIcons(), 200);
    }
  }

  // ===== STEP NAVIGATION =====
  window.goToStep = function (step) {
    // Validate current step before moving forward
    if (step > currentStep) {
      if (!validateStep(currentStep)) return;
    }

    // Update step progress
    const steps = document.querySelectorAll('.reg-step');
    steps.forEach((s, i) => {
      const stepNum = i + 1;
      s.classList.remove('active', 'done');
      if (stepNum < step) s.classList.add('done');
      if (stepNum === step) s.classList.add('active');
    });

    // Hide all step content, show target
    document.querySelectorAll('.reg-step-content').forEach(c => c.classList.remove('active'));
    const target = document.getElementById('formStep' + step);
    if (target) {
      target.classList.add('active');
      // Scroll to form area
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    currentStep = step;

    // Build review summary on step 3
    if (step === 3) buildReviewSummary();

    // Re-init lucide icons
    initLucideIcons();
  };

  // ===== FORM VALIDATION =====
  function validateStep(step) {
    clearErrors();

    if (step === 1) {
      return validateStep1();
    } else if (step === 2) {
      return validateStep2();
    }
    return true;
  }

  function validateStep1() {
    let valid = true;

    // Full Name
    const fullName = val('fullName');
    if (!fullName || fullName.length < 2) {
      showError('fullName', 'fullNameError');
      valid = false;
    }

    // DOB & Age
    const dob = val('dob');
    if (!dob) {
      showError('dob', 'dobError');
      valid = false;
    } else {
      const age = calculateAge(new Date(dob), CONFIG.COMPETITION_DATE);
      if (age < CONFIG.MIN_AGE || age > CONFIG.MAX_AGE) {
        showError('dob', 'dobError');
        valid = false;
      }
    }

    // Gender
    if (!val('gender')) {
      showError('gender', 'genderError');
      valid = false;
    }

    // Mobile
    const mobile = val('mobile');
    if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) {
      showError('mobile', 'mobileError');
      valid = false;
    }

    // Address
    if (!val('address') || val('address').length < 5) {
      showError('address', 'addressError');
      valid = false;
    }

    // City
    if (!val('city')) {
      showError('city', 'cityError');
      valid = false;
    }

    // District
    if (!val('district')) {
      showError('district', 'districtError');
      valid = false;
    }

    // Parent Name
    if (!val('parentName') || val('parentName').length < 2) {
      showError('parentName', 'parentNameError');
      valid = false;
    }

    // Parent Mobile
    const parentMobile = val('parentMobile');
    if (!parentMobile || !/^[6-9]\d{9}$/.test(parentMobile)) {
      showError('parentMobile', 'parentMobileError');
      valid = false;
    }

    if (!valid) {
      showToast('Please fill all required fields correctly.', 'error');
      scrollToFirstError();
    }

    return valid;
  }

  function validateStep2() {
    let valid = true;

    // Performance Language
    if (!val('perfLanguage')) {
      showError('perfLanguage', 'perfLanguageError');
      valid = false;
    }

    // Declarations
    const d1 = document.getElementById('declareAccuracy');
    const d2 = document.getElementById('declareParent');
    const decl1Box = d1 ? d1.closest('.reg-declaration') : null;
    const decl2Box = d2 ? d2.closest('.reg-declaration') : null;

    if (!d1 || !d1.checked || !d2 || !d2.checked) {
      const errEl = document.getElementById('declarationError');
      if (errEl) errEl.classList.add('show');
      if (decl1Box && !d1.checked) decl1Box.classList.add('has-error');
      if (decl2Box && !d2.checked) decl2Box.classList.add('has-error');
      valid = false;
      showToast('Please tick both declaration checkboxes (✓) to proceed.', 'error');
    }

    if (!valid) {
      scrollToFirstError();
    }

    return valid;
  }

  // ===== AGE CALCULATION =====
  function calculateAge(birthDate, referenceDate) {
    let age = referenceDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = referenceDate.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  // ===== FORM EVENTS =====
  function initFormEvents() {
    // Auto-calculate age on DOB change
    const dobInput = document.getElementById('dob');
    if (dobInput) {
      dobInput.addEventListener('change', () => {
        const dob = dobInput.value;
        if (dob) {
          const age = calculateAge(new Date(dob), CONFIG.COMPETITION_DATE);
          const ageDisplay = document.getElementById('ageDisplay');
          if (ageDisplay) {
            if (age >= CONFIG.MIN_AGE && age <= CONFIG.MAX_AGE) {
              ageDisplay.textContent = `Age on competition date: ${age} years ✓`;
              ageDisplay.style.color = 'var(--green-success)';
            } else {
              ageDisplay.textContent = `Age ${age} — not eligible (must be ${CONFIG.MIN_AGE}–${CONFIG.MAX_AGE})`;
              ageDisplay.style.color = 'var(--red-accent)';
            }
          }
        }
      });
    }

    // Clear errors on input
    document.querySelectorAll('.reg-form-group input, .reg-form-group select, .reg-form-group textarea').forEach(el => {
      el.addEventListener('input', () => {
        el.classList.remove('error');
        const errEl = el.parentElement.querySelector('.field-error');
        if (errEl) errEl.classList.remove('show');
      });
    });

    // Declaration checkboxes interactive styling & error removal
    ['declareAccuracy', 'declareParent'].forEach(id => {
      const cb = document.getElementById(id);
      if (cb) {
        cb.addEventListener('change', () => {
          const parentBox = cb.closest('.reg-declaration');
          if (parentBox) {
            parentBox.classList.toggle('is-checked', cb.checked);
            parentBox.classList.remove('has-error');
          }
          const d1 = document.getElementById('declareAccuracy');
          const d2 = document.getElementById('declareParent');
          if (d1 && d1.checked && d2 && d2.checked) {
            const errEl = document.getElementById('declarationError');
            if (errEl) errEl.classList.remove('show');
          }
        });
      }
    });
  }

  // ===== FILE UPLOADS =====
  function initFileUploads() {
    setupFileUpload('photoUpload', 'photoPreview', 'photoUploadArea', 2 * 1024 * 1024);
    setupFileUpload('screenshotUpload', 'screenshotPreview', 'screenshotUploadArea', 3 * 1024 * 1024);
  }

  let uploadedFiles = { photo: '', screenshot: '' };

  function setupFileUpload(inputId, previewId, areaId, maxSize) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    const area = document.getElementById(areaId);

    if (!input) return;

    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Validate file size
      if (file.size > maxSize) {
        showToast(`File too large. Maximum ${Math.round(maxSize / 1024 / 1024)}MB allowed.`, 'error');
        input.value = '';
        return;
      }

      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        showToast('Only JPG, PNG, and WebP images are accepted.', 'error');
        input.value = '';
        return;
      }

      // Show preview & store Base64
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target.result;
        if (inputId === 'photoUpload') {
          uploadedFiles.photo = base64;
          if (formData) formData.photoBase64 = base64;
        } else if (inputId === 'screenshotUpload') {
          uploadedFiles.screenshot = base64;
          if (formData) formData.screenshotBase64 = base64;
        }

        if (preview) {
          preview.src = base64;
          preview.style.display = 'block';
        }
        if (area) area.classList.add('has-file');
      };
      reader.readAsDataURL(file);
    });
  }

  // ===== AADHAAR TOGGLE =====
  function initAadhaarToggle() {
    const section = document.getElementById('aadhaarSection');
    const input = document.getElementById('aadhaar');
    if (CONFIG.AADHAAR_ENABLED) {
      if (section) section.style.display = 'block';
      if (input) input.disabled = false;
    }
  }

  // ===== UPI QR CODE GENERATION =====
  function generateUPIQr() {
    const canvas = document.getElementById('upiQrCanvas');
    const displayId = document.getElementById('displayUpiId');

    if (displayId) displayId.textContent = CONFIG.UPI_ID;

    if (canvas && typeof QRCode !== 'undefined') {
      const upiString = `upi://pay?pa=${encodeURIComponent(CONFIG.UPI_ID)}&pn=${encodeURIComponent(CONFIG.UPI_PAYEE)}&am=${CONFIG.UPI_AMOUNT}&cu=INR&tn=${encodeURIComponent('Registration Fee - ' + CONFIG.EVENT_NAME)}`;

      QRCode.toCanvas(canvas, upiString, {
        width: 196,
        margin: 0,
        color: { dark: '#000000', light: '#FFFFFF' }
      }, (error) => {
        if (error) console.error('QR generation failed:', error);
      });
    } else {
      // Retry after library loads
      setTimeout(generateUPIQr, 500);
    }
  }

  window.copyUpiId = function () {
    navigator.clipboard.writeText(CONFIG.UPI_ID).then(() => {
      showToast('UPI ID copied to clipboard!', 'success');
    }).catch(() => {
      // Fallback
      const temp = document.createElement('textarea');
      temp.value = CONFIG.UPI_ID;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      document.body.removeChild(temp);
      showToast('UPI ID copied!', 'success');
    });
  };

  // ===== BUILD REVIEW SUMMARY =====
  function buildReviewSummary() {
    const container = document.getElementById('reviewSummary');
    if (!container) return;

    const dob = val('dob');
    const age = dob ? calculateAge(new Date(dob), CONFIG.COMPETITION_DATE) : '—';

    const rows = [
      ['Participant Name', val('fullName')],
      ['Date of Birth', dob ? formatDate(new Date(dob)) : '—'],
      ['Age (on competition date)', age + ' years'],
      ['Gender', val('gender')],
      ['Mobile', val('mobile')],
      ['Address', val('address')],
      ['City / Taluk', val('city')],
      ['District', val('district')],
      ['Parent / Guardian', val('parentName')],
      ['Parent Mobile', val('parentMobile')],
      ['Competition', val('competitionName')],
      ['Category', val('category') || 'Solo'],
      ['Performance Language', val('perfLanguage')],
      ['Song Title', val('songTitle') || '— Not specified —'],
      ['Registration Fee', '₹' + CONFIG.UPI_AMOUNT],
    ];

    container.innerHTML = rows.map(([label, value]) =>
      `<div class="detail-row">
        <span class="detail-label">${label}</span>
        <span class="detail-value">${escapeHtml(value || '—')}</span>
      </div>`
    ).join('');
  }

  // ===== SUBMISSION =====
  window.submitRegistration = function () {
    if (isSubmitting) return;

    // Check for duplicate submission
    const prevId = sessionStorage.getItem(CONFIG.SUBMISSION_KEY);
    if (prevId) {
      showToast('You have already submitted a registration in this session.', 'warning');
      return;
    }

    isSubmitting = true;
    showLoading('Submitting your registration...');
    disableButton('submitBtn');

    // Generate Registration ID locally
    registrationId = generateRegId();

    // Collect form data
    const dob = val('dob');
    formData = {
      registrationId: registrationId,
      fullName: val('fullName'),
      dob: dob,
      age: dob ? calculateAge(new Date(dob), CONFIG.COMPETITION_DATE) : '',
      gender: val('gender'),
      mobile: val('mobile'),
      address: val('address'),
      city: val('city'),
      district: val('district'),
      parentName: val('parentName'),
      parentMobile: val('parentMobile'),
      competitionName: val('competitionName'),
      category: val('category') || 'Solo',
      perfLanguage: val('perfLanguage'),
      songTitle: val('songTitle') || '',
      photoBase64: uploadedFiles.photo || '',
      registrationDate: new Date().toISOString(),
      paymentStatus: 'PENDING',
      utrNumber: '',
      amountPaid: CONFIG.UPI_AMOUNT,
    };

    // Attempt to send to Google Apps Script
    if (CONFIG.APPS_SCRIPT_URL) {
      submitToBackend(formData);
    } else {
      // No backend configured — save locally and proceed
      console.warn('No Apps Script URL configured. Registration saved locally only.');
      saveLocally(formData);
      onSubmissionSuccess();
    }
  };

  function submitToBackend(data) {
    fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'register', data: data })
    })
      .then(res => res.json())
      .then(res => {
        if (res && res.success) {
          if (res.registrationId) data.registrationId = res.registrationId;
          if (res.serialNumber) data.serialNumber = res.serialNumber;
          if (res.accessToken) data.accessToken = res.accessToken;
          saveLocally(data);
          onSubmissionSuccess();
        } else {
          hideLoading();
          isSubmitting = false;
          showToast(res.error || 'Registration failed.', 'error');
          const submitBtn = document.getElementById('submitBtn');
          if (submitBtn) submitBtn.disabled = false;
        }
      })
      .catch((error) => {
        console.error('Submission error:', error);
        saveLocally(data);
        onSubmissionSuccess();
        showToast('Registration saved locally. Backend sync pending.', 'warning');
      });
  }

  function onSubmissionSuccess() {
    isSubmitting = false;
    hideLoading();

    // Mark as submitted to prevent duplicates
    sessionStorage.setItem(CONFIG.SUBMISSION_KEY, registrationId);

    // Set the registration ID in payment step
    const payRegId = document.getElementById('paymentRegId');
    if (payRegId) payRegId.textContent = registrationId;

    // Move to payment step
    goToStep(4);

    showToast('Registration submitted successfully! Now complete payment.', 'success');
  }

  // ===== COMPLETE PAYMENT =====
  window.completePayment = function () {
    if (isSubmitting) return;

    // Validate UTR
    const utr = val('utrNumber');
    if (!utr || utr.length < 6) {
      showError('utrNumber', 'utrError');
      showToast('Please enter a valid UPI Transaction ID / UTR number.', 'error');
      return;
    }

    isSubmitting = true;
    showLoading('Saving payment details...');
    disableButton('completePaymentBtn');

    // Update form data
    formData.utrNumber = utr;
    formData.paymentStatus = 'PENDING VERIFICATION';

    // Handle screenshot
    const screenshotInput = document.getElementById('screenshotUpload');
    let screenshotBase64 = '';
    if (screenshotInput && screenshotInput.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        screenshotBase64 = e.target.result;
        formData.screenshotBase64 = screenshotBase64;
        finishPayment();
      };
      reader.readAsDataURL(screenshotInput.files[0]);
    } else {
      finishPayment();
    }
  };

  function finishPayment() {
    // Update in backend
    if (CONFIG.APPS_SCRIPT_URL) {
      fetch(CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'updatePayment',
          data: {
            registrationId: formData.registrationId,
            utrNumber: formData.utrNumber,
            paymentStatus: formData.paymentStatus,
            screenshotBase64: formData.screenshotBase64 || uploadedFiles.screenshot || '',
          }
        })
      }).catch(err => console.error('Payment update error:', err));
    }

    // Update local
    saveLocally(formData);

    isSubmitting = false;
    hideLoading();

    // Redirect to success page
    const params = new URLSearchParams({
      regId: formData.registrationId,
      name: formData.fullName,
      status: 'PENDING VERIFICATION'
    });
    window.location.href = 'registration-success.html?' + params.toString();
  }

  // ===== REGISTRATION ID GENERATION =====
  function generateRegId() {
    const prefix = 'BU26';
    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return prefix + '-' + timestamp + random;
  }

  // ===== LOCAL STORAGE =====
  function saveLocally(data) {
    try {
      const existing = JSON.parse(localStorage.getItem('bidari_registrations') || '[]');
      const idx = existing.findIndex(r => r.registrationId === data.registrationId);
      if (idx >= 0) {
        existing[idx] = data;
      } else {
        existing.push(data);
      }
      localStorage.setItem('bidari_registrations', JSON.stringify(existing));

      // Also save current registration for quick access
      localStorage.setItem('bidari_current_reg', JSON.stringify(data));
    } catch (e) {
      console.error('LocalStorage save error:', e);
    }
  }

  function getLocalRegistration(regId) {
    try {
      const existing = JSON.parse(localStorage.getItem('bidari_registrations') || '[]');
      return existing.find(r => r.registrationId === regId) || null;
    } catch (e) {
      return null;
    }
  }

  // Make available globally for other scripts
  window.BidariReg = {
    CONFIG,
    getLocalRegistration,
    calculateAge,
    generateRegId,
    formatDate,
    escapeHtml,
  };

  // ===== UTILITY FUNCTIONS =====
  function val(id) {
    const el = document.getElementById(id);
    if (!el) return '';
    return (el.value || '').trim();
  }

  function showError(inputId, errorId) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);
    if (input) input.classList.add('error');
    if (error) error.classList.add('show');
  }

  function clearErrors() {
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.field-error.show').forEach(el => el.classList.remove('show'));
  }

  function scrollToFirstError() {
    const first = document.querySelector('.error, .field-error.show, .reg-declaration.has-error');
    if (first) {
      const yOffset = -120; // Offset to keep clear of floating navbar
      const y = first.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }

  function showLoading(text) {
    const overlay = document.getElementById('loadingOverlay');
    const textEl = document.getElementById('loadingText');
    if (overlay) overlay.classList.add('show');
    if (textEl) textEl.textContent = text || 'Processing...';
  }

  function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('show');
  }

  function showToast(message, type) {
    const toast = document.getElementById('regToast');
    const icon = document.getElementById('toastIcon');
    const msg = document.getElementById('toastMessage');

    if (!toast) return;

    toast.className = 'reg-toast';
    toast.classList.add(type || 'success');

    if (icon) {
      icon.textContent = type === 'error' ? '✕' : type === 'warning' ? '⚠' : '✓';
    }
    if (msg) msg.textContent = message;

    // Show
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Auto-hide
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => { toast.style.display = 'none'; }, 300);
    }, 4000);
  }

  function disableButton(id) {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = true;
  }

  function formatDate(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return date.getDate() + ' ' + months[date.getMonth()] + ' ' + date.getFullYear();
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

})();


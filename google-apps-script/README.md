# BIDARI UTSAV 2026 – GOOGLE APPS SCRIPT BACKEND & ADMIN SETUP

This document provides complete instructions for setting up, configuring, deploying, and testing the Google Apps Script backend and Admin Management System for **Bidari Utsav 2026**.

---

## 1. Create Google Spreadsheet Database

1. Open [Google Sheets](https://sheets.new) in your web browser.
2. Rename the spreadsheet to exactly:
   ```
   BIDARI UTSAV 2026 – REGISTRATION DATABASE
   ```
3. Copy the **Spreadsheet ID** from the address bar URL:
   ```
   https://docs.google.com/spreadsheets/d/[THIS_IS_THE_SPREADSHEET_ID]/edit
   ```

---

## 2. Create Google Drive Document Folders

1. Open [Google Drive](https://drive.google.com).
2. Create a main parent folder:
   ```
   Bidari Utsav 2026 Documents
   ```
3. Open the folder and copy its **Folder ID** from the address bar:
   ```
   https://drive.google.com/drive/folders/[THIS_IS_THE_DRIVE_FOLDER_ID]
   ```
4. *(Optional)* The backend will automatically create subfolders inside it:
   - `Payment Proofs` (for uploaded UPI screenshots)
   - `Participant Photos` (for applicant portraits)
   - `Acknowledgements` (for registration acknowledgement PDFs)
   - `Receipts` (for verified official payment receipt PDFs)
   - `Event Passes` (for provisional and confirmed gate passes)

---

## 3. Install Backend Code in Google Apps Script

1. In your new Google Spreadsheet, click **Extensions** > **Apps Script**.
2. Erase any default code in `Code.gs`.
3. Open [`Code.gs`](./Code.gs) from this project folder, select all, and paste it into the editor.
4. Configure Script Properties:
   - In the Apps Script left sidebar, click **Project Settings** (gear icon ⚙️).
   - Scroll down to **Script Properties** and click **Edit script properties** > **Add script property**:
     - `SPREADSHEET_ID`: Paste your Google Spreadsheet ID.
     - `DRIVE_FOLDER_ID`: Paste your Google Drive Folder ID.
     - `ADMIN_SECRET_KEY`: Set your private administrative password (e.g. `bidari2026admin` or a secure passphrase).
   - Click **Save script properties**.

---

## 4. Initialize Database Schema

1. Return to the Apps Script editor (`< > Code`).
2. In the top toolbar, select `setupDatabase` from the function dropdown.
3. Click **Run**.
4. Review and grant Google authorization permissions when prompted.
5. Check your Google Sheet:
   All **6 tabs** are automatically created with frozen dark-teal headers:
   - 📋 **Participants** (27 header-mapped columns)
   - 💳 **Payments** (Payment records, verification timestamp, admin remarks)
   - 🏆 **Competitions** (Sugama Sangeeta Gayana Spardhe initialized)
   - 🎫 **Attendance** (Gate check-in timestamps and staff identity)
   - ⚙️ **Settings** (Event dates, venue, UPI configuration, allowlist)
   - 🛡️ **Admin Logs** (Full administrative audit trail)
6. *Note:* Re-running `setupDatabase` is completely safe and will **never erase** existing registrations.

---

## 5. Configure Admin Email Allowlist & Settings

1. Open the **Settings** tab in your Google Sheet.
2. In the row for `ADMIN_EMAIL_ALLOWLIST`, enter your authorized Google accounts (comma-separated):
   ```
   bidarivedike@gmail.com, yourname@gmail.com
   ```
3. Ensure the UPI details are accurate:
   - `UPI_ID`: `bidarivedike@upi` (or your actual receiving merchant/bank VPA)
   - `UPI_PAYEE_NAME`: `Bidar Jilleya Samskruthika Vedike`
   - `REGISTRATION_FEE`: `200`
   - `VENUE`: `Sri ChannaBasava PattaDevaR Rang Mandir, Bidar - 585401`

---

## 6. Deploy as Web App

1. In Google Apps Script, click the blue **Deploy** button (top right) > **New deployment**.
2. Click the gear icon ⚙️ next to "Select type" and choose **Web app**.
3. Configure the deployment parameters:
   - **Description**: `Bidari Utsav 2026 Production API v1`
   - **Execute as**: `Me (your Google email)`
   - **Who has access**: `Anyone` *(Essential so public participants can register without Google authentication)*
4. Click **Deploy**.
5. Copy the generated **Web App URL**:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

---

## 7. Connect Frontend Website

1. Open [`assets/js/registration.js`](../assets/js/registration.js) in your website codebase.
2. Set `APPS_SCRIPT_URL` on line 13:
   ```javascript
   const CONFIG = {
     APPS_SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_ACTUAL_DEPLOYMENT_URL/exec',
     ...
   };
   ```
3. Save the file. All pages (`registration.html`, `registration-download.html`, `admin.html`, `attendance.html`) are now live and connected!

---

## 8. Verification & End-to-End Testing Checklist

| Step | Action | Expected Result |
| :--- | :--- | :--- |
| **1. Registration Test** | Open `registration.html`, fill in test details (Age 18), and advance steps. | Age calculates automatically; validates 16–20 years. |
| **2. UPI Submission** | Review summary, submit form, view dynamic ₹200 UPI QR, enter sample UTR (`123456789012`). | Form advances to `registration-success.html` with unique ID (`BU26-XXXX`) and status `PENDING VERIFICATION`. |
| **3. Database Entry** | Check Google Sheet `Participants` tab. | New row created with status `PENDING VERIFICATION`, auto-incremented serial number, and private access token. Acknowledgement and Provisional Pass PDFs appear in Drive. |
| **4. Admin Portal Login** | Open `admin.html` and log in with your email / `ADMIN_SECRET_KEY`. | Metric cards update immediately. Pending payment appears in the "Verify Payments" queue. |
| **5. Manual Payment Approval** | In `admin.html` under "Verify Payments", click **Approve Payment**. | Admin verifies bank statement; backend checks for duplicate UTRs; updates status to `CONFIRMED`; generates official **Payment Receipt PDF** and **Confirmed Pass PDF**. Action logged in `Admin Logs`. |
| **6. Participant Re-Download** | Open `registration-download.html`, enter Registration ID and mobile number. | Status shows **CONFIRMED**; participant can download updated official receipt and confirmed pass. |
| **7. Rejection & Resubmission** | If payment is rejected in Admin Dashboard with remarks: | Participant sees rejection reason on download portal and gets a form to resubmit corrected UTR **without creating a duplicate registration**. |
| **8. Event Day QR Check-In** | Open `attendance.html` or the Gate Scanner in `admin.html`, scan pass or enter ID. | Pass verifies immediately: displays green checkmark, logs attendance timestamp and staff email in `Attendance` tab, and blocks duplicate entry attempts. |

---

## 9. Security & Architecture Guarantees

- **No Public Sheet Exposing:** Google Spreadsheet is private to organizers.
- **Secure Document Streaming:** PDFs are retrieved through `?action=downloadPdf` using unique private access tokens; Google Drive remains private.
- **Strict Verification Guard:** Gates reject unverified passes unless authorized staff explicitly enters an override reason.
- **Anti-Duplicate Engine:** UTRs cannot be credited to more than one participant.

/**
 * BIDARI UTSAV 2026 - CLIENT-SIDE PDF & PRINTABLE DOCUMENT ENGINE
 * Generates:
 * 1. Official Registration Acknowledgement Receipt
 * 2. Participant Event Pass (Provisional / Confirmed)
 * Uses jsPDF library (with fallback to high-fidelity printable view)
 */

(function (window) {
    'use strict';

    const PdfEngine = {
        /**
         * Generate Registration Acknowledgement Receipt
         * @param {Object} data Registration record
         */
        async generateReceipt(data) {
            // Check if jsPDF is available
            if (window.jspdf && window.jspdf.jsPDF) {
                return this._generateReceiptJsPDF(data);
            } else {
                return this._generatePrintableView(data, 'RECEIPT');
            }
        },

        /**
         * Generate Participant Event Pass (Provisional or Confirmed)
         * @param {Object} data Registration record
         */
        async generatePass(data) {
            if (window.jspdf && window.jspdf.jsPDF) {
                return this._generatePassJsPDF(data);
            } else {
                return this._generatePrintableView(data, 'PASS');
            }
        },

        /**
         * Helper to generate QR data URL
         */
        async getQrDataUrl(text) {
            return new Promise((resolve) => {
                if (window.QRCode && typeof window.QRCode.toDataURL === 'function') {
                    window.QRCode.toDataURL(text, { width: 140, margin: 1 }, (err, url) => {
                        if (!err && url) resolve(url);
                        else resolve(null);
                    });
                } else {
                    resolve(null);
                }
            });
        },

        /**
         * jsPDF Implementation for Acknowledgement Receipt
         */
        async _generateReceiptJsPDF(data) {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const primaryTeal = [0, 91, 85];      // #005B55
            const goldColor = [212, 175, 55];     // #D4AF37
            const textDark = [30, 41, 59];
            const mutedText = [100, 116, 139];
            const redAccent = [229, 57, 53];
            const warningBg = [254, 243, 199];

            // Outer decorative border
            doc.setDrawColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
            doc.setLineWidth(1.2);
            doc.rect(8, 8, 194, 281);

            doc.setDrawColor(goldColor[0], goldColor[1], goldColor[2]);
            doc.setLineWidth(0.4);
            doc.rect(10, 10, 190, 277);

            // Top Header Bar
            doc.setFillColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
            doc.rect(10, 10, 190, 36, 'F');

            // Header Texts
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.text('BIDARI UTSAV 2026', 105, 22, { align: 'center' });

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('Bidar Jilleya Samskruthika Vedike (R.) | Annual Cultural Summit', 105, 28, { align: 'center' });
            doc.setFontSize(9);
            doc.text('Sri ChannaBasava PattaDevaR Rang Mandir, Bidar, Karnataka - 585401', 105, 34, { align: 'center' });

            // Title Ribbon
            doc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
            doc.rect(20, 50, 170, 10, 'F');
            doc.setTextColor(11, 12, 16);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text('REGISTRATION ACKNOWLEDGEMENT RECEIPT', 105, 56.5, { align: 'center' });

            // Status Banner (Pending or Verified)
            const isPaid = (data.paymentStatus || '').toUpperCase() === 'PAID' || (data.paymentStatus || '').toUpperCase() === 'CONFIRMED';
            if (isPaid) {
                doc.setFillColor(220, 252, 231);
                doc.setDrawColor(22, 163, 74);
                doc.rect(20, 64, 170, 9, 'FD');
                doc.setTextColor(22, 163, 74);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.text('PAYMENT STATUS: CONFIRMED & APPROVED', 105, 70, { align: 'center' });
            } else {
                doc.setFillColor(warningBg[0], warningBg[1], warningBg[2]);
                doc.setDrawColor(245, 158, 11);
                doc.rect(20, 64, 170, 9, 'FD');
                doc.setTextColor(180, 83, 9);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.text('PAYMENT STATUS: PENDING VERIFICATION (MANUAL UPI CHECK IN PROGRESS)', 105, 70, { align: 'center' });
            }

            // Key Identification Box
            let y = 82;
            doc.setDrawColor(203, 213, 225);
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(20, y, 170, 24, 2, 2, 'FD');

            doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text('REGISTRATION ID', 26, y + 8);
            doc.text('SUBMISSION DATE & TIME', 110, y + 8);

            doc.setTextColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.text(data.registrationId || 'BU26-PENDING', 26, y + 17);

            doc.setTextColor(textDark[0], textDark[1], textDark[2]);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            const regDateStr = data.registrationDate ? new Date(data.registrationDate).toLocaleString('en-IN') : new Date().toLocaleString('en-IN');
            doc.text(regDateStr, 110, y + 17);

            // Table Grid: Participant Details
            y = 114;
            doc.setFontSize(11);
            doc.setTextColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
            doc.setFont('helvetica', 'bold');
            doc.text('Participant Details', 20, y);
            doc.setDrawColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
            doc.line(20, y + 2, 190, y + 2);

            const details = [
                ['Full Name', data.fullName || '-'],
                ['Date of Birth / Age', `${data.dob || '-'} (${data.age || '-'} Years)`],
                ['Gender', data.gender || '-'],
                ['Mobile Number', data.mobile || '-'],
                ['City / Taluk & District', `${data.city || '-'}, ${data.district || '-'}`],
                ['Parent / Guardian Name', data.parentName || '-'],
                ['Parent Mobile Number', data.parentMobile || '-'],
                ['Competition Name', data.competitionName || 'Sugama Sangeeta Gayana Spardhe'],
                ['Category & Language', `${data.category || 'Solo'} | ${data.perfLanguage || 'Kannada'}`],
                ['Registration Fee Amount', 'Rs. 200 (Two Hundred Rupees Only)'],
                ['UPI Reference / UTR', data.utrNumber || 'Submitted for verification']
            ];

            let rowY = y + 8;
            details.forEach(([lbl, val], idx) => {
                if (idx % 2 === 0) {
                    doc.setFillColor(248, 250, 252);
                    doc.rect(20, rowY - 4, 170, 7.5, 'F');
                }
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(71, 85, 105);
                doc.text(lbl, 24, rowY + 1);

                doc.setFont('helvetica', 'normal');
                doc.setTextColor(textDark[0], textDark[1], textDark[2]);
                doc.text(String(val), 80, rowY + 1);
                rowY += 7.5;
            });

            // QR Code for verification
            const qrPayload = JSON.stringify({
                app: 'BidariUtsav2026',
                id: data.registrationId,
                name: data.fullName,
                cat: data.competitionName,
                status: data.paymentStatus
            });
            const qrUrl = await this.getQrDataUrl(qrPayload);
            if (qrUrl) {
                try {
                    doc.addImage(qrUrl, 'PNG', 145, 198, 42, 42);
                    doc.setFontSize(7.5);
                    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
                    doc.text('Scan for Verification', 166, 243, { align: 'center' });
                } catch (e) {
                    console.warn('QR addImage failed', e);
                }
            }

            // Important Disclaimer Box
            doc.setDrawColor(229, 57, 53);
            doc.setFillColor(254, 242, 242);
            doc.roundedRect(20, 202, 120, 36, 1.5, 1.5, 'FD');

            doc.setTextColor(redAccent[0], redAccent[1], redAccent[2]);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.text('IMPORTANT DISCLAIMER / ಪ್ರಮುಖ ಸೂಚನೆ:', 24, 208);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(127, 29, 29);
            doc.setFontSize(8);
            const notes = [
                '1. This acknowledgement is NOT proof of verified payment or confirmed entry.',
                '2. Final confirmation is subject to manual verification against organizer bank records.',
                '3. Check status online anytime with Registration ID and Mobile Number.',
                '4. For any questions, contact organizers at: 9986138457 / 9481294296.'
            ];
            notes.forEach((nt, idx) => {
                doc.text(nt, 24, 215 + (idx * 5));
            });

            // Footer / Signatures
            doc.setDrawColor(203, 213, 225);
            doc.line(20, 260, 190, 260);

            doc.setFontSize(8);
            doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
            doc.text('System Generated Document - Bidar Jilleya Samskruthika Vedike', 20, 266);
            doc.text('President / General Secretary Signature', 190, 266, { align: 'right' });

            doc.save(`BidariUtsav2026_Acknowledgement_${data.registrationId || 'BU26'}.pdf`);
        },

        /**
         * jsPDF Implementation for Event Pass (Provisional / Confirmed)
         */
        async _generatePassJsPDF(data) {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: [148, 105] // A6 Landscape size for pass / badge
            });

            const isConfirmed = (data.paymentStatus || '').toUpperCase() === 'CONFIRMED' || (data.paymentStatus || '').toUpperCase() === 'PAID';
            const primaryTeal = [0, 91, 85];
            const goldColor = [212, 175, 55];

            // Background card
            doc.setFillColor(11, 12, 16);
            doc.rect(0, 0, 148, 105, 'F');

            // Borders
            doc.setDrawColor(goldColor[0], goldColor[1], goldColor[2]);
            doc.setLineWidth(0.8);
            doc.rect(3, 3, 142, 99);

            // Header Banner
            doc.setFillColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
            doc.rect(4, 4, 140, 22, 'F');

            doc.setTextColor(212, 175, 55);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.text('BIDARI UTSAV 2026', 74, 12, { align: 'center' });

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text('Bidar Jilleya Samskruthika Vedike | ಸುಗಮ ಸಂಗೀತ ಗಾಯನ ಸ್ಪರ್ಧೆ', 74, 17, { align: 'center' });

            // Pass Type Badge
            if (isConfirmed) {
                doc.setFillColor(22, 163, 74);
                doc.roundedRect(44, 21, 60, 6, 2, 2, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.text('CONFIRMED ENTRY PASS', 74, 25.5, { align: 'center' });
            } else {
                doc.setFillColor(217, 119, 6);
                doc.roundedRect(40, 21, 68, 6, 2, 2, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.5);
                doc.text('PROVISIONAL PASS (PENDING VERIFICATION)', 74, 25.5, { align: 'center' });
            }

            // Left Column: Details
            doc.setTextColor(212, 175, 55);
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'bold');
            doc.text('PARTICIPANT NAME', 12, 36);

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(12);
            doc.text(data.fullName || 'Participant', 12, 42);

            doc.setTextColor(154, 160, 174);
            doc.setFontSize(7.5);
            doc.text(`Age: ${data.age || '-'} Years  |  Gender: ${data.gender || '-'}`, 12, 47);

            doc.setTextColor(212, 175, 55);
            doc.text('COMPETITION', 12, 55);
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);
            doc.text(data.competitionName || 'Sugama Sangeeta Gayana Spardhe', 12, 60);

            doc.setTextColor(154, 160, 174);
            doc.setFontSize(7.5);
            doc.text(`Category: ${data.category || 'Solo'} | Lang: ${data.perfLanguage || 'Kannada'}`, 12, 65);

            doc.setTextColor(212, 175, 55);
            doc.text('DATES & SCHEDULE', 12, 73);
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8);
            doc.text('12 & 13 December 2026 (Reporting 11-12-2026 9:00 AM)', 12, 78);

            doc.setTextColor(154, 160, 174);
            doc.setFontSize(7);
            doc.text('Venue: Sri ChannaBasava PattaDevaR Rang Mandir, Bidar', 12, 83);

            // Right Box: Registration ID & QR
            doc.setFillColor(20, 22, 29);
            doc.setDrawColor(212, 175, 55);
            doc.roundedRect(100, 32, 42, 60, 2, 2, 'FD');

            doc.setTextColor(212, 175, 55);
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'bold');
            doc.text('PASS ID', 121, 38, { align: 'center' });

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8.5);
            doc.text(data.registrationId || 'BU26-PEND', 121, 43, { align: 'center' });

            // Pass QR
            const passQrPayload = JSON.stringify({
                app: 'BidariUtsav2026Pass',
                id: data.registrationId,
                name: data.fullName,
                status: isConfirmed ? 'CONFIRMED' : 'PROVISIONAL'
            });
            const qrUrl = await this.getQrDataUrl(passQrPayload);
            if (qrUrl) {
                try {
                    doc.addImage(qrUrl, 'PNG', 104, 46, 34, 34);
                } catch (e) {
                    console.warn(e);
                }
            }

            doc.setTextColor(154, 160, 174);
            doc.setFontSize(6.5);
            doc.text('Carry Valid Govt ID Proof', 121, 84, { align: 'center' });
            doc.text('Helpline: 9986138457', 121, 88, { align: 'center' });

            // Bottom Ribbon
            doc.setFillColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
            doc.rect(4, 94, 140, 8, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(6.5);
            doc.text('This pass is non-transferable. Present at the gate for entry verification.', 74, 99, { align: 'center' });

            const fileSuffix = isConfirmed ? 'ConfirmedPass' : 'ProvisionalPass';
            doc.save(`BidariUtsav2026_${fileSuffix}_${data.registrationId || 'BU26'}.pdf`);
        },

        /**
         * Fallback printable window view if jsPDF library is not available or user triggers direct print
         */
        _generatePrintableView(data, type) {
            const isReceipt = type === 'RECEIPT';
            const isConfirmed = (data.paymentStatus || '').toUpperCase() === 'CONFIRMED' || (data.paymentStatus || '').toUpperCase() === 'PAID';
            const title = isReceipt ? 'Registration Acknowledgement Receipt' : (isConfirmed ? 'Confirmed Participant Pass' : 'Provisional Participant Pass');

            const printWin = window.open('', '_blank', 'width=800,height=900');
            if (!printWin) {
                alert('Pop-up blocked! Please allow pop-ups to print/download documents.');
                return;
            }

            const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${title} - ${data.registrationId || ''}</title>
                <meta charset="utf-8">
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
                        color: #1e293b;
                        margin: 0;
                        padding: 24px;
                        background: #f8fafc;
                    }
                    .sheet {
                        background: #fff;
                        max-width: 720px;
                        margin: 0 auto;
                        border: 2px solid #005B55;
                        padding: 32px;
                        box-shadow: 0 4px 16px rgba(0,0,0,0.08);
                    }
                    .header {
                        text-align: center;
                        background: #005B55;
                        color: #fff;
                        padding: 16px;
                        margin: -32px -32px 24px -32px;
                    }
                    .header h1 { margin: 0; font-size: 24px; letter-spacing: 0.05em; color: #D4AF37; }
                    .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.9; }
                    .badge {
                        display: inline-block;
                        padding: 6px 16px;
                        border-radius: 9999px;
                        font-weight: bold;
                        font-size: 13px;
                        margin: 8px 0 16px;
                    }
                    .badge-pending { background: #fef3c7; color: #92400e; border: 1px solid #f59e0b; }
                    .badge-confirmed { background: #dcfce7; color: #166534; border: 1px solid #22c55e; }
                    .grid { width: 100%; border-collapse: collapse; margin-top: 16px; }
                    .grid th, .grid td {
                        padding: 10px 12px;
                        text-align: left;
                        border-bottom: 1px solid #e2e8f0;
                        font-size: 13.5px;
                    }
                    .grid th { color: #64748b; font-weight: 600; width: 38%; }
                    .grid td { color: #0f172a; font-weight: 500; }
                    .grid tr:nth-child(even) { background: #f8fafc; }
                    .disclaimer {
                        margin-top: 24px;
                        padding: 12px 16px;
                        background: #fef2f2;
                        border: 1px solid #ef4444;
                        border-radius: 6px;
                        font-size: 12px;
                        color: #991b1b;
                    }
                    .footer {
                        margin-top: 32px;
                        display: flex;
                        justify-content: space-between;
                        font-size: 12px;
                        color: #64748b;
                        border-top: 1px solid #cbd5e1;
                        padding-top: 12px;
                    }
                    @media print {
                        body { background: #fff; padding: 0; }
                        .sheet { border: 1px solid #000; box-shadow: none; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="sheet">
                    <div class="header">
                        <h1>BIDARI UTSAV 2026</h1>
                        <p>Bidar Jilleya Samskruthika Vedike | ಸುಗಮ ಸಂಗೀತ ಗಾಯನ ಸ್ಪರ್ಧೆ</p>
                        <p>Venue: Sri ChannaBasava PattaDevaR Rang Mandir, Bidar, Karnataka</p>
                    </div>

                    <div style="text-align:center;">
                        <h2>${title}</h2>
                        <div class="badge ${isConfirmed ? 'badge-confirmed' : 'badge-pending'}">
                            ${isConfirmed ? 'STATUS: CONFIRMED & APPROVED' : 'STATUS: PENDING VERIFICATION'}
                        </div>
                    </div>

                    <table class="grid">
                        <tr><th>Registration ID</th><td><strong style="color:#005B55; font-size:16px;">${data.registrationId || '-'}</strong></td></tr>
                        <tr><th>Participant Name</th><td>${data.fullName || '-'}</td></tr>
                        <tr><th>Date of Birth & Age</th><td>${data.dob || '-'} (${data.age || '-'} Years)</td></tr>
                        <tr><th>Gender</th><td>${data.gender || '-'}</td></tr>
                        <tr><th>Mobile Number</th><td>${data.mobile || '-'}</td></tr>
                        <tr><th>City & District</th><td>${data.city || '-'}, ${data.district || '-'}</td></tr>
                        <tr><th>Parent / Guardian</th><td>${data.parentName || '-'} (${data.parentMobile || '-'})</td></tr>
                        <tr><th>Competition</th><td>${data.competitionName || 'Sugama Sangeeta Gayana Spardhe'}</td></tr>
                        <tr><th>Category & Language</th><td>${data.category || 'Solo'} | ${data.perfLanguage || 'Kannada'}</td></tr>
                        <tr><th>Registration Fee</th><td>₹200 (Paid via UPI)</td></tr>
                        <tr><th>UPI Transaction Ref (UTR)</th><td>${data.utrNumber || 'Submitted'}</td></tr>
                        <tr><th>Date of Submission</th><td>${new Date().toLocaleString('en-IN')}</td></tr>
                    </table>

                    ${isReceipt ? `
                    <div class="disclaimer">
                        <strong>Important Notice:</strong> This receipt is provisional and does NOT constitute final proof of entry. Verification is performed manually against bank records. Keep your Registration ID safe for status checks.
                    </div>
                    ` : `
                    <div class="disclaimer">
                        <strong>Pass Notice:</strong> Present this pass along with a valid photo identity proof at the entrance. Reporting time: 11-12-2026 9:00 AM.
                    </div>
                    `}

                    <div class="footer">
                        <span>Bidari Utsav 2026 - Helpline: 9986138457 / 9481294296</span>
                        <span>Authorized Signatory</span>
                    </div>

                    <div class="no-print" style="margin-top:24px; text-align:center;">
                        <button onclick="window.print()" style="background:#005B55; color:#fff; border:none; padding:10px 24px; border-radius:9999px; font-weight:bold; cursor:pointer;">Print / Save as PDF</button>
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        // Auto-prompt print if needed
                    };
                </script>
            </body>
            </html>
            `;

            printWin.document.open();
            printWin.document.write(html);
            printWin.document.close();
        }
    };

    window.PdfEngine = PdfEngine;
})(window);


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
         * Helper to safely get image data URL from Base64 or URL
         */
        async _getImageDataUrl(src) {
            if (!src) return null;
            if (typeof src === 'string' && src.startsWith('data:image')) {
                return src;
            }
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.naturalWidth || img.width || 200;
                        canvas.height = img.naturalHeight || img.height || 250;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        resolve(canvas.toDataURL('image/jpeg', 0.92));
                    } catch (e) {
                        resolve(null);
                    }
                };
                img.onerror = () => resolve(null);
                img.src = src;
                setTimeout(() => resolve(null), 3500);
            });
        },

        /**
         * Helper to generate QR data URL with multiple fallbacks
         */
        async getQrDataUrl(text) {
            // Method 1: window.QRCode.toDataURL
            if (window.QRCode && typeof window.QRCode.toDataURL === 'function') {
                try {
                    const url = await new Promise((resolve) => {
                        window.QRCode.toDataURL(text, { width: 160, margin: 1, errorCorrectionLevel: 'M' }, (err, res) => {
                            if (!err && res) resolve(res);
                            else resolve(null);
                        });
                    });
                    if (url) return url;
                } catch (e) {
                    console.warn('QRCode.toDataURL failed:', e);
                }
            }

            // Method 2: window.QRCode.toCanvas
            if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
                try {
                    const canvas = document.createElement('canvas');
                    const url = await new Promise((resolve) => {
                        window.QRCode.toCanvas(canvas, text, { width: 160, margin: 1 }, (err) => {
                            if (!err) resolve(canvas.toDataURL('image/png'));
                            else resolve(null);
                        });
                    });
                    if (url) return url;
                } catch (e) {
                    console.warn('QRCode.toCanvas failed:', e);
                }
            }

            // Method 3: Online QR API
            try {
                const imgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(text)}`;
                const onlineQr = await this._getImageDataUrl(imgUrl);
                if (onlineQr) return onlineQr;
            } catch (e) {
                console.warn('Online QR fetch failed:', e);
            }

            return null;
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

            const pName = String(data.fullName || data.participantName || data.name || '-').trim();
            const pComp = String(data.competitionName || data.competition || 'Sugama Sangeeta Gayana Spardhe').trim();

            const details = [
                ['Full Name', pName],
                ['Date of Birth / Age', `${data.dob || '-'} (${data.age || '-'} Years)`],
                ['Gender', data.gender || '-'],
                ['Mobile Number', data.mobile || data.mobileNumber || '-'],
                ['City / Taluk & District', `${data.city || '-'}, ${data.district || '-'}`],
                ['Parent / Guardian Name', data.parentName || '-'],
                ['Parent Mobile Number', data.parentMobile || '-'],
                ['Competition Name', pComp],
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
                name: pName,
                cat: pComp,
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
            doc.text('IMPORTANT DISCLAIMER / PRAMUKHA SOOCHANE:', 24, 208);

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
            const pName = String(data.fullName || data.participantName || data.name || 'Participant').trim();
            const pComp = String(data.competitionName || data.competition || 'Sugama Sangeeta Gayana Spardhe').trim();
            const regId = String(data.registrationId || 'BU26-PEND').trim();

            // Background card
            doc.setFillColor(11, 12, 16);
            doc.rect(0, 0, 148, 105, 'F');

            // Borders
            doc.setDrawColor(goldColor[0], goldColor[1], goldColor[2]);
            doc.setLineWidth(0.8);
            doc.rect(3, 3, 142, 99);

            // Header Banner
            doc.setFillColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
            doc.rect(4, 4, 140, 20, 'F');

            doc.setTextColor(212, 175, 55);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.text('BIDARI UTSAV 2026', 74, 11, { align: 'center' });

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text('Bidar Jilleya Samskruthika Vedike | Sugama Sangeeta Gayana Spardhe', 74, 16.5, { align: 'center' });

            // Pass Type Badge
            if (isConfirmed) {
                doc.setFillColor(22, 163, 74);
                doc.roundedRect(44, 20.5, 60, 6, 2, 2, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.text('CONFIRMED ENTRY PASS', 74, 24.8, { align: 'center' });
            } else {
                doc.setFillColor(217, 119, 6);
                doc.roundedRect(40, 20.5, 68, 6, 2, 2, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.5);
                doc.text('PROVISIONAL PASS (PENDING VERIFICATION)', 74, 24.8, { align: 'center' });
            }

            // Left Section: Participant Photo (Box: x:8, y:29, w:25, h:32)
            doc.setFillColor(20, 24, 33);
            doc.setDrawColor(goldColor[0], goldColor[1], goldColor[2]);
            doc.setLineWidth(0.5);
            doc.roundedRect(8, 29, 25, 32, 1.5, 1.5, 'FD');

            const photoSrc = data.photoBase64 || data.photoUrl || data.photographUrl || '';
            let photoLoaded = false;
            if (photoSrc) {
                const photoDataUrl = await this._getImageDataUrl(photoSrc);
                if (photoDataUrl) {
                    try {
                        doc.addImage(photoDataUrl, 'JPEG', 8.5, 29.5, 24, 31);
                        photoLoaded = true;
                    } catch (err) {
                        console.warn('Pass photo render error:', err);
                    }
                }
            }

            if (!photoLoaded) {
                // Attractive avatar silhouette fallback
                doc.setFillColor(45, 55, 72);
                doc.circle(20.5, 40, 4.5, 'F');
                doc.roundedRect(13.5, 46, 14, 10, 3, 3, 'F');
                doc.setTextColor(212, 175, 55);
                doc.setFontSize(6.5);
                doc.setFont('helvetica', 'bold');
                doc.text('PHOTO', 20.5, 59, { align: 'center' });
            }

            // Participant Details (Adjacent to photo: x: 36)
            doc.setTextColor(212, 175, 55);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text('PARTICIPANT NAME', 36, 33);

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(pName.length > 20 ? 9.5 : 11);
            doc.text(pName, 36, 38.5);

            doc.setTextColor(154, 160, 174);
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'normal');
            doc.text(`Age: ${data.age || '-'} Years  |  Gender: ${data.gender || '-'}`, 36, 44);

            doc.setTextColor(212, 175, 55);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text('COMPETITION', 36, 50.5);

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8.5);
            doc.text(pComp, 36, 55);

            doc.setTextColor(154, 160, 174);
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'normal');
            doc.text(`Category: ${data.category || 'Solo'} | Lang: ${data.perfLanguage || 'Kannada'}`, 36, 60);

            // Divider under top details
            doc.setDrawColor(38, 48, 60);
            doc.setLineWidth(0.3);
            doc.line(8, 63.5, 99, 63.5);

            // Schedule & Venue block
            doc.setTextColor(212, 175, 55);
            doc.setFontSize(6.8);
            doc.setFont('helvetica', 'bold');
            doc.text('DATES & SCHEDULE', 8, 68);

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(7.8);
            doc.text('12 & 13 December 2026 (Reporting 11-12-2026 9:00 AM)', 8, 73);

            doc.setTextColor(212, 175, 55);
            doc.setFontSize(6.8);
            doc.setFont('helvetica', 'bold');
            doc.text('VENUE', 8, 79);

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'normal');
            doc.text('Sri ChannaBasava PattaDevaR Rang Mandir, Bidar', 8, 83.5);

            doc.setTextColor(154, 160, 174);
            doc.setFontSize(6.5);
            doc.text('Organized by: Bidar Jilleya Samskruthika Vedike (R.)', 8, 89);

            // Right Box: Registration ID & QR (x: 102, y: 29, w: 40, h: 63)
            doc.setFillColor(20, 22, 29);
            doc.setDrawColor(goldColor[0], goldColor[1], goldColor[2]);
            doc.setLineWidth(0.6);
            doc.roundedRect(102, 29, 40, 63, 2, 2, 'FD');

            doc.setTextColor(212, 175, 55);
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'bold');
            doc.text('PASS ID', 122, 35, { align: 'center' });

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8.5);
            doc.text(regId, 122, 40, { align: 'center' });

            // Pass QR Code
            const passQrPayload = JSON.stringify({
                app: 'BidariUtsav2026Pass',
                id: regId,
                name: pName,
                status: isConfirmed ? 'CONFIRMED' : 'PROVISIONAL'
            });
            const qrUrl = await this.getQrDataUrl(passQrPayload);
            if (qrUrl) {
                try {
                    doc.addImage(qrUrl, 'PNG', 106, 43, 32, 32);
                } catch (e) {
                    console.warn('QR addImage error:', e);
                }
            } else {
                // Visual verification box if QR could not be generated
                doc.setFillColor(255, 255, 255);
                doc.rect(106, 43, 32, 32, 'F');
                doc.setFillColor(0, 0, 0);
                doc.rect(108, 45, 8, 8, 'F');
                doc.rect(128, 45, 8, 8, 'F');
                doc.rect(108, 65, 8, 8, 'F');
                doc.setFontSize(5.5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text('DIGITAL PASS', 122, 59, { align: 'center' });
                doc.text(regId, 122, 63, { align: 'center' });
            }

            doc.setTextColor(212, 175, 55);
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'bold');
            doc.text('Carry Valid Govt ID Proof', 122, 80, { align: 'center' });

            doc.setTextColor(154, 160, 174);
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'normal');
            doc.text('Helpline: 9986138457', 122, 84.5, { align: 'center' });

            doc.setTextColor(100, 116, 139);
            doc.setFontSize(5.5);
            doc.text('Scan for Gate Entry Verification', 122, 89, { align: 'center' });

            // Bottom Ribbon
            doc.setFillColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
            doc.rect(4, 94, 140, 8, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'bold');
            doc.text('This pass is non-transferable. Present at the gate for entry verification.', 74, 99, { align: 'center' });

            const fileSuffix = isConfirmed ? 'ConfirmedPass' : 'ProvisionalPass';
            doc.save(`BidariUtsav2026_${fileSuffix}_${regId}.pdf`);
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

            const pName = String(data.fullName || data.participantName || data.name || '-').trim();
            const pComp = String(data.competitionName || data.competition || 'Sugama Sangeeta Gayana Spardhe').trim();
            const pPhoto = data.photoBase64 || data.photoUrl || data.photographUrl || '';

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
                    .photo-thumb { width: 90px; height: 110px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1; }
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
                        <p>Bidar Jilleya Samskruthika Vedike | Sugama Sangeeta Gayana Spardhe</p>
                        <p>Venue: Sri ChannaBasava PattaDevaR Rang Mandir, Bidar, Karnataka</p>
                    </div>

                    <div style="text-align:center;">
                        <h2>${title}</h2>
                        <div class="badge ${isConfirmed ? 'badge-confirmed' : 'badge-pending'}">
                            ${isConfirmed ? 'STATUS: CONFIRMED & APPROVED' : 'STATUS: PENDING VERIFICATION'}
                        </div>
                    </div>

                    ${pPhoto ? `<div style="text-align:center; margin-bottom:12px;"><img src="${pPhoto}" class="photo-thumb" alt="Photo"></div>` : ''}

                    <table class="grid">
                        <tr><th>Registration ID</th><td><strong style="color:#005B55; font-size:16px;">${data.registrationId || '-'}</strong></td></tr>
                        <tr><th>Participant Name</th><td>${pName}</td></tr>
                        <tr><th>Date of Birth & Age</th><td>${data.dob || '-'} (${data.age || '-'} Years)</td></tr>
                        <tr><th>Gender</th><td>${data.gender || '-'}</td></tr>
                        <tr><th>Mobile Number</th><td>${data.mobile || data.mobileNumber || '-'}</td></tr>
                        <tr><th>City & District</th><td>${data.city || '-'}, ${data.district || '-'}</td></tr>
                        <tr><th>Parent / Guardian</th><td>${data.parentName || '-'} (${data.parentMobile || '-'})</td></tr>
                        <tr><th>Competition</th><td>${pComp}</td></tr>
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


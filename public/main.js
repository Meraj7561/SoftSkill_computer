// =====================================================================
// Contact Form -> saves to database via /api/contact, then
// automatically opens WhatsApp with the enquiry pre-filled.
// =====================================================================
const contactForm = document.getElementById('contactForm');
const contactFormMsg = document.getElementById('contactFormMsg');

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
        contactFormMsg.innerHTML = '';

        try {
            const whatsappWindow = window.open('', '_blank');
            const formData = new FormData(contactForm);
            const urlParams = new URLSearchParams();
            for (const [key, value] of formData.entries()) {
                urlParams.append(key, value);
            }

            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                },
                body: urlParams.toString(),
            });
            const result = await response.json();

            if (result.success) {
                contactFormMsg.innerHTML = `<p style="color:#4ADE80; margin-bottom:16px;">${result.message}</p>`;
                contactForm.reset();

                // Automatically open WhatsApp with the enquiry pre-filled.
                // Opening a blank tab first keeps this action within the user gesture,
                // which avoids popup blocking in some browsers.
                if (result.whatsapp_url) {
                    if (whatsappWindow && !whatsappWindow.closed) {
                        whatsappWindow.location = result.whatsapp_url;
                    } else {
                        window.open(result.whatsapp_url, '_blank');
                    }
                }
            } else {
                if (whatsappWindow && !whatsappWindow.closed) {
                    whatsappWindow.close();
                }
                contactFormMsg.innerHTML = `<p style="color:#FF6B35; margin-bottom:16px;">${result.message}</p>`;
            }
        } catch (err) {
            contactFormMsg.innerHTML = `<p style="color:#FF6B35; margin-bottom:16px;">Something went wrong. Please try again later.</p>`;
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
}

// =====================================================================
// Certificate Verification -> looks up the roll number via
// /api/verify-certificate and renders the result.
// =====================================================================
const verifyForm = document.getElementById('verifyForm');
const verifyResult = document.getElementById('verifyResult');

if (verifyForm) {
    verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const rollNo = document.getElementById('verifyRollNo').value.trim();
        if (!rollNo) return;

        const submitBtn = verifyForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying...';
        verifyResult.innerHTML = '<p style="color:#D4FF00; margin-bottom:16px;">Checking certificate details...</p>';

        try {
            const response = await fetch('/api/verify-certificate?roll_no=' + encodeURIComponent(rollNo));
            const result = await response.json();

            if (result.success) {
                const d = result.data;
                verifyResult.innerHTML = `
                    <div class="verify-result-card">
                        <p class="verify-result-title">✔ Certificate Verified</p>
                        <div class="verify-field"><span>Roll No:</span> ${escapeHtml(d.roll_no)}</div>
                        <div class="verify-field"><span>Student Name:</span> ${escapeHtml(d.student_name)}</div>
                        <div class="verify-field"><span>Father Name:</span> ${escapeHtml(d.father_name || '-')}</div>
                        <div class="verify-field"><span>Course:</span> ${escapeHtml(d.course_name || '-')}</div>
                        <div class="verify-field"><span>Grade:</span> ${escapeHtml(d.grade || '-')}</div>
                    </div>
                `;
            } else {
                verifyResult.innerHTML = `
                    <div class="verify-result-card verify-result-error">
                        <p>${escapeHtml(result.message)}</p>
                    </div>
                `;
            }
        } catch (err) {
            verifyResult.innerHTML = `
                <div class="verify-result-card verify-result-error">
                    <p>Something went wrong while checking the certificate. Please try again later.</p>
                </div>
            `;
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            verifyResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}

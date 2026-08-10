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
            const formData = new FormData(contactForm);
            const response = await fetch('/api/contact', {
                method: 'POST',
                body: formData,
            });
            const result = await response.json();

            if (result.success) {
                contactFormMsg.innerHTML = `<p style="color:#4ADE80; margin-bottom:16px;">${result.message}</p>`;
                contactForm.reset();

                // Automatically open WhatsApp with the enquiry pre-filled
                if (result.whatsapp_url) {
                    window.open(result.whatsapp_url, '_blank');
                }
            } else {
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
        verifyResult.innerHTML = '';

        try {
            const response = await fetch('/api/verify-certificate?roll_no=' + encodeURIComponent(rollNo));
            const result = await response.json();

            if (result.success) {
                const d = result.data;
                verifyResult.innerHTML = `
                    <div style="background: rgba(212,255,0,0.06); border: 1px solid rgba(212,255,0,0.25); border-radius: 12px; padding: 22px; text-align:left;">
                        <p style="color:#D4FF00; font-weight:700; margin:0 0 12px;">✔ Certificate Verified</p>
                        <p style="margin:6px 0;"><strong>Roll No:</strong> ${escapeHtml(d.roll_no)}</p>
                        <p style="margin:6px 0;"><strong>Student Name:</strong> ${escapeHtml(d.student_name)}</p>
                        <p style="margin:6px 0;"><strong>Course:</strong> ${escapeHtml(d.course_name || '-')}</p>
                        <p style="margin:6px 0;"><strong>Duration:</strong> ${escapeHtml(d.duration || '-')}</p>
                        <p style="margin:6px 0;"><strong>Grade:</strong> ${escapeHtml(d.grade || '-')}</p>
                        <p style="margin:6px 0;"><strong>Issue Date:</strong> ${escapeHtml(d.issue_date || '-')}</p>
                        ${d.father_name ? `<p style="margin:6px 0;"><strong>Father's Name:</strong> ${escapeHtml(d.father_name)}</p>` : ''}
                    </div>
                `;
            } else {
                verifyResult.innerHTML = `
                    <div style="background: rgba(255,92,92,0.08); border: 1px solid rgba(255,92,92,0.3); border-radius: 12px; padding: 18px; text-align:center; color:#FF6B6B;">
                        ${escapeHtml(result.message)}
                    </div>
                `;
            }
        } catch (err) {
            verifyResult.innerHTML = `<p style="color:#FF6B35;">Something went wrong. Please try again later.</p>`;
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}

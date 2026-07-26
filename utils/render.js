function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function renderCourseCards(courses) {
    if (!courses || courses.length === 0) {
        return '<p style="color: var(--text-muted); text-align:center; padding: 20px 0;">Courses coming soon. Please check back shortly.</p>';
    }
    let html = '<div class="courses-grid">';
    for (const course of courses) {
        const featuredClass = course.is_featured ? ' featured' : '';
        html += `<div class="course-card${featuredClass}">`;
        html += `<div class="course-duration">${escapeHtml(course.duration)}</div>`;
        html += `<h3 class="course-name">${escapeHtml(course.course_name)}</h3>`;
        html += `<p class="course-desc">${escapeHtml(course.description)}</p>`;
        html += `<a href="#contact" class="course-link">Enroll Now &rarr;</a>`;
        html += `</div>`;
    }
    html += '</div>';
    return html;
}

module.exports = { escapeHtml, renderCourseCards };

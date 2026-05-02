async function fetchJSON(url) {
  const res = await fetch(url);
  return res.json();
}

function termFromDate(dateStr) {
  // Very simple mapping: months 1-6 -> S1, 7-12 -> S2
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  const m = d.getMonth() + 1;
  return m <= 6 ? 'S1' : 'S2';
}

function renderCourses(courses, selectedTerm) {
  const container = document.getElementById('courses');
  container.innerHTML = '';
  courses.forEach(c => {
    const el = document.createElement('div');
    el.className = 'course';
    const offered = c.offerings.includes(selectedTerm);
    el.innerHTML = `<strong>${c.code}</strong> — ${c.title} <br/>Credits: ${c.credits} <br/>Offered in ${c.offerings.join(', ')} <div class="${offered ? '' : 'warning'}">${offered ? 'Offered' : 'Not offered this term'}</div>`;
    container.appendChild(el);
  });
}

async function init() {
  const degrees = await fetchJSON('/api/degrees');
  const degreeSelect = document.getElementById('degreeSelect');
  degrees.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = d.name;
    degreeSelect.appendChild(opt);
  });

  document.getElementById('startForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const startDate = document.getElementById('startDate').value;
    const term = termFromDate(startDate);
    if (!term) return alert('Please enter a valid start date');
    const courses = await fetchJSON('/api/courses');
    renderCourses(courses, term);
  });
}

init();

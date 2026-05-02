const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    // match quoted fields or unquoted fields
    const parts = [];
    const regex = /"([^"]*)"|([^,]+)/g;
    let m;
    while ((m = regex.exec(line)) !== null) {
      parts.push(m[1] !== undefined ? m[1] : (m[2] !== undefined ? m[2].trim() : ''));
    }
    const obj = {};
    headers.forEach((h, i) => { obj[h] = parts[i] !== undefined ? parts[i] : ''; });
    return obj;
  });
  return rows;
}

function readCSV(relPath) {
  const p = path.join(__dirname, '..', relPath);
  const text = fs.readFileSync(p, 'utf8');
  return parseCSV(text);
}

app.get('/api/degrees', (req, res) => {
  const raw = readCSV('data/degrees.csv');
  const degrees = raw.map(d => ({
    id: d.id,
    name: d.name,
    requiredCredits: parseInt(d.requiredCredits || '0', 10),
    coreCourses: (d.coreCourses || '').split('|').filter(Boolean)
  }));
  res.json(degrees);
});

app.get('/api/courses', (req, res) => {
  const raw = readCSV('data/courses.csv');
  const courses = raw.map(c => ({
    code: c.code,
    title: c.title,
    credits: parseInt(c.credits || '0', 10),
    offerings: (c.offerings || '').split('|').filter(Boolean),
    prerequisites: (c.prerequisites || '').split('|').filter(Boolean)
  }));
  res.json(courses);
});

app.post('/api/validate-plan', (req, res) => {
  // Placeholder — detailed validation implemented later
  res.json({ ok: true, message: 'Validation endpoint TODO' });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

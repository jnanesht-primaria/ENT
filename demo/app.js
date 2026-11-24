'use strict';
/* =====================================================================
   ENT HOSPITAL MANAGEMENT PORTAL – Demo (Single Super Admin, no login)
   Front-end only: data is stored in the browser (localStorage).
   ===================================================================== */

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => iso(new Date());
const addDays = (n, base = new Date()) => { const d = new Date(base); d.setDate(d.getDate() + n); return iso(d); };
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const fmtDate = s => { if (!s) return '—'; const d = parse(s); return `${pad(d.getDate())} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
const fmtTime = t => { if (!t) return ''; let [h, m] = t.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${pad(h)}:${pad(m)} ${ap}`; };
const money = n => '₹' + Number(n || 0).toLocaleString('en-IN');
const ageOf = dob => { if (!dob) return ''; const b = parse(dob), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a; };
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-');
const badge = s => `<span class="badge b-${slug(s)}">${esc(s)}</span>`;
const initials = n => String(n).replace(/^Dr\.?\s*/i, '').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const monthKey = s => s.slice(0, 7);
function nextId(prefix, list, w = 4) {
  const max = list.reduce((m, x) => Math.max(m, parseInt(String(x.id).split('-')[1], 10) || 0), 0);
  return `${prefix}-${String(max + 1).padStart(w, '0')}`;
}

/* ---------- constants ---------- */
const APPT_STATUS = ['Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'No Show'];
const PAY_STATUS = ['Paid', 'Pending', 'Partially Paid'];
const PAY_METHODS = ['Cash', 'UPI', 'Card'];
const SPECS = ['General ENT', 'Otology (Ear)', 'Rhinology (Nose)', 'Laryngology (Throat)', 'Pediatric ENT', 'Head and Neck Surgery'];
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const FREQ = ['Once daily', 'Twice daily (BD)', 'Thrice daily (TDS)', 'Four times daily', 'At bedtime', 'SOS (if needed)'];
const WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/* ---------- storage + seed ---------- */
const KEY = 'ent_portal_db_v2';
let db;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('Storage full – could not save', 'err'); } };
function load() {
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { db = null; }
  if (!db || !db.patients) { db = seed(); save(); }
}

function genSlots(start, end, step) {
  const out = []; let [h, m] = start.split(':').map(Number); const [eh, em] = end.split(':').map(Number);
  while (h * 60 + m < eh * 60 + em) { out.push(`${pad(h)}:${pad(m)}`); m += step; h += Math.floor(m / 60); m %= 60; }
  return out;
}

function seed() {
  let sv = 42; const rnd = () => { sv = (sv * 16807) % 2147483647; return (sv - 1) / 2147483646; };
  const pick = a => a[Math.floor(rnd() * a.length)];
  const slots = genSlots('09:00', '17:00', 30);
  const D = {
    settings: {
      hospital: { name: 'CityCare ENT Hospital', logo: '', address: '12-5-8, MG Road, Benz Circle, Vijayawada, Andhra Pradesh – 520010', phone: '+91 866 245 0000', email: 'info@citycareent.demo' },
      slots, charges: { newConsult: 500, followUp: 300 },
      departments: ['Reception', 'Nursing', 'Laboratory', 'Pharmacy', 'Administration', 'Billing']
    },
    patients: [], doctors: [], staff: [], appointments: [], consultations: [], prescriptions: [], invoices: [], services: []
  };

  const pn = [['Ravi Teja', 'Male'], ['Lakshmi Prasanna', 'Female'], ['Srinivas Rao', 'Male'], ['Anitha Reddy', 'Female'], ['Venkatesh Naidu', 'Male'], ['Padmavathi Devi', 'Female'], ['Karthik Varma', 'Male'], ['Sravani Chowdary', 'Female'], ['Harish Babu', 'Male'], ['Swathi Kumari', 'Female'], ['Mohammed Irfan', 'Male'], ['Divya Sree', 'Female'], ['Chandra Sekhar', 'Male'], ['Bhavana Rani', 'Female'], ['Aarav Kumar', 'Male'], ['Meghana Reddy', 'Female']];
  const hist = ['None', 'Hypertension', 'Diabetes Type 2', 'Chronic sinusitis', 'Asthma', 'Recurrent tonsillitis', 'Previous septoplasty', 'None'];
  const alg = ['None', 'Penicillin', 'Dust / pollen', 'None', 'Sulfa drugs', 'None', 'Aspirin'];
  pn.forEach(([name, g], i) => {
    const yr = 1950 + Math.floor(rnd() * 56), dobObj = `${yr}-${pad(1 + Math.floor(rnd() * 12))}-${pad(1 + Math.floor(rnd() * 28))}`;
    D.patients.push({
      id: `PAT-${String(i + 1).padStart(4, '0')}`, name, dob: i === 14 ? '2018-06-12' : dobObj, gender: g,
      mobile: `98${Math.floor(10000000 + rnd() * 89999999)}`, email: name.toLowerCase().replace(/[^a-z]+/g, '.') + '@mail.demo',
      address: `${Math.floor(1 + rnd() * 90)}-${Math.floor(1 + rnd() * 40)}, ${pick(['Patamata', 'Governorpet', 'Labbipet', 'Gunadala', 'Benz Circle', 'Auto Nagar'])}, Vijayawada`,
      blood: pick(BLOOD), emergency: `97${Math.floor(10000000 + rnd() * 89999999)} (Family)`, history: pick(hist), allergies: pick(alg),
      registeredOn: addDays(-Math.floor(rnd() * 170))
    });
  });

  const docs = [
    ['Dr. Ramesh Kumar', 'MBBS, MS (ENT)', 'General ENT', 15, 600, ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], '09:00', '17:00'],
    ['Dr. Sunitha Rao', 'MBBS, MS (ENT), DNB', 'Otology (Ear)', 12, 800, ['Monday', 'Wednesday', 'Friday', 'Saturday'], '10:00', '16:00'],
    ['Dr. Vamsi Krishna', 'MBBS, MS (ENT)', 'Rhinology (Nose)', 9, 700, ['Tuesday', 'Thursday', 'Saturday', 'Monday'], '09:00', '15:00'],
    ['Dr. Padma Latha', 'MBBS, DLO, MS', 'Laryngology (Throat)', 18, 900, ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], '11:00', '17:00'],
    ['Dr. Arjun Menon', 'MBBS, MS (ENT), Fellowship Paeds ENT', 'Pediatric ENT', 8, 750, ['Monday', 'Tuesday', 'Thursday', 'Friday', 'Saturday'], '09:00', '14:00'],
    ['Dr. Kiran Babu', 'MBBS, MS, MCh (Head & Neck)', 'Head and Neck Surgery', 20, 1200, ['Tuesday', 'Wednesday', 'Friday'], '10:00', '16:30']
  ];
  docs.forEach((d, i) => D.doctors.push({
    id: `DOC-${String(i + 1).padStart(3, '0')}`, name: d[0], qualification: d[1], specialization: d[2], experience: d[3],
    mobile: `90${Math.floor(10000000 + rnd() * 89999999)}`, email: d[0].toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '') + '@citycareent.demo',
    fee: d[4], days: d[5], from: d[6], to: d[7], photo: '', active: i !== 5 || true
  }));
  D.doctors[2].active = true;

  const st = [['Sneha Latha', 'Reception', 'Front Desk Executive'], ['Rajesh Kumar', 'Reception', 'Receptionist'], ['Sister Mary Joseph', 'Nursing', 'Head Nurse'], ['Bhargavi Devi', 'Nursing', 'Staff Nurse'], ['Naveen Chowdary', 'Laboratory', 'Lab Technician'], ['Uma Maheswari', 'Pharmacy', 'Pharmacist'], ['Suresh Babu', 'Administration', 'Hospital Administrator'], ['Deepika Rao', 'Billing', 'Billing Executive'], ['Anil Kumar', 'Nursing', 'Audiometry Technician']];
  st.forEach((s, i) => D.staff.push({
    id: `STF-${String(i + 1).padStart(3, '0')}`, name: s[0], department: s[1], designation: s[2], mobile: `80${Math.floor(10000000 + rnd() * 89999999)}`,
    email: s[0].toLowerCase().replace(/[^a-z]+/g, '.') + '@citycareent.demo', joined: addDays(-Math.floor(100 + rnd() * 1500)),
    address: `${Math.floor(1 + rnd() * 60)}-${Math.floor(1 + rnd() * 30)}, ${pick(['Gunadala', 'Moghalrajpuram', 'Bhavanipuram', 'Ajit Singh Nagar'])}, Vijayawada`, active: i !== 8
  }));

  [['ENT Consultation', 'Consultation', 500], ['Ear Wax Removal', 'Procedure', 800], ['Hearing Test', 'Diagnostic', 600], ['Audiometry', 'Diagnostic', 900], ['Nasal Endoscopy', 'Procedure', 1500], ['Throat Examination', 'Procedure', 400], ['Foreign Body Removal', 'Procedure', 2000], ['Follow-up Consultation', 'Consultation', 300]]
    .forEach((s, i) => D.services.push({ id: `SRV-${String(i + 1).padStart(3, '0')}`, name: s[0], category: s[1], charge: s[2], active: true }));

  const reasons = ['Ear pain and blocked sensation', 'Recurrent sore throat', 'Nasal congestion for 2 weeks', 'Hearing difficulty', 'Sinus headache', 'Tinnitus', 'Voice hoarseness', 'Epistaxis (nose bleed)', 'Tonsillitis', 'Vertigo / dizziness', 'Post-operative review', 'Swallowing discomfort'];
  const used = new Set();
  const addAppt = (date, status) => {
    for (let t = 0; t < 40; t++) {
      const doc = pick(D.doctors), time = pick(slots), k = doc.id + date + time;
      if (used.has(k)) continue; used.add(k);
      D.appointments.push({ id: `APT-${String(D.appointments.length + 1).padStart(4, '0')}`, patientId: pick(D.patients).id, doctorId: doc.id, date, time, type: rnd() < .62 ? 'New' : 'Follow-up', reason: pick(reasons), status }); return;
    }
  };
  for (let i = 0; i < 85; i++) { const r = rnd(); addAppt(addDays(-1 - Math.floor(rnd() * 45)), r < .78 ? 'Completed' : r < .9 ? 'Cancelled' : 'No Show'); }
  ['Completed', 'Completed', 'Confirmed', 'Confirmed', 'Confirmed', 'Scheduled', 'Scheduled'].forEach(s => addAppt(today(), s));
  for (let i = 0; i < 14; i++) addAppt(addDays(1 + Math.floor(rnd() * 7)), rnd() < .5 ? 'Confirmed' : 'Scheduled');

  const diag = ['Acute otitis media', 'Chronic tonsillitis', 'Allergic rhinitis', 'Sensorineural hearing loss (mild)', 'Chronic sinusitis', 'Cerumen impaction', 'Acute laryngitis', 'Deviated nasal septum'];
  const meds = [['Amoxicillin-Clavulanate 625mg', 'Twice daily (BD)', '5 days', 'After food'], ['Cetirizine 10mg', 'At bedtime', '7 days', 'May cause drowsiness'], ['Paracetamol 500mg', 'SOS (if needed)', '3 days', 'For pain / fever'], ['Xylometazoline nasal drops', 'Twice daily (BD)', '3 days', '2 drops each nostril'], ['Ofloxacin ear drops', 'Thrice daily (TDS)', '5 days', 'Keep ear dry'], ['Pantoprazole 40mg', 'Once daily', '7 days', 'Before breakfast'], ['Saline nasal spray', 'Twice daily (BD)', '14 days', 'Shake well']];
  const done = D.appointments.filter(a => a.status === 'Completed');
  done.slice(0, 30).forEach((a, i) => {
    const doc = D.doctors.find(d => d.id === a.doctorId);
    const items = [{ type: 'Consultation', desc: `${doc.name} – consultation`, qty: 1, rate: doc.fee }];
    if (rnd() < .4) { const s = pick(D.services.filter(x => x.category !== 'Consultation')); items.push({ type: 'Procedure', desc: s.name, qty: 1, rate: s.charge }); }
    if (rnd() < .4) items.push({ type: 'Medicine', desc: 'Prescribed medicines', qty: 1, rate: 150 + Math.floor(rnd() * 8) * 50 });
    const sub = items.reduce((s, x) => s + x.qty * x.rate, 0), disc = rnd() < .25 ? 100 : 0, total = sub - disc, r = rnd();
    const status = r < .68 ? 'Paid' : r < .84 ? 'Pending' : 'Partially Paid';
    D.invoices.push({ id: `INV-${String(i + 1).padStart(4, '0')}`, patientId: a.patientId, doctorId: a.doctorId, date: a.date, items, discount: disc, total, method: pick(PAY_METHODS), status, paid: status === 'Paid' ? total : status === 'Pending' ? 0 : Math.round(total / 2 / 10) * 10 });
    if (i < 16) {
      const dg = pick(diag);
      const cid = `CON-${String(D.consultations.length + 1).padStart(4, '0')}`;
      D.consultations.push({
        id: cid, patientId: a.patientId, doctorId: a.doctorId, date: a.date, complaints: a.reason, symptoms: pick(['Duration 5 days, mild fever', 'Intermittent, worse at night', 'Associated with headache', 'Gradual onset, no discharge']),
        diagnosis: dg, ear: pick(['Tympanic membrane intact, mild congestion', 'Canal clear, TM normal', 'Wax impaction – right ear']), nose: pick(['Mucosa pale, turbinates hypertrophied', 'Mild DNS to right', 'Normal']),
        throat: pick(['Tonsils grade 2, congested', 'Pharynx mildly congested', 'Normal']), hearing: pick(['Rinne positive bilaterally', 'Mild conductive loss (tuning fork)', 'Normal']), general: 'Afebrile, vitals stable',
        treatment: 'Medication as prescribed. Avoid cold beverages and dust exposure. Steam inhalation twice daily.', followUp: addDays(7 + Math.floor(rnd() * 14), parse(a.date))
      });
      const m1 = pick(meds), m2 = pick(meds);
      D.prescriptions.push({ id: `RX-${String(D.prescriptions.length + 1).padStart(4, '0')}`, patientId: a.patientId, doctorId: a.doctorId, date: a.date, diagnosis: dg, medicines: [m1, m2].map(m => ({ name: m[0], dosage: '1 unit', frequency: m[1], duration: m[2], instructions: m[3] })), notes: 'Review if symptoms persist.' });
    }
  });
  return D;
}

/* ---------- lookups ---------- */
const P = id => db.patients.find(p => p.id === id);
const Dc = id => db.doctors.find(d => d.id === id);
const pName = id => P(id)?.name ?? '(deleted)';
const dName = id => Dc(id)?.name ?? '(deleted)';
const hosp = () => db.settings.hospital;

/* ---------- UI state ---------- */
const ui = {
  patients: { q: '', gender: '', blood: '' },
  appts: { q: '', status: '', doctor: '', view: 'all', date: today() },
  doctors: { q: '', spec: '', active: '' },
  staff: { q: '', dept: '', active: '' },
  consults: { q: '', doctor: '' },
  rx: { q: '', doctor: '' },
  billing: { q: '', status: '' },
  services: { q: '' },
  reports: { type: 'daily_reg', from: addDays(-180), to: today() }
};
let charts = [];

/* ---------- toast / modal / confirm ---------- */
function toast(msg, type = 'ok') {
  const t = document.createElement('div'); t.className = `toast ${type}`; t.textContent = msg; $('#toast').appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
function modal(title, body, wide) {
  $('#modal').innerHTML = `<div class="modal-box ${wide ? 'wide' : ''}"><div class="modal-head"><h3>${title}</h3><button class="icon-btn" data-act="closeModal" aria-label="Close">✕</button></div><div class="modal-body">${body}</div></div>`;
  $('#modal').classList.add('open');
}
const closeModal = () => { $('#modal').classList.remove('open'); $('#modal').innerHTML = ''; };
function confirmBox(msg, onYes, label = 'Delete') {
  modal('Please confirm', `<p>${msg}</p><div class="form-foot"><button class="btn" data-act="closeModal">Cancel</button><button class="btn danger" id="confirmYes">${label}</button></div>`);
  $('#confirmYes').onclick = () => { closeModal(); onYes(); };
}

/* ---------- form builder ---------- */
function fieldHTML(f, v) {
  const val = v[f.name] ?? f.default ?? '';
  const full = f.full || ['textarea', 'checkboxes', 'image'].includes(f.type);
  const sh = f.showIf ? ` data-showif="${f.showIf[0]}=${f.showIf[1]}"` : '';
  let inner;
  const req = f.required ? 'required' : '';
  if (f.type === 'select') {
    inner = `<select name="${f.name}" ${req}>${f.placeholder ? `<option value="">${esc(f.placeholder)}</option>` : ''}${f.options.map(o => { const [ov, ol] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(ov)}" ${String(ov) === String(val) ? 'selected' : ''}>${esc(ol)}</option>`; }).join('')}</select>`;
  } else if (f.type === 'textarea') {
    inner = `<textarea name="${f.name}" ${req} placeholder="${esc(f.ph || '')}">${esc(val)}</textarea>`;
  } else if (f.type === 'checkboxes') {
    const arr = Array.isArray(val) ? val : [];
    inner = `<div class="checks">${f.options.map(o => `<label><input type="checkbox" value="${esc(o)}" ${arr.includes(o) ? 'checked' : ''}>${esc(o)}</label>`).join('')}</div>`;
  } else if (f.type === 'image') {
    inner = `<div style="display:flex;gap:12px;align-items:center"><div class="photo" data-prev>${val ? `<img src="${val}" alt="">` : '＋'}</div><input type="file" accept="image/*" data-imgfor="${f.name}"><input type="hidden" name="${f.name}" value="${esc(val)}"></div>`;
  } else {
    inner = `<input type="${f.type || 'text'}" name="${f.name}" value="${esc(val)}" ${req} ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''} ${f.step ? `step="${f.step}"` : ''} ${f.pattern ? `pattern="${f.pattern}" title="${esc(f.title || '')}"` : ''} placeholder="${esc(f.ph || '')}">`;
  }
  return `<div class="field ${full ? 'full' : ''}" data-f="${f.name}"${sh}><label class="lbl">${esc(f.label)}${f.required ? ' *' : ''}</label>${inner}</div>`;
}
function applyShowIf(form) {
  $$('[data-showif]', form).forEach(w => {
    const [n, val] = w.dataset.showif.split('=');
    const hide = (form.elements[n]?.value ?? '') !== val;
    w.hidden = hide; $$('input,select,textarea', w).forEach(i => i.disabled = hide);
  });
}
function resizeImage(file, max, cb) {
  const fr = new FileReader();
  fr.onload = () => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = img.width * s; c.height = img.height * s; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      cb(c.toDataURL('image/jpeg', .8));
    };
    img.src = fr.result;
  };
  fr.readAsDataURL(file);
}
/* opts: title, fields, values, submitLabel, onSubmit(data), extraHTML, bind(form), extra(form), wide */
function openForm(o) {
  const v = o.values || {};
  modal(o.title, `<form id="mform" novalidate-off><div class="form-grid">${o.fields.map(f => fieldHTML(f, v)).join('')}${o.extraHTML || ''}</div>
    <div class="form-foot"><button type="button" class="btn" data-act="closeModal">Cancel</button><button class="btn primary" type="submit">${o.submitLabel || 'Save'}</button></div></form>`, o.wide);
  const form = $('#mform');
  applyShowIf(form);
  form.addEventListener('input', e => { if (e.target.name) applyShowIf(form); });
  $$('input[type=file][data-imgfor]', form).forEach(inp => inp.onchange = () => {
    if (!inp.files[0]) return;
    resizeImage(inp.files[0], 220, url => { form.elements[inp.dataset.imgfor].value = url; $('[data-prev]', inp.parentElement).innerHTML = `<img src="${url}" alt="">`; });
  });
  o.bind && o.bind(form);
  form.addEventListener('submit', e => {
    e.preventDefault();
    const d = {};
    o.fields.forEach(f => {
      const w = $(`[data-f="${f.name}"]`, form); if (w.hidden) return;
      if (f.type === 'checkboxes') d[f.name] = $$('input:checked', w).map(i => i.value);
      else { const val = form.elements[f.name].value; d[f.name] = f.type === 'number' && val !== '' ? Number(val) : (typeof val === 'string' ? val.trim() : val); }
    });
    if (o.extra) Object.assign(d, o.extra(form));
    if (o.onSubmit(d) !== false) closeModal();
  });
}

/* ---------- table helper ---------- */
function table(cols, rows, empty = 'No records found') {
  if (!rows.length) return `<div class="table-wrap"><div class="empty">${empty}</div></div>`;
  return `<div class="table-wrap"><table><thead><tr>${cols.map(c => `<th class="${c.cls || ''}">${c.h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${cols.map(c => `<td class="${c.cls || ''}">${c.f(r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
const btn = (act, id, label, cls = '') => `<button class="btn sm ${cls}" data-act="${act}" data-id="${esc(id)}">${label}</button>`;
const matchQ = (q, ...vals) => !q || vals.join(' ').toLowerCase().includes(q.toLowerCase());
const opts = (arr, sel) => arr.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(sel) ? 'selected' : ''}>${esc(l)}</option>`; }).join('');
const docOpts = (activeOnly = false) => db.doctors.filter(d => !activeOnly || d.active).map(d => [d.id, `${d.name} – ${d.specialization}`]);
const patOpts = () => db.patients.map(p => [p.id, `${p.name} (${p.id})`]);

/* ---------- printing / downloading ---------- */
function printHTML(html) { $('#printArea').innerHTML = `<div class="doc-print">${html}</div>`; window.print(); }
function docHeader(title, no) {
  const h = hosp();
  return `<div class="ph"><div style="display:flex;gap:12px;align-items:center">${h.logo ? `<img src="${h.logo}" style="width:54px;height:54px;object-fit:cover;border-radius:8px">` : ''}<div><h2>${esc(h.name)}</h2><div>${esc(h.address)}</div><div>${esc(h.phone)} · ${esc(h.email)}</div></div></div><div style="text-align:right"><h2>${title}</h2>${no ? `<div><b>${esc(no)}</b></div>` : ''}</div></div>`;
}
function download(name, text, mime) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: mime })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
}
function rxDoc(rx) {
  const p = P(rx.patientId) || {}, d = Dc(rx.doctorId) || {};
  return `${docHeader('PRESCRIPTION', rx.id)}
  <div class="meta"><div><b>Patient:</b> ${esc(p.name)} (${esc(p.id)})</div><div><b>Date:</b> ${fmtDate(rx.date)}</div><div><b>Age / Gender:</b> ${ageOf(p.dob)} / ${esc(p.gender)}</div><div><b>Doctor:</b> ${esc(d.name)}</div><div><b>Allergies:</b> ${esc(p.allergies)}</div><div><b>Specialization:</b> ${esc(d.specialization)}</div></div>
  ${rx.diagnosis ? `<p><b>Diagnosis:</b> ${esc(rx.diagnosis)}</p>` : ''}
  <table><thead><tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr></thead><tbody>
  ${rx.medicines.map((m, i) => `<tr><td>${i + 1}</td><td>${esc(m.name)}</td><td>${esc(m.dosage)}</td><td>${esc(m.frequency)}</td><td>${esc(m.duration)}</td><td>${esc(m.instructions)}</td></tr>`).join('')}</tbody></table>
  ${rx.notes ? `<p><b>Notes:</b> ${esc(rx.notes)}</p>` : ''}<div class="sig">${esc(d.name)}<br><small>${esc(d.qualification)}</small></div>`;
}
const invSub = inv => inv.items.reduce((s, x) => s + x.qty * x.rate, 0);
function invDoc(inv) {
  const p = P(inv.patientId) || {};
  return `${docHeader('INVOICE', inv.id)}
  <div class="meta"><div><b>Patient:</b> ${esc(p.name)} (${esc(p.id)})</div><div><b>Date:</b> ${fmtDate(inv.date)}</div><div><b>Mobile:</b> ${esc(p.mobile)}</div><div><b>Doctor:</b> ${esc(dName(inv.doctorId))}</div></div>
  <table><thead><tr><th>#</th><th>Type</th><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>
  ${inv.items.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x.type)}</td><td>${esc(x.desc)}</td><td>${x.qty}</td><td>${money(x.rate)}</td><td>${money(x.qty * x.rate)}</td></tr>`).join('')}</tbody></table>
  <table style="width:50%;margin-left:auto"><tr><td>Subtotal</td><td>${money(invSub(inv))}</td></tr><tr><td>Discount</td><td>- ${money(inv.discount)}</td></tr><tr><td><b>Total</b></td><td><b>${money(inv.total)}</b></td></tr><tr><td>Paid (${esc(inv.method)})</td><td>${money(inv.paid)}</td></tr><tr><td><b>Balance</b></td><td><b>${money(inv.total - inv.paid)}</b></td></tr></table>
  <p><b>Payment status:</b> ${esc(inv.status)}</p><p style="text-align:center;color:#555">Thank you for choosing ${esc(hosp().name)}. Get well soon!</p>`;
}
function consultDoc(c) {
  const p = P(c.patientId) || {};
  const row = (k, v) => `<tr><th style="width:28%">${k}</th><td>${esc(v) || '—'}</td></tr>`;
  return `${docHeader('CONSULTATION RECORD', c.id)}<div class="meta"><div><b>Patient:</b> ${esc(p.name)} (${esc(p.id)})</div><div><b>Date:</b> ${fmtDate(c.date)}</div><div><b>Doctor:</b> ${esc(dName(c.doctorId))}</div><div><b>Follow-up:</b> ${fmtDate(c.followUp)}</div></div>
  <table>${row('Complaints', c.complaints)}${row('Symptoms', c.symptoms)}${row('Ear Examination', c.ear)}${row('Nose Examination', c.nose)}${row('Throat Examination', c.throat)}${row('Hearing Assessment', c.hearing)}${row('General ENT Exam', c.general)}${row('Diagnosis', c.diagnosis)}${row('Treatment', c.treatment)}</table>`;
}

/* ---------- navigation ---------- */
const ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
  patients: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  appointments: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  doctors: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  staff: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  consultations: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>',
  prescriptions: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/>',
  billing: '<rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>',
  services: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/>',
  reports: '<path d="M12 20V10M18 20V4M6 20v-4"/>',
  settings: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>'
};
const ROUTES = [
  ['dashboard', 'Dashboard', () => renderDashboard()],
  ['patients', 'Patients', () => renderPatients(), () => refreshPatients()],
  ['appointments', 'Appointments', () => renderAppts(), () => refreshAppts()],
  ['doctors', 'Doctors', () => renderDoctors(), () => refreshDoctors()],
  ['staff', 'Staff', () => renderStaff(), () => refreshStaff()],
  ['consultations', 'Consultations', () => renderConsults(), () => refreshConsults()],
  ['prescriptions', 'Prescriptions', () => renderRx(), () => refreshRx()],
  ['billing', 'Billing', () => renderBilling(), () => refreshBilling()],
  ['services', 'ENT Services', () => renderServices(), () => refreshServices()],
  ['reports', 'Reports', () => renderReports(), () => refreshReports()],
  ['settings', 'Settings', () => renderSettings()]
];
let current = ROUTES[0];
function buildNav() {
  $('#nav').innerHTML = ROUTES.map(r => `<a href="#${r[0]}" data-r="${r[0]}"><svg viewBox="0 0 24 24">${ICONS[r[0]]}</svg>${r[1]}</a>`).join('');
}
function navigate() {
  const key = (location.hash || '#dashboard').slice(1);
  current = ROUTES.find(r => r[0] === key) || ROUTES[0];
  charts.forEach(c => c.destroy()); charts = [];
  $$('#nav a').forEach(a => a.classList.toggle('active', a.dataset.r === current[0]));
  $('#pageTitle').textContent = current[1];
  document.body.classList.remove('menu-open');
  current[2](); window.scrollTo(0, 0);
}
const rerender = () => navigate();
const refreshCurrent = () => (current[3] ? current[3]() : null);
function applyBrand() {
  const h = hosp(); $('#brandName').textContent = h.name;
  $('#brandLogo').innerHTML = h.logo ? `<img src="${h.logo}" alt="">` : esc(h.name[0] || 'E');
  document.title = `${h.name} – Management Portal`;
}
const pageHead = (title, sub, actions = '') => `<div class="page-head"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div><div class="row-actions">${actions}</div></div>`;

/* =====================================================================
   DASHBOARD
   ===================================================================== */
function mkChart(id, cfg) { if (!window.Chart || !$('#' + id)) return; cfg.options = Object.assign({ responsive: true, maintainAspectRatio: false }, cfg.options || {}); charts.push(new Chart($('#' + id), cfg)); }
function lastMonths(n) { const out = [], d = new Date(); d.setDate(1); for (let i = n - 1; i >= 0; i--) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push({ key: `${x.getFullYear()}-${pad(x.getMonth() + 1)}`, label: `${MON[x.getMonth()]} ${String(x.getFullYear()).slice(2)}` }); } return out; }
const balance = i => i.total - i.paid;

function renderDashboard() {
  const t = today(), A = db.appointments;
  const stats = [
    ['Total Patients', db.patients.length, '👥', '#dbeafe'], ["Today's Appointments", A.filter(a => a.date === t).length, '📅', '#ccfbf1'],
    ['Total Doctors', db.doctors.length, '🩺', '#e0e7ff'], ['Total Staff', db.staff.length, '🧑‍💼', '#fae8ff'],
    ['Completed Appointments', A.filter(a => a.status === 'Completed').length, '✅', '#dcfce7'], ['Pending Appointments', A.filter(a => ['Scheduled', 'Confirmed'].includes(a.status)).length, '⏳', '#fef3c7'],
    ['Total Revenue', money(db.invoices.reduce((s, i) => s + i.paid, 0)), '💰', '#d1fae5'], ['Pending Payments', money(db.invoices.reduce((s, i) => s + balance(i), 0)), '🧾', '#fee2e2']
  ];
  const recent = [...db.patients].sort((a, b) => b.registeredOn.localeCompare(a.registeredOn) || b.id.localeCompare(a.id)).slice(0, 6);
  const todayList = A.filter(a => a.date === t).sort((a, b) => a.time.localeCompare(b.time));
  $('#view').innerHTML = `
  ${pageHead('Welcome, Super Admin', `${hosp().name} · ${DAYS[new Date().getDay()]}, ${fmtDate(t)}`,
    `<button class="btn primary" data-act="addPatient">＋ Add Patient</button><button class="btn primary" data-act="addDoctor">＋ Add Doctor</button><button class="btn primary" data-act="addAppt">＋ Book Appointment</button><button class="btn" data-act="addInv">＋ New Invoice</button>`)}
  <div class="grid g-stats">${stats.map(s => `<div class="card stat"><div class="stat-ico" style="background:${s[3]}">${s[2]}</div><div><div class="stat-val">${s[1]}</div><div class="stat-lbl">${s[0]}</div></div></div>`).join('')}</div>
  <div class="grid g-2"><div class="card"><h3>Daily Appointments (last 14 days)</h3><div class="chart-box"><canvas id="c1"></canvas></div></div>
  <div class="card"><h3>Monthly Appointments</h3><div class="chart-box"><canvas id="c2"></canvas></div></div></div>
  <div class="grid g-2"><div class="card"><h3>Patient Registrations (monthly)</h3><div class="chart-box"><canvas id="c3"></canvas></div></div>
  <div class="card"><h3>Appointment Status Overview</h3><div class="chart-box"><canvas id="c4"></canvas></div></div></div>
  <div class="grid g-2"><div class="card"><h3>Recent Patient Registrations <a href="#patients" class="small">View all</a></h3>
    ${table([{ h: 'ID', f: r => r.id }, { h: 'Name', f: r => `<span class="strong">${esc(r.name)}</span>` }, { h: 'Mobile', f: r => esc(r.mobile) }, { h: 'Registered', f: r => fmtDate(r.registeredOn) }], recent)}</div>
  <div class="card"><h3>Today's Appointments <a href="#appointments" class="small">View all</a></h3>
    ${table([{ h: 'Time', f: r => fmtTime(r.time) }, { h: 'Patient', f: r => esc(pName(r.patientId)) }, { h: 'Doctor', f: r => esc(dName(r.doctorId)) }, { h: 'Status', f: r => badge(r.status) }], todayList, 'No appointments today')}</div></div>`;

  const days = Array.from({ length: 14 }, (_, i) => addDays(i - 13));
  mkChart('c1', { type: 'bar', data: { labels: days.map(d => fmtDate(d).slice(0, 6)), datasets: [{ label: 'Appointments', data: days.map(d => A.filter(a => a.date === d).length), backgroundColor: '#14b8a6', borderRadius: 5 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
  const m6 = lastMonths(6);
  mkChart('c2', { type: 'line', data: { labels: m6.map(m => m.label), datasets: [{ label: 'Appointments', data: m6.map(m => A.filter(a => monthKey(a.date) === m.key).length), borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,.12)', fill: true, tension: .35 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
  mkChart('c3', { type: 'bar', data: { labels: m6.map(m => m.label), datasets: [{ label: 'New patients', data: m6.map(m => db.patients.filter(p => monthKey(p.registeredOn) === m.key).length), backgroundColor: '#6366f1', borderRadius: 5 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
  mkChart('c4', { type: 'doughnut', data: { labels: APPT_STATUS, datasets: [{ data: APPT_STATUS.map(s => A.filter(a => a.status === s).length), backgroundColor: ['#3b82f6', '#6366f1', '#22c55e', '#ef4444', '#f59e0b'] }] }, options: { plugins: { legend: { position: 'right' } } } });
}

/* =====================================================================
   PATIENTS
   ===================================================================== */
function renderPatients() {
  const f = ui.patients;
  $('#view').innerHTML = `${pageHead('Patient Management', 'Register, search and manage patient records', '<button class="btn primary" data-act="addPatient">＋ Register Patient</button>')}
  <div class="toolbar"><input type="search" placeholder="Search name, ID, mobile, email…" value="${esc(f.q)}" data-filter="patients.q">
  <select data-filter="patients.gender"><option value="">All genders</option>${opts(['Male', 'Female', 'Other'], f.gender)}</select>
  <select data-filter="patients.blood"><option value="">All blood groups</option>${opts(BLOOD, f.blood)}</select></div><div id="tbl"></div>`;
  refreshPatients();
}
function refreshPatients() {
  const f = ui.patients;
  const rows = db.patients.filter(p => matchQ(f.q, p.id, p.name, p.mobile, p.email) && (!f.gender || p.gender === f.gender) && (!f.blood || p.blood === f.blood));
  $('#tbl').innerHTML = table([
    { h: 'Patient ID', f: r => `<span class="strong">${r.id}</span>` }, { h: 'Name', f: r => esc(r.name) }, { h: 'Age / Gender', f: r => `${ageOf(r.dob)} / ${esc(r.gender)}` },
    { h: 'Mobile', f: r => esc(r.mobile) }, { h: 'Blood', f: r => esc(r.blood) }, { h: 'Registered', f: r => fmtDate(r.registeredOn) },
    { h: 'Actions', f: r => `<div class="row-actions">${btn('viewPatient', r.id, 'View')}${btn('editPatient', r.id, 'Edit')}${btn('bookFor', r.id, 'Book')}${btn('delPatient', r.id, 'Delete', 'danger')}</div>` }
  ], rows, 'No patients match your search');
}
const patientFields = () => [
  { name: 'name', label: 'Patient Name', required: true }, { name: 'dob', label: 'Date of Birth', type: 'date', required: true, max: today() },
  { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true }, { name: 'mobile', label: 'Mobile Number', type: 'tel', required: true, pattern: '[0-9+\\- ]{10,15}', title: '10–15 digits' },
  { name: 'email', label: 'Email Address', type: 'email' }, { name: 'blood', label: 'Blood Group', type: 'select', options: BLOOD, placeholder: 'Select' },
  { name: 'emergency', label: 'Emergency Contact' }, { name: 'address', label: 'Address' },
  { name: 'history', label: 'Medical History', type: 'textarea' }, { name: 'allergies', label: 'Allergies', type: 'textarea' }
];
function patientForm(id) {
  const p = id ? P(id) : null;
  openForm({
    title: p ? `Edit Patient – ${p.id}` : 'Register New Patient', fields: patientFields(), values: p || { gender: 'Male' }, submitLabel: p ? 'Update' : 'Register',
    onSubmit(d) {
      if (p) { Object.assign(p, d); toast('Patient updated'); }
      else { const n = { id: nextId('PAT', db.patients), registeredOn: today(), ...d }; db.patients.push(n); toast(`Patient registered – ${n.id}`); }
      save(); rerender();
    }
  });
}
function viewPatient(id) {
  const p = P(id); if (!p) return;
  const ap = db.appointments.filter(a => a.patientId === id).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const cs = db.consultations.filter(c => c.patientId === id).sort((a, b) => b.date.localeCompare(a.date));
  const kv = (k, v) => `<div><div class="k">${k}</div><div class="v">${esc(v) || '—'}</div></div>`;
  modal(`Patient Profile – ${esc(p.name)}`, `
  <div class="detail-grid">${kv('Patient ID', p.id)}${kv('Name', p.name)}${kv('Age / DOB', `${ageOf(p.dob)} yrs · ${fmtDate(p.dob)}`)}${kv('Gender', p.gender)}${kv('Mobile', p.mobile)}${kv('Email', p.email)}${kv('Blood Group', p.blood)}${kv('Emergency Contact', p.emergency)}${kv('Address', p.address)}${kv('Registered On', fmtDate(p.registeredOn))}${kv('Medical History', p.history)}${kv('Allergies', p.allergies)}</div>
  <div class="section-title">Appointment History (${ap.length})</div>
  ${table([{ h: 'Date', f: r => fmtDate(r.date) + ' ' + fmtTime(r.time) }, { h: 'Doctor', f: r => esc(dName(r.doctorId)) }, { h: 'Type', f: r => badge(r.type) }, { h: 'Reason', f: r => esc(r.reason) }, { h: 'Status', f: r => badge(r.status) }], ap, 'No appointments yet')}
  <div class="section-title">Consultation History (${cs.length})</div>
  ${table([{ h: 'Date', f: r => fmtDate(r.date) }, { h: 'Doctor', f: r => esc(dName(r.doctorId)) }, { h: 'Diagnosis', f: r => esc(r.diagnosis) }, { h: 'Follow-up', f: r => fmtDate(r.followUp) }, { h: '', f: r => btn('viewConsult', r.id, 'Open') }], cs, 'No consultations yet')}
  <div class="form-foot"><button class="btn" data-act="closeModal">Close</button><button class="btn" data-act="editPatient" data-id="${id}">Edit</button><button class="btn primary" data-act="bookFor" data-id="${id}">Book Appointment</button></div>`, true);
}

/* =====================================================================
   APPOINTMENTS
   ===================================================================== */
function weekRange(d) { const x = parse(d), off = (x.getDay() + 6) % 7; return [addDays(-off, x), addDays(6 - off, x)]; }
function renderAppts() {
  const f = ui.appts;
  $('#view').innerHTML = `${pageHead('Appointment Management', 'Schedule and track patient appointments', '<button class="btn primary" data-act="addAppt">＋ Book Appointment</button>')}
  <div class="toolbar"><input type="search" placeholder="Search patient, doctor, reason…" value="${esc(f.q)}" data-filter="appts.q">
  <select data-filter="appts.status"><option value="">All statuses</option>${opts(APPT_STATUS, f.status)}</select>
  <select data-filter="appts.doctor"><option value="">All doctors</option>${opts(db.doctors.map(d => [d.id, d.name]), f.doctor)}</select>
  <select data-filter="appts.view">${opts([['all', 'All dates'], ['day', 'Daily view'], ['week', 'Weekly view'], ['month', 'Monthly view']], f.view)}</select>
  <input type="date" value="${f.date}" data-filter="appts.date" ${f.view === 'all' ? 'disabled' : ''}></div><div id="rangeLbl" class="muted small" style="margin-bottom:8px"></div><div id="tbl"></div>`;
  refreshAppts();
}
function refreshAppts() {
  const f = ui.appts; let lo = '', hi = '', lbl = 'Showing all appointments';
  if (f.view === 'day') { lo = hi = f.date; lbl = `Day: ${fmtDate(f.date)}`; }
  else if (f.view === 'week') { [lo, hi] = weekRange(f.date); lbl = `Week: ${fmtDate(lo)} – ${fmtDate(hi)}`; }
  else if (f.view === 'month') { lo = f.date.slice(0, 7) + '-01'; hi = f.date.slice(0, 7) + '-31'; lbl = `Month: ${MON[+f.date.slice(5, 7) - 1]} ${f.date.slice(0, 4)}`; }
  $('#rangeLbl').textContent = lbl;
  const rows = db.appointments.filter(a => (!lo || (a.date >= lo && a.date <= hi)) && (!f.status || a.status === f.status) && (!f.doctor || a.doctorId === f.doctor) && matchQ(f.q, pName(a.patientId), a.patientId, dName(a.doctorId), a.reason, a.id))
    .sort((a, b) => (f.view === 'all' ? (b.date + b.time).localeCompare(a.date + a.time) : (a.date + a.time).localeCompare(b.date + b.time)));
  $('#tbl').innerHTML = table([
    { h: 'ID', f: r => r.id }, { h: 'Date & Time', f: r => `<span class="strong">${fmtDate(r.date)}</span><br><span class="muted small">${fmtTime(r.time)}</span>` },
    { h: 'Patient', f: r => `${esc(pName(r.patientId))}<br><span class="muted small">${r.patientId}</span>` }, { h: 'Doctor', f: r => esc(dName(r.doctorId)) },
    { h: 'Type', f: r => badge(r.type) }, { h: 'Reason', f: r => esc(r.reason) },
    { h: 'Status', f: r => `<select data-change="apptStatus" data-id="${r.id}">${opts(APPT_STATUS, r.status)}</select>` },
    { h: 'Actions', f: r => `<div class="row-actions">${btn('editAppt', r.id, 'Edit')}${btn('delAppt', r.id, 'Delete', 'danger')}</div>` }
  ], rows, 'No appointments found');
}
function apptForm(id, preset = {}) {
  const a = id ? db.appointments.find(x => x.id === id) : null;
  const vals = a ? { ...a } : { type: 'New', status: 'Scheduled', date: today(), time: db.settings.slots[0], ...preset };
  const fields = [
    { name: 'patientId', label: 'Patient', type: 'select', required: true, placeholder: 'Select patient', options: [...(a ? [] : [['__new__', '➕ Register a new patient']]), ...patOpts()] },
    { name: 'newName', label: 'New Patient Name', required: true, showIf: ['patientId', '__new__'] }, { name: 'newMobile', label: 'Mobile Number', type: 'tel', required: true, showIf: ['patientId', '__new__'] },
    { name: 'newGender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], showIf: ['patientId', '__new__'] }, { name: 'newDob', label: 'Date of Birth', type: 'date', required: true, showIf: ['patientId', '__new__'], max: today() },
    { name: 'doctorId', label: 'Doctor', type: 'select', required: true, placeholder: 'Select doctor', options: docOpts(true) },
    { name: 'date', label: 'Appointment Date', type: 'date', required: true }, { name: 'time', label: 'Time Slot', type: 'select', required: true, options: db.settings.slots.map(s => [s, fmtTime(s)]) },
    { name: 'type', label: 'Consultation Type', type: 'select', options: ['New', 'Follow-up'], required: true }, { name: 'status', label: 'Status', type: 'select', options: APPT_STATUS },
    { name: 'reason', label: 'Reason / Symptoms', type: 'textarea', required: true }
  ];
  openForm({
    title: a ? `Edit Appointment – ${a.id}` : 'Book New Appointment', fields, values: vals, submitLabel: a ? 'Update' : 'Book',
    onSubmit(d) {
      const doc = Dc(d.doctorId), dayName = DAYS[parse(d.date).getDay()];
      if (doc && !doc.days.includes(dayName)) { toast(`${doc.name} is not available on ${dayName}s`, 'err'); return false; }
      if (doc && (d.time < doc.from || d.time >= doc.to)) { toast(`${doc.name} is available ${fmtTime(doc.from)} – ${fmtTime(doc.to)} only`, 'err'); return false; }
      if (db.appointments.some(x => x.id !== id && x.doctorId === d.doctorId && x.date === d.date && x.time === d.time && x.status !== 'Cancelled')) { toast('This doctor already has an appointment at that date & time. Pick another slot.', 'err'); return false; }
      if (d.patientId === '__new__') {
        const np = { id: nextId('PAT', db.patients), name: d.newName, dob: d.newDob, gender: d.newGender || 'Male', mobile: d.newMobile, email: '', address: '', blood: '', emergency: '', history: '', allergies: '', registeredOn: today() };
        db.patients.push(np); d.patientId = np.id;
      }
      ['newName', 'newMobile', 'newGender', 'newDob'].forEach(k => delete d[k]);
      if (a) Object.assign(a, d); else db.appointments.push({ id: nextId('APT', db.appointments), status: 'Scheduled', ...d });
      toast(a ? 'Appointment updated' : 'Appointment booked'); save(); rerender();
    }
  });
}

/* =====================================================================
   DOCTORS
   ===================================================================== */
function renderDoctors() {
  const f = ui.doctors;
  $('#view').innerHTML = `${pageHead('Doctor Management', 'Manage ENT specialists and their availability', '<button class="btn primary" data-act="addDoctor">＋ Add Doctor</button>')}
  <div class="toolbar"><input type="search" placeholder="Search doctor, ID, specialization…" value="${esc(f.q)}" data-filter="doctors.q">
  <select data-filter="doctors.spec"><option value="">All specializations</option>${opts(SPECS, f.spec)}</select>
  <select data-filter="doctors.active"><option value="">All</option>${opts([['1', 'Active'], ['0', 'Inactive']], f.active)}</select></div><div id="tbl"></div>`;
  refreshDoctors();
}
const photoEl = (d, lg) => `<div class="photo ${lg ? 'lg' : ''}">${d.photo ? `<img src="${d.photo}" alt="">` : initials(d.name)}</div>`;
function refreshDoctors() {
  const f = ui.doctors, dn = DAYS[new Date().getDay()];
  const rows = db.doctors.filter(d => matchQ(f.q, d.id, d.name, d.specialization, d.qualification) && (!f.spec || d.specialization === f.spec) && (!f.active || (f.active === '1') === d.active));
  $('#tbl').innerHTML = rows.length ? `<div class="doc-grid">${rows.map(d => `<div class="doc-card"><div class="doc-top">${photoEl(d)}<div><div class="strong" style="font-size:15px">${esc(d.name)}</div><div class="muted small">${d.id} · ${esc(d.specialization)}</div><div style="margin-top:4px">${badge(d.active ? 'Active' : 'Inactive')} ${d.active && d.days.includes(dn) ? '<span class="badge b-new">Available today</span>' : ''}</div></div></div>
    <div class="small"><b>Qualification:</b> ${esc(d.qualification)}<br><b>Experience:</b> ${d.experience} yrs · <b>Fee:</b> ${money(d.fee)}<br><b>Timings:</b> ${fmtTime(d.from)} – ${fmtTime(d.to)}<br><b>Contact:</b> ${esc(d.mobile)}</div>
    <div class="chips">${WEEK.map(w => `<span class="chip ${d.days.includes(w) ? 'on' : ''}">${w.slice(0, 3)}</span>`).join('')}</div>
    <div class="row-actions">${btn('viewDoctor', d.id, 'History')}${btn('editDoctor', d.id, 'Edit')}${btn('toggleDoctor', d.id, d.active ? 'Deactivate' : 'Activate')}${btn('delDoctor', d.id, 'Delete', 'danger')}</div></div>`).join('')}</div>` : '<div class="table-wrap"><div class="empty">No doctors found</div></div>';
}
function doctorForm(id) {
  const d = id ? Dc(id) : null;
  openForm({
    title: d ? `Edit Doctor – ${d.id}` : 'Add New Doctor', submitLabel: d ? 'Update' : 'Add Doctor', values: d || { days: WEEK.slice(0, 6), from: '09:00', to: '17:00', specialization: 'General ENT' },
    fields: [
      { name: 'name', label: 'Doctor Name', required: true, ph: 'Dr. …' }, { name: 'qualification', label: 'Qualification', required: true }, { name: 'specialization', label: 'Specialization', type: 'select', options: SPECS, required: true },
      { name: 'experience', label: 'Experience (years)', type: 'number', min: 0, required: true }, { name: 'mobile', label: 'Mobile Number', type: 'tel', required: true }, { name: 'email', label: 'Email Address', type: 'email' },
      { name: 'fee', label: 'Consultation Fee (₹)', type: 'number', min: 0, required: true }, { name: 'from', label: 'Available From', type: 'time', required: true }, { name: 'to', label: 'Available To', type: 'time', required: true },
      { name: 'days', label: 'Available Days', type: 'checkboxes', options: WEEK }, { name: 'photo', label: 'Profile Photo', type: 'image' }
    ],
    onSubmit(x) {
      if (x.from >= x.to) { toast('"Available To" must be after "Available From"', 'err'); return false; }
      if (!x.days.length) { toast('Select at least one available day', 'err'); return false; }
      if (d) { Object.assign(d, x); toast('Doctor updated'); }
      else { const n = { id: nextId('DOC', db.doctors, 3), active: true, ...x }; db.doctors.push(n); toast(`Doctor added – ${n.id}`); }
      save(); rerender();
    }
  });
}
function viewDoctor(id) {
  const d = Dc(id); if (!d) return;
  const ap = db.appointments.filter(a => a.doctorId === id).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  modal(`${esc(d.name)} – Profile & Appointment History`, `<div class="doc-top" style="margin-bottom:14px">${photoEl(d, true)}<div><div class="strong" style="font-size:17px">${esc(d.name)}</div><div class="muted">${esc(d.qualification)}</div><div>${esc(d.specialization)} · ${d.experience} yrs · ${money(d.fee)}</div><div class="small muted">${esc(d.mobile)} · ${esc(d.email)}</div></div></div>
  <div class="section-title">Availability</div><div class="chips">${WEEK.map(w => `<span class="chip ${d.days.includes(w) ? 'on' : ''}">${w}</span>`).join('')}</div><p class="small">Timings: <b>${fmtTime(d.from)} – ${fmtTime(d.to)}</b></p>
  <div class="section-title">Appointment History (${ap.length})</div>
  ${table([{ h: 'Date & Time', f: r => `${fmtDate(r.date)} ${fmtTime(r.time)}` }, { h: 'Patient', f: r => esc(pName(r.patientId)) }, { h: 'Type', f: r => badge(r.type) }, { h: 'Status', f: r => badge(r.status) }], ap.slice(0, 60), 'No appointments')}
  <div class="form-foot"><button class="btn" data-act="closeModal">Close</button></div>`, true);
}

/* =====================================================================
   STAFF
   ===================================================================== */
function renderStaff() {
  const f = ui.staff;
  $('#view').innerHTML = `${pageHead('Staff Management', 'Hospital staff records', '<button class="btn primary" data-act="addStaff">＋ Add Staff</button>')}
  <div class="toolbar"><input type="search" placeholder="Search name, ID, designation…" value="${esc(f.q)}" data-filter="staff.q">
  <select data-filter="staff.dept"><option value="">All departments</option>${opts(db.settings.departments, f.dept)}</select>
  <select data-filter="staff.active"><option value="">All</option>${opts([['1', 'Active'], ['0', 'Inactive']], f.active)}</select></div><div id="tbl"></div>`;
  refreshStaff();
}
function refreshStaff() {
  const f = ui.staff;
  const rows = db.staff.filter(s => matchQ(f.q, s.id, s.name, s.designation, s.mobile) && (!f.dept || s.department === f.dept) && (!f.active || (f.active === '1') === s.active));
  $('#tbl').innerHTML = table([
    { h: 'Staff ID', f: r => `<span class="strong">${r.id}</span>` }, { h: 'Name', f: r => esc(r.name) }, { h: 'Department', f: r => esc(r.department) }, { h: 'Designation', f: r => esc(r.designation) },
    { h: 'Mobile', f: r => esc(r.mobile) }, { h: 'Joined', f: r => fmtDate(r.joined) }, { h: 'Status', f: r => badge(r.active ? 'Active' : 'Inactive') },
    { h: 'Actions', f: r => `<div class="row-actions">${btn('viewStaff', r.id, 'View')}${btn('editStaff', r.id, 'Edit')}${btn('toggleStaff', r.id, r.active ? 'Deactivate' : 'Activate')}${btn('delStaff', r.id, 'Delete', 'danger')}</div>` }
  ], rows, 'No staff found');
}
function staffForm(id) {
  const s = id ? db.staff.find(x => x.id === id) : null;
  openForm({
    title: s ? `Edit Staff – ${s.id}` : 'Add New Staff', values: s || { joined: today() }, submitLabel: s ? 'Update' : 'Add Staff',
    fields: [{ name: 'name', label: 'Staff Name', required: true }, { name: 'department', label: 'Department', type: 'select', options: db.settings.departments, required: true, placeholder: 'Select' }, { name: 'designation', label: 'Designation', required: true },
    { name: 'mobile', label: 'Mobile Number', type: 'tel', required: true }, { name: 'email', label: 'Email Address', type: 'email' }, { name: 'joined', label: 'Joining Date', type: 'date', required: true }, { name: 'address', label: 'Address', type: 'textarea' }],
    onSubmit(d) { if (s) { Object.assign(s, d); toast('Staff updated'); } else { const n = { id: nextId('STF', db.staff, 3), active: true, ...d }; db.staff.push(n); toast(`Staff added – ${n.id}`); } save(); rerender(); }
  });
}

/* =====================================================================
   CONSULTATIONS
   ===================================================================== */
function renderConsults() {
  const f = ui.consults;
  $('#view').innerHTML = `${pageHead('Consultations & Medical Records', 'ENT examination notes and treatment plans', '<button class="btn primary" data-act="addConsult">＋ New Consultation</button>')}
  <div class="toolbar"><input type="search" placeholder="Search patient, diagnosis…" value="${esc(f.q)}" data-filter="consults.q">
  <select data-filter="consults.doctor"><option value="">All doctors</option>${opts(db.doctors.map(d => [d.id, d.name]), f.doctor)}</select></div><div id="tbl"></div>`;
  refreshConsults();
}
function refreshConsults() {
  const f = ui.consults;
  const rows = db.consultations.filter(c => matchQ(f.q, pName(c.patientId), c.patientId, c.diagnosis, c.complaints, c.id) && (!f.doctor || c.doctorId === f.doctor)).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  $('#tbl').innerHTML = table([
    { h: 'ID', f: r => r.id }, { h: 'Date', f: r => fmtDate(r.date) }, { h: 'Patient', f: r => `${esc(pName(r.patientId))}<br><span class="muted small">${r.patientId}</span>` }, { h: 'Doctor', f: r => esc(dName(r.doctorId)) },
    { h: 'Diagnosis', f: r => esc(r.diagnosis) }, { h: 'Follow-up', f: r => fmtDate(r.followUp) },
    { h: 'Actions', f: r => `<div class="row-actions">${btn('viewConsult', r.id, 'View')}${btn('editConsult', r.id, 'Edit')}${btn('addRxFor', r.id, 'Prescribe')}${btn('delConsult', r.id, 'Delete', 'danger')}</div>` }
  ], rows, 'No consultations recorded');
}
function consultForm(id, preset = {}) {
  const c = id ? db.consultations.find(x => x.id === id) : null;
  openForm({
    title: c ? `Edit Consultation – ${c.id}` : 'New Consultation', values: c || { date: today(), ...preset }, wide: true, submitLabel: c ? 'Update' : 'Save Consultation',
    fields: [
      { name: 'patientId', label: 'Patient', type: 'select', options: patOpts(), required: true, placeholder: 'Select patient' }, { name: 'doctorId', label: 'Doctor', type: 'select', options: docOpts(), required: true, placeholder: 'Select doctor' },
      { name: 'date', label: 'Consultation Date', type: 'date', required: true }, { name: 'followUp', label: 'Follow-up Date', type: 'date' },
      { name: 'complaints', label: 'Patient Complaints', type: 'textarea', required: true }, { name: 'symptoms', label: 'Symptoms', type: 'textarea' },
      { name: 'ear', label: 'Ear Examination', type: 'textarea' }, { name: 'nose', label: 'Nose Examination', type: 'textarea' }, { name: 'throat', label: 'Throat Examination', type: 'textarea' },
      { name: 'hearing', label: 'Hearing Assessment', type: 'textarea' }, { name: 'general', label: 'General ENT Examination', type: 'textarea' }, { name: 'diagnosis', label: 'Diagnosis', type: 'textarea', required: true },
      { name: 'treatment', label: 'Treatment Recommendations', type: 'textarea' }
    ],
    onSubmit(d) {
      if (d.followUp && d.followUp < d.date) { toast('Follow-up date cannot be before consultation date', 'err'); return false; }
      if (c) { Object.assign(c, d); toast('Consultation updated'); } else { const n = { id: nextId('CON', db.consultations), ...d }; db.consultations.push(n); toast(`Consultation saved – ${n.id}`); }
      save(); rerender();
    }
  });
}
function viewConsult(id) {
  const c = db.consultations.find(x => x.id === id); if (!c) return;
  const kv = (k, v) => `<div><div class="k">${k}</div><div class="v" style="font-weight:500">${esc(v) || '—'}</div></div>`;
  modal(`Consultation ${c.id}`, `<div class="detail-grid">${kv('Patient', `${pName(c.patientId)} (${c.patientId})`)}${kv('Doctor', dName(c.doctorId))}${kv('Date', fmtDate(c.date))}${kv('Follow-up', fmtDate(c.followUp))}</div>
  <div class="detail-grid">${kv('Complaints', c.complaints)}${kv('Symptoms', c.symptoms)}${kv('Ear Examination', c.ear)}${kv('Nose Examination', c.nose)}${kv('Throat Examination', c.throat)}${kv('Hearing Assessment', c.hearing)}${kv('General ENT Examination', c.general)}${kv('Diagnosis', c.diagnosis)}${kv('Treatment', c.treatment)}</div>
  <div class="form-foot"><button class="btn" data-act="closeModal">Close</button><button class="btn" data-act="printConsult" data-id="${id}">🖨 Print</button><button class="btn primary" data-act="addRxFor" data-id="${id}">Create Prescription</button></div>`, true);
}

/* =====================================================================
   PRESCRIPTIONS
   ===================================================================== */
function renderRx() {
  const f = ui.rx;
  $('#view').innerHTML = `${pageHead('Prescription Management', 'Create, view and print prescriptions', '<button class="btn primary" data-act="addRx">＋ New Prescription</button>')}
  <div class="toolbar"><input type="search" placeholder="Search patient, medicine, diagnosis…" value="${esc(f.q)}" data-filter="rx.q">
  <select data-filter="rx.doctor"><option value="">All doctors</option>${opts(db.doctors.map(d => [d.id, d.name]), f.doctor)}</select></div><div id="tbl"></div>`;
  refreshRx();
}
function refreshRx() {
  const f = ui.rx;
  const rows = db.prescriptions.filter(r => matchQ(f.q, pName(r.patientId), r.patientId, r.diagnosis, r.medicines.map(m => m.name).join(' '), r.id) && (!f.doctor || r.doctorId === f.doctor)).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  $('#tbl').innerHTML = table([
    { h: 'Rx ID', f: r => r.id }, { h: 'Date', f: r => fmtDate(r.date) }, { h: 'Patient', f: r => `${esc(pName(r.patientId))}<br><span class="muted small">${r.patientId}</span>` }, { h: 'Doctor', f: r => esc(dName(r.doctorId)) },
    { h: 'Medicines', f: r => `${r.medicines.length} item(s)<br><span class="muted small">${esc(r.medicines.map(m => m.name).join(', ').slice(0, 60))}</span>` },
    { h: 'Actions', f: r => `<div class="row-actions">${btn('viewRx', r.id, 'View')}${btn('printRx', r.id, '🖨 Print')}${btn('editRx', r.id, 'Edit')}${btn('delRx', r.id, 'Delete', 'danger')}</div>` }
  ], rows, 'No prescriptions found');
}
const rxRowHTML = (m = {}) => `<div class="line-row rx-row"><input data-k="name" placeholder="Medicine name" value="${esc(m.name || '')}"><input data-k="dosage" placeholder="Dosage" value="${esc(m.dosage || '')}">
  <select data-k="frequency">${opts(FREQ, m.frequency || FREQ[1])}</select><input data-k="duration" placeholder="Duration" value="${esc(m.duration || '')}"><input data-k="instructions" placeholder="Instructions" value="${esc(m.instructions || '')}"><button type="button" class="icon-btn" data-act="rmRow" title="Remove">✕</button></div>`;
function rxForm(id, preset = {}) {
  const r = id ? db.prescriptions.find(x => x.id === id) : null;
  openForm({
    title: r ? `Edit Prescription – ${r.id}` : 'New Prescription', wide: true, values: r || { date: today(), ...preset }, submitLabel: r ? 'Update' : 'Save Prescription',
    fields: [{ name: 'patientId', label: 'Patient', type: 'select', options: patOpts(), required: true, placeholder: 'Select patient' }, { name: 'doctorId', label: 'Doctor', type: 'select', options: docOpts(), required: true, placeholder: 'Select doctor' },
    { name: 'date', label: 'Date', type: 'date', required: true }, { name: 'diagnosis', label: 'Diagnosis' }, { name: 'notes', label: 'Additional Notes / Advice', type: 'textarea' }],
    extraHTML: `<div class="sub-head">Medicines <button type="button" class="btn sm" data-act="addRxRow">＋ Add medicine</button></div><div class="line-rows" id="rxRows">${(r ? r.medicines : [{}]).map(rxRowHTML).join('')}</div>`,
    extra: form => ({ medicines: $$('.rx-row', form).map(row => Object.fromEntries($$('[data-k]', row).map(i => [i.dataset.k, i.value.trim()]))).filter(m => m.name) }),
    onSubmit(d) {
      if (!d.medicines.length) { toast('Add at least one medicine', 'err'); return false; }
      if (r) { Object.assign(r, d); toast('Prescription updated'); } else { const n = { id: nextId('RX', db.prescriptions), ...d }; db.prescriptions.push(n); toast(`Prescription saved – ${n.id}`); }
      save(); rerender();
    }
  });
}
function viewRx(id) {
  const r = db.prescriptions.find(x => x.id === id); if (!r) return;
  modal(`Prescription ${r.id}`, `<div class="doc-print">${rxDoc(r)}</div><div class="form-foot"><button class="btn" data-act="closeModal">Close</button><button class="btn primary" data-act="printRx" data-id="${id}">🖨 Print</button></div>`, true);
}

/* =====================================================================
   BILLING
   ===================================================================== */
function renderBilling() {
  const f = ui.billing, inv = db.invoices;
  $('#view').innerHTML = `${pageHead('Billing & Payments', 'Invoices, payments and balances', '<button class="btn primary" data-act="addInv">＋ New Invoice</button>')}
  <div class="grid g-stats"><div class="card stat"><div class="stat-ico" style="background:#d1fae5">💰</div><div><div class="stat-val">${money(inv.reduce((s, i) => s + i.paid, 0))}</div><div class="stat-lbl">Collected</div></div></div>
  <div class="card stat"><div class="stat-ico" style="background:#fee2e2">🧾</div><div><div class="stat-val">${money(inv.reduce((s, i) => s + balance(i), 0))}</div><div class="stat-lbl">Outstanding</div></div></div>
  <div class="card stat"><div class="stat-ico" style="background:#dbeafe">📄</div><div><div class="stat-val">${inv.length}</div><div class="stat-lbl">Total invoices</div></div></div></div>
  <div class="toolbar"><input type="search" placeholder="Search invoice, patient…" value="${esc(f.q)}" data-filter="billing.q">
  <select data-filter="billing.status"><option value="">All payment statuses</option>${opts(PAY_STATUS, f.status)}</select></div><div id="tbl"></div>`;
  refreshBilling();
}
function refreshBilling() {
  const f = ui.billing;
  const rows = db.invoices.filter(i => matchQ(f.q, i.id, pName(i.patientId), i.patientId) && (!f.status || i.status === f.status)).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  $('#tbl').innerHTML = table([
    { h: 'Invoice', f: r => `<span class="strong">${r.id}</span>` }, { h: 'Date', f: r => fmtDate(r.date) }, { h: 'Patient', f: r => esc(pName(r.patientId)) },
    { h: 'Total', cls: 'right', f: r => money(r.total) }, { h: 'Paid', cls: 'right', f: r => money(r.paid) }, { h: 'Balance', cls: 'right', f: r => money(balance(r)) },
    { h: 'Method', f: r => esc(r.method) }, { h: 'Status', f: r => badge(r.status) },
    { h: 'Actions', f: r => `<div class="row-actions">${btn('viewInv', r.id, 'View')}${btn('printInv', r.id, '🖨')}${btn('dlInv', r.id, '⬇')}${btn('editInv', r.id, 'Edit')}${btn('delInv', r.id, 'Delete', 'danger')}</div>` }
  ], rows, 'No invoices found');
}
const invRowHTML = (x = {}) => `<div class="line-row inv-row"><select data-k="type">${opts(['Consultation', 'Procedure', 'Medicine'], x.type || 'Consultation')}</select><input data-k="desc" placeholder="Description" value="${esc(x.desc || '')}" required>
  <input data-k="qty" type="number" min="1" value="${x.qty || 1}" title="Qty"><input data-k="rate" type="number" min="0" step="1" value="${x.rate ?? ''}" placeholder="Rate ₹" required><span class="strong" data-amt>${money((x.qty || 1) * (x.rate || 0))}</span><button type="button" class="icon-btn" data-act="rmRow" title="Remove">✕</button></div>`;
function readInvRows(form) { return $$('.inv-row', form).map(r => ({ type: $('[data-k=type]', r).value, desc: $('[data-k=desc]', r).value.trim(), qty: Number($('[data-k=qty]', r).value) || 1, rate: Number($('[data-k=rate]', r).value) || 0 })); }
function calcInv(form) {
  const rows = $$('.inv-row', form); let sub = 0;
  rows.forEach(r => { const a = (Number($('[data-k=qty]', r).value) || 0) * (Number($('[data-k=rate]', r).value) || 0); $('[data-amt]', r).textContent = money(a); sub += a; });
  const disc = Math.min(Number(form.elements.discount.value) || 0, sub);
  $('#invTotals').innerHTML = `<div><span>Subtotal</span><span>${money(sub)}</span></div><div><span>Discount</span><span>- ${money(disc)}</span></div><div class="grand"><span>Total</span><span>${money(sub - disc)}</span></div>`;
}
function invForm(id, preset = {}) {
  const inv = id ? db.invoices.find(x => x.id === id) : null;
  openForm({
    title: inv ? `Edit Invoice – ${inv.id}` : 'Generate Invoice', wide: true, submitLabel: inv ? 'Update' : 'Generate Invoice',
    values: inv || { date: today(), discount: 0, method: 'Cash', status: 'Paid', ...preset },
    fields: [{ name: 'patientId', label: 'Patient', type: 'select', options: patOpts(), required: true, placeholder: 'Select patient' }, { name: 'doctorId', label: 'Doctor', type: 'select', options: docOpts(), placeholder: 'Select doctor' },
    { name: 'date', label: 'Invoice Date', type: 'date', required: true }, { name: 'discount', label: 'Discount (₹)', type: 'number', min: 0 },
    { name: 'method', label: 'Payment Method', type: 'select', options: PAY_METHODS }, { name: 'status', label: 'Payment Status', type: 'select', options: PAY_STATUS },
    { name: 'paidAmount', label: 'Amount Paid (₹)', type: 'number', min: 0, showIf: ['status', 'Partially Paid'], required: true, default: inv && inv.status === 'Partially Paid' ? inv.paid : '' }],
    extraHTML: `<div class="sub-head">Charges <span><button type="button" class="btn sm" data-act="addConsultFee">＋ Consultation fee</button> <select id="svcPick" style="padding:4px 8px;border-radius:6px;border:1px solid var(--border)"><option value="">＋ Add service…</option>${db.services.filter(s => s.active).map(s => `<option value="${s.id}">${esc(s.name)} – ${money(s.charge)}</option>`).join('')}</select> <button type="button" class="btn sm" data-act="addRowInv">＋ Medicine / custom</button></span></div>
      <div class="line-rows" id="invRows">${(inv ? inv.items : [{ type: 'Consultation', desc: 'Consultation charges', qty: 1, rate: '' }]).map(invRowHTML).join('')}</div><div class="totals" id="invTotals"></div>`,
    bind(form) {
      calcInv(form);
      form.addEventListener('input', () => calcInv(form));
      $('#svcPick', form).onchange = e => {
        const s = db.services.find(x => x.id === e.target.value); if (!s) return;
        $('#invRows', form).insertAdjacentHTML('beforeend', invRowHTML({ type: s.category === 'Consultation' ? 'Consultation' : 'Procedure', desc: s.name, qty: 1, rate: s.charge })); e.target.value = ''; calcInv(form);
      };
      form.elements.doctorId.addEventListener('change', () => { /* doctor chosen: used by "Consultation fee" button */ });
    },
    extra: form => ({ items: readInvRows(form) }),
    onSubmit(d) {
      if (!d.items.length) { toast('Add at least one charge', 'err'); return false; }
      const sub = d.items.reduce((s, x) => s + x.qty * x.rate, 0), disc = Math.min(d.discount || 0, sub), total = sub - disc;
      const paid = d.status === 'Paid' ? total : d.status === 'Pending' ? 0 : Math.min(d.paidAmount || 0, total);
      const rec = { patientId: d.patientId, doctorId: d.doctorId || '', date: d.date, items: d.items, discount: disc, total, method: d.method, status: d.status, paid };
      if (inv) { Object.assign(inv, rec); toast('Invoice updated'); } else { const n = { id: nextId('INV', db.invoices), ...rec }; db.invoices.push(n); toast(`Invoice generated – ${n.id}`); }
      save(); rerender();
    }
  });
}
function viewInv(id) {
  const i = db.invoices.find(x => x.id === id); if (!i) return;
  modal(`Invoice ${i.id}`, `<div class="doc-print">${invDoc(i)}</div><div class="form-foot"><button class="btn" data-act="closeModal">Close</button><button class="btn" data-act="dlInv" data-id="${id}">⬇ Download</button><button class="btn primary" data-act="printInv" data-id="${id}">🖨 Print / Save PDF</button></div>`, true);
}

/* =====================================================================
   ENT SERVICES
   ===================================================================== */
function renderServices() {
  $('#view').innerHTML = `${pageHead('ENT Services & Procedures', 'Manage the service catalogue and charges', '<button class="btn primary" data-act="addSvc">＋ Add Service</button>')}
  <div class="toolbar"><input type="search" placeholder="Search services…" value="${esc(ui.services.q)}" data-filter="services.q"></div><div id="tbl"></div>`;
  refreshServices();
}
function refreshServices() {
  const rows = db.services.filter(s => matchQ(ui.services.q, s.name, s.category, s.id));
  $('#tbl').innerHTML = table([{ h: 'ID', f: r => r.id }, { h: 'Service', f: r => `<span class="strong">${esc(r.name)}</span>` }, { h: 'Category', f: r => esc(r.category) }, { h: 'Charge', cls: 'right', f: r => money(r.charge) }, { h: 'Status', f: r => badge(r.active ? 'Active' : 'Inactive') },
  { h: 'Actions', f: r => `<div class="row-actions">${btn('editSvc', r.id, 'Edit')}${btn('toggleSvc', r.id, r.active ? 'Deactivate' : 'Activate')}${btn('delSvc', r.id, 'Delete', 'danger')}</div>` }], rows, 'No services found');
}
function svcForm(id) {
  const s = id ? db.services.find(x => x.id === id) : null;
  openForm({
    title: s ? 'Edit Service' : 'Add Service', values: s || { category: 'Procedure' }, submitLabel: s ? 'Update' : 'Add',
    fields: [{ name: 'name', label: 'Service Name', required: true, full: true }, { name: 'category', label: 'Category', type: 'select', options: ['Consultation', 'Procedure', 'Diagnostic'] }, { name: 'charge', label: 'Charge (₹)', type: 'number', min: 0, required: true }],
    onSubmit(d) { if (s) { Object.assign(s, d); toast('Service updated'); } else { db.services.push({ id: nextId('SRV', db.services, 3), active: true, ...d }); toast('Service added'); } save(); rerender(); }
  });
}

/* =====================================================================
   REPORTS
   ===================================================================== */
const REPORTS = {
  daily_reg: 'Daily Patient Registration Report', monthly_reg: 'Monthly Patient Registration Report', doctor_appts: 'Doctor-wise Appointment Report',
  status: 'Appointment Status Report', revenue: 'Revenue Report', pending: 'Pending Payment Report', doctor_perf: 'Doctor Performance Summary'
};
function renderReports() {
  const f = ui.reports;
  $('#view').innerHTML = `${pageHead('Reports & Analytics', 'Generate, filter and export reports', '<button class="btn" data-act="exportXls">📊 Export Excel</button><button class="btn primary" data-act="exportPdf">📄 Export PDF</button>')}
  <div class="toolbar"><select data-filter="reports.type" style="min-width:280px">${opts(Object.entries(REPORTS), f.type)}</select>
  <label class="muted small">From</label><input type="date" value="${f.from}" data-filter="reports.from"><label class="muted small">To</label><input type="date" value="${f.to}" data-filter="reports.to"></div><div id="tbl"></div>`;
  refreshReports();
}
function buildReport() {
  const { type, from, to } = ui.reports, inR = d => d >= from && d <= to;
  const A = db.appointments.filter(a => inR(a.date)), I = db.invoices.filter(i => inR(i.date));
  let headers = [], rows = [], summary = '';
  const cnt = (arr, s) => arr.filter(a => a.status === s).length;
  if (type === 'daily_reg') {
    headers = ['Date', 'New Patients', 'Patient Names'];
    const g = {}; db.patients.filter(p => inR(p.registeredOn)).forEach(p => (g[p.registeredOn] ||= []).push(p.name));
    rows = Object.keys(g).sort().reverse().map(d => [fmtDate(d), g[d].length, g[d].join(', ')]);
    summary = `Total registrations: ${rows.reduce((s, r) => s + r[1], 0)}`;
  } else if (type === 'monthly_reg') {
    headers = ['Month', 'New Patients', 'Male', 'Female', 'Other'];
    const g = {}; db.patients.filter(p => inR(p.registeredOn)).forEach(p => (g[monthKey(p.registeredOn)] ||= []).push(p));
    rows = Object.keys(g).sort().reverse().map(k => [`${MON[+k.slice(5) - 1]} ${k.slice(0, 4)}`, g[k].length, g[k].filter(p => p.gender === 'Male').length, g[k].filter(p => p.gender === 'Female').length, g[k].filter(p => p.gender === 'Other').length]);
    summary = `Total registrations: ${rows.reduce((s, r) => s + r[1], 0)}`;
  } else if (type === 'doctor_appts') {
    headers = ['Doctor', 'Specialization', 'Total', 'Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'No Show'];
    rows = db.doctors.map(d => { const x = A.filter(a => a.doctorId === d.id); return [d.name, d.specialization, x.length, cnt(x, 'Scheduled'), cnt(x, 'Confirmed'), cnt(x, 'Completed'), cnt(x, 'Cancelled'), cnt(x, 'No Show')]; });
    summary = `Total appointments: ${A.length}`;
  } else if (type === 'status') {
    headers = ['Status', 'Appointments', 'Share'];
    rows = APPT_STATUS.map(s => [s, cnt(A, s), A.length ? Math.round(cnt(A, s) / A.length * 100) + '%' : '0%']); summary = `Total appointments: ${A.length}`;
  } else if (type === 'revenue') {
    headers = ['Invoice', 'Date', 'Patient', 'Doctor', 'Method', 'Billed', 'Collected', 'Status'];
    rows = I.sort((a, b) => b.date.localeCompare(a.date)).map(i => [i.id, fmtDate(i.date), pName(i.patientId), dName(i.doctorId), i.method, money(i.total), money(i.paid), i.status]);
    summary = `Billed: ${money(I.reduce((s, i) => s + i.total, 0))}  |  Collected: ${money(I.reduce((s, i) => s + i.paid, 0))}  |  Cash ${money(I.filter(i => i.method === 'Cash').reduce((s, i) => s + i.paid, 0))} · UPI ${money(I.filter(i => i.method === 'UPI').reduce((s, i) => s + i.paid, 0))} · Card ${money(I.filter(i => i.method === 'Card').reduce((s, i) => s + i.paid, 0))}`;
  } else if (type === 'pending') {
    headers = ['Invoice', 'Date', 'Patient', 'Mobile', 'Total', 'Paid', 'Balance', 'Status'];
    const pend = I.filter(i => balance(i) > 0);
    rows = pend.map(i => [i.id, fmtDate(i.date), pName(i.patientId), P(i.patientId)?.mobile || '', money(i.total), money(i.paid), money(balance(i)), i.status]);
    summary = `Outstanding: ${money(pend.reduce((s, i) => s + balance(i), 0))} across ${pend.length} invoice(s)`;
  } else {
    headers = ['Doctor', 'Appointments', 'Completed', 'Completion Rate', 'Unique Patients', 'Revenue Collected'];
    rows = db.doctors.map(d => { const x = A.filter(a => a.doctorId === d.id), c = cnt(x, 'Completed'); return [d.name, x.length, c, x.length ? Math.round(c / x.length * 100) + '%' : '0%', new Set(x.map(a => a.patientId)).size, money(I.filter(i => i.doctorId === d.id).reduce((s, i) => s + i.paid, 0))]; });
    summary = 'Based on appointments and invoices in the selected period';
  }
  return { title: REPORTS[type], headers, rows, summary, range: `${fmtDate(from)} to ${fmtDate(to)}` };
}
function reportTableHTML(r) {
  return `<table><thead><tr>${r.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${r.rows.map(x => `<tr>${x.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function refreshReports() {
  const r = buildReport();
  $('#tbl').innerHTML = `<div class="card"><h3>${r.title}<span class="muted small">${r.range}</span></h3><div class="summary-bar"><b>${esc(r.summary)}</b></div>${r.rows.length ? `<div class="table-wrap">${reportTableHTML(r)}</div>` : '<div class="empty">No data for the selected period</div>'}</div>`;
}

/* =====================================================================
   SETTINGS
   ===================================================================== */
function renderSettings() {
  const s = db.settings, h = s.hospital;
  $('#view').innerHTML = `${pageHead('Settings', 'Portal configuration')}
  <div class="grid g-2">
  <div class="card"><h3>Hospital Information</h3><form data-submit="saveHospital"><div class="form-grid">
    <div class="field full"><label class="lbl">Hospital Name</label><input name="name" value="${esc(h.name)}" required></div>
    <div class="field full"><label class="lbl">Logo</label><div style="display:flex;gap:12px;align-items:center"><div class="photo" id="logoPrev">${h.logo ? `<img src="${h.logo}" alt="">` : esc(h.name[0])}</div><input type="file" accept="image/*" id="logoFile"><input type="hidden" name="logo" value="${esc(h.logo)}"></div></div>
    <div class="field full"><label class="lbl">Address</label><textarea name="address">${esc(h.address)}</textarea></div>
    <div class="field"><label class="lbl">Phone</label><input name="phone" value="${esc(h.phone)}"></div><div class="field"><label class="lbl">Email</label><input name="email" type="email" value="${esc(h.email)}"></div></div>
    <div class="form-foot"><button class="btn primary">Save Hospital Info</button></div></form></div>

  <div class="card"><h3>Consultation Charges</h3><form data-submit="saveCharges"><div class="form-grid">
    <div class="field"><label class="lbl">New Consultation (₹)</label><input type="number" min="0" name="newConsult" value="${s.charges.newConsult}" required></div>
    <div class="field"><label class="lbl">Follow-up Consultation (₹)</label><input type="number" min="0" name="followUp" value="${s.charges.followUp}" required></div></div>
    <p class="muted small">Default charges used for general consultations. Doctor-specific fees are set in Doctor Management.</p><div class="form-foot"><button class="btn primary">Save Charges</button></div></form>
    <h3 style="margin-top:22px">Service Management</h3><p class="muted small">Add, edit or deactivate ENT services and their charges.</p><a class="btn" href="#services">Manage ENT Services →</a></div>

  <div class="card"><h3>Appointment Time Slots</h3><div class="chips" style="margin-bottom:14px">${s.slots.map(t => `<span class="chip">${fmtTime(t)}<button data-act="delSlot" data-id="${t}" title="Remove">✕</button></span>`).join('') || '<span class="muted">No slots</span>'}</div>
    <form data-submit="genSlots"><div class="form-grid"><div class="field"><label class="lbl">Start</label><input type="time" name="start" value="09:00" required></div><div class="field"><label class="lbl">End</label><input type="time" name="end" value="17:00" required></div>
    <div class="field"><label class="lbl">Interval (minutes)</label><select name="step">${opts([10, 15, 20, 30, 45, 60], 30)}</select></div></div>
    <p class="muted small">Generating replaces the current list of slots.</p><div class="form-foot"><button class="btn primary">Generate Slots</button></div></form></div>

  <div class="card"><h3>Department Management</h3><div class="chips" style="margin-bottom:14px">${s.departments.map(d => `<span class="chip">${esc(d)}<button data-act="delDept" data-id="${esc(d)}" title="Remove">✕</button></span>`).join('')}</div>
    <form data-submit="addDept" style="display:flex;gap:8px"><input name="dept" placeholder="New department name" required style="flex:1;padding:9px 11px;border:1px solid #cbd5e1;border-radius:8px"><button class="btn primary">Add</button></form>
    <h3 style="margin-top:22px">Demo Data</h3><p class="muted small">Restore the original sample patients, doctors, staff, appointments and invoices.</p><button class="btn danger" data-act="resetData">Reset Demo Data</button></div></div>`;
  $('#logoFile').onchange = e => { if (!e.target.files[0]) return; resizeImage(e.target.files[0], 160, url => { $('input[name=logo]').value = url; $('#logoPrev').innerHTML = `<img src="${url}" alt="">`; }); };
}

/* =====================================================================
   EVENT WIRING
   ===================================================================== */
const A = {
  closeModal, toggleMenu: () => document.body.classList.toggle('menu-open'),
  addPatient: () => patientForm(), editPatient: id => { closeModal(); patientForm(id); }, viewPatient,
  delPatient: id => confirmBox(`Delete patient <b>${esc(pName(id))}</b> and all their appointments, consultations, prescriptions and invoices? This cannot be undone.`, () => {
    db.patients = db.patients.filter(p => p.id !== id); ['appointments', 'consultations', 'prescriptions', 'invoices'].forEach(k => db[k] = db[k].filter(x => x.patientId !== id)); save(); toast('Patient deleted'); rerender();
  }),
  bookFor: id => { closeModal(); apptForm(null, { patientId: id }); },
  addAppt: () => apptForm(), editAppt: id => apptForm(id),
  delAppt: id => confirmBox('Delete this appointment?', () => { db.appointments = db.appointments.filter(a => a.id !== id); save(); toast('Appointment deleted'); rerender(); }),
  addDoctor: () => doctorForm(), editDoctor: id => doctorForm(id), viewDoctor,
  toggleDoctor: id => { const d = Dc(id); d.active = !d.active; save(); toast(`${d.name} ${d.active ? 'activated' : 'deactivated'}`); refreshDoctors(); },
  delDoctor: id => confirmBox(`Delete <b>${esc(dName(id))}</b>? Their past appointment records will remain but show as "(deleted)".`, () => { db.doctors = db.doctors.filter(d => d.id !== id); save(); toast('Doctor deleted'); rerender(); }),
  addStaff: () => staffForm(), editStaff: id => staffForm(id),
  viewStaff: id => { const s = db.staff.find(x => x.id === id); const kv = (k, v) => `<div><div class="k">${k}</div><div class="v">${esc(v) || '—'}</div></div>`; modal(`Staff Record – ${esc(s.name)}`, `<div class="detail-grid">${kv('Staff ID', s.id)}${kv('Name', s.name)}${kv('Department', s.department)}${kv('Designation', s.designation)}${kv('Mobile', s.mobile)}${kv('Email', s.email)}${kv('Joining Date', fmtDate(s.joined))}${kv('Status', s.active ? 'Active' : 'Inactive')}${kv('Address', s.address)}</div><div class="form-foot"><button class="btn" data-act="closeModal">Close</button></div>`); },
  toggleStaff: id => { const s = db.staff.find(x => x.id === id); s.active = !s.active; save(); toast(`${s.name} ${s.active ? 'activated' : 'deactivated'}`); refreshStaff(); },
  delStaff: id => confirmBox('Delete this staff member?', () => { db.staff = db.staff.filter(s => s.id !== id); save(); toast('Staff deleted'); rerender(); }),
  addConsult: () => consultForm(), editConsult: id => { closeModal(); consultForm(id); }, viewConsult,
  delConsult: id => confirmBox('Delete this consultation record?', () => { db.consultations = db.consultations.filter(c => c.id !== id); save(); toast('Consultation deleted'); rerender(); }),
  printConsult: id => printHTML(consultDoc(db.consultations.find(c => c.id === id))),
  addRxFor: id => { const c = db.consultations.find(x => x.id === id); closeModal(); rxForm(null, { patientId: c.patientId, doctorId: c.doctorId, diagnosis: c.diagnosis }); },
  addRx: () => rxForm(), editRx: id => { closeModal(); rxForm(id); }, viewRx,
  printRx: id => printHTML(rxDoc(db.prescriptions.find(r => r.id === id))),
  delRx: id => confirmBox('Delete this prescription?', () => { db.prescriptions = db.prescriptions.filter(r => r.id !== id); save(); toast('Prescription deleted'); rerender(); }),
  addRxRow: () => $('#rxRows').insertAdjacentHTML('beforeend', rxRowHTML()),
  rmRow: (id, el) => { const box = el.closest('.line-rows'); if (box.children.length > 1) { el.closest('.line-row').remove(); const f = $('#mform'); if (f && $('#invTotals')) calcInv(f); } else toast('At least one row is required', 'err'); },
  addInv: () => invForm(), editInv: id => { closeModal(); invForm(id); }, viewInv,
  printInv: id => printHTML(invDoc(db.invoices.find(i => i.id === id))),
  dlInv: id => { const i = db.invoices.find(x => x.id === id); download(`${i.id}.html`, `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${i.id}</title><style>body{font-family:Arial,sans-serif;max-width:800px;margin:30px auto;font-size:13px}.ph{display:flex;justify-content:space-between;border-bottom:2px solid #0f766e;padding-bottom:10px;margin-bottom:14px}h2{color:#0f766e;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin:10px 0}th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left}th{background:#f1f5f9}.meta{display:grid;grid-template-columns:1fr 1fr;gap:4px 20px}</style></head><body>${invDoc(i)}</body></html>`, 'text/html'); toast('Invoice downloaded'); },
  delInv: id => confirmBox('Delete this invoice?', () => { db.invoices = db.invoices.filter(i => i.id !== id); save(); toast('Invoice deleted'); rerender(); }),
  addConsultFee: () => { const f = $('#mform'), d = Dc(f.elements.doctorId.value); $('#invRows').insertAdjacentHTML('beforeend', invRowHTML({ type: 'Consultation', desc: d ? `${d.name} – consultation` : 'Consultation charges', qty: 1, rate: d ? d.fee : db.settings.charges.newConsult })); calcInv(f); },
  addRowInv: () => { $('#invRows').insertAdjacentHTML('beforeend', invRowHTML({ type: 'Medicine', desc: '', qty: 1, rate: '' })); },
  addSvc: () => svcForm(), editSvc: id => svcForm(id),
  toggleSvc: id => { const s = db.services.find(x => x.id === id); s.active = !s.active; save(); toast('Service status changed'); refreshServices(); },
  delSvc: id => confirmBox('Delete this service?', () => { db.services = db.services.filter(s => s.id !== id); save(); toast('Service deleted'); rerender(); }),
  exportXls: () => {
    const r = buildReport();
    download(`${slug(r.title)}-${today()}.xls`, `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><h3>${esc(hosp().name)} – ${esc(r.title)}</h3><p>${r.range}</p>${reportTableHTML(r)}<p>${esc(r.summary)}</p></body></html>`, 'application/vnd.ms-excel');
    toast('Excel file downloaded');
  },
  exportPdf: () => { const r = buildReport(); printHTML(`${docHeader('REPORT')}<h3>${esc(r.title)}</h3><p>Period: ${r.range}<br><b>${esc(r.summary)}</b></p>${reportTableHTML(r)}`); },
  delSlot: id => { db.settings.slots = db.settings.slots.filter(s => s !== id); save(); renderSettings(); },
  delDept: id => { if (db.staff.some(s => s.department === id)) { toast('Department is in use by staff members', 'err'); return; } db.settings.departments = db.settings.departments.filter(d => d !== id); save(); renderSettings(); },
  resetData: () => confirmBox('Reset all data back to the original demo data?', () => { db = seed(); save(); applyBrand(); toast('Demo data restored'); rerender(); }, 'Reset')
};
const FORMS = {
  saveHospital: d => { Object.assign(db.settings.hospital, d); save(); applyBrand(); toast('Hospital information saved'); },
  saveCharges: d => { db.settings.charges = { newConsult: +d.newConsult, followUp: +d.followUp }; save(); toast('Consultation charges saved'); },
  genSlots: d => { if (d.start >= d.end) return toast('End time must be after start time', 'err'); db.settings.slots = genSlots(d.start, d.end, +d.step); save(); toast(`${db.settings.slots.length} slots generated`); renderSettings(); },
  addDept: d => { const n = d.dept.trim(); if (db.settings.departments.some(x => x.toLowerCase() === n.toLowerCase())) return toast('Department already exists', 'err'); db.settings.departments.push(n); save(); toast('Department added'); renderSettings(); }
};
const CHANGE = {
  apptStatus: (id, el) => { const a = db.appointments.find(x => x.id === id); a.status = el.value; save(); toast(`Appointment marked ${el.value}`); }
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) { if (e.target.id === 'modal') closeModal(); return; }
  const fn = A[el.dataset.act]; if (fn) { e.preventDefault(); fn(el.dataset.id, el); }
});
document.addEventListener('input', e => {
  const k = e.target.dataset?.filter; if (!k) return;
  const [grp, key] = k.split('.'); ui[grp][key] = e.target.value;
  if (k === 'appts.view') return renderAppts();
  refreshCurrent();
});
document.addEventListener('change', e => { const k = e.target.dataset?.change; if (k && CHANGE[k]) CHANGE[k](e.target.dataset.id, e.target); });
document.addEventListener('submit', e => {
  const k = e.target.dataset?.submit; if (!k) return; e.preventDefault();
  FORMS[k](Object.fromEntries(new FormData(e.target).entries()));
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
window.addEventListener('hashchange', navigate);

function init() {
  load(); buildNav(); applyBrand();
  $('#topDate').textContent = `${DAYS[new Date().getDay()]}, ${fmtDate(today())}`;
  $('#globalSearch').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    ui.patients.q = e.target.value; e.target.value = '';
    if (location.hash === '#patients') renderPatients(); else location.hash = '#patients';
  });
  navigate();
}
init();
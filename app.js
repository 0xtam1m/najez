/* ناجز — امتلك مسيرتك المهنية */
(function () {
  'use strict';

  var STORAGE_KEY = 'najez.career';
  var DEMO_KEY = 'najez.career.demo';
  var LANG_KEY = 'najez.lang';
  var SETTINGS_KEY = 'najez.settings';

  /* ===== الإعدادات ===== */
  var settings = (function () {
    try {
      var raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      return { showPlan: raw.showPlan !== false };
    } catch (e) {
      return { showPlan: true };
    }
  })();

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function applyPlanVisibility() {
    document.querySelector('.tab[data-route="plan"]').hidden = !settings.showPlan;
  }

  function setPlanVisible(visible) {
    settings.showPlan = visible;
    saveSettings();
    applyPlanVisibility();
  }

  /* ===== اللغة ===== */
  var lang = localStorage.getItem(LANG_KEY);
  if (lang !== 'ar' && lang !== 'en') lang = 'ar';
  var L, dateFmt, monthDayFmt;

  function t(key) { return L.strings[key]; }

  function applyLanguage() {
    L = NAJEZ_I18N[lang];
    dateFmt = new Intl.DateTimeFormat(L.locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    monthDayFmt = new Intl.DateTimeFormat(L.locale, { day: 'numeric', month: 'long', year: 'numeric' });

    document.documentElement.lang = L.htmlLang;
    document.documentElement.dir = L.dir;
    document.title = L.title;

    document.querySelectorAll('[data-i18n]').forEach(function (node) {
      node.textContent = t(node.dataset.i18n);
    });
    document.getElementById('lang-toggle').textContent = t('langButton');
  }

  document.getElementById('lang-toggle').addEventListener('click', function () {
    lang = lang === 'ar' ? 'en' : 'ar';
    localStorage.setItem(LANG_KEY, lang);
    applyLanguage();
    route();
  });

  /* ===== التخزين ===== */
  function emptyCareer() {
    return {
      annual: { core: [], ongoing: [], development: [] },
      plan: { p30: [], p60: [], p90: [] },
      weekly: {},
      monthly: {},
      promotion: { currentJob: '', futureJob: '', targetDate: '', resp: [] }
    };
  }

  function loadCareer() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var data = raw ? JSON.parse(raw) : null;
      if (!data || typeof data !== 'object') return emptyCareer();
      var base = emptyCareer();
      ['annual', 'plan', 'weekly', 'monthly', 'promotion'].forEach(function (k) {
        if (data[k]) base[k] = data[k];
      });
      return base;
    } catch (e) {
      return emptyCareer();
    }
  }

  var career = loadCareer();

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(career));
  }

  function uid() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function hasAnyData() {
    var a = career.annual, p = career.plan, pr = career.promotion;
    if (a.core.length || a.ongoing.length || a.development.length) return true;
    if (p.p30.length || p.p60.length || p.p90.length) return true;
    if (Object.keys(career.weekly).some(function (k) {
      var w = career.weekly[k];
      return w.todo.length || w.followups.length || w.unplanned.length || w.wins.length;
    })) return true;
    if (Object.keys(career.monthly).length) return true;
    if (pr.currentJob || pr.futureJob || pr.targetDate || pr.resp.length) return true;
    return false;
  }

  /* ===== أدوات التاريخ ===== */
  function toDateKey(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
  function fromDateKey(key) {
    var p = key.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function weekStart(d) {
    var s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    s.setDate(s.getDate() - s.getDay()); // الأحد بداية الأسبوع
    return s;
  }
  function addDays(d, n) {
    var c = new Date(d);
    c.setDate(c.getDate() + n);
    return c;
  }
  function monthKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  /* ===== مساعد DOM ===== */
  function el(tag, props, children) {
    var node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        if (k === 'class') node.className = props[k];
        else if (k === 'text') node.textContent = props[k];
        else if (k === 'html') { /* غير مستخدم — النصوص عبر textContent فقط */ }
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), props[k]);
        else if (k === 'dataset') Object.keys(props[k]).forEach(function (d) { node.dataset[d] = props[k][d]; });
        else node.setAttribute(k, props[k]);
      });
    }
    (children || []).forEach(function (ch) {
      if (ch == null) return;
      node.appendChild(typeof ch === 'string' ? document.createTextNode(ch) : ch);
    });
    return node;
  }

  /* ===== التلميح ===== */
  var tooltip = document.getElementById('tooltip');
  function showTooltip(evt, strongText, subText) {
    tooltip.textContent = '';
    tooltip.appendChild(el('strong', { text: strongText }));
    if (subText) {
      tooltip.appendChild(document.createElement('br'));
      tooltip.appendChild(document.createTextNode(subText));
    }
    tooltip.hidden = false;
    var pad = 12;
    var rect = tooltip.getBoundingClientRect();
    var x = Math.min(Math.max(evt.clientX - rect.width / 2, pad), window.innerWidth - rect.width - pad);
    var y = evt.clientY - rect.height - pad;
    if (y < pad) y = evt.clientY + pad * 2;
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
  }
  function hideTooltip() { tooltip.hidden = true; }

  /* ===== عناصر مشتركة ===== */
  var STATUS_OPTIONS = function () {
    return [
      { value: 'todo', label: t('statusTodo') },
      { value: 'doing', label: t('statusDoing') },
      { value: 'done', label: t('statusDone') }
    ];
  };
  var PRIORITY_OPTIONS = function () {
    return [
      { value: 'high', label: t('priorityHigh') },
      { value: 'medium', label: t('priorityMedium') },
      { value: 'low', label: t('priorityLow') }
    ];
  };
  var SIZE_OPTIONS = function () {
    return [
      { value: 'small', label: t('sizeSmall') },
      { value: 'medium', label: t('sizeMedium') },
      { value: 'large', label: t('sizeLarge') }
    ];
  };
  function optionLabel(options, value) {
    for (var i = 0; i < options.length; i++) if (options[i].value === value) return options[i].label;
    return value || '';
  }

  function buildSelect(options, value, onChange, cls) {
    var s = el('select', { class: cls || '' });
    options.forEach(function (o) {
      var opt = el('option', { value: o.value, text: o.label });
      if (o.value === value) opt.selected = true;
      s.appendChild(opt);
    });
    if (onChange) s.addEventListener('change', function () { onChange(s.value); });
    return s;
  }

  /* نموذج عام: fields = [{key,label,ph,type:'text'|'select'|'textarea',options}] */
  function buildForm(fields, initial, submitLabel, onSubmit, onCancel) {
    var form = el('form', { class: 'entry-form' });
    var inputs = {};
    fields.forEach(function (f) {
      var input;
      if (f.type === 'select') {
        input = buildSelect(f.options(), initial[f.key] || f.options()[0].value, null, 'form-input');
      } else if (f.type === 'textarea') {
        input = el('textarea', { class: 'form-input', rows: 2, placeholder: f.ph || '' });
        input.value = initial[f.key] || '';
      } else {
        input = el('input', { type: 'text', class: 'form-input', placeholder: f.ph || '' });
        input.value = initial[f.key] || '';
      }
      inputs[f.key] = input;
      form.appendChild(el('label', { class: 'form-field' + (f.wide ? ' wide' : '') }, [
        el('span', { class: 'form-label', text: f.label }),
        input
      ]));
    });
    var actions = el('div', { class: 'form-actions' }, [
      el('button', { type: 'submit', class: 'btn-primary btn-sm', text: submitLabel })
    ]);
    if (onCancel) {
      actions.appendChild(el('button', {
        type: 'button', class: 'btn-ghost btn-sm', text: t('cancel'),
        onclick: onCancel
      }));
    }
    form.appendChild(actions);
    form.addEventListener('submit', function (evt) {
      evt.preventDefault();
      var values = {};
      fields.forEach(function (f) { values[f.key] = inputs[f.key].value.trim(); });
      if (fields[0] && !values[fields[0].key]) return; // الحقل الأول إلزامي
      onSubmit(values);
    });
    return form;
  }

  function iconButton(symbol, label, onClick, cls) {
    return el('button', {
      type: 'button', class: 'btn-mini ' + (cls || ''), 'aria-label': label, title: label,
      text: symbol, onclick: onClick
    });
  }

  function metaChip(label, value, cls) {
    return el('span', { class: 'chip ' + (cls || '') }, [
      label ? el('span', { class: 'chip-label', text: label + ': ' }) : null,
      el('span', { text: value })
    ]);
  }

  function detailLine(label, value) {
    if (!value) return null;
    return el('p', { class: 'detail-line' }, [
      el('span', { class: 'detail-label', text: label + ': ' }),
      el('span', { text: value })
    ]);
  }

  function emptyHint() {
    return el('p', { class: 'empty-hint-sm', text: t('emptyList') });
  }

  /* شريط تقدم (meter) — التعبئة بالأزرق والمسار درجة أفتح من نفس التدرج */
  function meterRow(label, done, total) {
    var pct = total ? Math.round(done / total * 100) : 0;
    return el('div', { class: 'meter-row' }, [
      el('div', { class: 'meter-head' }, [
        el('span', { class: 'meter-label', text: label }),
        el('span', { class: 'meter-value', text: total ? done + '/' + total + ' — ' + pct + '%' : t('noData') })
      ]),
      el('div', { class: 'meter' }, [
        el('div', { class: 'meter-fill', style: 'width:' + pct + '%' })
      ])
    ]);
  }

  /* ===== الرسم العمودي (SVG) ===== */
  function roundedTopBar(x, y, w, h, r) {
    if (h <= 0) return '';
    r = Math.min(r, w / 2, h);
    return 'M' + x + ' ' + (y + h) + 'V' + (y + r) +
      'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y +
      'H' + (x + w - r) +
      'Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + r) +
      'V' + (y + h) + 'Z';
  }
  function niceCeil(v) {
    if (v <= 4) return 4;
    var mag = Math.pow(10, Math.floor(Math.log10(v)));
    var steps = [1, 2, 4, 5, 10];
    for (var i = 0; i < steps.length; i++) if (steps[i] * mag >= v) return steps[i] * mag;
    return 10 * mag;
  }

  /* labels/values متوازيان؛ opts: {maxValue, tickFormat, tooltip(i)->[strong,sub]} */
  function renderColumnChart(labels, values, opts) {
    opts = opts || {};
    var isRTL = L.dir === 'rtl';
    var W = 760, H = 220;
    var margin = { top: 16, bottom: 26, right: isRTL ? 38 : 6, left: isRTL ? 6 : 38 };
    var plotW = W - margin.left - margin.right;
    var plotH = H - margin.top - margin.bottom;
    var n = values.length;

    var maxVal = opts.maxValue || Math.max(1, Math.max.apply(null, values));
    var niceMax = opts.maxValue || niceCeil(maxVal);
    var maxIdx = values.reduce(function (best, v, i) { return v > values[best] ? i : best; }, 0);

    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('role', 'img');

    var ticks = 4;
    for (var tk = 0; tk <= ticks; tk++) {
      var y = margin.top + plotH - (plotH * tk / ticks);
      var line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', margin.left);
      line.setAttribute('x2', margin.left + plotW);
      line.setAttribute('y1', y);
      line.setAttribute('y2', y);
      line.setAttribute('class', tk === 0 ? 'axis-line' : 'grid-line');
      svg.appendChild(line);
      if (tk > 0) {
        var val = niceMax * tk / ticks;
        var tickText = document.createElementNS(svgNS, 'text');
        tickText.setAttribute('x', isRTL ? W - 4 : 4);
        tickText.setAttribute('y', y + 4);
        tickText.setAttribute('text-anchor', isRTL ? 'end' : 'start');
        tickText.setAttribute('class', 'tick-label');
        tickText.textContent = opts.tickFormat ? opts.tickFormat(val) : Math.round(val);
        svg.appendChild(tickText);
      }
    }

    var band = plotW / n;
    var barW = Math.min(24, band * 0.55);

    values.forEach(function (v, i) {
      var bandX = isRTL ? margin.left + plotW - (i + 1) * band : margin.left + i * band;
      var x = bandX + (band - barW) / 2;
      var h = niceMax ? (v / niceMax) * plotH : 0;
      var y2 = margin.top + plotH - h;

      var bar = null;
      if (v > 0) {
        bar = document.createElementNS(svgNS, 'path');
        bar.setAttribute('d', roundedTopBar(x, y2, barW, h, Math.min(4, h)));
        bar.setAttribute('class', 'bar');
        svg.appendChild(bar);
        if (i === maxIdx) {
          var cap = document.createElementNS(svgNS, 'text');
          cap.setAttribute('x', x + barW / 2);
          cap.setAttribute('y', y2 - 6);
          cap.setAttribute('text-anchor', 'middle');
          cap.setAttribute('class', 'cap-label');
          cap.textContent = opts.tickFormat ? opts.tickFormat(v) : v;
          svg.appendChild(cap);
        }
      }

      var lbl = document.createElementNS(svgNS, 'text');
      lbl.setAttribute('x', bandX + band / 2);
      lbl.setAttribute('y', H - 8);
      lbl.setAttribute('text-anchor', 'middle');
      lbl.setAttribute('class', 'month-label');
      lbl.textContent = labels[i];
      svg.appendChild(lbl);

      var hit = document.createElementNS(svgNS, 'rect');
      hit.setAttribute('x', bandX);
      hit.setAttribute('y', margin.top);
      hit.setAttribute('width', band);
      hit.setAttribute('height', plotH);
      hit.setAttribute('class', 'bar-hit');
      hit.addEventListener('pointermove', function (evt) {
        if (bar) bar.classList.add('hover');
        var tip = opts.tooltip ? opts.tooltip(i) : [String(v), ''];
        showTooltip(evt, tip[0], tip[1]);
      });
      hit.addEventListener('pointerleave', function () {
        if (bar) bar.classList.remove('hover');
        hideTooltip();
      });
      svg.appendChild(hit);
    });

    return el('div', { class: 'monthly-chart' }, [svg]);
  }

  /* =====================================================================
     صفحة: الأهداف السنوية
  ===================================================================== */
  var ANNUAL_SECTIONS = [
    { key: 'core', titleKey: 'annCore' },
    { key: 'ongoing', titleKey: 'annOngoing' },
    { key: 'development', titleKey: 'annDev' }
  ];

  function annualFields() {
    return [
      { key: 'task', label: t('fTask'), ph: t('phTask') },
      { key: 'priority', label: t('priorityLabel'), type: 'select', options: PRIORITY_OPTIONS },
      { key: 'size', label: t('sizeLabel'), type: 'select', options: SIZE_OPTIONS },
      { key: 'deadline', label: t('fDeadline'), ph: t('phDeadline') },
      { key: 'deliverable', label: t('fDeliverable'), ph: t('phDeliverable'), wide: true },
      { key: 'stakeholders', label: t('fStakeholders') },
      { key: 'valueAdd', label: t('fValueAdd'), ph: t('phValueAdd'), wide: true },
      { key: 'notes', label: t('fNotes'), wide: true }
    ];
  }

  function renderAnnual() {
    var container = document.getElementById('annual-sections');
    container.textContent = '';

    ANNUAL_SECTIONS.forEach(function (sec) {
      var items = career.annual[sec.key];
      var card = el('section', { class: 'card' });
      var doneCount = items.filter(function (i) { return i.done; }).length;
      card.appendChild(el('div', { class: 'card-head' }, [
        el('h2', { class: 'card-title', text: t(sec.titleKey) }),
        el('span', { class: 'card-count', text: items.length ? L.fmt.completedOf(doneCount, items.length) : '' })
      ]));

      var list = el('div', { class: 'entry-list' });
      if (!items.length) list.appendChild(emptyHint());
      items.forEach(function (item, idx) {
        list.appendChild(annualItemCard(sec.key, item, idx));
      });
      card.appendChild(list);

      var details = el('details', { class: 'add-details' }, [
        el('summary', { text: '+ ' + t('addTask') }),
        buildForm(annualFields(), {}, t('add'), function (values) {
          values.id = uid();
          values.done = false;
          career.annual[sec.key].push(values);
          save();
          renderAnnual();
        })
      ]);
      card.appendChild(details);
      container.appendChild(card);
    });
  }

  function annualItemCard(secKey, item, idx) {
    var wrap = el('div', { class: 'entry-item' + (item.done ? ' is-done' : '') });

    function startEdit() {
      var form = buildForm(annualFields(), item, t('save'), function (values) {
        Object.keys(values).forEach(function (k) { item[k] = values[k]; });
        save();
        renderAnnual();
      }, function () { renderAnnual(); });
      wrap.textContent = '';
      wrap.appendChild(form);
    }

    var check = el('input', { type: 'checkbox', class: 'done-check', 'aria-label': t('statusDone') });
    check.checked = !!item.done;
    check.addEventListener('change', function () {
      item.done = check.checked;
      save();
      renderAnnual();
    });

    var head = el('div', { class: 'entry-head' }, [
      check,
      el('span', { class: 'entry-title', text: item.task }),
      el('span', { class: 'entry-actions' }, [
        iconButton('✎', t('edit'), startEdit),
        iconButton('✕', t('delete'), function () {
          career.annual[secKey].splice(idx, 1);
          save();
          renderAnnual();
        }, 'danger')
      ])
    ]);
    wrap.appendChild(head);

    var chips = el('div', { class: 'chip-row' });
    chips.appendChild(metaChip('', optionLabel(PRIORITY_OPTIONS(), item.priority), 'chip-' + item.priority));
    chips.appendChild(metaChip(t('sizeLabel'), optionLabel(SIZE_OPTIONS(), item.size)));
    if (item.deadline) chips.appendChild(metaChip(t('fDeadline'), item.deadline));
    wrap.appendChild(chips);

    [detailLine(t('fDeliverable'), item.deliverable),
     detailLine(t('fStakeholders'), item.stakeholders),
     detailLine(t('fValueAdd'), item.valueAdd),
     detailLine(t('fNotes'), item.notes)].forEach(function (line) {
      if (line) wrap.appendChild(line);
    });

    return wrap;
  }

  /* =====================================================================
     صفحة: خطة 30/60/90
  ===================================================================== */
  var PLAN_PHASES = [
    { key: 'p30', titleKey: 'phase30', descKey: 'phase30Desc' },
    { key: 'p60', titleKey: 'phase60', descKey: 'phase60Desc' },
    { key: 'p90', titleKey: 'phase90', descKey: 'phase90Desc' }
  ];

  function goalFields() {
    return [
      { key: 'title', label: t('fGoal'), ph: t('phGoal') },
      { key: 'metric', label: t('fMetric'), ph: t('phMetric'), wide: true },
      { key: 'notes', label: t('fNotes'), wide: true }
    ];
  }

  function renderPlan() {
    var container = document.getElementById('plan-phases');
    container.textContent = '';

    PLAN_PHASES.forEach(function (phase) {
      var goals = career.plan[phase.key];
      var card = el('section', { class: 'card' });
      var stats = planPhaseStats(goals);
      card.appendChild(el('div', { class: 'card-head' }, [
        el('h2', { class: 'card-title', text: t(phase.titleKey) }),
        el('span', { class: 'card-count', text: stats.total ? stats.done + '/' + stats.total : '' })
      ]));
      card.appendChild(el('p', { class: 'card-desc', text: t(phase.descKey) }));

      var list = el('div', { class: 'entry-list' });
      if (!goals.length) list.appendChild(emptyHint());
      goals.forEach(function (goal, idx) {
        list.appendChild(goalCard(phase.key, goal, idx));
      });
      card.appendChild(list);

      card.appendChild(el('details', { class: 'add-details' }, [
        el('summary', { text: '+ ' + t('addGoal') }),
        buildForm(goalFields(), {}, t('add'), function (values) {
          values.id = uid();
          values.tasks = [];
          career.plan[phase.key].push(values);
          save();
          renderPlan();
        })
      ]));
      container.appendChild(card);
    });
  }

  function planPhaseStats(goals) {
    var done = 0, total = 0;
    goals.forEach(function (g) {
      (g.tasks || []).forEach(function (task) {
        total++;
        if (task.done) done++;
      });
    });
    return { done: done, total: total };
  }

  function goalCard(phaseKey, goal, idx) {
    var wrap = el('div', { class: 'entry-item' });

    function startEdit() {
      var form = buildForm(goalFields(), goal, t('save'), function (values) {
        Object.keys(values).forEach(function (k) { goal[k] = values[k]; });
        save();
        renderPlan();
      }, function () { renderPlan(); });
      wrap.textContent = '';
      wrap.appendChild(form);
    }

    wrap.appendChild(el('div', { class: 'entry-head' }, [
      el('span', { class: 'entry-title', text: goal.title }),
      el('span', { class: 'entry-actions' }, [
        iconButton('✎', t('edit'), startEdit),
        iconButton('✕', t('delete'), function () {
          career.plan[phaseKey].splice(idx, 1);
          save();
          renderPlan();
        }, 'danger')
      ])
    ]));
    if (goal.metric) wrap.appendChild(detailLine(t('fMetric'), goal.metric));
    if (goal.notes) wrap.appendChild(detailLine(t('fNotes'), goal.notes));

    var tasksWrap = el('div', { class: 'subtasks' });
    tasksWrap.appendChild(el('p', { class: 'detail-label subtasks-title', text: t('tasksLabel') }));
    (goal.tasks || []).forEach(function (task, tIdx) {
      var check = el('input', { type: 'checkbox', class: 'done-check sm' });
      check.checked = !!task.done;
      check.addEventListener('change', function () {
        task.done = check.checked;
        save();
        renderPlan();
      });
      tasksWrap.appendChild(el('div', { class: 'subtask' + (task.done ? ' is-done' : '') }, [
        check,
        el('span', { class: 'subtask-text', text: task.text }),
        iconButton('✕', t('delete'), function () {
          goal.tasks.splice(tIdx, 1);
          save();
          renderPlan();
        }, 'danger')
      ]));
    });

    var addInput = el('input', { type: 'text', class: 'form-input subtask-input', placeholder: t('addSubtask') });
    var addForm = el('form', { class: 'subtask-form' }, [addInput,
      el('button', { type: 'submit', class: 'btn-ghost btn-sm', text: t('add') })]);
    addForm.addEventListener('submit', function (evt) {
      evt.preventDefault();
      var text = addInput.value.trim();
      if (!text) return;
      goal.tasks = goal.tasks || [];
      goal.tasks.push({ id: uid(), text: text, done: false });
      save();
      renderPlan();
    });
    tasksWrap.appendChild(addForm);
    wrap.appendChild(tasksWrap);

    return wrap;
  }

  /* =====================================================================
     صفحة: قائمة الأسبوع
  ===================================================================== */
  var currentWeekStart = weekStart(new Date());

  function weekData(key) {
    if (!career.weekly[key]) {
      career.weekly[key] = { todo: [], followups: [], unplanned: [], wins: [] };
    }
    return career.weekly[key];
  }

  var WEEK_SECTIONS = [
    { key: 'todo', titleKey: 'secTodo', ph: 'phWeeklyTask', extraKey: 'valueAdd', extraLabelKey: 'fValueAdd' },
    { key: 'followups', titleKey: 'secFollowups', ph: 'phFollowup', extraKey: 'stakeholder', extraLabelKey: 'fStakeholder' },
    { key: 'unplanned', titleKey: 'secUnplanned', ph: 'phUnplanned', extraKey: 'valueAdd', extraLabelKey: 'fValueAdd' }
  ];

  function renderWeekly() {
    var key = toDateKey(currentWeekStart);
    var data = weekData(key);
    var isThisWeek = key === toDateKey(weekStart(new Date()));

    document.getElementById('week-label').textContent =
      t('weekOf') + ' ' + monthDayFmt.format(currentWeekStart);
    document.getElementById('week-today').hidden = isThisWeek;

    var container = document.getElementById('weekly-sections');
    container.textContent = '';

    WEEK_SECTIONS.forEach(function (sec) {
      var items = data[sec.key];
      var card = el('section', { class: 'card' });
      var doneCount = items.filter(function (i) { return i.status === 'done'; }).length;
      card.appendChild(el('div', { class: 'card-head' }, [
        el('h2', { class: 'card-title', text: t(sec.titleKey) }),
        el('span', { class: 'card-count', text: items.length ? doneCount + '/' + items.length : '' })
      ]));

      var list = el('div', { class: 'entry-list' });
      if (!items.length) list.appendChild(emptyHint());
      items.forEach(function (item, idx) {
        list.appendChild(weeklyItemRow(data, sec, item, idx));
      });
      card.appendChild(list);

      var textInput = el('input', { type: 'text', class: 'form-input', placeholder: t(sec.ph) });
      var extraInput = el('input', { type: 'text', class: 'form-input', placeholder: t(sec.extraLabelKey) });
      var form = el('form', { class: 'inline-add' }, [textInput, extraInput,
        el('button', { type: 'submit', class: 'btn-primary btn-sm', text: t('add') })]);
      form.addEventListener('submit', function (evt) {
        evt.preventDefault();
        var text = textInput.value.trim();
        if (!text) return;
        var item = { id: uid(), text: text, status: 'todo' };
        item[sec.extraKey] = extraInput.value.trim();
        items.push(item);
        save();
        renderWeekly();
      });
      card.appendChild(form);
      container.appendChild(card);
    });

    /* إنجازات الأسبوع */
    var wins = data.wins;
    var winsCard = el('section', { class: 'card' });
    winsCard.appendChild(el('div', { class: 'card-head' }, [
      el('h2', { class: 'card-title', text: t('secWins') }),
      el('span', { class: 'card-count', text: wins.length ? L.fmt.itemsCount(wins.length) : '' })
    ]));
    var winsList = el('div', { class: 'entry-list' });
    if (!wins.length) winsList.appendChild(emptyHint());
    wins.forEach(function (win, idx) {
      winsList.appendChild(el('div', { class: 'entry-item slim' }, [
        el('div', { class: 'entry-head' }, [
          el('span', { class: 'check-mark', text: '★' }),
          el('span', { class: 'entry-title', text: win.text }),
          el('span', { class: 'entry-actions' }, [
            iconButton('✕', t('delete'), function () {
              wins.splice(idx, 1);
              save();
              renderWeekly();
            }, 'danger')
          ])
        ])
      ]));
    });
    winsCard.appendChild(winsList);
    var winInput = el('input', { type: 'text', class: 'form-input', placeholder: t('phWin') });
    var winForm = el('form', { class: 'inline-add' }, [winInput,
      el('button', { type: 'submit', class: 'btn-primary btn-sm', text: t('add') })]);
    winForm.addEventListener('submit', function (evt) {
      evt.preventDefault();
      var text = winInput.value.trim();
      if (!text) return;
      wins.push({ id: uid(), text: text });
      save();
      renderWeekly();
    });
    winsCard.appendChild(winForm);
    container.appendChild(winsCard);
  }

  function weeklyItemRow(data, sec, item, idx) {
    var row = el('div', { class: 'entry-item slim status-' + item.status });
    var statusSelect = buildSelect(STATUS_OPTIONS(), item.status, function (value) {
      item.status = value;
      save();
      renderWeekly();
    }, 'status-select');

    row.appendChild(el('div', { class: 'entry-head' }, [
      statusSelect,
      el('span', { class: 'entry-title', text: item.text }),
      el('span', { class: 'entry-actions' }, [
        iconButton('✕', t('delete'), function () {
          data[sec.key].splice(idx, 1);
          save();
          renderWeekly();
        }, 'danger')
      ])
    ]));
    if (item[sec.extraKey]) {
      row.appendChild(detailLine(t(sec.extraLabelKey), item[sec.extraKey]));
    }
    return row;
  }

  document.getElementById('week-prev').addEventListener('click', function () {
    currentWeekStart = addDays(currentWeekStart, -7);
    renderWeekly();
  });
  document.getElementById('week-next').addEventListener('click', function () {
    currentWeekStart = addDays(currentWeekStart, 7);
    renderWeekly();
  });
  document.getElementById('week-today').addEventListener('click', function () {
    currentWeekStart = weekStart(new Date());
    renderWeekly();
  });

  /* =====================================================================
     صفحة: الملخص الشهري
  ===================================================================== */
  var currentMonth = new Date();
  currentMonth.setDate(1);

  function monthData(key) {
    if (!career.monthly[key]) {
      career.monthly[key] = { accomplishments: [], feedback: [], projects: [], nextGoals: [] };
    }
    return career.monthly[key];
  }

  var MONTH_SECTIONS = [
    { key: 'accomplishments', titleKey: 'secAccomp', ph: 'phAccomp', extraLabelKey: 'fValueAlign' },
    { key: 'feedback', titleKey: 'secFeedbackM', ph: 'phFeedbackM', extraLabelKey: 'fHowApply' },
    { key: 'projects', titleKey: 'secProjects', ph: 'phProject', extraLabelKey: 'fValueAlign' },
    { key: 'nextGoals', titleKey: 'secNextGoals', ph: 'phNextGoal', extraLabelKey: 'fValueAlign' }
  ];

  function renderMonthly() {
    var key = monthKey(currentMonth);
    var data = monthData(key);
    var isThisMonth = key === monthKey(new Date());

    document.getElementById('month-label').textContent =
      L.months[currentMonth.getMonth()] + ' ' + currentMonth.getFullYear();
    document.getElementById('month-today').hidden = isThisMonth;

    var container = document.getElementById('monthly-sections');
    container.textContent = '';

    MONTH_SECTIONS.forEach(function (sec) {
      var items = data[sec.key];
      var card = el('section', { class: 'card' });
      card.appendChild(el('div', { class: 'card-head' }, [
        el('h2', { class: 'card-title', text: t(sec.titleKey) }),
        el('span', { class: 'card-count', text: items.length ? L.fmt.itemsCount(items.length) : '' })
      ]));

      var list = el('div', { class: 'entry-list' });
      if (!items.length) list.appendChild(emptyHint());
      items.forEach(function (item, idx) {
        var row = el('div', { class: 'entry-item slim' });
        row.appendChild(el('div', { class: 'entry-head' }, [
          el('span', { class: 'check-mark', text: '•' }),
          el('span', { class: 'entry-title', text: item.text }),
          el('span', { class: 'entry-actions' }, [
            iconButton('✕', t('delete'), function () {
              items.splice(idx, 1);
              save();
              renderMonthly();
            }, 'danger')
          ])
        ]));
        if (item.extra) row.appendChild(detailLine(t(sec.extraLabelKey), item.extra));
        list.appendChild(row);
      });
      card.appendChild(list);

      var textInput = el('input', { type: 'text', class: 'form-input', placeholder: t(sec.ph) });
      var extraInput = el('input', { type: 'text', class: 'form-input', placeholder: t(sec.extraLabelKey) });
      var form = el('form', { class: 'inline-add' }, [textInput, extraInput,
        el('button', { type: 'submit', class: 'btn-primary btn-sm', text: t('add') })]);
      form.addEventListener('submit', function (evt) {
        evt.preventDefault();
        var text = textInput.value.trim();
        if (!text) return;
        items.push({ id: uid(), text: text, extra: extraInput.value.trim() });
        save();
        renderMonthly();
      });
      card.appendChild(form);
      container.appendChild(card);
    });
  }

  document.getElementById('month-prev').addEventListener('click', function () {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    renderMonthly();
  });
  document.getElementById('month-next').addEventListener('click', function () {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    renderMonthly();
  });
  document.getElementById('month-today').addEventListener('click', function () {
    currentMonth = new Date();
    currentMonth.setDate(1);
    renderMonthly();
  });

  /* =====================================================================
     صفحة: أهداف الترقية
  ===================================================================== */
  function selfOptions() {
    return [
      { value: '0', label: t('selfNone') },
      { value: '1', label: t('self1') },
      { value: '2', label: t('self2') },
      { value: '3', label: t('self3') },
      { value: '4', label: t('self4') },
      { value: '5', label: t('self5') }
    ];
  }

  function bindPromoField(id, key) {
    var input = document.getElementById(id);
    input.value = career.promotion[key] || '';
    input.addEventListener('change', function () {
      career.promotion[key] = input.value;
      save();
    });
  }

  function renderPromotion() {
    document.getElementById('promo-current').value = career.promotion.currentJob || '';
    document.getElementById('promo-future').value = career.promotion.futureJob || '';
    document.getElementById('promo-date').value = career.promotion.targetDate || '';

    var container = document.getElementById('promo-resps');
    container.textContent = '';
    if (!career.promotion.resp.length) {
      container.appendChild(el('p', { class: 'empty-hint-sm', text: t('emptyList') }));
    }
    career.promotion.resp.forEach(function (resp, idx) {
      container.appendChild(respCard(resp, idx));
    });
  }

  function simpleListBlock(titleKey, items, phKey, onAdd, onDelete) {
    var block = el('div', { class: 'promo-block' });
    block.appendChild(el('p', { class: 'detail-label subtasks-title', text: t(titleKey) }));
    items.forEach(function (item, idx) {
      block.appendChild(el('div', { class: 'subtask' }, [
        el('span', { class: 'check-mark', text: '•' }),
        el('span', { class: 'subtask-text' }, [
          item.provider ? el('strong', { text: item.provider + ': ' }) : null,
          document.createTextNode(item.text)
        ]),
        iconButton('✕', t('delete'), function () { onDelete(idx); }, 'danger')
      ]));
    });
    var inputs = [el('input', { type: 'text', class: 'form-input', placeholder: t(phKey) })];
    if (titleKey === 'secFeedbackP') {
      inputs.unshift(el('input', { type: 'text', class: 'form-input provider-input', placeholder: t('phProvider') }));
    }
    var form = el('form', { class: 'subtask-form' }, inputs.concat([
      el('button', { type: 'submit', class: 'btn-ghost btn-sm', text: t('add') })
    ]));
    form.addEventListener('submit', function (evt) {
      evt.preventDefault();
      var text = inputs[inputs.length - 1].value.trim();
      if (!text) return;
      var payload = { id: uid(), text: text };
      if (inputs.length === 2) payload.provider = inputs[0].value.trim();
      onAdd(payload);
    });
    block.appendChild(form);
    return block;
  }

  function respCard(resp, idx) {
    var card = el('section', { class: 'card' });

    var titleInput = el('input', { type: 'text', class: 'form-input resp-title', placeholder: t('phResp') });
    titleInput.value = resp.title || '';
    titleInput.addEventListener('change', function () {
      resp.title = titleInput.value.trim();
      save();
    });

    card.appendChild(el('div', { class: 'card-head' }, [
      titleInput,
      el('span', { class: 'entry-actions' }, [
        iconButton('✕', t('delete'), function () {
          career.promotion.resp.splice(idx, 1);
          save();
          renderPromotion();
        }, 'danger')
      ])
    ]));

    card.appendChild(simpleListBlock('secActions', resp.actions, 'phAction', function (payload) {
      resp.actions.push(payload);
      save();
      renderPromotion();
    }, function (i) {
      resp.actions.splice(i, 1);
      save();
      renderPromotion();
    }));

    card.appendChild(simpleListBlock('secExamples', resp.examples, 'phExample', function (payload) {
      resp.examples.push(payload);
      save();
      renderPromotion();
    }, function (i) {
      resp.examples.splice(i, 1);
      save();
      renderPromotion();
    }));

    card.appendChild(simpleListBlock('secFeedbackP', resp.feedback, 'phFeedbackP', function (payload) {
      resp.feedback.push(payload);
      save();
      renderPromotion();
    }, function (i) {
      resp.feedback.splice(i, 1);
      save();
      renderPromotion();
    }));

    var selfWrap = el('div', { class: 'self-row' }, [
      el('span', { class: 'detail-label', text: t('fSelf') + ': ' }),
      buildSelect(selfOptions(), String(resp.self || '0'), function (value) {
        resp.self = +value;
        save();
      }, 'form-input self-select')
    ]);
    card.appendChild(selfWrap);

    return card;
  }

  document.getElementById('promo-add-resp').addEventListener('click', function () {
    career.promotion.resp.push({ id: uid(), title: '', actions: [], examples: [], feedback: [], self: 0 });
    save();
    renderPromotion();
  });

  /* =====================================================================
     لوحة المعلومات
  ===================================================================== */
  function renderDashboard() {
    var body = document.getElementById('dash-body');
    var empty = document.getElementById('dash-empty');
    body.textContent = '';

    var hasData = hasAnyData();
    empty.hidden = hasData;
    if (!hasData) {
      body.appendChild(settingsCard());
      return;
    }

    /* --- KPIs --- */
    var annualAll = career.annual.core.concat(career.annual.ongoing, career.annual.development);
    var annualDone = annualAll.filter(function (i) { return i.done; }).length;

    var planDone = 0, planTotal = 0;
    PLAN_PHASES.forEach(function (ph) {
      var stat = planPhaseStats(career.plan[ph.key]);
      planDone += stat.done;
      planTotal += stat.total;
    });

    var wk = career.weekly[toDateKey(weekStart(new Date()))] || { todo: [], followups: [], unplanned: [], wins: [] };
    var weekItems = wk.todo.concat(wk.followups, wk.unplanned);
    var weekDone = weekItems.filter(function (i) { return i.status === 'done'; }).length;

    var daysToPromo = null;
    if (career.promotion.targetDate) {
      var target = fromDateKey(career.promotion.targetDate);
      daysToPromo = Math.max(0, Math.ceil((target - new Date()) / 86400000));
    }

    var kpis = el('section', { class: 'kpi-row' }, [
      kpiTile(t('kpiAnnual'),
        annualAll.length ? Math.round(annualDone / annualAll.length * 100) + '%' : '—',
        annualAll.length ? L.fmt.completedOf(annualDone, annualAll.length) : t('noData')),
      !settings.showPlan ? null : kpiTile(t('kpiPlan'),
        planTotal ? Math.round(planDone / planTotal * 100) + '%' : '—',
        planTotal ? L.fmt.completedOf(planDone, planTotal) : t('noData')),
      kpiTile(t('kpiWeek'),
        weekItems.length ? weekDone + '/' + weekItems.length : '—',
        weekItems.length ? t('pctDone') + ' ' + Math.round(weekDone / weekItems.length * 100) + '%' : t('noData')),
      kpiTile(t('kpiPromotion'),
        daysToPromo === null ? '—' : String(daysToPromo),
        daysToPromo === null ? t('kpiNoTarget') : monthDayFmt.format(fromDateKey(career.promotion.targetDate)))
    ]);
    body.appendChild(kpis);

    /* --- نسبة إنجاز الأسابيع الأخيرة --- */
    var weekLabels = [], weekValues = [], weekTips = [];
    var start = weekStart(new Date());
    for (var i = 7; i >= 0; i--) {
      var ws = addDays(start, -7 * i);
      var wdata = career.weekly[toDateKey(ws)];
      var itemsArr = wdata ? wdata.todo.concat(wdata.followups, wdata.unplanned) : [];
      var doneArr = itemsArr.filter(function (x) { return x.status === 'done'; });
      var pct = itemsArr.length ? Math.round(doneArr.length / itemsArr.length * 100) : 0;
      weekLabels.push(L.dir === 'rtl'
        ? ws.getDate() + '/' + (ws.getMonth() + 1)
        : (ws.getMonth() + 1) + '/' + ws.getDate());
      weekValues.push(pct);
      weekTips.push([
        t('weekOf') + ' ' + monthDayFmt.format(ws),
        itemsArr.length ? doneArr.length + '/' + itemsArr.length + ' — ' + pct + '%' : t('noData')
      ]);
    }
    body.appendChild(dashCard(t('cardWeeklyTrend'),
      renderColumnChart(weekLabels, weekValues, {
        maxValue: 100,
        tickFormat: function (v) { return Math.round(v) + '%'; },
        tooltip: function (idx) { return weekTips[idx]; }
      })));

    /* --- الأهداف السنوية حسب الأولوية --- */
    var prCard = el('div', {});
    PRIORITY_OPTIONS().forEach(function (opt) {
      var subset = annualAll.filter(function (item) { return item.priority === opt.value; });
      var doneCount = subset.filter(function (item) { return item.done; }).length;
      prCard.appendChild(meterRow(opt.label, doneCount, subset.length));
    });
    body.appendChild(dashCard(t('cardAnnualByPriority'), prCard));

    /* --- تقدم 30/60/90 (إن كانت الصفحة مفعّلة) --- */
    if (settings.showPlan) {
      var phCard = el('div', {});
      PLAN_PHASES.forEach(function (ph) {
        var stat = planPhaseStats(career.plan[ph.key]);
        phCard.appendChild(meterRow(t(ph.titleKey).split(':')[0], stat.done, stat.total));
      });
      body.appendChild(dashCard(t('cardPlanPhases'), phCard));
    }

    /* --- الإنجازات الشهرية خلال السنة --- */
    var year = new Date().getFullYear();
    var mLabels = [], mValues = [], mTips = [];
    for (var m = 0; m < 12; m++) {
      var mk = year + '-' + String(m + 1).padStart(2, '0');
      var mdata = career.monthly[mk];
      var count = mdata ? mdata.accomplishments.length : 0;
      /* أضِف إنجازات الأسابيع الواقعة في الشهر */
      Object.keys(career.weekly).forEach(function (wkKey) {
        if (wkKey.slice(0, 7) === mk) count += career.weekly[wkKey].wins.length;
      });
      mLabels.push(L.monthsShort[m]);
      mValues.push(count);
      mTips.push([L.months[m] + ' ' + year, L.fmt.itemsCount(count)]);
    }
    body.appendChild(dashCard(t('cardMonthlyWins'),
      renderColumnChart(mLabels, mValues, {
        tooltip: function (idx) { return mTips[idx]; }
      })));

    /* --- جاهزية الترقية --- */
    var resp = career.promotion.resp;
    var rated = resp.filter(function (r) { return r.self > 0; });
    var avgSelf = rated.length
      ? rated.reduce(function (sum, r) { return sum + r.self; }, 0) / rated.length
      : 0;
    var examplesCount = resp.reduce(function (s, r) { return s + r.examples.length; }, 0);
    var feedbackCount = resp.reduce(function (s, r) { return s + r.feedback.length; }, 0);

    var promoWrap = el('div', {});
    promoWrap.appendChild(meterRow(t('selfAvg'), Math.round(avgSelf * 10) / 10, 5));
    promoWrap.appendChild(el('div', { class: 'promo-stats' }, [
      promoStat(resp.length, t('respCovered')),
      promoStat(examplesCount, t('evidenceExamples')),
      promoStat(feedbackCount, t('evidenceFeedback'))
    ]));
    if (career.promotion.currentJob || career.promotion.futureJob) {
      var arrow = L.dir === 'rtl' ? ' ← ' : ' → ';
      promoWrap.appendChild(el('p', { class: 'detail-line promo-path', text:
        (career.promotion.currentJob || '—') + arrow + (career.promotion.futureJob || '—') }));
    }
    body.appendChild(dashCard(t('cardPromoReadiness'), promoWrap));

    body.appendChild(settingsCard());

    /* حذف البيانات التجريبية */
    if (localStorage.getItem(DEMO_KEY)) {
      var clearBtn = el('button', { class: 'btn-ghost btn-danger', text: t('clearDemo') });
      clearBtn.addEventListener('click', function () {
        if (!confirm(t('confirmClear'))) return;
        career = emptyCareer();
        save();
        localStorage.removeItem(DEMO_KEY);
        route();
      });
      body.appendChild(clearBtn);
    }
  }

  function settingsCard() {
    var toggle = el('input', { type: 'checkbox', class: 'switch-input', id: 'toggle-plan' });
    toggle.checked = settings.showPlan;
    toggle.addEventListener('change', function () {
      setPlanVisible(toggle.checked);
      renderDashboard();
    });
    return el('section', { class: 'card settings-card' }, [
      el('h2', { class: 'card-title', text: t('settingsTitle') }),
      el('div', { class: 'setting-row' }, [
        el('label', { class: 'switch', for: 'toggle-plan' }, [
          toggle,
          el('span', { class: 'switch-track' })
        ]),
        el('div', { class: 'setting-text' }, [
          el('label', { class: 'setting-label', for: 'toggle-plan', text: t('togglePlanLabel') }),
          el('p', { class: 'setting-hint', text: t('togglePlanHint') })
        ])
      ])
    ]);
  }

  function kpiTile(label, value, sub) {
    return el('div', { class: 'stat-tile' }, [
      el('span', { class: 'stat-label', text: label }),
      el('span', { class: 'stat-value', text: value }),
      el('span', { class: 'stat-sub', text: sub })
    ]);
  }

  function dashCard(title, content) {
    return el('section', { class: 'card' }, [
      el('h2', { class: 'card-title', text: title }),
      content
    ]);
  }

  function promoStat(value, label) {
    return el('div', { class: 'promo-stat' }, [
      el('span', { class: 'promo-stat-value', text: value }),
      el('span', { class: 'promo-stat-label', text: label })
    ]);
  }

  /* ===== البيانات التجريبية ===== */
  document.getElementById('seed-demo').addEventListener('click', function () {
    seedDemo();
    localStorage.setItem(DEMO_KEY, '1');
    save();
    route();
  });

  function seedDemo() {
    var ar = lang === 'ar';
    var seed = 42;
    function rand() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }

    var annualTasks = ar
      ? ['قيادة عملية التنبؤ الشهري', 'أتمتة تقرير المبيعات الأسبوعي', 'إطلاق لوحة مؤشرات القسم',
         'تحسين عملية إقفال نهاية الشهر', 'تدريب موظفَين جدد', 'الحصول على شهادة مهنية',
         'توثيق إجراءات العمل الأساسية', 'تقليل زمن معالجة الطلبات 20%']
      : ['Own the monthly forecasting process', 'Automate the weekly sales report', 'Launch the department KPI dashboard',
         'Improve month-end close process', 'Onboard two new team members', 'Earn a professional certification',
         'Document core work procedures', 'Cut request processing time by 20%'];
    var priorities = ['high', 'medium', 'low'];
    var sizes = ['small', 'medium', 'large'];

    ['core', 'ongoing', 'development'].forEach(function (secKey, sIdx) {
      var n = [4, 3, 2][sIdx];
      for (var i = 0; i < n; i++) {
        career.annual[secKey].push({
          id: uid(), task: pick(annualTasks), priority: pick(priorities), size: pick(sizes),
          deadline: 'Q' + (1 + Math.floor(rand() * 4)),
          deliverable: '', stakeholders: '', valueAdd: '', notes: '',
          done: rand() < 0.45
        });
      }
    });

    var planGoals = ar
      ? { p30: [['التعرف على الشركة والاندماج', 'إكمال كل مواد التهيئة'], ['بناء علاقات مع الفريق', 'لقاء فردي مع كل عضو أساسي']],
          p60: [['تنفيذ مشروع أساسي', 'تسليم مشروع ملموس واحد على الأقل'], ['اقتراح تحسين للعمليات', 'تحديد فرصتي تحسين']],
          p90: [['قيادة مبادرة جديدة', 'قيادة مشروع أو مبادرة'], ['توثيق النتائج', 'ملف إنجازات محدّث']] }
      : { p30: [['Learn and integrate', 'Complete all onboarding'], ['Build team relationships', 'One-on-one with every key member']],
          p60: [['Execute a key project', 'Deliver at least one substantial project'], ['Propose a process improvement', 'Identify two improvement opportunities']],
          p90: [['Lead a new initiative', 'Lead a project or initiative'], ['Document results', 'An up-to-date wins file']] };
    var planTasks = ar
      ? ['مراجعة الوثائق', 'اجتماع مع صاحب المصلحة', 'إعداد مسودة أولى', 'جمع الملاحظات', 'التسليم النهائي']
      : ['Review documentation', 'Meet the stakeholder', 'Prepare a first draft', 'Collect feedback', 'Final delivery'];
    var doneRate = { p30: 1, p60: 0.5, p90: 0.15 };
    Object.keys(planGoals).forEach(function (phKey) {
      planGoals[phKey].forEach(function (g) {
        var tasks = [];
        for (var i = 0; i < 3; i++) {
          tasks.push({ id: uid(), text: pick(planTasks), done: rand() < doneRate[phKey] });
        }
        career.plan[phKey].push({ id: uid(), title: g[0], metric: g[1], notes: '', tasks: tasks });
      });
    });

    var weeklyTasks = ar
      ? ['تحديث تقرير الأداء', 'متابعة طلب العميل', 'مراجعة العرض التقديمي', 'اجتماع الفريق الأسبوعي',
         'إغلاق تذاكر معلقة', 'تحضير مواد الاجتماع', 'مراجعة الميزانية']
      : ['Update the performance report', 'Follow up on the client request', 'Review the presentation', 'Weekly team meeting',
         'Close pending tickets', 'Prepare meeting materials', 'Review the budget'];
    var winsTexts = ar
      ? ['أنهيت التقرير قبل الموعد', 'حل مشكلة عميل معقدة', 'قدمت عرضًا ناجحًا', 'أتممت مرحلة من المشروع']
      : ['Finished the report early', 'Solved a complex client issue', 'Delivered a successful presentation', 'Completed a project phase'];
    var start = weekStart(new Date());
    for (var w = 7; w >= 0; w--) {
      var ws = addDays(start, -7 * w);
      var key = toDateKey(ws);
      var data = weekData(key);
      var n = 3 + Math.floor(rand() * 3);
      for (var i2 = 0; i2 < n; i2++) {
        var isPast = w > 0;
        data.todo.push({
          id: uid(), text: pick(weeklyTasks),
          status: isPast ? (rand() < 0.8 ? 'done' : 'doing') : pick(['todo', 'doing', 'done']),
          valueAdd: ''
        });
      }
      data.followups.push({ id: uid(), text: pick(weeklyTasks), status: w > 0 ? 'done' : 'doing', stakeholder: ar ? 'المدير المباشر' : 'Direct manager' });
      if (rand() < 0.7) data.wins.push({ id: uid(), text: pick(winsTexts) });
    }

    var accTexts = ar
      ? ['إطلاق تقرير آلي وفّر 5 ساعات أسبوعيًا', 'تحقيق هدف الربع قبل الموعد', 'تحسين رضا العملاء 12%', 'إنجاز مشروع التحول الرقمي']
      : ['Launched an automated report saving 5 hrs/week', 'Hit the quarter goal early', 'Improved customer satisfaction by 12%', 'Delivered the digital transformation project'];
    var now = new Date();
    for (var m = 0; m <= now.getMonth(); m++) {
      var mk = now.getFullYear() + '-' + String(m + 1).padStart(2, '0');
      var mdata = monthData(mk);
      var nAcc = 2 + Math.floor(rand() * 3);
      for (var a = 0; a < nAcc; a++) {
        mdata.accomplishments.push({ id: uid(), text: pick(accTexts), extra: '' });
      }
      mdata.feedback.push({ id: uid(), text: ar ? 'تواصلك مع الفريق ممتاز' : 'Great communication with the team', extra: '' });
      mdata.projects.push({ id: uid(), text: pick(accTexts), extra: '' });
      mdata.nextGoals.push({ id: uid(), text: pick(annualTasks), extra: '' });
    }

    career.promotion.currentJob = ar ? 'محلل أول' : 'Senior Analyst';
    career.promotion.futureJob = ar ? 'قائد فريق' : 'Team Lead';
    var target = new Date();
    target.setMonth(target.getMonth() + 6);
    career.promotion.targetDate = toDateKey(target);
    var respTitles = ar
      ? ['قيادة التخطيط والتنبؤ', 'إدارة أصحاب المصلحة', 'تطوير أعضاء الفريق']
      : ['Own planning and forecasting', 'Manage stakeholders', 'Develop team members'];
    respTitles.forEach(function (title, i) {
      career.promotion.resp.push({
        id: uid(), title: title,
        actions: [{ id: uid(), text: ar ? 'وضع الخطة الربع سنوية' : 'Set the quarterly plan' }],
        examples: [{ id: uid(), text: pick(accTexts) }, { id: uid(), text: pick(accTexts) }],
        feedback: [{ id: uid(), provider: ar ? 'المدير المباشر' : 'Direct manager', text: ar ? 'جاهز لمسؤوليات أكبر' : 'Ready for bigger responsibilities' }],
        self: 3 + (i % 2)
      });
    });
  }

  /* ===== التنقل ===== */
  var ROUTES = {
    dashboard: renderDashboard,
    annual: renderAnnual,
    plan: renderPlan,
    weekly: renderWeekly,
    monthly: renderMonthly,
    promotion: renderPromotion
  };

  function route() {
    var hash = location.hash || '#/dashboard';
    var page = 'dashboard';
    Object.keys(ROUTES).forEach(function (key) {
      if (hash.indexOf(key) !== -1) page = key;
    });
    if (page === 'plan' && !settings.showPlan) page = 'dashboard';

    Object.keys(ROUTES).forEach(function (key) {
      document.getElementById('view-' + key).hidden = key !== page;
    });
    document.querySelectorAll('.tab').forEach(function (tab) {
      tab.classList.toggle('active', tab.dataset.route === page);
    });

    hideTooltip();
    ROUTES[page]();
  }

  ['promo-current', 'promo-future', 'promo-date'].forEach(function (id, i) {
    bindPromoField(id, ['currentJob', 'futureJob', 'targetDate'][i]);
  });

  document.getElementById('plan-hide').addEventListener('click', function () {
    setPlanVisible(false);
    location.hash = '#/dashboard';
  });

  window.addEventListener('hashchange', route);
  applyLanguage();
  applyPlanVisibility();
  route();
})();

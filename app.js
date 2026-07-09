/* ناجز — تطبيق متابعة مهام العمل اليومية */
(function () {
  'use strict';

  var STORAGE_KEY = 'najez.entries';
  var MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  var WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  var AR_DATE = new Intl.DateTimeFormat('ar-u-ca-gregory-nu-latn',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  var AR_TIME = new Intl.DateTimeFormat('ar-u-ca-gregory-nu-latn',
    { hour: '2-digit', minute: '2-digit' });

  /* ===== التخزين ===== */
  function loadEntries() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function saveEntries(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function addEntry(text) {
    var entries = loadEntries();
    var now = new Date();
    entries.push({
      id: now.getTime() + '-' + Math.random().toString(36).slice(2, 8),
      date: toDateKey(now),
      text: text,
      ts: now.getTime()
    });
    saveEntries(entries);
  }

  function deleteEntry(id) {
    saveEntries(loadEntries().filter(function (e) { return e.id !== id; }));
  }

  /* ===== أدوات التاريخ والصياغة ===== */
  function toDateKey(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function fromDateKey(key) {
    var p = key.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  function taskWord(n) {
    if (n === 1) return 'مهمة واحدة';
    if (n === 2) return 'مهمتان';
    if (n >= 3 && n <= 10) return n + ' مهام';
    return n + ' مهمة';
  }

  function dayWord(n) {
    if (n === 1) return 'يوم واحد';
    if (n === 2) return 'يومان';
    if (n >= 3 && n <= 10) return n + ' أيام';
    return n + ' يوم';
  }

  /* ===== التلميح (tooltip) ===== */
  var tooltip = document.getElementById('tooltip');

  function showTooltip(evt, strongText, subText) {
    tooltip.textContent = '';
    var strong = document.createElement('strong');
    strong.textContent = strongText;
    tooltip.appendChild(strong);
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

  /* ===== صفحة اليوم ===== */
  function renderToday() {
    var todayKey = toDateKey(new Date());
    document.getElementById('today-date').textContent = AR_DATE.format(new Date());

    var todays = loadEntries()
      .filter(function (e) { return e.date === todayKey; })
      .sort(function (a, b) { return b.ts - a.ts; });

    var list = document.getElementById('today-list');
    list.textContent = '';
    todays.forEach(function (entry) {
      list.appendChild(buildTaskItem(entry, renderToday, true));
    });

    document.getElementById('today-count').textContent =
      todays.length ? 'أنجزت اليوم ' + taskWord(todays.length) : 'مهام اليوم';
    document.getElementById('today-empty').hidden = todays.length > 0;
  }

  function buildTaskItem(entry, onDelete, withTime) {
    var li = document.createElement('li');
    li.className = 'task-item';

    var check = document.createElement('span');
    check.className = 'check';
    check.textContent = '✓';
    li.appendChild(check);

    var text = document.createElement('span');
    text.className = 'text';
    text.textContent = entry.text;
    li.appendChild(text);

    var time = document.createElement('time');
    time.textContent = withTime
      ? AR_TIME.format(new Date(entry.ts))
      : AR_DATE.format(fromDateKey(entry.date));
    li.appendChild(time);

    var del = document.createElement('button');
    del.type = 'button';
    del.className = 'btn-delete';
    del.textContent = '✕';
    del.setAttribute('aria-label', 'حذف المهمة');
    del.addEventListener('click', function () {
      deleteEntry(entry.id);
      onDelete();
    });
    li.appendChild(del);

    return li;
  }

  document.getElementById('task-form').addEventListener('submit', function (evt) {
    evt.preventDefault();
    var input = document.getElementById('task-input');
    var text = input.value.trim();
    if (!text) return;
    addEntry(text);
    input.value = '';
    input.focus();
    renderToday();
  });

  /* ===== حسابات الإنجازات ===== */
  function computeStats(entries, year) {
    var yearEntries = entries.filter(function (e) {
      return e.date.slice(0, 4) === String(year);
    });

    var byDay = {};   // dateKey -> count
    var byMonth = []; // 0..11 -> { tasks, daySet }
    for (var m = 0; m < 12; m++) byMonth.push({ tasks: 0, days: {} });

    yearEntries.forEach(function (e) {
      byDay[e.date] = (byDay[e.date] || 0) + 1;
      var month = +e.date.slice(5, 7) - 1;
      byMonth[month].tasks++;
      byMonth[month].days[e.date] = true;
    });

    var activeDays = Object.keys(byDay).sort();

    // أطول سلسلة أيام متتالية خلال السنة
    var longest = 0, run = 0, prev = null;
    activeDays.forEach(function (key) {
      var d = fromDateKey(key);
      run = (prev && (d - prev === 86400000)) ? run + 1 : 1;
      if (run > longest) longest = run;
      prev = d;
    });

    // السلسلة الحالية (تنتهي اليوم أو أمس) — تُحسب على كل البيانات
    var allDays = {};
    entries.forEach(function (e) { allDays[e.date] = true; });
    var current = 0;
    var cursor = new Date();
    if (!allDays[toDateKey(cursor)]) cursor.setDate(cursor.getDate() - 1);
    while (allDays[toDateKey(cursor)]) {
      current++;
      cursor.setDate(cursor.getDate() - 1);
    }

    return {
      total: yearEntries.length,
      activeDays: activeDays.length,
      byDay: byDay,
      byMonth: byMonth.map(function (mo) {
        return { tasks: mo.tasks, days: Object.keys(mo.days).length };
      }),
      longestStreak: longest,
      currentStreak: current
    };
  }

  /* ===== صفحة الإنجازات ===== */
  var selectedYear = null;

  function renderAchievements() {
    var entries = loadEntries();
    var currentYear = new Date().getFullYear();

    var years = {};
    years[currentYear] = true;
    entries.forEach(function (e) { years[+e.date.slice(0, 4)] = true; });
    var yearList = Object.keys(years).map(Number).sort(function (a, b) { return b - a; });
    if (selectedYear === null || yearList.indexOf(selectedYear) === -1) selectedYear = currentYear;

    var select = document.getElementById('year-select');
    select.textContent = '';
    yearList.forEach(function (y) {
      var opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      opt.selected = y === selectedYear;
      select.appendChild(opt);
    });

    var hasData = entries.length > 0;
    document.getElementById('dash-empty').hidden = hasData;
    document.getElementById('dash-body').hidden = !hasData;
    document.getElementById('clear-demo').hidden = !entries.some(function (e) { return e.demo; });
    if (!hasData) return;

    var stats = computeStats(entries, selectedYear);

    // مؤشرات الأرقام
    document.getElementById('kpi-total').textContent = stats.total.toLocaleString('en-US');
    document.getElementById('kpi-total-sub').textContent = 'خلال سنة ' + selectedYear;
    document.getElementById('kpi-days').textContent = stats.activeDays.toLocaleString('en-US');
    document.getElementById('kpi-days-sub').textContent = 'يوم سجّلت فيه مهام';
    document.getElementById('kpi-avg').textContent =
      stats.activeDays ? (stats.total / stats.activeDays).toFixed(1) : '0';
    document.getElementById('kpi-streak').textContent = stats.longestStreak.toLocaleString('en-US');
    document.getElementById('kpi-streak-sub').textContent =
      selectedYear === currentYear && stats.currentStreak > 0
        ? 'السلسلة الحالية: ' + dayWord(stats.currentStreak)
        : 'أيام متتالية';

    renderMonthlyChart(stats.byMonth);
    renderMonthlyTable(stats.byMonth);
    renderHeatmap(stats.byDay, selectedYear);
    renderLog(entries, selectedYear);
  }

  document.getElementById('year-select').addEventListener('change', function () {
    selectedYear = +this.value;
    renderAchievements();
  });

  /* الرسم الشهري — أعمدة، سلسلة واحدة بلون أزرق تسلسلي */
  function renderMonthlyChart(byMonth) {
    var W = 760, H = 240;
    var margin = { top: 18, bottom: 26, right: 34, left: 6 };
    var plotW = W - margin.left - margin.right;
    var plotH = H - margin.top - margin.bottom;

    var maxVal = Math.max(1, Math.max.apply(null, byMonth.map(function (m) { return m.tasks; })));
    var niceMax = niceCeil(maxVal);
    var maxIdx = byMonth.reduce(function (best, m, i) {
      return m.tasks > byMonth[best].tasks ? i : best;
    }, 0);

    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'عدد المهام في كل شهر من السنة');

    // خطوط الشبكة وقيم المحور (على اليمين — اتجاه القراءة)
    var ticks = 4;
    for (var t = 0; t <= ticks; t++) {
      var val = Math.round(niceMax * t / ticks);
      var y = margin.top + plotH - (plotH * t / ticks);
      var line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', margin.left);
      line.setAttribute('x2', margin.left + plotW);
      line.setAttribute('y1', y);
      line.setAttribute('y2', y);
      line.setAttribute('class', t === 0 ? 'axis-line' : 'grid-line');
      svg.appendChild(line);

      if (t > 0) {
        var tickText = document.createElementNS(svgNS, 'text');
        tickText.setAttribute('x', W - 4);
        tickText.setAttribute('y', y + 4);
        tickText.setAttribute('text-anchor', 'end');
        tickText.setAttribute('class', 'tick-label');
        tickText.textContent = val;
        svg.appendChild(tickText);
      }
    }

    var band = plotW / 12;
    var barW = Math.min(24, band * 0.5);

    byMonth.forEach(function (mo, i) {
      // يناير في أقصى اليمين — اتجاه القراءة العربية
      var bandX = margin.left + plotW - (i + 1) * band;
      var x = bandX + (band - barW) / 2;
      var h = niceMax ? (mo.tasks / niceMax) * plotH : 0;
      var y = margin.top + plotH - h;

      var bar = null;
      if (mo.tasks > 0) {
        bar = document.createElementNS(svgNS, 'path');
        bar.setAttribute('d', roundedTopBar(x, y, barW, h, Math.min(4, h)));
        bar.setAttribute('class', 'bar');
        svg.appendChild(bar);

        // تسمية مباشرة على أعلى شهر فقط
        if (i === maxIdx) {
          var cap = document.createElementNS(svgNS, 'text');
          cap.setAttribute('x', x + barW / 2);
          cap.setAttribute('y', y - 6);
          cap.setAttribute('text-anchor', 'middle');
          cap.setAttribute('class', 'cap-label');
          cap.textContent = mo.tasks;
          svg.appendChild(cap);
        }
      }

      var monthLabel = document.createElementNS(svgNS, 'text');
      monthLabel.setAttribute('x', bandX + band / 2);
      monthLabel.setAttribute('y', H - 8);
      monthLabel.setAttribute('text-anchor', 'middle');
      monthLabel.setAttribute('class', 'month-label');
      monthLabel.textContent = MONTHS[i];
      svg.appendChild(monthLabel);

      // منطقة التفاعل: العمود كامل الارتفاع أوسع من العلامة نفسها
      var hit = document.createElementNS(svgNS, 'rect');
      hit.setAttribute('x', bandX);
      hit.setAttribute('y', margin.top);
      hit.setAttribute('width', band);
      hit.setAttribute('height', plotH);
      hit.setAttribute('class', 'bar-hit');
      hit.addEventListener('pointermove', function (evt) {
        if (bar) bar.classList.add('hover');
        showTooltip(evt, MONTHS[i] + ' — ' + taskWord(mo.tasks),
          mo.days ? 'في ' + dayWord(mo.days) + ' عمل' : '');
      });
      hit.addEventListener('pointerleave', function () {
        if (bar) bar.classList.remove('hover');
        hideTooltip();
      });
      svg.appendChild(hit);
    });

    var container = document.getElementById('monthly-chart');
    container.textContent = '';
    container.appendChild(svg);
  }

  function roundedTopBar(x, y, w, h, r) {
    if (h <= 0) return '';
    r = Math.min(r, w / 2, h);
    return 'M' + x + ' ' + (y + h) +
      'V' + (y + r) +
      'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y +
      'H' + (x + w - r) +
      'Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + r) +
      'V' + (y + h) + 'Z';
  }

  function niceCeil(v) {
    if (v <= 4) return 4;
    var mag = Math.pow(10, Math.floor(Math.log10(v)));
    var steps = [1, 2, 4, 5, 10];
    for (var i = 0; i < steps.length; i++) {
      if (steps[i] * mag >= v) return steps[i] * mag;
    }
    return 10 * mag;
  }

  function renderMonthlyTable(byMonth) {
    var tbody = document.querySelector('#monthly-table tbody');
    tbody.textContent = '';
    byMonth.forEach(function (mo, i) {
      var tr = document.createElement('tr');
      [MONTHS[i], mo.tasks, mo.days].forEach(function (v) {
        var td = document.createElement('td');
        td.textContent = v;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  /* خريطة نشاط السنة — تدرّج أزرق واحد، فاتح → داكن */
  function renderHeatmap(byDay, year) {
    var container = document.getElementById('heatmap');
    container.textContent = '';

    var start = new Date(year, 0, 1);
    var end = new Date(year, 11, 31);
    var todayKey = toDateKey(new Date());

    // نبدأ الشبكة من الأحد الذي يسبق أول السنة
    var gridStart = new Date(start);
    gridStart.setDate(gridStart.getDate() - gridStart.getDay());
    var totalDays = Math.round((end - gridStart) / 86400000) + 1;
    var weeks = Math.ceil(totalDays / 7);

    var CELL = 12, GAP = 3;

    // صف أسماء الشهور فوق الشبكة
    var monthsRow = document.createElement('div');
    monthsRow.className = 'hm-months';
    monthsRow.style.display = 'grid';
    monthsRow.style.gridTemplateColumns = 'repeat(' + weeks + ', ' + CELL + 'px)';
    monthsRow.style.gap = GAP + 'px';
    for (var m = 0; m < 12; m++) {
      var firstOfMonth = new Date(year, m, 1);
      var weekIdx = Math.floor((firstOfMonth - gridStart) / 86400000 / 7);
      var label = document.createElement('span');
      label.className = 'hm-month-label';
      label.style.gridColumn = String(weekIdx + 1);
      label.style.whiteSpace = 'nowrap';
      label.textContent = MONTHS[m];
      monthsRow.appendChild(label);
    }
    container.appendChild(monthsRow);

    var grid = document.createElement('div');
    grid.className = 'hm-grid';

    var day = new Date(gridStart);
    for (var i = 0; i < weeks * 7; i++) {
      var key = toDateKey(day);
      var inYear = day >= start && day <= end;
      var isFuture = key > todayKey;
      var count = byDay[key] || 0;

      var cell = document.createElement('span');
      cell.className = 'hm-cell ' + levelClass(count);
      if (!inYear || isFuture) cell.classList.add('future');

      if (inYear && !isFuture) {
        (function (dateStr, count) {
          cell.addEventListener('pointermove', function (evt) {
            showTooltip(evt, count ? taskWord(count) : 'لا مهام', dateStr);
          });
          cell.addEventListener('pointerleave', hideTooltip);
        })(AR_DATE.format(day), count);
      }

      grid.appendChild(cell);
      day.setDate(day.getDate() + 1);
    }
    container.appendChild(grid);
  }

  function levelClass(count) {
    if (count === 0) return 'l0';
    if (count === 1) return 'l1';
    if (count === 2) return 'l2';
    if (count <= 4) return 'l3';
    return 'l4';
  }

  /* سجل المهام */
  function renderLog(entries, year) {
    var yearEntries = entries
      .filter(function (e) { return e.date.slice(0, 4) === String(year); })
      .sort(function (a, b) { return b.ts - a.ts; });

    document.getElementById('log-count').textContent = '(' + yearEntries.length + ')';
    var list = document.getElementById('log-list');
    list.textContent = '';
    yearEntries.slice(0, 200).forEach(function (entry) {
      list.appendChild(buildTaskItem(entry, renderAchievements, false));
    });
  }

  /* ===== البيانات التجريبية ===== */
  var DEMO_TASKS = [
    'مراجعة تقرير الأداء الأسبوعي', 'اجتماع متابعة مع الفريق', 'الرد على بريد العملاء',
    'تحديث خطة المشروع', 'إعداد عرض تقديمي', 'مراجعة طلبات الشراء',
    'تدقيق البيانات الشهرية', 'كتابة محضر الاجتماع', 'متابعة المهام المتأخرة',
    'تطوير نموذج العمل الجديد', 'تنسيق مع قسم الموارد', 'إغلاق تذاكر الدعم'
  ];

  document.getElementById('seed-demo').addEventListener('click', function () {
    var entries = loadEntries();
    var today = new Date();
    var d = new Date(today.getFullYear(), 0, 1);
    var seed = 42;
    function rand() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }

    while (d <= today) {
      var isWeekend = d.getDay() === 5 || d.getDay() === 6; // الجمعة والسبت
      var p = isWeekend ? 0.1 : 0.75;
      if (rand() < p) {
        var n = 1 + Math.floor(rand() * 4);
        for (var i = 0; i < n; i++) {
          entries.push({
            id: 'demo-' + d.getTime() + '-' + i,
            date: toDateKey(d),
            text: DEMO_TASKS[Math.floor(rand() * DEMO_TASKS.length)],
            ts: d.getTime() + i * 3600000,
            demo: true
          });
        }
      }
      d.setDate(d.getDate() + 1);
    }
    saveEntries(entries);
    renderAchievements();
  });

  document.getElementById('clear-demo').addEventListener('click', function () {
    saveEntries(loadEntries().filter(function (e) { return !e.demo; }));
    renderAchievements();
    renderToday();
  });

  /* ===== التنقل ===== */
  function route() {
    var hash = location.hash || '#/today';
    var page = hash.indexOf('achievements') !== -1 ? 'achievements' : 'today';

    document.getElementById('view-today').hidden = page !== 'today';
    document.getElementById('view-achievements').hidden = page !== 'achievements';
    document.querySelectorAll('.tab').forEach(function (tab) {
      tab.classList.toggle('active', tab.dataset.route === page);
    });

    hideTooltip();
    if (page === 'today') {
      renderToday();
      document.getElementById('task-input').focus();
    } else {
      renderAchievements();
    }
  }

  window.addEventListener('hashchange', route);
  route();
})();

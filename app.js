(function () {
  const PAGE_SIZE = 50;

  // reagents comes from reagents_data_v2.js. Each item gets a stable id = its index.
  const data = reagents.map((r, i) => ({ ...r, id: i, no: String(i + 1).padStart(4, '0') }));

  const LOCATION_GROUPS = {
    'group-aj': ['A시약장','B시약장','C시약장','D시약장','E시약장','F시약장','G시약장','H시약장','I시약장','J시약장'],
    'group-a123': ['A1시약장','A2시약장','A3시약장'],
    'group-n123': ['N1시약장','N2시약장','N3시약장'],
    'group-prof': ['교수님 시약장 1층','교수님 시약장 2층','교수님 시약장 3층','교수님 시약장 4층','교수님 시약장 5층'],
    'group-etc': ['산시약장','냉장고'],
  };

  const state = {
    query: '',
    manufacturer: '',
    location: '',
    sort: 'default',
    page: 1,
  };

  const els = {
    totalCount: document.getElementById('total-count'),
    searchInput: document.getElementById('search-input'),
    searchClear: document.getElementById('search-clear'),
    manufacturerSelect: document.getElementById('manufacturer-select'),
    sortSelect: document.getElementById('sort-select'),
    resultSummary: document.getElementById('result-summary'),
    tableBody: document.getElementById('table-body'),
    emptyState: document.getElementById('empty-state'),
    pagination: document.getElementById('pagination'),
    sidebar: document.getElementById('sidebar'),
    sidebarToggle: document.getElementById('sidebar-toggle'),
    countAll: document.getElementById('count-all'),
  };

  function isEstimatedPurity(p) {
    return typeof p === 'string' && p.includes('추정');
  }

  function init() {
    els.totalCount.textContent = `총 ${data.length.toLocaleString()}개 시약`;
    els.countAll.textContent = data.length;
    buildSidebar();
    buildManufacturerOptions();
    bindEvents();
    render();
  }

  function buildSidebar() {
    const counts = {};
    data.forEach((r) => { counts[r.location] = (counts[r.location] || 0) + 1; });

    Object.entries(LOCATION_GROUPS).forEach(([groupId, locations]) => {
      const container = document.getElementById(groupId);
      locations.forEach((loc) => {
        const count = counts[loc] || 0;
        const btn = document.createElement('button');
        btn.className = 'drawer-item';
        btn.dataset.location = loc;
        btn.innerHTML = `<span class="drawer-label">${shortLabel(loc)}</span><span class="drawer-count">${count}</span>`;
        container.appendChild(btn);
      });
    });
  }

  function shortLabel(loc) {
    return loc.replace('교수님 시약장 ', '').replace('시약장', '');
  }

  function buildManufacturerOptions() {
    const counts = {};
    data.forEach((r) => {
      const m = r.manufacturer && r.manufacturer !== '---' ? r.manufacturer : null;
      if (m) counts[m] = (counts[m] || 0) + 1;
    });
    const names = Object.keys(counts).sort((a, b) => a.localeCompare(b));
    names.forEach((name) => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = `${name} (${counts[name]})`;
      els.manufacturerSelect.appendChild(opt);
    });
  }

  function bindEvents() {
    els.searchInput.addEventListener('input', () => {
      state.query = els.searchInput.value.trim().toLowerCase();
      els.searchClear.hidden = state.query === '';
      state.page = 1;
      render();
    });

    els.searchClear.addEventListener('click', () => {
      els.searchInput.value = '';
      state.query = '';
      els.searchClear.hidden = true;
      state.page = 1;
      render();
    });

    els.manufacturerSelect.addEventListener('change', () => {
      state.manufacturer = els.manufacturerSelect.value;
      state.page = 1;
      render();
    });

    els.sortSelect.addEventListener('change', () => {
      state.sort = els.sortSelect.value;
      state.page = 1;
      render();
    });

    document.querySelectorAll('.drawer-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.location = btn.dataset.location;
        state.page = 1;
        document.querySelectorAll('.drawer-item').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        render();
        els.sidebar.classList.remove('open');
      });
    });

    els.sidebarToggle.addEventListener('click', () => {
      els.sidebar.classList.toggle('open');
    });
  }

  function getFiltered() {
    let list = data;

    if (state.location) {
      list = list.filter((r) => r.location === state.location);
    }
    if (state.manufacturer) {
      list = list.filter((r) => r.manufacturer === state.manufacturer);
    }
    if (state.query) {
      const q = state.query;
      list = list.filter((r) =>
        r.title.toLowerCase().includes(q) ||
        (r.content && r.content.toLowerCase().includes(q)) ||
        (r.manufacturer && r.manufacturer.toLowerCase().includes(q))
      );
    }

    if (state.sort === 'title-asc') {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    } else if (state.sort === 'title-desc') {
      list = [...list].sort((a, b) => b.title.localeCompare(a.title));
    } else if (state.sort === 'mw-asc' || state.sort === 'mw-desc') {
      list = [...list].sort((a, b) => {
        const av = typeof a.분자량 === 'number' ? a.분자량 : (parseFloat(a.분자량) || Infinity);
        const bv = typeof b.분자량 === 'number' ? b.분자량 : (parseFloat(b.분자량) || Infinity);
        return state.sort === 'mw-asc' ? av - bv : bv - av;
      });
    }

    return list;
  }

  function render() {
    const filtered = getFiltered();
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    state.page = Math.min(state.page, totalPages);

    const start = (state.page - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);

    els.resultSummary.textContent = state.query || state.manufacturer || state.location
      ? `${total.toLocaleString()}개 결과`
      : `전체 ${total.toLocaleString()}개`;

    els.emptyState.hidden = total !== 0;
    els.tableBody.innerHTML = '';

    for (const item of pageItems) {
      const tr = document.createElement('tr');
      tr.dataset.id = item.id;

      const purityClass = item.순도 === '---'
        ? ''
        : (isEstimatedPurity(item.순도) ? 'cell-purity-estimated' : 'cell-purity-stated');

      tr.innerHTML = `
        <td class="col-no mono">${item.no}</td>
        <td class="cell-title">${escapeHtml(item.title)}</td>
        <td class="cell-formula">${escapeHtml(item.content)}</td>
        <td class="col-mw mono">${item.분자량 === '---' ? '—' : item.분자량}</td>
        <td class="col-purity ${purityClass}">${escapeHtml(item.순도)}</td>
        <td class="col-manuf">${escapeHtml(item.manufacturer)}</td>
        <td class="col-loc">${escapeHtml(item.location)}</td>
      `;
      els.tableBody.appendChild(tr);
    }

    renderPagination(total, totalPages);
  }

  function renderPagination(total, totalPages) {
    els.pagination.innerHTML = '';
    if (totalPages <= 1) return;

    const makeBtn = (label, page, opts = {}) => {
      const btn = document.createElement('button');
      btn.className = 'page-btn' + (opts.active ? ' active' : '');
      btn.textContent = label;
      btn.disabled = !!opts.disabled;
      btn.addEventListener('click', () => { state.page = page; render(); window.scrollTo({top:0, behavior:'smooth'}); });
      return btn;
    };

    els.pagination.appendChild(makeBtn('‹', state.page - 1, { disabled: state.page === 1 }));

    const windowSize = 5;
    let startPage = Math.max(1, state.page - Math.floor(windowSize / 2));
    let endPage = Math.min(totalPages, startPage + windowSize - 1);
    startPage = Math.max(1, endPage - windowSize + 1);

    for (let p = startPage; p <= endPage; p++) {
      els.pagination.appendChild(makeBtn(String(p), p, { active: p === state.page }));
    }

    els.pagination.appendChild(makeBtn('›', state.page + 1, { disabled: state.page === totalPages }));
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  init();
})();

// State
const state = {
    db1: {
        file: null,
        workbook: null,
        data: [], // Selected sheet data
        keys: [] // Selected keys
    },
    db2: {
        file: null,
        workbook: null,
        data: [],
        keys: []
    },
    results: {
        added: [],
        removed: [],
        modified: []
    }
};

// DOM Elements
const dropzone1 = document.getElementById('dropzone1');
const fileInput1 = document.getElementById('fileInput1');
const fileName1 = document.getElementById('fileName1');
const options1 = document.getElementById('options1');
const sheetSelect1 = document.getElementById('sheetSelect1');
const keysContainer1 = document.getElementById('keysContainer1');
const btnAddKey1 = document.getElementById('btnAddKey1');
const rowCount1 = document.getElementById('rowCount1');

const dropzone2 = document.getElementById('dropzone2');
const fileInput2 = document.getElementById('fileInput2');
const fileName2 = document.getElementById('fileName2');
const options2 = document.getElementById('options2');
const sheetSelect2 = document.getElementById('sheetSelect2');
const keysContainer2 = document.getElementById('keysContainer2');
const btnAddKey2 = document.getElementById('btnAddKey2');
const rowCount2 = document.getElementById('rowCount2');

const btnCompare = document.getElementById('btnCompare');
const resultsSection = document.getElementById('resultsSection');
const searchInput = document.getElementById('searchInput');
const btnExport = document.getElementById('btnExport');
const btnReset = document.getElementById('btnReset');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    setupDropzone(dropzone1, fileInput1, 1);
    setupDropzone(dropzone2, fileInput2, 2);

    // Select listeners
    sheetSelect1.addEventListener('change', (e) => loadSheetData(1, e.target.value));
    sheetSelect2.addEventListener('change', (e) => loadSheetData(2, e.target.value));

    btnAddKey1.addEventListener('click', () => addKeySelect(1));
    btnAddKey2.addEventListener('click', () => addKeySelect(2));

    btnCompare.addEventListener('click', performComparison);

    if (searchInput) {
        searchInput.addEventListener('input', filterTables);
    }

    if (btnExport) {
        btnExport.addEventListener('click', exportToExcel);
    }

    if (btnReset) {
        btnReset.addEventListener('click', resetApp);
    }

    // Tabs setup
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));

            // Add active to clicked
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.remove('hidden');
        });
    });

    // Summary cards act as tabs too
    document.getElementById('cardAdded').addEventListener('click', () => document.querySelector('[data-target="tab-added"]').click());
    document.getElementById('cardRemoved').addEventListener('click', () => document.querySelector('[data-target="tab-removed"]').click());
    document.getElementById('cardModified').addEventListener('click', () => document.querySelector('[data-target="tab-modified"]').click());
});

// Logic for Dropzones
function setupDropzone(dropzone, input, index) {
    dropzone.addEventListener('click', () => input.click());

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length) handleFile(files[0], index);
    });

    input.addEventListener('change', function () {
        if (this.files.length) handleFile(this.files[0], index);
    });
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// File Reading & Parsing
function handleFile(file, index) {
    // Hide results section when a new file is uploaded to clear previous comparison
    resultsSection.classList.add('hidden');
    state.results = { added: [], removed: [], modified: [] };

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
        alert('Por favor sube un archivo Excel o CSV.');
        return;
    }

    const targetState = index === 1 ? state.db1 : state.db2;
    const fileNameEl = index === 1 ? fileName1 : fileName2;
    const optionsEl = index === 1 ? options1 : options2;
    const sheetSelectEl = index === 1 ? sheetSelect1 : sheetSelect2;

    targetState.file = file;
    fileNameEl.textContent = file.name;
    fileNameEl.title = file.name;

    // Read file with FileReader
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        targetState.workbook = workbook;

        // Populate sheets
        sheetSelectEl.innerHTML = '';
        workbook.SheetNames.forEach(sheetName => {
            const option = document.createElement('option');
            option.value = sheetName;
            option.textContent = sheetName;
            sheetSelectEl.appendChild(option);
        });

        optionsEl.classList.remove('hidden');

        // Load first sheet by default
        loadSheetData(index, workbook.SheetNames[0]);
    };
    reader.readAsArrayBuffer(file);
}

function loadSheetData(index, sheetName) {
    const targetState = index === 1 ? state.db1 : state.db2;
    const rowCountEl = index === 1 ? rowCount1 : rowCount2;

    const worksheet = targetState.workbook.Sheets[sheetName];
    // Convert to JSON array, format dates as dd/mm/yyyy
    let jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false, dateNF: "dd/mm/yyyy" });
    targetState.data = jsonData;
    rowCountEl.textContent = `Filas: ${jsonData.length}`;

    // Extract column headers
    const container = index === 1 ? keysContainer1 : keysContainer2;
    const btnAdd = index === 1 ? btnAddKey1 : btnAddKey2;
    container.innerHTML = '';

    if (jsonData.length > 0) {
        const columns = Object.keys(jsonData[0]);
        targetState.keys = [columns[0]];

        const firstSelect = document.createElement('select');
        firstSelect.className = 'glass-select key-select';
        firstSelect.dataset.idx = 0;

        columns.forEach(col => {
            const option = document.createElement('option');
            option.value = col;
            option.textContent = col;
            firstSelect.appendChild(option);
        });

        firstSelect.addEventListener('change', () => updateKeysState(index));
        container.appendChild(firstSelect);

        btnAdd.classList.remove('hidden');
    } else {
        const emptySelect = document.createElement('select');
        emptySelect.className = 'glass-select key-select';
        emptySelect.innerHTML = '<option value="">No hay datos</option>';
        container.appendChild(emptySelect);
        targetState.keys = [];
        btnAdd.classList.add('hidden');
    }

    checkAddButtonVisibility(index);

    // Try to auto-match first key if possible
    if (targetState.keys.length > 0) {
        const otherState = index === 1 ? state.db2 : state.db1;
        if (otherState.keys.length > 0 && otherState.data.length > 0) {
            const columns = Object.keys(jsonData[0]);
            if (columns.includes(otherState.keys[0])) {
                container.querySelector('select').value = otherState.keys[0];
                targetState.keys[0] = otherState.keys[0];
            }
        }
    }

    updateKeysState(index);
}

function addKeySelect(index) {
    const container = index === 1 ? keysContainer1 : keysContainer2;
    const selects = container.querySelectorAll('select');
    if (selects.length >= 5) return;

    const targetState = index === 1 ? state.db1 : state.db2;
    const columns = targetState.data.length > 0 ? Object.keys(targetState.data[0]) : [];

    const newSelect = document.createElement('select');
    newSelect.className = 'glass-select key-select';
    newSelect.dataset.idx = selects.length;

    // Default to empty option for subsequent keys
    const defaultOpt = document.createElement('option');
    defaultOpt.value = "";
    defaultOpt.textContent = "-- Seleccionar llave extra --";
    newSelect.appendChild(defaultOpt);

    columns.forEach(col => {
        const option = document.createElement('option');
        option.value = col;
        option.textContent = col;
        newSelect.appendChild(option);
    });

    newSelect.addEventListener('change', () => updateKeysState(index));
    container.appendChild(newSelect);

    updateKeysState(index);
    checkAddButtonVisibility(index);
}

function updateKeysState(index) {
    const container = index === 1 ? keysContainer1 : keysContainer2;
    const selects = container.querySelectorAll('select');
    const keys = Array.from(selects).map(s => s.value).filter(v => v !== ""); // filter out empty

    if (index === 1) state.db1.keys = keys;
    else state.db2.keys = keys;

    checkReady();
}

function checkAddButtonVisibility(index) {
    const container = index === 1 ? keysContainer1 : keysContainer2;
    const btn = index === 1 ? btnAddKey1 : btnAddKey2;
    if (container.querySelectorAll('select').length >= 5) {
        btn.classList.add('hidden');
    } else if (container.querySelectorAll('select').length > 0 && container.querySelector('select').value !== "") {
        btn.classList.remove('hidden');
    }
}

function checkReady() {
    if (state.db1.data.length > 0 && state.db2.data.length > 0 &&
        state.db1.keys.length > 0 && state.db2.keys.length > 0 &&
        state.db1.keys.length === state.db2.keys.length) {
        btnCompare.disabled = false;
        btnCompare.classList.add('pulse-anim');
        setTimeout(() => btnCompare.classList.remove('pulse-anim'), 1000);
    } else {
        btnCompare.disabled = true;
    }
}

function filterTables(e) {
    const term = e.target.value.toLowerCase();
    const tables = [document.getElementById('tableAdded'), document.getElementById('tableRemoved'), document.getElementById('tableModified')];

    tables.forEach(table => {
        if (!table) return;
        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            if (row.querySelector('th')) return; // Ignore empty state message row

            const text = row.textContent.toLowerCase();
            if (text.includes(term)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
}

// Compare Engine
function performComparison() {
    const keys1 = state.db1.keys;
    const keys2 = state.db2.keys;
    const data1 = state.db1.data;
    const data2 = state.db2.data;

    const getCompositeKey1 = (row) => keys1.map(k => String(row[k] || '').trim()).join(' | ');
    const getCompositeKey2 = (row) => keys2.map(k => String(row[k] || '').trim()).join(' | ');

    // Index arrays by key for O(1) lookups
    const map1 = new Map();
    data1.forEach(row => {
        let keyValue = getCompositeKey1(row);
        if (keyValue !== '') {
            map1.set(keyValue, row);
        }
    });

    const map2 = new Map();
    data2.forEach(row => {
        let keyValue = getCompositeKey2(row);
        if (keyValue !== '') {
            map2.set(keyValue, row);
        }
    });

    const added = [];
    const removed = [];
    const modified = [];

    // Find Removed (in 1 not in 2) and Modified (in both but diff values)
    map1.forEach((row1, keyValue) => {
        if (!map2.has(keyValue)) {
            removed.push(row1);
        } else {
            const row2 = map2.get(keyValue);
            // Check for modifications
            const differences = {};
            let isModified = false;

            // We check only common columns (same name) ignoring all keys
            const commonCols = Object.keys(row1).filter(col =>
                Object.keys(row2).includes(col) &&
                !keys1.includes(col) &&
                !keys2.includes(col)
            );

            commonCols.forEach(col => {
                const val1 = String(row1[col] || '');
                const val2 = String(row2[col] || '');

                if (val1 !== val2) {
                    isModified = true;
                    differences[col] = { old: val1, new: val2 };
                }
            });

            if (isModified) {
                // Return a special object that contains the key, differences, and original rows for reference
                const groupName = Object.keys(differences).sort().join(', ');
                modified.push({
                    key: keyValue,
                    diffs: differences,
                    diffGroup: groupName,
                    row1: row1,
                    row2: row2
                });
            }
        }
    });

    // Find Added (in 2 not in 1)
    map2.forEach((row2, keyValue) => {
        if (!map1.has(keyValue)) {
            added.push(row2);
        }
    });

    // Update State
    state.results = { added, removed, modified };

    // Render Results
    renderResults();
}

function renderResults() {
    // Reveal section
    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth' });

    // Update counts
    document.getElementById('countAdded').textContent = state.results.added.length;
    document.getElementById('countRemoved').textContent = state.results.removed.length;
    document.getElementById('countModified').textContent = state.results.modified.length;

    // Render tables
    renderSimpleTable('tableAdded', state.results.added, state.db2.keys.join(' | '));
    renderSimpleTable('tableRemoved', state.results.removed, state.db1.keys.join(' | '));
    renderModifiedTable('tableModified', state.results.modified, state.db1.keys.join(' | '), state.db2.keys.join(' | '));
}

function renderSimpleTable(tableId, dataArray, primaryKey) {
    const table = document.getElementById(tableId);
    if (!dataArray || dataArray.length === 0) {
        table.innerHTML = '<thead><tr><th>No se encontraron datos en esta categoría.</th></tr></thead><tbody></tbody>';
        return;
    }

    // Extract union of all columns just in case
    const columnsSet = new Set();
    columnsSet.add(primaryKey); // ensure primary key is first
    dataArray.forEach(row => Object.keys(row).forEach(col => columnsSet.add(col)));
    const columns = Array.from(columnsSet);

    let thead = '<thead><tr>';
    columns.forEach(col => {
        thead += `<th>${col}</th>`;
    });
    thead += '</tr></thead>';

    let tbody = '<tbody>';
    dataArray.forEach(row => {
        tbody += '<tr>';
        columns.forEach(col => {
            tbody += `<td>${row[col] !== undefined ? row[col] : ''}</td>`;
        });
        tbody += '</tr>';
    });
    tbody += '</tbody>';

    table.innerHTML = thead + tbody;
}

function renderModifiedTable(tableId, modifiedArray, keyName1, keyName2) {
    const tableEl = document.getElementById(tableId);
    if (!tableEl) return;
    const container = tableEl.parentElement;
    container.innerHTML = '';

    if (!modifiedArray || modifiedArray.length === 0) {
        container.innerHTML = '<table class="data-table" id="tableModified"><thead><tr><th>No se encontraron datos en esta categoría.</th></tr></thead><tbody></tbody></table>';
        return;
    }

    // Group by diffGroup
    const groups = {};
    modifiedArray.forEach(mod => {
        if (!groups[mod.diffGroup]) groups[mod.diffGroup] = [];
        groups[mod.diffGroup].push(mod);
    });

    // For each group create a table
    Object.keys(groups).sort().forEach(groupName => {
        const groupMods = groups[groupName];

        // Header for group
        const groupTitle = document.createElement('h4');
        groupTitle.style.padding = '1.5rem 0 0.5rem';
        groupTitle.style.color = 'var(--text-main)';
        groupTitle.textContent = `Modificaciones en: ${groupName} (${groupMods.length} registros)`;
        container.appendChild(groupTitle);

        const table = document.createElement('table');
        table.className = 'data-table';

        const cols = groupName.split(', ');

        // thead
        let thead = '<thead><tr>';
        thead += `<th>Llave (${keyName1})</th>`;
        cols.forEach(col => {
            thead += `<th>${col} (Antiguo)</th>`;
            thead += `<th>${col} (Nuevo)</th>`;
        });
        thead += '</tr></thead>';

        // tbody
        let tbody = '<tbody>';
        groupMods.forEach(mod => {
            tbody += '<tr>';
            tbody += `<td><strong>${mod.key}</strong></td>`;

            cols.forEach(col => {
                const oldVal = mod.diffs[col] ? mod.diffs[col].old : '';
                const newVal = mod.diffs[col] ? mod.diffs[col].new : '';
                tbody += `<td><span class="value-old" style="text-decoration:none; opacity:0.9;">${oldVal}</span></td>`;
                tbody += `<td class="cell-modified"><span class="value-new">${newVal}</span></td>`;
            });
            tbody += '</tr>';
        });
        tbody += '</tbody>';

        table.innerHTML = thead + tbody;
        container.appendChild(table);
    });
}

function exportToExcel() {
    if (!state.results || (state.results.added.length === 0 && state.results.removed.length === 0 && state.results.modified.length === 0)) {
        alert("No hay resultados para exportar.");
        return;
    }

    const wb = XLSX.utils.book_new();

    // 1. Añadidos (Incluidos)
    if (state.results.added.length > 0) {
        const wsAdded = XLSX.utils.json_to_sheet(state.results.added);
        XLSX.utils.book_append_sheet(wb, wsAdded, "Incluidos");
    }

    // 2. Eliminados (Excluidos)
    if (state.results.removed.length > 0) {
        const wsRemoved = XLSX.utils.json_to_sheet(state.results.removed);
        XLSX.utils.book_append_sheet(wb, wsRemoved, "Excluidos");
    }

    // 3. Modificados (Agrupados por tipo de modificación en pestañas separadas)
    if (state.results.modified.length > 0) {
        const keyName1 = state.db1.keys.join(' | ');
        const keyName2 = state.db2.keys.join(' | ');

        // Group by diffGroup
        const groups = {};
        state.results.modified.forEach(mod => {
            if (!groups[mod.diffGroup]) groups[mod.diffGroup] = [];
            groups[mod.diffGroup].push(mod);
        });

        // Loop through each group and create a separate sheet
        Object.keys(groups).sort().forEach((groupName, idx) => {
            const groupMods = groups[groupName];

            const flatGroupMods = groupMods.map(mod => {
                const row = { ["Llave (" + keyName1 + ")"]: mod.key };

                const cols = groupName.split(', ');
                cols.forEach(col => {
                    row[`${col} (Antiguo)`] = mod.diffs[col] ? mod.diffs[col].old : '';
                    row[`${col} (Nuevo)`] = mod.diffs[col] ? mod.diffs[col].new : '';
                });

                Object.keys(mod.row2).forEach(col => {
                    if (col === keyName1 || col === keyName2 || cols.includes(col)) return;
                    row[col + " (Sin cambios)"] = mod.row2[col];
                });

                return row;
            });

            const wsModifiedGroup = XLSX.utils.json_to_sheet(flatGroupMods);

            // SheetJS has a 31 char limit for sheet names. 
            // We create a safe, unique name incorporating the group properties smartly or truncating.
            let safeSheetName = `Modificados - ${groupName}`;
            if (safeSheetName.length > 31) {
                safeSheetName = safeSheetName.substring(0, 27) + `...`;
            }

            // Ensure no duplicate sheet names with truncation overlaps
            try {
                XLSX.utils.book_append_sheet(wb, wsModifiedGroup, safeSheetName);
            } catch (e) {
                XLSX.utils.book_append_sheet(wb, wsModifiedGroup, `Modificados ${idx + 1}`);
            }
        });
    }

    // Save file
    XLSX.writeFile(wb, "Nexus_Comparacion.xlsx");
}

function resetApp() {
    // Reset state
    state.db1 = { file: null, workbook: null, data: [], keys: [] };
    state.db2 = { file: null, workbook: null, data: [], keys: [] };
    state.results = { added: [], removed: [], modified: [] };

    // Reset inputs
    fileInput1.value = '';
    fileInput2.value = '';

    // Reset UI for DB1
    fileName1.textContent = '';
    fileName1.title = '';
    options1.classList.add('hidden');
    sheetSelect1.innerHTML = '';
    keysContainer1.innerHTML = '';
    btnAddKey1.classList.add('hidden');
    rowCount1.textContent = 'Filas: 0';

    // Reset UI for DB2
    fileName2.textContent = '';
    fileName2.title = '';
    options2.classList.add('hidden');
    sheetSelect2.innerHTML = '';
    keysContainer2.innerHTML = '';
    btnAddKey2.classList.add('hidden');
    rowCount2.textContent = 'Filas: 0';

    // Hide results
    resultsSection.classList.add('hidden');

    // Disable compare button
    btnCompare.disabled = true;

    // Clear search input
    if (searchInput) searchInput.value = '';

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

const SERVICE_UUID        = "12345678-1234-1234-1234-1234567890ab";
const CHARACTERISTIC_UUID = "abcdefab-1234-1234-1234-abcdefabcdef";

let char1 = null;
let char2 = null;
let startTime1 = null;
let startTime2 = null;
let timer1      = null;
let timer2      = null;
let audioCtx    = null;
let soundEnabled = localStorage.getItem('sound') !== 'off';

// ── Helpers ───────────────────────────────────────────────

function extractLastNumber(text) {
    const nums = text.match(/\d+/g);
    if (nums && nums.length > 0) return nums[nums.length - 1];
    return null;
}

function fmt(date) {
    if (!date) return "--:--:--";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function fmtFull(date) {
    if (!date) return "—";
    return date.toLocaleString([], {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
}

function setConnected(n) {
    document.getElementById("status" + n).innerText = "Connected";
    document.getElementById("statusPill" + n).classList.add("status-pill--connected");
    document.getElementById("statusDot" + n).classList.add("status-dot--connected");

    const now = new Date();
    if (n === 1) startTime1 = now;
    else         startTime2 = now;
    document.getElementById("startTime" + n).textContent = fmt(now);
    document.getElementById("endTime"   + n).textContent = "--:--:--";
    startSessionTimer(n);
}

// ── Toast ─────────────────────────────────────────────────

let toastTimer = null;

function showToast(message, type = "error") {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = "toast toast--show toast--" + type;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("toast--show"), 4000);
}

function checkBluetooth() {
    if (!navigator.bluetooth) {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        showToast(
            isIOS
                ? "Web Bluetooth is not supported on iOS Safari. Please use the Bluefy browser app."
                : "Web Bluetooth is not supported in this browser. Please use Chrome on Android or desktop.",
            "warn"
        );
        return false;
    }
    return true;
}

// ── Connection Modal (created dynamically) ────────────────

let _connCancelled = false;

function _buildConnModal() {
    if (document.getElementById("connOverlay")) return;
    const el = document.createElement("div");
    el.id = "connOverlay";
    el.className = "conn-overlay";
    el.innerHTML = `
      <div class="conn-card">
        <div class="conn-anim">
          <div class="conn-ring conn-ring--1"></div>
          <div class="conn-ring conn-ring--2"></div>
          <div class="conn-ring conn-ring--3"></div>
          <div class="conn-bt-icon" id="connIcon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"/>
            </svg>
          </div>
        </div>
        <div class="conn-device" id="connDevice"></div>
        <div class="conn-step" id="connStep"></div>
        <div class="conn-status-row"><span class="conn-dot-anim"></span></div>
        <button class="conn-cancel-btn" id="connCancelBtn" onclick="hideConnModal()">Cancel</button>
      </div>`;
    document.body.appendChild(el);
}

function showConnModal(deviceName, color) {
    _buildConnModal();
    _connCancelled = false;
    const ov = document.getElementById("connOverlay");
    document.getElementById("connDevice").textContent      = deviceName;
    document.getElementById("connStep").textContent        = "Scanning for device…";
    document.getElementById("connCancelBtn").style.display = "";
    document.getElementById("connCancelBtn").textContent   = "Cancel";
    // Trigger animation on next frame so transition fires
    ov.className = `conn-overlay conn--${color}`;
    requestAnimationFrame(() => requestAnimationFrame(() => {
        ov.classList.add("conn--open", "conn--scanning");
    }));
}

function setConnStep(text, state) {
    const ov  = document.getElementById("connOverlay");
    if (!ov) return;
    document.getElementById("connStep").textContent = text;
    ov.className = ov.className
        .replace(/conn--(scanning|connecting|success|error)\b/g, "")
        .trim() + ` conn--${state}`;
    if (state === "success") {
        document.getElementById("connCancelBtn").style.display = "none";
    } else if (state === "error") {
        document.getElementById("connCancelBtn").style.display = "";
        document.getElementById("connCancelBtn").textContent   = "Close";
    }
}

function hideConnModal() {
    _connCancelled = true;
    const ov = document.getElementById("connOverlay");
    if (!ov) return;
    ov.classList.remove("conn--open");
    setTimeout(() => { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 300);
}

// ── Bluetooth ─────────────────────────────────────────────

async function connectDevice1() {
    if (!checkBluetooth()) return;
    showConnModal("PedalCounter_1", "blue");
    try {
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ name: "PedalCounter_1" }],
            optionalServices: [SERVICE_UUID]
        });
        if (_connCancelled) return;
        setConnStep("Establishing connection…", "connecting");
        const server  = await device.gatt.connect();
        const service = await server.getPrimaryService(SERVICE_UUID);
        char1         = await service.getCharacteristic(CHARACTERISTIC_UUID);
        await char1.startNotifications();
        char1.addEventListener("characteristicvaluechanged", handleDevice1);
        setConnStep("Connected!", "success");
        setConnected(1);
        setTimeout(hideConnModal, 1400);
    } catch (err) {
        if (err.name === "NotFoundError") { hideConnModal(); return; }
        setConnStep(err.message || "Connection failed.", "error");
    }
}

async function connectDevice2() {
    if (!checkBluetooth()) return;
    showConnModal("PedalCounter_2", "purple");
    try {
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ name: "PedalCounter_2" }],
            optionalServices: [SERVICE_UUID]
        });
        if (_connCancelled) return;
        setConnStep("Establishing connection…", "connecting");
        const server  = await device.gatt.connect();
        const service = await server.getPrimaryService(SERVICE_UUID);
        char2         = await service.getCharacteristic(CHARACTERISTIC_UUID);
        await char2.startNotifications();
        char2.addEventListener("characteristicvaluechanged", handleDevice2);
        setConnStep("Connected!", "success");
        setConnected(2);
        setTimeout(hideConnModal, 1400);
    } catch (err) {
        if (err.name === "NotFoundError") { hideConnModal(); return; }
        setConnStep(err.message || "Connection failed.", "error");
    }
}

// ── Notification handlers ─────────────────────────────────

function handleDevice1(event) {
    const value = new TextDecoder().decode(event.target.value);
    const log   = document.getElementById("log1");
    log.innerHTML += value + "<br>";
    log.scrollTop  = log.scrollHeight;
    const num = extractLastNumber(value);
    if (num !== null) { document.getElementById("count1").innerText = num; updateStats(); playCountBeep(); }
}

function handleDevice2(event) {
    const value = new TextDecoder().decode(event.target.value);
    const log   = document.getElementById("log2");
    log.innerHTML += value + "<br>";
    log.scrollTop  = log.scrollHeight;
    const num = extractLastNumber(value);
    if (num !== null) { document.getElementById("count2").innerText = num; updateStats(); playCountBeep(); }
}

// ── Reset ─────────────────────────────────────────────────

async function resetDevice1() {
    document.getElementById("count1").innerText = "0";
    updateStats();
    if (char1) {
        try { await char1.writeValue(new TextEncoder().encode("RESET")); }
        catch (err) { console.log(err); }
    }
}

async function resetDevice2() {
    document.getElementById("count2").innerText = "0";
    updateStats();
    if (char2) {
        try { await char2.writeValue(new TextEncoder().encode("RESET")); }
        catch (err) { console.log(err); }
    }
}

// ── Save Record ───────────────────────────────────────────

function saveRecord(n) {
    const patientName = document.getElementById("patientName" + n).value.trim();
    const zone        = document.getElementById("zone" + n).value;
    const graftType   = document.getElementById("graftType" + n).value;
    const count       = document.getElementById("count" + n).innerText;

    if (!patientName) { showToast("Patient Name is required.", "warn"); return; }
    if (!zone)        { showToast("Please select a Zone.", "warn");         return; }
    if (!graftType)   { showToast("Please select a Graft Type.", "warn");   return; }

    const endTime = new Date();
    document.getElementById("endTime" + n).textContent = fmt(endTime);

    const startTime = n === 1 ? startTime1 : startTime2;

    const record = {
        id:          Date.now(),
        device:      "Device " + n,
        patientName,
        zone,
        graftType,
        count,
        startTime:   fmtFull(startTime),
        endTime:     fmtFull(endTime),
        date:        endTime.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" })
    };

    const history = JSON.parse(localStorage.getItem("pedalHistory") || "[]");
    history.unshift(record);
    localStorage.setItem("pedalHistory", JSON.stringify(history));

    showToast("Record saved successfully!", "success");
}

// ── History Modal ─────────────────────────────────────────

function openHistory() {
    renderHistory();
    document.getElementById("historyModal").classList.add("modal--open");
}

function closeHistory() {
    document.getElementById("historyModal").classList.remove("modal--open");
}

function closeHistoryOnOverlay(e) {
    if (e.target === document.getElementById("historyModal")) closeHistory();
}

function clearHistory() {
    if (!confirm("Clear all saved records?")) return;
    localStorage.removeItem("pedalHistory");
    renderHistory();
}

function renderHistory() {
    const list    = document.getElementById("historyList");
    const records = JSON.parse(localStorage.getItem("pedalHistory") || "[]");

    if (records.length === 0) {
        list.innerHTML = `
          <div class="modal-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
            </svg>
            <p>No records saved yet.<br>Fill in the form and click Save Record.</p>
          </div>`;
        return;
    }

    list.innerHTML = records.map(r => {
        const devBadge = r.device === "Device 1" ? "badge--blue" : "badge--purple";
        return `
          <div class="record-card">
            <div class="record-top">
              <div>
                <div class="record-patient">${r.patientName}</div>
                <div class="record-date">${r.date}</div>
              </div>
              <div class="record-badges">
                <span class="badge ${devBadge}">${r.device}</span>
                <span class="badge badge--gray">${r.zone}</span>
                <span class="badge badge--gray">${r.graftType}</span>
              </div>
            </div>
            <div class="record-divider"></div>
            <div class="record-meta">
              <div class="record-count-wrap">
                <div class="record-count">${r.count}</div>
                <div class="record-field-label" style="margin-top:4px">grafts</div>
              </div>
              <div class="record-field">
                <span class="record-field-label">Start Time</span>
                <span class="record-field-value">${r.startTime}</span>
              </div>
              <div class="record-field">
                <span class="record-field-label">End Time</span>
                <span class="record-field-value">${r.endTime}</span>
              </div>
            </div>
          </div>`;
    }).join("");
}

// ── Theme toggle ──────────────────────────────────────────

const themeToggle = document.getElementById("themeToggle");
const savedTheme  = localStorage.getItem("theme");
if (savedTheme === "light") document.documentElement.setAttribute("data-theme", "light");

themeToggle.addEventListener("click", () => {
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    if (isLight) {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("theme", "dark");
    } else {
        document.documentElement.setAttribute("data-theme", "light");
        localStorage.setItem("theme", "light");
    }
});

// ── Clock ─────────────────────────────────────────────────

function updateClock() {
    document.getElementById("clock").textContent =
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
updateClock();
setInterval(updateClock, 1000);

// ── Session Timer ─────────────────────────────────────────

function startSessionTimer(n) {
    if (n === 1 && timer1) clearInterval(timer1);
    if (n === 2 && timer2) clearInterval(timer2);

    const tick = () => {
        const st   = n === 1 ? startTime1 : startTime2;
        if (!st) return;
        const secs = Math.floor((Date.now() - st.getTime()) / 1000);
        const h    = String(Math.floor(secs / 3600)).padStart(2, '0');
        const m    = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
        const s    = String(secs % 60).padStart(2, '0');
        document.getElementById('elapsed' + n).textContent = `${h}:${m}:${s}`;
        const count = parseInt(document.getElementById('count' + n).innerText) || 0;
        document.getElementById('rate' + n).textContent =
            secs >= 6 ? (count / (secs / 60)).toFixed(1) + ' /min' : '— /min';
    };

    const id = setInterval(tick, 1000);
    if (n === 1) timer1 = id; else timer2 = id;
    tick();
    document.getElementById('sessionMeta' + n).classList.add('active');
}

// ── Stats Bar ─────────────────────────────────────────────

function updateStats() {
    const c1 = parseInt(document.getElementById('count1').innerText) || 0;
    const c2 = parseInt(document.getElementById('count2').innerText) || 0;
    document.getElementById('statCount1').textContent = c1;
    document.getElementById('statCount2').textContent = c2;
    document.getElementById('statTotal').textContent  = c1 + c2;
}

// ── Sound Beep ────────────────────────────────────────────

function playCountBeep() {
    if (!soundEnabled) return;
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc  = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.10, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.08);
    } catch { /* ignore */ }
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('sound', soundEnabled ? 'on' : 'off');
    document.getElementById('soundToggle').classList.toggle('sound-muted', !soundEnabled);
    showToast(soundEnabled ? 'Sound on' : 'Sound muted', 'success');
    if (soundEnabled) playCountBeep();
}

if (!soundEnabled) document.getElementById('soundToggle').classList.add('sound-muted');

// ── CSV Export ────────────────────────────────────────────

function exportCSV() {
    const records = JSON.parse(localStorage.getItem('pedalHistory') || '[]');
    if (!records.length) { showToast('No records to export.', 'warn'); return; }
    const headers = ['Date','Patient Name','Device','Zone','Graft Type','Count','Start Time','End Time'];
    const rows    = records.map(r =>
        [r.date, r.patientName, r.device, r.zone, r.graftType, r.count, r.startTime, r.endTime]
            .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
            .join(',')
    );
    const csv  = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
        href: url, download: `pedal-history-${new Date().toISOString().slice(0, 10)}.csv`
    });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exported ${records.length} record${records.length !== 1 ? 's' : ''}.`, 'success');
}

// ── Keyboard Shortcuts ────────────────────────────────────

document.addEventListener('keydown', e => {
    if (['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    switch (e.key) {
        case '1': connectDevice1(); break;
        case '2': connectDevice2(); break;
        case 'h': case 'H': {
            const m = document.getElementById('historyModal');
            m.classList.contains('modal--open') ? closeHistory() : openHistory();
            break;
        }
        case 's': case 'S': toggleSound(); break;
        case 't': case 'T': document.getElementById('themeToggle').click(); break;
        case 'Escape': closeHistory(); hideConnModal(); break;
    }
});

// ── Custom Dropdowns ──────────────────────────────────────

function buildDropdown(selectEl) {
    const opts        = Array.from(selectEl.options);
    const placeholder = opts[0].text;
    selectEl.style.display = 'none';

    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select';

    const trigger = document.createElement('div');
    trigger.className = 'cs-trigger';
    trigger.innerHTML =
        `<span class="cs-value">${placeholder}</span>
         <svg class="cs-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
           <polyline points="6 9 12 15 18 9"/>
         </svg>`;

    const panel = document.createElement('div');
    panel.className = 'cs-panel';

    opts.slice(1).forEach(opt => {
        const item = document.createElement('div');
        item.className = 'cs-option';
        item.dataset.value = opt.value || opt.text;
        item.innerHTML =
            `<span>${opt.text}</span>
             <svg class="cs-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
               <polyline points="20 6 9 17 4 12"/>
             </svg>`;

        item.addEventListener('click', e => {
            e.stopPropagation();
            selectEl.value = item.dataset.value;
            trigger.querySelector('.cs-value').textContent = opt.text;
            trigger.classList.add('cs-has-value');
            panel.querySelectorAll('.cs-option').forEach(o => o.classList.remove('cs-option--active'));
            item.classList.add('cs-option--active');
            wrapper.classList.remove('cs-open');
        });

        panel.appendChild(item);
    });

    wrapper.appendChild(trigger);
    wrapper.appendChild(panel);
    selectEl.parentNode.insertBefore(wrapper, selectEl.nextSibling);

    trigger.addEventListener('click', e => {
        e.stopPropagation();
        const wasOpen = wrapper.classList.contains('cs-open');
        document.querySelectorAll('.custom-select.cs-open').forEach(d => d.classList.remove('cs-open'));
        if (!wasOpen) wrapper.classList.add('cs-open');
    });
}

document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select.cs-open').forEach(d => d.classList.remove('cs-open'));
});

document.querySelectorAll('.form-select').forEach(buildDropdown);

// ── Service Worker ────────────────────────────────────────

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
}

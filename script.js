const SERVICE_UUID        = "12345678-1234-1234-1234-1234567890ab";
const CHARACTERISTIC_UUID = "abcdefab-1234-1234-1234-abcdefabcdef";

let char1 = null;
let char2 = null;
let startTime1 = null;
let startTime2 = null;

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

// ── Bluetooth ─────────────────────────────────────────────

async function connectDevice1() {
    if (!checkBluetooth()) return;
    try {
        const device  = await navigator.bluetooth.requestDevice({
            filters: [{ name: "PedalCounter_1" }],
            optionalServices: [SERVICE_UUID]
        });
        const server  = await device.gatt.connect();
        const service = await server.getPrimaryService(SERVICE_UUID);
        char1         = await service.getCharacteristic(CHARACTERISTIC_UUID);
        await char1.startNotifications();
        char1.addEventListener("characteristicvaluechanged", handleDevice1);
        setConnected(1);
    } catch (err) {
        if (err.name !== "NotFoundError") showToast(err.message || String(err), "error");
    }
}

async function connectDevice2() {
    if (!checkBluetooth()) return;
    try {
        const device  = await navigator.bluetooth.requestDevice({
            filters: [{ name: "PedalCounter_2" }],
            optionalServices: [SERVICE_UUID]
        });
        const server  = await device.gatt.connect();
        const service = await server.getPrimaryService(SERVICE_UUID);
        char2         = await service.getCharacteristic(CHARACTERISTIC_UUID);
        await char2.startNotifications();
        char2.addEventListener("characteristicvaluechanged", handleDevice2);
        setConnected(2);
    } catch (err) {
        if (err.name !== "NotFoundError") showToast(err.message || String(err), "error");
    }
}

// ── Notification handlers ─────────────────────────────────

function handleDevice1(event) {
    const value = new TextDecoder().decode(event.target.value);
    const log   = document.getElementById("log1");
    log.innerHTML += value + "<br>";
    log.scrollTop  = log.scrollHeight;
    const num = extractLastNumber(value);
    if (num !== null) document.getElementById("count1").innerText = num;
}

function handleDevice2(event) {
    const value = new TextDecoder().decode(event.target.value);
    const log   = document.getElementById("log2");
    log.innerHTML += value + "<br>";
    log.scrollTop  = log.scrollHeight;
    const num = extractLastNumber(value);
    if (num !== null) document.getElementById("count2").innerText = num;
}

// ── Reset ─────────────────────────────────────────────────

async function resetDevice1() {
    document.getElementById("count1").innerText = "0";
    if (char1) {
        try { await char1.writeValue(new TextEncoder().encode("RESET")); }
        catch (err) { console.log(err); }
    }
}

async function resetDevice2() {
    document.getElementById("count2").innerText = "0";
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
        const colorClass = r.device === "Device 1" ? "badge--blue" : "badge--purple";
        return `
          <div class="record-card">
            <div class="record-top">
              <div>
                <div class="record-patient">${r.patientName}</div>
                <div class="record-date">${r.date}</div>
              </div>
              <div class="record-badges">
                <span class="badge ${colorClass}">${r.device}</span>
                <span class="badge badge--gray">${r.zone}</span>
                <span class="badge badge--gray">${r.graftType}</span>
              </div>
            </div>
            <div class="record-meta">
              <div class="record-meta-item">
                <span class="record-meta-label">Count</span>
                <span class="record-meta-value record-count">${r.count}</span>
              </div>
              <div class="record-meta-item">
                <span class="record-meta-label">Start</span>
                <span class="record-meta-value">${r.startTime}</span>
              </div>
              <div class="record-meta-item">
                <span class="record-meta-label">End</span>
                <span class="record-meta-value">${r.endTime}</span>
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

// ── Service Worker ────────────────────────────────────────

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
}

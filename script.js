const SERVICE_UUID = "12345678-1234-1234-1234-1234567890ab";
const CHARACTERISTIC_UUID = "abcdefab-1234-1234-1234-abcdefabcdef";

let char1 = null;
let char2 = null;

// ── Helpers ───────────────────────────────────────────────

function extractLastNumber(text) {
    const nums = text.match(/\d+/g);
    if (nums && nums.length > 0) return nums[nums.length - 1];
    return null;
}

function setConnected(n) {
    document.getElementById("status" + n).innerText = "Connected";
    document.getElementById("statusPill" + n).classList.add("status-pill--connected");
    document.getElementById("statusDot" + n).classList.add("status-dot--connected");
}

// ── Bluetooth ─────────────────────────────────────────────

async function connectDevice1() {
    try {
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ name: "PedalCounter_1" }],
            optionalServices: [SERVICE_UUID]
        });

        const server  = await device.gatt.connect();
        const service = await server.getPrimaryService(SERVICE_UUID);

        char1 = await service.getCharacteristic(CHARACTERISTIC_UUID);
        await char1.startNotifications();
        char1.addEventListener("characteristicvaluechanged", handleDevice1);

        setConnected(1);

    } catch (err) {
        alert(err);
    }
}

async function connectDevice2() {
    try {
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ name: "PedalCounter_2" }],
            optionalServices: [SERVICE_UUID]
        });

        const server  = await device.gatt.connect();
        const service = await server.getPrimaryService(SERVICE_UUID);

        char2 = await service.getCharacteristic(CHARACTERISTIC_UUID);
        await char2.startNotifications();
        char2.addEventListener("characteristicvaluechanged", handleDevice2);

        setConnected(2);

    } catch (err) {
        alert(err);
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
        try {
            await char1.writeValue(new TextEncoder().encode("RESET"));
        } catch (err) {
            console.log(err);
        }
    }
}

async function resetDevice2() {
    document.getElementById("count2").innerText = "0";
    if (char2) {
        try {
            await char2.writeValue(new TextEncoder().encode("RESET"));
        } catch (err) {
            console.log(err);
        }
    }
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

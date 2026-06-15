const SERVICE_UUID =
"12345678-1234-1234-1234-1234567890ab";

const CHARACTERISTIC_UUID =
"abcdefab-1234-1234-1234-abcdefabcdef";

let char1 = null;
let char2 = null;

// Extract last number from text
function extractLastNumber(text) {

    const nums = text.match(/\d+/g);

    if(nums && nums.length > 0)
        return nums[nums.length - 1];

    return null;
}

// Connect Device 1
async function connectDevice1() {

    try {

        const device =
        await navigator.bluetooth.requestDevice({
            filters: [{ name: "PedalCounter_1" }],
            optionalServices: [SERVICE_UUID]
        });

        const server =
        await device.gatt.connect();

        const service =
        await server.getPrimaryService(
            SERVICE_UUID
        );

        char1 =
        await service.getCharacteristic(
            CHARACTERISTIC_UUID
        );

        await char1.startNotifications();

        char1.addEventListener(
            "characteristicvaluechanged",
            handleDevice1
        );

        document.getElementById(
            "status1"
        ).innerText = "Connected";

    } catch(err) {
        alert(err);
    }
}

// Connect Device 2
async function connectDevice2() {

    try {

        const device =
        await navigator.bluetooth.requestDevice({
            filters: [{ name: "PedalCounter_2" }],
            optionalServices: [SERVICE_UUID]
        });

        const server =
        await device.gatt.connect();

        const service =
        await server.getPrimaryService(
            SERVICE_UUID
        );

        char2 =
        await service.getCharacteristic(
            CHARACTERISTIC_UUID
        );

        await char2.startNotifications();

        char2.addEventListener(
            "characteristicvaluechanged",
            handleDevice2
        );

        document.getElementById(
            "status2"
        ).innerText = "Connected";

    } catch(err) {
        alert(err);
    }
}

// Device 1 notifications
function handleDevice1(event) {

    let value =
    new TextDecoder().decode(
        event.target.value
    );

    let log =
    document.getElementById("log1");

    log.innerHTML += value + "<br>";

    log.scrollTop = log.scrollHeight;

    let num =
    extractLastNumber(value);

    if(num !== null) {
        document.getElementById(
            "count1"
        ).innerText = num;
    }
}

// Device 2 notifications
function handleDevice2(event) {

    let value =
    new TextDecoder().decode(
        event.target.value
    );

    let log =
    document.getElementById("log2");

    log.innerHTML += value + "<br>";

    log.scrollTop = log.scrollHeight;

    let num =
    extractLastNumber(value);

    if(num !== null) {
        document.getElementById(
            "count2"
        ).innerText = num;
    }
}

// Reset Device 1
async function resetDevice1() {

    document.getElementById(
        "count1"
    ).innerText = "0";

    if(char1) {

        try {

            const data =
            new TextEncoder().encode(
                "RESET"
            );

            await char1.writeValue(
                data
            );

        } catch(err) {
            console.log(err);
        }
    }
}

// Reset Device 2
async function resetDevice2() {

    document.getElementById(
        "count2"
    ).innerText = "0";

    if(char2) {

        try {

            const data =
            new TextEncoder().encode(
                "RESET"
            );

            await char2.writeValue(
                data
            );

        } catch(err) {
            console.log(err);
        }
    }
}

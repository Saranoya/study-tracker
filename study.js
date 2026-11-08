const fs = require("fs");
const path = require("path");
const startFilePath = path.join(__dirname, "start.txt");
const totalsFilePath = path.join(__dirname, "totals.json");

function readTotals() {
    // if totals.json exists: read it, parse it, and return the object
    // otherwise: return an empty object {}
    let totals = {};
    if (fs.existsSync(totalsFilePath)) {
        totals = JSON.parse(fs.readFileSync(totalsFilePath, "utf8"));
    }
    return totals;
}

function readStartTime() {
    // if start.txt exists: read it, parse it, and return the number
    // otherwise: return null
    let startTime = null;
    if (fs.existsSync(startFilePath)) {
        startTime = Number(fs.readFileSync(startFilePath, "utf8"));
    }
    return startTime;
}

function minutesSince(startTime) {
    // calculate the number of minutes since the given startTime
    const ms = Date.now() - startTime;
    return Math.floor(ms / 60000);
}

function getHours(minutes) {
    // convert minutes to hours and remaining minutes
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return { hours, remainingMinutes };
}

function formatMinutes(minutes) {
    // format minutes as "X hours, Y minutes"
    const { hours, remainingMinutes } = getHours(minutes);
    let message = "";
    if (hours === 0 && remainingMinutes === 0) {
        message = "0 minutes";
    }
    if (hours > 0) {
        if (hours === 1) {
            message = `1 hour`;
        } else {
            message = `${hours} hours`;
        }
    }
    if (remainingMinutes > 0) {
        const word = remainingMinutes === 1 ? "minute" : "minutes";
        if (message.length > 0) {
            message += `, ${remainingMinutes} ${word}`;
        } else {
            message = `${remainingMinutes} ${word}`;
        }
    }
    return message;
}

let command = process.argv[2];
if (command === undefined) {
    if (fs.existsSync(startFilePath)) {
        command = "stop";
    } else {
        command = "start";
    }
}

if (command === "start" && !fs.existsSync(startFilePath)) {
    const msStart = Date.now();
    const dateTime = new Date(msStart).toLocaleTimeString();
    console.log("Started the study tracker at " + dateTime + ".");
    fs.writeFileSync(startFilePath, String(msStart));
} else if (command === "start") {
    console.log("A study session is already running. Please stop the current session before starting a new one.");
} else if (command === "stop" && fs.existsSync(startFilePath)) {
    const today = new Date().toDateString();
    const dateTime = new Date().toLocaleTimeString();
    console.log("Stopped the study tracker at " + dateTime + ".");
    const minutes = minutesSince(readStartTime());
    const totals = readTotals();
    totals[today] = (totals[today] || 0) + minutes;
    fs.writeFileSync(totalsFilePath, JSON.stringify(totals, null, 2));
    console.log(`You studied for ${formatMinutes(minutes)}.\n`);
    console.log(`Total study time for ${today}: ${formatMinutes(totals[today])}.`);
    fs.unlinkSync(startFilePath);
} else if (command === "stop") {
    console.log("No study session to stop. Please start a session first.");
} else if (command === "today") {
    const totals = readTotals();
    const today = new Date().toDateString();
    const totalMinutes = totals[today] || 0;
    const currentSessionMinutes = fs.existsSync(startFilePath) ? minutesSince(readStartTime()) : 0;
    console.log(`Total study time for ${today}: ${formatMinutes(totalMinutes)} (+ ${formatMinutes(currentSessionMinutes)} running).`);

} else if (command === "week") {
    const totals = readTotals();
    const week = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toDateString();
        week.push({ date: dateString, minutes: totals[dateString] || 0 });
    }
    console.log("Study time for the past week:");
    let minutesThisWeek = 0;
    week.forEach(({ date, minutes }) => {
        minutesThisWeek += minutes;
        console.log(`  ${date}: ${formatMinutes(minutes)}.`);
    });
    console.log("\nTotal study time for the week: " + formatMinutes(minutesThisWeek) + ".");
} else {
    console.log("Unknown command. Please use 'start', 'stop', 'today' or 'week'. Study with no word will start or stop a study session.");
}

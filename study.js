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
    const stopTime = Date.now();
    const dateTime = new Date(stopTime).toLocaleTimeString();
    console.log("Stopped the study tracker at " + dateTime + ".");
    const startTime = Number(fs.readFileSync(startFilePath, "utf8"));
    const ms = stopTime - startTime;
    const minutes = Math.floor(ms / 60000);
    const totals = readTotals();
    totals[today] = (totals[today] || 0) + minutes;
    fs.writeFileSync(totalsFilePath, JSON.stringify(totals, null, 2));
    console.log(`You studied for ${minutes} minutes.\n`);
    console.log("Total study time for " + today + ": " + totals[today] + " minutes.");
    fs.unlinkSync(startFilePath); 
} else if (command === "stop") {
    console.log("No study session to stop. Please start a session first.");
} else if (command === "today") {
    const totals = readTotals();
    const today = new Date().toDateString();
    const totalMinutes = totals[today] || 0;
    const currentSessionMinutes = fs.existsSync(startFilePath) ? Math.floor((Date.now() - Number(fs.readFileSync(startFilePath, "utf8"))) / 60000) : 0;
    console.log("Total study time for " + today + ": " + totalMinutes + " minutes (+" + currentSessionMinutes + " running).");
   
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
        console.log(`  ${date}: ${minutes} minutes`);
    });
    console.log("\nTotal study time for the week: " + minutesThisWeek + " minutes.\n");
} else {
    console.log("Unknown command. Please use 'start', 'stop', 'today' or 'week'.");
}

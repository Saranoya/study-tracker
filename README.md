# Study Tracker

A small command-line tool, written in Node.js, that tracks how long I study. I start a session, stop it, and the tool adds the minutes to a daily total.

I built it step by step as a learning project. Below is how to use it and what I learned along the way, with lines from the code.

## Usage

```
study            # no word: starts a session, or stops the running one
study start      # start a session
study stop       # stop the session and add the minutes to today's total
study today      # show today's total (plus the running session)
study week       # show the last 7 days and the week total
```

Example output:

```
$ study stop
Stopped the study tracker at 16:40:01.
You studied for 39 minutes.

Total study time for Sun Nov 08 2026: 4 hours, 23 minutes.
```

## Setup

Requires [Node.js](https://nodejs.org/).

To use `study` from any folder, add an alias to `~/.zshrc`:

```
alias study="node ~/coding/study-tracker/study.js"
```

Then run `source ~/.zshrc`, or open a new terminal.

## How it works

The tool uses two files, which are created next to `study.js`:

| File | Contents | Purpose |
|---|---|---|
| `start.txt` | one number, such as `1794150031405` | when the current session started. It exists only while a session is running |
| `totals.json` | `{ "Sun Nov 08 2026": 263 }` | minutes studied per day |

Both files are listed in `.gitignore`: they hold my personal data, not code.

## What I learned

### Command-line arguments

`process.argv` is an array of everything typed on the command line. Position 0 is the path to `node`, position 1 is the script, and position 2 is the first word I type.

```js
let command = process.argv[2];
```

If no word is typed, `process.argv[2]` is `undefined`. I use that to make `study` on its own work as a toggle:

```js
if (command === undefined) {
    if (fs.existsSync(startFilePath)) {
        command = "stop";
    } else {
        command = "start";
    }
}
```

This is also why `command` is declared with `let` and not `const`: its value can change.

### Reading, writing and deleting files

Node's built-in `fs` module handles files:

```js
fs.writeFileSync(startFilePath, String(msStart));             // write (replaces the contents)
Number(fs.readFileSync(startFilePath, "utf8"));               // read
fs.existsSync(startFilePath);                                 // check whether it exists
fs.unlinkSync(startFilePath);                                 // delete
```

Files always contain **text**. So I convert a number to text with `String()` before writing it, and back to a number with `Number()` after reading it.

### Store data for your program as simply as possible

At first I saved readable dates like `Sun Nov 08 2026 11:28:04 GMT+0100`. That's easy for a person to read, but hard for the program to calculate with. A plain number of milliseconds is much easier:

```js
const msStart = Date.now();                          // 1794150031405
const ms = Date.now() - startTime;                   // subtract, done
```

Converting dates to text and back also caused a real bug. `toLocaleString()` writes the date the Belgian way (`8/11/2026`, day/month), but `new Date("8/11/2026")` reads it the American way (month/day). So 8 November became 11 August.

### `Date.now()` versus `new Date()`

| Code | Gives | Can I call `.toLocaleTimeString()` on it? |
|---|---|---|
| `Date.now()` | a **number**: milliseconds since 1 January 1970 | no |
| `new Date()` | a **date** for right now | yes |
| `new Date(msStart)` | a **date** for that number | yes |

```js
const dateTime = new Date(msStart).toLocaleTimeString();   // "16:00:31"
```

A dot calls a method on **whatever is directly to its left**, so the order of the brackets matters:

```js
new Date(msStart.toLocaleTimeString());   // wrong: msStart is a number
new Date(msStart).toLocaleTimeString();   // right: first make a date, then format it
```

### JSON and objects

`totals.json` stores an **object**: pairs of keys and values, here dates and minutes. `JSON.parse` turns the file's text into an object, and `JSON.stringify` turns it back into text:

```js
totals = JSON.parse(fs.readFileSync(totalsFilePath, "utf8"));
fs.writeFileSync(totalsFilePath, JSON.stringify(totals, null, 2));
```

I look up a value by its key with square brackets. A key has to be **exactly** the same every time. When I briefly switched from `toDateString()` to `toLocaleDateString()`, one day was split across two keys.

```js
const today = new Date().toDateString();          // "Sun Nov 08 2026"
totals[today] = (totals[today] || 0) + minutes;
```

### `||` as a fallback

On the first session of a day, `totals[today]` doesn't exist and gives `undefined`. `undefined + 8` is `NaN` ("Not a Number"). `||` means "if the left side is empty, use the right side":

```js
totals[today] || 0
```

Whatever is on the left of `=` is what gets changed. This line only sets a variable, and the object stays the same:

```js
const totalMinutes = totals[today] || 0;
```

### `if` / `else if` chains and `&&`

JavaScript checks a chain from top to bottom and runs **only the first** block that matches. With `&&` ("and"), I can put the input checks in the same flat chain instead of nesting them:

```js
if (command === "start" && !fs.existsSync(startFilePath)) {
    // start a session
} else if (command === "start") {
    // a session is already running
} else if (command === "stop" && fs.existsSync(startFilePath)) {
    // stop and save
} else if (command === "stop") {
    // there is no session to stop
}
```

Order matters. When I wrote `if (hours > 0)` before `else if (hours === 1)`, the second branch could never be reached.

### Scope

A variable made with `const` or `let` only exists inside the `{ }` where it was created. This didn't work, because `totals` disappeared as soon as the `if` ended:

```js
if (...) {
    const totals = {};
}
totals[today] = ...;   // ReferenceError: totals is not defined
```

The fix is to declare the variable *before* the block, and only give it a value inside.

### Loops

A `for` loop has three parts: start, condition and step. I count backwards so the oldest day comes first:

```js
for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateString = date.toDateString();
    week.push({ date: dateString, minutes: totals[dateString] || 0 });
}
```

To keep a running total, declare the variable with `let` before the loop and add to it inside the loop:

```js
let minutesThisWeek = 0;
week.forEach(({ date, minutes }) => {
    minutesThisWeek += minutes;
    console.log(`  ${date}: ${formatMinutes(minutes)}.`);
});
```

Here `forEach` runs a small function (`=>`) for every item, and `{ date, minutes }` unpacks each object into two variables. This is called destructuring.

### The ternary operator

`condition ? valueIfTrue : valueIfFalse` is a short `if`/`else` that gives back a value:

```js
const word = remainingMinutes === 1 ? "minute" : "minutes";
```

### Functions

Functions remove duplicated code. Each one does one job, has a name, and gives back a result with `return`:

```js
function minutesSince(startTime) {
    const ms = Date.now() - startTime;
    return Math.floor(ms / 60000);
}
```

Functions can be nested inside each other. Read the call from the inside out: first the start time is read, then it's turned into minutes.

```js
const minutes = minutesSince(readStartTime());
```

A function can only return one value. To return two, I return one object with two properties:

```js
return { hours, remainingMinutes };
```

A function has to **contain** the work itself. My first version of `readTotals()` called `readTotals()` again instead of actually reading the file.

### Building text piece by piece

`formatMinutes` turns `125` into `2 hours, 5 minutes`. Hours and minutes are **two separate decisions**, so they need two separate `if`s, not one `if`/`else if` chain. And a choice needed in two places, such as "minute" or "minutes", is made once, before the branches:

```js
if (remainingMinutes > 0) {
    const word = remainingMinutes === 1 ? "minute" : "minutes";
    if (message.length > 0) {
        message += `, ${remainingMinutes} ${word}`;
    } else {
        message = `${remainingMinutes} ${word}`;
    }
}
```

### Working from any folder: `__dirname`

A filename without a folder, like `"start.txt"`, means "in the folder the terminal is in now". With an alias, that can be any folder. `__dirname` is always the folder of the script itself:

```js
const startFilePath = path.join(__dirname, "start.txt");
```

### Habits

- **Run it before you say it works.** "I think it works" only counts once I've seen the output.
- **Read the error message.** It names the problem and the line: `study.js:82`.
- **Test edge cases**, such as 0, 1, 60 and 61 minutes, or `stop` without a `start`.
- **Test risky changes on a copy** so a bug can't damage real data.
- **Refactoring** means changing the code without changing what it does, so test before and after.
- **Commit after every working step**, so `git restore` can always take me back.

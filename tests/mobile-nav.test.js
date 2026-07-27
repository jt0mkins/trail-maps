const fs = require("fs");
const path = require("path");
const assert = require("assert");

const script = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");

assert.ok(script.includes("nav-toggle"), "Expected mobile navigation toggle logic in script.js");
assert.ok(script.includes("site-nav"), "Expected mobile navigation container markup in script.js");
assert.ok(script.includes("aria-expanded"), "Expected accessibility state handling for the nav toggle");

console.log("Mobile navigation toggle logic is present.");

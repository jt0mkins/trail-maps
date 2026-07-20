const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.join(__dirname, "..");
const storeHtml = fs.readFileSync(path.join(root, "store.html"), "utf8");
const productLinks = [...storeHtml.matchAll(/data-product-page="([^"]+)"/g)].map((match) => match[1]);

assert.ok(productLinks.length >= 10, `Expected at least 10 product links, found ${productLinks.length}`);

productLinks.forEach((fileName) => {
  const filePath = path.join(root, fileName);
  assert.ok(fs.existsSync(filePath), `Missing product page: ${fileName}`);
});

console.log(`Verified ${productLinks.length} product page links.`);

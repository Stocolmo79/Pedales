// One-off: converts a Supabase CSV export of the products table into products.json for the R2 data bucket.
// Usage: node scripts/csv-to-products-json.mjs CSV/products_rows.csv CSV/products.json
import { readFileSync, writeFileSync } from "node:fs";

const [input = "CSV/products_rows.csv", output = "CSV/products.json"] = process.argv.slice(2);

// RFC 4180: quoted fields may contain commas, newlines and "" escapes.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const [header, ...records] = parseCsv(readFileSync(input, "utf8").replace(/^\uFEFF/, ""));
const rows = records
  .filter((r) => r.length === header.length)
  .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));

rows.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

const products = rows.map((r) => ({
  id: r.id,
  title: r.title,
  price: Number(r.price),
  description: r.description,
  images: r.images ? JSON.parse(r.images) : [],
  reservedBy:
    r.reserved_name && r.reserved_email && r.reserved_at
      ? { name: r.reserved_name, email: r.reserved_email, reservedAt: new Date(r.reserved_at).toISOString() }
      : null,
  waitlist: r.waitlist
    ? JSON.parse(r.waitlist).map((w) => ({ name: w.name, email: w.email, joinedAt: w.joined_at }))
    : [],
}));

writeFileSync(output, JSON.stringify(products, null, 2));
console.log(`${products.length} produkter skrivna till ${output}`);

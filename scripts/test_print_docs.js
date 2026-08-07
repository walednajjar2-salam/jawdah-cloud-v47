/**
 * Unit test for the printed-document helpers in public/auto-trading/print-docs.js.
 *
 * The Arabic amount-in-words converter is the part worth pinning down: Omani
 * contracts and vouchers state the sum in words as well as figures, and the
 * counted noun changes form with the last two digits of the number.
 *
 * Run: node scripts/test_print_docs.js
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'public', 'auto-trading', 'print-docs.js');
const holder = {};
new Function('window', 'document', fs.readFileSync(SRC, 'utf8')).call(holder, holder, {});
const { moneyWords } = holder.NajjarPrintDocs;

const CASES = [
  [0, 'فقط صفر ريال عماني لا غير'],
  [1, 'فقط ريال عماني واحد لا غير'],
  [2, 'فقط ريالان عمانيان لا غير'],
  [3, 'فقط ثلاثة ريالات عمانية لا غير'],
  [11, 'فقط أحد عشر ريالاً عمانياً لا غير'],
  [21, 'فقط واحد وعشرون ريالاً عمانياً لا غير'],
  // A round hundred or thousand takes the genitive singular, not the accusative.
  [100, 'فقط مئة ريال عماني لا غير'],
  [125, 'فقط مئة وخمسة وعشرون ريالاً عمانياً لا غير'],
  [1000, 'فقط ألف ريال عماني لا غير'],
  [1500, 'فقط ألف وخمسمئة ريال عماني لا غير'],
  [2500, 'فقط ألفان وخمسمئة ريال عماني لا غير'],
  [3200, 'فقط ثلاثة آلاف ومئتان ريال عماني لا غير'],
  [12000, 'فقط اثنا عشر ألف ريال عماني لا غير'],
  [125000, 'فقط مئة وخمسة وعشرون ألف ريال عماني لا غير'],
  [1000000, 'فقط مليون ريال عماني لا غير'],
  // Baisa are the thousandths of a rial and are spelled out alongside it.
  [1.5, 'فقط ريال عماني واحد وخمسمئة بيسة لا غير'],
  [0.25, 'فقط مئتان وخمسون بيسة لا غير'],
  [0.001, 'فقط بيسة واحدة لا غير'],
  [4500.75, 'فقط أربعة آلاف وخمسمئة ريال عماني وسبعمئة وخمسون بيسة لا غير'],
];

let failed = 0;
for (const [amount, expected] of CASES) {
  const actual = moneyWords(amount);
  if (actual === expected) continue;
  failed += 1;
  console.error(`FAIL ${amount}\n  got:  ${actual}\n  want: ${expected}`);
}

if (failed) {
  console.error(`\nprint-docs amount-in-words: ${failed} of ${CASES.length} case(s) failed`);
  process.exit(1);
}
console.log(`print-docs amount-in-words: OK (${CASES.length} cases)`);

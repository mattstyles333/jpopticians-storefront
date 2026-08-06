/* Storefront browser journey test.
 * Runs a headless Chromium session through the real storefront UI:
 * home -> PLP -> PDP -> add to cart -> cart -> checkout -> order confirmation.
 * Requires: storefront dev server on :3000, Medusa backend on :9000.
 * Usage: node e2e-storefront-ui.mjs
 */
import { chromium } from "/home/lap/.local/share/mise/installs/node/26.2.0/lib/node_modules/playwright/index.mjs"

const BASE = process.env.STOREFRONT_URL ?? "http://localhost:3000"
const SHOW = process.env.SHOW_BROWSER === "1"

const results = []
function check(name, ok, detail = "") {
  results.push({ name, ok, detail })
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`)
}

const browser = await chromium.launch({ headless: !SHOW })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
page.setDefaultTimeout(15000)

try {
  // 1. Home renders products
  await page.goto(BASE)
  await page.waitForSelector("text=Shop glasses")
  const featuredVisible = await page.locator("text=JPOpticians Classic Round").first().isVisible()
  check("home renders featured products", featuredVisible)

  // 2. PLP with category filter
  await page.goto(`${BASE}/products?category=optical`)
  await page.waitForSelector("text=Glasses")
  const plpCount = await page.locator("text=Optical").first().isVisible()
  check("PLP category filter renders", plpCount)

  // 3. PDP
  await page.goto(`${BASE}/products/jpopt-classic-round`)
  await page.waitForSelector("text=Add frame to cart")
  const priceShown = await page.locator("text=£69.00").first().isVisible()
  check("PDP shows variant price", priceShown)

  // 4. Add to cart (choose a colour variant first if present)
  const addBtn = page.locator("button", { hasText: "Add frame to cart" })
  await addBtn.click()
  await page.waitForSelector("text=Added ✓")
  check("add to cart shows confirmation", true)

  // 5. Cart page
  await page.goto(`${BASE}/cart`)
  await page.waitForSelector("text=Order summary")
  const cartHasItem = await page.locator("text=JPOpticians Classic Round").first().isVisible()
  check("cart contains the item", cartHasItem)

  // 6. Checkout
  await page.goto(`${BASE}/checkout`)
  await page.waitForSelector("text=Contact and delivery")
  const fields = {
    'input[placeholder="Email address"]': "ui-customer@example.com",
    'input[placeholder="First name"]': "Uma",
    'input[placeholder="Last name"]': "Iverson",
    'input[placeholder="Address line 1"]': "221B Baker Street",
    'input[placeholder="City"]': "London",
    'input[placeholder="Postcode"]': "NW1 6XE",
  }
  for (const [sel, value] of Object.entries(fields)) {
    await page.fill(sel, value)
  }
  await page.click("button", { hasText: "Continue to shipping" })
  await page.waitForSelector("text=Delivery method")
  const shippingOptionVisible = await page.locator("text=Standard UK Delivery").first().isVisible()
  check("shipping options listed", shippingOptionVisible)

  // select the shipping radio
  const radio = page.locator('input[name="shipping"]').first()
  await radio.check()
  await page.waitForSelector("text=Payment")

  // 7. Place order — wait for navigation to order confirmation
  await page.locator("button", { hasText: "Place order" }).first().click()
  await page.waitForURL("**/order/**", { timeout: 30000 })
  const confirmationShown = await page.locator("text=Order confirmed").isVisible()
  check("order confirmation page shown", confirmationShown)

  const orderId = await page.locator("h1").first().textContent()
  console.log("ORDER_H1:", orderId)

  // 8. Order totals sane
  const bodyText = await page.textContent("body")
  check("confirmation shows total", bodyText.includes("Total (incl. VAT)"))
} catch (err) {
  check("journey completed", false, err.message)
  await page.screenshot({ path: "/tmp/storefront-journey-failure.png", fullPage: true })
} finally {
  await browser.close()
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length > 0 ? 1 : 0)

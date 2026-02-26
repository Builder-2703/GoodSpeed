/**
 * Phase 4 Manual Test Script — automated via Playwright
 * Runs the 12-step validation from PHASE4_IMPLEMENTATION.md
 */
import { chromium } from 'playwright'

const BASE = 'http://localhost:5199'
let passed = 0
let failed = 0

function assert(condition, step, description) {
  if (condition) {
    console.log(`  ✓ Step ${step}: ${description}`)
    passed++
  } else {
    console.log(`  ✗ Step ${step}: ${description}`)
    failed++
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  console.log('\n=== Phase 4 Manual Test Script ===\n')

  // Navigate to app
  await page.goto(BASE)
  await page.waitForSelector('text=Enter at least 2 parameters')

  // --- Step 1: Lock AR=16:9 + Height=100in, select first config, Confirm ---
  console.log('Step 1: Lock AR + Height, select, confirm')

  // Lock AR: select 16:9 from the AR dropdown (second select on page; first is unit dropdown)
  const arSelect = page.locator('select').nth(1)
  await arSelect.selectOption(String(16 / 9))
  // Find and click the AR lock button (second lock button — order: Diagonal, AR, Width, Height)
  const lockButtons = page.locator('[aria-label="Lock parameter"]')
  await lockButtons.nth(1).click()

  // Lock Height: type 100 in the height input (third text input)
  const textInputs = page.locator('input[placeholder="0.00"]')
  await textInputs.nth(2).fill('100')
  // Click height apply button (third apply)
  const applyButtons = page.locator('text=apply')
  await applyButtons.nth(2).click()

  // Wait for results table
  await page.waitForSelector('text=Choose a Size', { timeout: 3000 })

  // Select first option (click first radio)
  const radios = page.locator('input[type="radio"]')
  await radios.first().click()

  // Click Confirm
  await page.click('text=Confirm')
  await page.waitForSelector('text=Selected', { timeout: 3000 })

  // Check: "Receive Quote" visible, History visible, SVG grid rendered
  const receiveQuoteBtn = page.locator('text=Receive Quote')
  assert(await receiveQuoteBtn.isVisible(), 1, 'Selection saved, History + Receive Quote appear')

  const historyHeader = page.locator('text=History')
  assert(await historyHeader.isVisible(), 1, 'History panel appears after confirm')

  const svg = page.locator('svg')
  assert(await svg.count() > 0, 1, 'SVG grid visualization rendered')

  // --- Step 2: Refresh the page, check history persists ---
  console.log('Step 2: Refresh page, check history persists')
  await page.reload()
  await page.waitForSelector('text=Enter at least 2 parameters')

  // History should load from localStorage
  const historyAfterRefresh = page.locator('text=History')
  // Small wait for useEffect to fire
  await page.waitForTimeout(500)
  const historyVisible = await historyAfterRefresh.isVisible().catch(() => false)
  assert(historyVisible, 2, 'History panel loads from localStorage on mount')

  // --- Step 3: Click history row to reload config ---
  console.log('Step 3: Click history row to reload config')
  if (historyVisible) {
    const historyRow = page.locator('[aria-label*="Load"]').first()
    if (await historyRow.isVisible()) {
      await historyRow.click()
      await page.waitForSelector('text=Selected', { timeout: 3000 })
      const gridAfterReload = page.locator('svg')
      assert(await gridAfterReload.count() > 0, 3, 'Clicking history row reloads confirmed grid')
    } else {
      assert(false, 3, 'History row not found to click')
    }
  } else {
    assert(false, 3, 'History not visible, skipping reload test')
  }

  // --- Step 4: Click delete on history row ---
  console.log('Step 4: Delete history row')
  // First, re-navigate and confirm again to have a history entry
  await page.goto(BASE)
  await page.waitForSelector('text=Enter at least 2 parameters')

  // Lock AR + Height again
  await page.locator('select').nth(1).selectOption(String(16 / 9))
  await page.locator('[aria-label="Lock parameter"]').nth(1).click()
  await page.locator('input[placeholder="0.00"]').nth(2).fill('100')
  await page.locator('text=apply').nth(2).click()
  await page.waitForSelector('text=Choose a Size', { timeout: 3000 })
  await page.locator('input[type="radio"]').first().click()
  await page.click('text=Confirm')
  await page.waitForSelector('text=History', { timeout: 3000 })

  const deleteButtons = page.locator('[aria-label="Delete selection"]')
  const countBefore = await deleteButtons.count()
  if (countBefore > 0) {
    await deleteButtons.first().click()
    await page.waitForTimeout(300)
    const countAfter = await page.locator('[aria-label="Delete selection"]').count()
    assert(countAfter < countBefore, 4, `Delete removes row (${countBefore} → ${countAfter})`)
  } else {
    assert(false, 4, 'No delete buttons found')
  }

  // --- Step 5: Click "Help me choose" ---
  console.log('Step 5: Click "Help me choose" opens modal')
  // Need results table visible — re-lock params
  await page.goto(BASE)
  await page.waitForSelector('text=Enter at least 2 parameters')
  await page.locator('select').nth(1).selectOption(String(16 / 9))
  await page.locator('[aria-label="Lock parameter"]').nth(1).click()
  await page.locator('input[placeholder="0.00"]').nth(2).fill('100')
  await page.locator('text=apply').nth(2).click()
  await page.waitForSelector('text=Choose a Size', { timeout: 3000 })

  const helpBtn = page.locator('text=Help me choose')
  await helpBtn.click()
  await page.waitForTimeout(500)

  const modalTitle = page.locator('text=Need help choosing?')
  assert(await modalTitle.isVisible(), 5, '"Help me choose" opens modal with correct title')

  // Close modal via the X button (aria-label="Close")
  await page.locator('[aria-label="Close"]').click()
  await page.waitForTimeout(500)

  // --- Step 6: Submit quote with email ---
  console.log('Step 6: Submit quote via email')
  await helpBtn.click()
  await page.waitForTimeout(500)

  await page.fill('#contact-name', 'Jane')
  await page.fill('#contact-email', 'jane@example.com')
  await page.locator('[role="dialog"] button:text("Submit")').click()
  await page.waitForTimeout(500)

  const toast = page.locator('text=Quote request received!')
  assert(await toast.isVisible(), 6, 'Toast appears after quote submission')

  // Wait for auto-dismiss (3s timeout + 300ms CSS fade transition)
  await page.waitForTimeout(4000)
  // Check opacity directly — Playwright isVisible() may still detect the element
  const toastOpacity = await page.locator('[role="status"]').evaluate(el => getComputedStyle(el).opacity).catch(() => '1')
  assert(toastOpacity === '0', 6, `Toast auto-dismisses after 3 seconds (opacity: ${toastOpacity})`)

  // --- Step 7: Confirm + "Receive Quote" with phone ---
  console.log('Step 7: Confirm selection, click Receive Quote, submit with phone')
  await page.locator('input[type="radio"]').first().click()
  await page.click('text=Confirm')
  await page.waitForSelector('text=Receive Quote', { timeout: 3000 })
  await page.click('text=Receive Quote')
  await page.waitForTimeout(500)

  const quoteTitle = page.locator('text=Request a Quote')
  assert(await quoteTitle.isVisible(), 7, '"Receive Quote" opens modal with "Request a Quote" title')

  // Fill phone
  await page.fill('#contact-name', 'John')
  await page.locator('[role="dialog"] label:text("Phone")').click()
  await page.waitForTimeout(200)
  await page.fill('#contact-phone', '+1 555 123 4567')
  await page.locator('[role="dialog"] button:text("Submit")').click()
  await page.waitForTimeout(500)

  const toast2 = page.locator('text=Quote request received!')
  assert(await toast2.isVisible(), 7, 'Toast appears after phone quote submission')
  await page.waitForTimeout(3500)

  // --- Step 8: Submit with empty name ---
  console.log('Step 8: Validation — empty name')
  await page.click('text=Receive Quote')
  await page.waitForTimeout(500)
  await page.locator('[role="dialog"] button:text("Submit")').click()
  await page.waitForTimeout(300)

  const nameError = page.locator('text=Name is required')
  assert(await nameError.isVisible(), 8, 'Validation error: "Name is required"')

  // --- Step 9: Submit with invalid email ---
  console.log('Step 9: Validation — invalid email')
  await page.fill('#contact-name', 'Test')
  await page.fill('#contact-email', 'abc')
  await page.locator('[role="dialog"] button:text("Submit")').click()
  await page.waitForTimeout(300)

  const emailError = page.locator('text=Enter a valid email address')
  assert(await emailError.isVisible(), 9, 'Validation error: "Enter a valid email address"')

  // --- Step 10: Cancel / Esc closes modal ---
  console.log('Step 10: Cancel closes modal, form resets on reopen')
  await page.locator('[role="dialog"] button:text("Cancel")').click()
  await page.waitForTimeout(500)

  const modalGone = !(await page.locator('[role="dialog"]').isVisible().catch(() => false))
  assert(modalGone, 10, 'Cancel closes modal')

  // Reopen and check form is reset
  await page.click('text=Receive Quote')
  await page.waitForTimeout(500)
  const nameValue = await page.inputValue('#contact-name')
  assert(nameValue === '', 10, 'Form resets when modal reopens')
  await page.locator('[role="dialog"] button:text("Cancel")').click()
  await page.waitForTimeout(500)

  // --- Step 11: Change unit, check History updates ---
  console.log('Step 11: Change unit to Feet, check History dimensions')
  const unitSelect = page.locator('select').first()
  await unitSelect.selectOption('ft')
  await page.waitForTimeout(300)

  // History dimensions should now show "ft" values
  const historyText = await page.locator('[aria-label*="Load"]').first().textContent().catch(() => '')
  assert(historyText.includes('ft'), 11, 'History dimensions update to feet')

  // --- Step 12: Check localStorage ---
  console.log('Step 12: Verify localStorage contents')
  const selections = await page.evaluate(() => localStorage.getItem('videowall_selections'))
  const quotes = await page.evaluate(() => localStorage.getItem('videowall_quotes'))

  assert(selections !== null && JSON.parse(selections).length > 0, 12, 'videowall_selections contains saved data')
  assert(quotes !== null && JSON.parse(quotes).length > 0, 12, 'videowall_quotes contains quote submissions')

  // --- Summary ---
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`)

  await browser.close()
  process.exit(failed > 0 ? 1 : 0)
}

run().catch(err => {
  console.error('Test script error:', err)
  process.exit(1)
})

import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page, u: string, p: string) {
  await page.goto("/login");
  await page.fill("#username", u);
  await page.fill("#password", p);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

const flag = async (page: Page, name: string) => decodeURIComponent((await page.context().cookies()).find((c) => c.name === name)?.value ?? "");

test("customer can shop end to end", async ({ page }) => {
  await signIn(page, "erin.kowalski", "Shop#Pass2026");
  await page.goto("/products/3");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.goto("/cart");
  await page.getByRole("button", { name: "Proceed to checkout" }).click();
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page.getByText("Thank you, your order is placed")).toBeVisible();
});

test("reflected xss executes in browser (training)", async ({ page }) => {
  let fired = false;
  await page.exposeFunction("xssFired", () => { fired = true; });
  await page.goto("/legacy/search?q=" + encodeURIComponent("<img src=x onerror=xssFired()>"));
  await page.waitForTimeout(500);
  expect(fired).toBe(true);
  expect(await flag(page, "vm_lab07")).toContain("FLAG{");
});

test("dom xss executes in browser (training)", async ({ page }) => {
  let fired = false;
  await page.exposeFunction("xssFired", () => { fired = true; });
  await page.goto("/promo/flash-sale#" + encodeURIComponent("<img src=x onerror=xssFired()>"));
  await page.waitForTimeout(500);
  expect(fired).toBe(true);
  expect(await flag(page, "vm_lab09")).toContain("FLAG{");
});

test("stored xss executes for another viewer and moderation hides it", async ({ page, browser }) => {
  await signIn(page, "bob.carter", "Shop#Pass2026");
  await page.goto("/products/5");
  await page.fill("#rbody", "<img src=x onerror=xssFired()>");
  await page.getByRole("button", { name: "Submit review" }).click();
  const viewer = await browser.newPage();
  let fired = false;
  await viewer.exposeFunction("xssFired", () => { fired = true; });
  await viewer.goto("/products/5");
  await viewer.waitForTimeout(800);
  expect(fired).toBe(true);
  expect(await flag(viewer, "vm_lab08")).toContain("FLAG{");
  await viewer.close();
  const reset = await page.request.post("/api/auth/login", { data: { username: "admin", password: "Adm1n#Market2026" } });
  const token = (await reset.json()).access_token;
  await page.request.post("/api/admin/labs/LAB-08/reset", { headers: { Authorization: `Bearer ${token}` } });
});

test("admin dashboard renders statistics", async ({ page }) => {
  await signIn(page, "admin", "Adm1n#Market2026");
  await expect(page.getByText("Platform overview")).toBeVisible();
  await expect(page.getByText("Registered users")).toBeVisible();
});

import sys, json
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:5173"
out = sys.argv[1]
jobs = json.loads(sys.argv[2])
login = sys.argv[3] if len(sys.argv) > 3 else None

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    for job in jobs:
        w = job.get("w", 1440)
        ctx = b.new_context(viewport={"width": w, "height": job.get("h", 900)}, device_scale_factor=1)
        page = ctx.new_page()
        errors = []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))
        if job.get("login"):
            u, pw = job["login"].split(":")
            page.goto(BASE + "/login")
            page.fill("#username", u)
            page.fill("#password", pw)
            page.click("button:has-text('Sign in'):not([aria-label])")
            page.wait_for_timeout(1200)
        page.goto(BASE + job["path"])
        page.wait_for_load_state("networkidle")
        page.evaluate("async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,120))}window.scrollTo(0,0)}")
        page.wait_for_timeout(600)
        name = f"{out}/{job['name']}.png"
        page.screenshot(path=name, full_page=job.get("full", True))
        print(job["name"], "errors:", errors[:3])
        ctx.close()
    b.close()

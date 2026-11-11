import html
from urllib.parse import quote

from fastapi import APIRouter, Depends, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.core.flags_config import flag_for
from app.core.mode import is_training
from app.db import get_db
from app.models import Product

router = APIRouter(tags=["legacy"])

STYLE = """
<style>
*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,Segoe UI,Arial,sans-serif;background:#f5f6fa;color:#0f172a}
header{background:#0b1220;color:#fff;padding:14px 32px;display:flex;align-items:center;gap:24px}
header b{font-size:18px;letter-spacing:.2px}header a{color:#c7d2fe;text-decoration:none;font-size:14px}
main{max-width:1040px;margin:28px auto;padding:0 24px}
form.s{display:flex;gap:8px;margin-bottom:20px}form.s input{flex:1;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:15px}
form.s button{background:#4f46e5;color:#fff;border:0;border-radius:8px;padding:10px 18px;font-weight:600;cursor:pointer}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px}.card h4{margin:0 0 6px;font-size:14px}.price{font-weight:700}
.muted{color:#64748b;font-size:13px}.banner{background:linear-gradient(90deg,#1e1b4b,#4338ca);color:#fff;border-radius:12px;padding:28px 32px;margin-bottom:20px}
.banner h1{margin:0 0 6px;font-size:26px}
</style>
"""


def shell(title: str, body: str) -> str:
    return f"""<!doctype html><html lang=en><head><meta charset=utf-8><title>{title}</title><meta name=viewport content="width=device-width,initial-scale=1">{STYLE}</head>
<body><header><b>VULNMARKET</b><a href="/">Storefront</a><a href="/legacy/search">Classic search</a><a href="/promo/flash-sale">Flash sale</a></header><main>{body}</main></body></html>"""


@router.get("/legacy/search", response_class=HTMLResponse)
def legacy_search(q: str = Query("", max_length=400), db: Session = Depends(get_db)):
    training = is_training()
    shown = q if training else html.escape(q)
    rows = []
    if q.strip():
        pattern = "%" + q.replace("%", "").replace("_", "") + "%"
        rows = db.query(Product).filter(Product.is_active.is_(True), Product.title.ilike(pattern)).limit(12).all()
    cards = "".join(
        f'<div class=card><h4>{html.escape(p.title)}</h4><div class=muted>{html.escape(p.brand)}</div><div class=price>&#8377;{float(p.price) * (100 - p.discount_percent) / 100:,.0f}</div></div>'
        for p in rows
    )
    body = (
        f'<form class=s method=get action=/legacy/search><input name=q value="{shown}" placeholder="Search products"><button>Search</button></form>'
        f"<h2>Results for: {shown}</h2>"
        + (f'<div class=grid>{cards}</div>' if rows else '<p class=muted>No products matched your search.</p>')
    )
    response = HTMLResponse(shell("Search - VulnMarket", body))
    if training and "<" in q:
        response.set_cookie("vm_lab07", quote(flag_for("LAB-07"), safe=""), max_age=600, httponly=False, samesite="lax", path="/legacy")
    if not training:
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'none'; style-src 'unsafe-inline'; object-src 'none'; base-uri 'none'"
    return response


PROMO_SCRIPT_TRAINING = """
<script>
(function(){
  var raw = decodeURIComponent(window.location.hash.slice(1));
  var el = document.getElementById('greeting');
  if (raw) { el.innerHTML = 'Hello, ' + raw + '! Your exclusive offers are ready.'; }
})();
</script>
"""

PROMO_SCRIPT_SECURE = """
<script>
(function(){
  var raw = decodeURIComponent(window.location.hash.slice(1));
  var el = document.getElementById('greeting');
  if (raw) { el.textContent = 'Hello, ' + raw + '! Your exclusive offers are ready.'; }
})();
</script>
"""


@router.get("/promo/flash-sale", response_class=HTMLResponse)
def flash_sale(db: Session = Depends(get_db)):
    training = is_training()
    deals = db.query(Product).filter(Product.is_active.is_(True)).order_by(Product.discount_percent.desc()).limit(6).all()
    cards = "".join(
        f'<div class=card><h4>{html.escape(p.title)}</h4><div class=muted>{p.discount_percent}% off</div><div class=price>&#8377;{float(p.price) * (100 - p.discount_percent) / 100:,.0f}</div></div>'
        for p in deals
    )
    body = (
        '<div class=banner><h1>Flash Sale</h1><p id=greeting>Welcome back! Sign in to unlock member-only prices.</p></div>'
        f'<div class=grid>{cards}</div>'
    )
    page = shell("Flash Sale - VulnMarket", body).replace("</body>", (PROMO_SCRIPT_TRAINING if training else PROMO_SCRIPT_SECURE) + "</body>")
    response = HTMLResponse(page)
    if training:
        response.set_cookie("vm_lab09", quote(flag_for("LAB-09"), safe=""), max_age=600, httponly=False, samesite="lax", path="/promo")
    else:
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; require-trusted-types-for 'script'"
    return response

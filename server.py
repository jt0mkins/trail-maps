import html
import json
import mimetypes
import os
import re
import threading
import time
import urllib.request
from collections import defaultdict, deque
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlencode, urlparse

HOST = "127.0.0.1"
PORT = 8000
ROOT = os.path.dirname(os.path.abspath(__file__))
ENV_FILE = Path(ROOT) / ".env"


def load_environment():
    if not ENV_FILE.exists():
        return

    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_environment()

# Prices are set here, not taken from the browser, so a customer can't edit
# their cart in local storage to change what they pay. Keep in sync with
# catalogProducts / customRouteSizes in script.js.
TRAIL_SIZES = {"8x10": 45, "A4": 65, "A3": 85}
PRICE_LIST = {
    title: TRAIL_SIZES
    for title in [
        "Milford Track",
        "Routeburn Track",
        "Abel Tasman Coast Track",
        "Tongariro Alpine Crossing",
        "Kepler Track",
        "Heaphy Track",
        "Rakiura Track",
        "Paparoa Track",
        "Whanganui Journey",
    ]
}
PRICE_LIST["Custom GPX Run"] = {"8x10": 55, "A4": 75, "A3": 95}

# Only these file types are served, and never dotfiles (e.g. .env secrets).
SERVABLE_EXTENSIONS = {".html", ".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico"}


def resolve_static_path(url_path):
    relative = unquote(url_path).lstrip("/") or "index.html"
    root = os.path.realpath(ROOT)
    file_path = os.path.realpath(os.path.join(root, relative))

    if os.path.isdir(file_path):
        file_path = os.path.join(file_path, "index.html")

    inside_root = os.path.commonpath([file_path, root]) == root
    hidden = any(part.startswith(".") for part in Path(relative).parts)
    allowed_type = os.path.splitext(file_path)[1].lower() in SERVABLE_EXTENSIONS

    if inside_root and not hidden and allowed_type and os.path.isfile(file_path):
        return file_path
    return None


MAX_BODY_BYTES = 64 * 1024
MAX_CART_LINES = 50
MAX_FIELD_LENGTHS = {"name": 100, "email": 254, "message": 5000}
METADATA_KEYS = {"walkDates", "runTitle", "runDistance", "runElevation", "runDates", "gpxFileName"}
EMAIL_PATTERN = re.compile(r"^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+$")

# (max requests, per seconds) for each client IP.
RATE_LIMITS = {"/checkout": (10, 60), "/contact": (5, 600)}

# Hosts this server answers POSTs for. Blocks DNS-rebinding tricks where
# another site points its own domain at 127.0.0.1.
ALLOWED_HOSTS = {
    host.strip()
    for host in os.getenv("ALLOWED_HOSTS", f"127.0.0.1:{PORT},localhost:{PORT}").split(",")
    if host.strip()
}

# Keep in sync with the Content-Security-Policy <meta> tag in the HTML pages.
CONTENT_SECURITY_POLICY = (
    "default-src 'self'; "
    "script-src 'self'; "
    "style-src 'self' https://fonts.googleapis.com; "
    "font-src https://fonts.gstatic.com; "
    "img-src 'self' data:; "
    "connect-src 'self'; "
    "form-action 'self'; "
    "base-uri 'self'; "
    "object-src 'none'; "
    "frame-ancestors 'none'"
)

SECURITY_HEADERS = {
    "Content-Security-Policy": CONTENT_SECURITY_POLICY,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Cross-Origin-Opener-Policy": "same-origin",
}

_request_log = defaultdict(deque)
_request_log_lock = threading.Lock()


def is_rate_limited(key, limit, window_seconds):
    now = time.monotonic()
    with _request_log_lock:
        hits = _request_log[key]
        while hits and now - hits[0] > window_seconds:
            hits.popleft()
        if len(hits) >= limit:
            return True
        hits.append(now)
        return False


def first_value(payload, key):
    return payload.get(key, [""])[0].strip()


class Handler(BaseHTTPRequestHandler):
    # Don't advertise the Python version in the Server header.
    server_version = "TrailMaps"
    sys_version = ""
    # Drop connections that stall, so slow clients can't tie up the server.
    timeout = 15

    def end_headers(self):
        for name, value in SECURITY_HEADERS.items():
            self.send_header(name, value)
        super().end_headers()

    def send_json(self, status, data):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def is_same_origin(self):
        host = self.headers.get("Host", "")
        if host not in ALLOWED_HOSTS:
            return False

        origin = self.headers.get("Origin", "")
        if not origin:
            referer = urlparse(self.headers.get("Referer", ""))
            origin = f"{referer.scheme}://{referer.netloc}" if referer.netloc else ""

        return urlparse(origin).netloc == host

    def do_GET(self):
        file_path = resolve_static_path(urlparse(self.path).path)

        if file_path:
            content_type = mimetypes.guess_type(file_path)[0] or "application/octet-stream"
            if content_type.startswith("text/") or content_type.endswith("javascript"):
                content_type += "; charset=utf-8"
            with open(file_path, "rb") as fh:
                body = fh.read()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"Not found")

    def do_POST(self):
        path = urlparse(self.path).path
        if path not in RATE_LIMITS:
            self.send_json(404, {"success": False, "message": "Not found."})
            return

        # Only accept requests made by this site's own pages (blocks CSRF).
        if not self.is_same_origin():
            self.send_json(403, {"success": False, "message": "Request blocked."})
            return

        if self.headers.get_content_type() != "application/x-www-form-urlencoded":
            self.send_json(415, {"success": False, "message": "Unsupported request format."})
            return

        try:
            length = int(self.headers.get("Content-Length", ""))
        except ValueError:
            self.send_json(411, {"success": False, "message": "Missing request length."})
            return

        if length < 0 or length > MAX_BODY_BYTES:
            self.send_json(413, {"success": False, "message": "Request is too large."})
            return

        if is_rate_limited((self.client_address[0], path), *RATE_LIMITS[path]):
            self.send_json(429, {"success": False, "message": "Too many requests. Please wait a few minutes and try again."})
            return

        try:
            payload = parse_qs(self.rfile.read(length).decode("utf-8"), max_num_fields=20)
        except (UnicodeDecodeError, ValueError):
            self.send_json(400, {"success": False, "message": "Invalid request."})
            return

        if path == "/checkout":
            self.handle_checkout(payload)
        else:
            self.handle_contact(payload)

    def handle_checkout(self, payload):
        try:
            cart = json.loads(first_value(payload, "cart") or "[]")
            self.send_json(200, create_checkout_session(cart))
        except json.JSONDecodeError:
            self.send_json(400, {"success": False, "message": "Your cart could not be read. Please refresh and try again."})
        except ValueError as error:
            self.send_json(400, {"success": False, "message": str(error)})
        except Exception as error:
            # Details go to the server log only; they may include API responses.
            self.log_error("Checkout failed: %r", error)
            self.send_json(500, {"success": False, "message": "Checkout could not be started right now. Please try again shortly."})

    def handle_contact(self, payload):
        # Hidden "website" field: people never see it, spam bots fill it in.
        if first_value(payload, "website"):
            self.send_json(200, {"success": True, "message": "Thanks! Your message has been received."})
            return

        fields = {key: first_value(payload, key) for key in MAX_FIELD_LENGTHS}

        if not all(fields.values()):
            self.send_json(400, {"success": False, "message": "Please complete all fields before sending your enquiry."})
            return

        too_long = [key for key, limit in MAX_FIELD_LENGTHS.items() if len(fields[key]) > limit]
        if too_long:
            self.send_json(400, {"success": False, "message": f"Your {too_long[0]} is too long."})
            return

        if not EMAIL_PATTERN.match(fields["email"]):
            self.send_json(400, {"success": False, "message": "Please enter a valid email address."})
            return

        # Collapse whitespace so a name can't inject extra lines into the subject.
        name = " ".join(fields["name"].split())

        try:
            send_contact_email(name, fields["email"], fields["message"])
            self.send_json(200, {"success": True, "message": f"Thanks {name}! Your message has been received and we will be in touch soon."})
        except Exception as error:
            self.log_error("Contact email failed: %r", error)
            self.send_json(500, {"success": False, "message": "Your enquiry could not be sent right now. Please try again later."})


def create_checkout_session(cart):
    stripe_secret_key = os.getenv("STRIPE_SECRET_KEY")
    success_url = os.getenv("STRIPE_SUCCESS_URL", "http://127.0.0.1:8000/success.html")
    cancel_url = os.getenv("STRIPE_CANCEL_URL", "http://127.0.0.1:8000/store.html")

    if not stripe_secret_key:
        return {
            "checkoutUrl": "#",
            "message": "Stripe Checkout is not configured yet. Set STRIPE_SECRET_KEY to enable live checkout.",
        }

    if not isinstance(cart, list) or not cart:
        raise ValueError("Your cart is empty.")

    if len(cart) > MAX_CART_LINES:
        raise ValueError(f"Your cart has too many items. Please keep it to {MAX_CART_LINES} lines or fewer.")

    # Stripe's API takes form-encoded fields (not JSON), with nested values
    # written as line_items[0][price_data][currency]=nzd and so on.
    fields = [
        ("mode", "payment"),
        ("success_url", success_url),
        ("cancel_url", cancel_url),
    ]
    order_lines = []

    for index, item in enumerate(cart):
        if not isinstance(item, dict):
            raise ValueError("Your cart could not be read. Please refresh and try again.")

        title = str(item.get("title", ""))[:100]
        size = str(item.get("size", "8x10"))[:20]
        price = PRICE_LIST.get(title, {}).get(size)
        if price is None:
            raise ValueError(f"{title} ({size}) is no longer available. Please remove it from your cart.")

        try:
            quantity = max(1, min(99, int(item.get("quantity", 1) or 1)))
        except (TypeError, ValueError):
            raise ValueError(f"The quantity for {title} is not valid.")

        # Only pass through the order details the site actually collects,
        # as short plain strings.
        details = item.get("metadata")
        details = details if isinstance(details, dict) else {}
        description = ", ".join(
            f"{key}: {' '.join(str(value).split())[:200]}"
            for key, value in details.items()
            if key in METADATA_KEYS and isinstance(value, str) and value.strip()
        )

        prefix = f"line_items[{index}]"
        fields += [
            (f"{prefix}[quantity]", str(quantity)),
            (f"{prefix}[price_data][currency]", "nzd"),
            (f"{prefix}[price_data][unit_amount]", str(price * 100)),
            (f"{prefix}[price_data][product_data][name]", f"{title} ({size})"),
        ]
        if description:
            fields.append((f"{prefix}[price_data][product_data][description]", description[:500]))
        order_lines.append(f"{quantity} x {title} ({size})" + (f" [{description}]" if description else ""))

    # Stripe metadata values are limited to 500 characters each.
    fields.append(("metadata[order]", "\n".join(order_lines)[:500]))

    request = urllib.request.Request(
        "https://api.stripe.com/v1/checkout/sessions",
        data=urlencode(fields).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {stripe_secret_key}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=20) as response:
        response_payload = json.loads(response.read().decode("utf-8"))

    return {
        "checkoutUrl": response_payload.get("url", "#"),
        "message": "Stripe Checkout session created successfully.",
    }


def send_contact_email(name, email, message):
    api_key = os.getenv("RESEND_API_KEY")
    from_address = os.getenv("RESEND_FROM", "onboarding@resend.dev")
    to_address = os.getenv("CONTACT_TO_EMAIL", "hello@trailmapsnz.co.nz")

    if not api_key:
        raise RuntimeError("RESEND_API_KEY is not set. Add it to your environment before sending emails.")

    payload = {
        "from": from_address,
        "to": [to_address],
        "subject": f"New contact enquiry from {name}",
        "html": "<p><strong>Name:</strong> {}</p><p><strong>Email:</strong> {}</p><p><strong>Message:</strong><br />{}</p>".format(
            html.escape(name), html.escape(email), html.escape(message).replace("\n", "<br />")
        ),
        "text": f"Name: {name}\nEmail: {email}\n\nMessage:\n{message}",
    }

    request = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=20) as response:
        response.read()
        if response.status >= 400:
            raise RuntimeError("Resend rejected the email request")


if __name__ == "__main__":
    server = HTTPServer((HOST, PORT), Handler)
    print(f"Serving on http://{HOST}:{PORT}")
    server.serve_forever()

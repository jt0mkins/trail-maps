import json
import os
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

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


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/checkout":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "message": "Stripe Checkout has not been configured yet. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID to enable live checkout."
            }).encode("utf-8"))
            return

        if parsed.path == "/":
            file_path = os.path.join(ROOT, "index.html")
        else:
            file_path = os.path.join(ROOT, parsed.path.lstrip("/"))

        if os.path.isdir(file_path):
            file_path = os.path.join(file_path, "index.html")

        if os.path.exists(file_path) and os.path.isfile(file_path):
            self.send_response(200)
            content_type = "text/html"
            if file_path.endswith(".css"):
                content_type = "text/css"
            elif file_path.endswith(".js"):
                content_type = "application/javascript"
            self.send_header("Content-Type", content_type)
            self.end_headers()
            with open(file_path, "rb") as fh:
                self.wfile.write(fh.read())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length).decode("utf-8")
        payload = parse_qs(raw)

        if parsed.path == "/checkout":
            try:
                cart = json.loads(payload.get("cart", ["[]"])[0] or "[]")
                subtotal = float(payload.get("subtotal", ["0"])[0] or 0)
                summary = payload.get("summary", [""])[0]
                checkout_response = create_checkout_session(cart, subtotal, summary)

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(checkout_response).encode("utf-8"))
            except Exception as error:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": False,
                    "message": f"Checkout could not be created: {error}"
                }).encode("utf-8"))
            return

        if parsed.path == "/contact":
            name = payload.get("name", [""])[0].strip()
            email = payload.get("email", [""])[0].strip()
            message = payload.get("message", [""])[0].strip()

            if not name or not email or not message:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": False,
                    "message": "Please complete all fields before sending your enquiry."
                }).encode("utf-8"))
                return

            try:
                send_contact_email(name, email, message)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "message": f"Thanks {name}! Your message has been received and we will be in touch soon."
                }).encode("utf-8"))
            except Exception as error:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": False,
                    "message": f"Your enquiry could not be delivered right now: {error}"
                }).encode("utf-8"))
            return

        self.send_response(404)
        self.end_headers()


def create_checkout_session(cart, subtotal, summary):
    stripe_secret_key = os.getenv("STRIPE_SECRET_KEY")
    success_url = os.getenv("STRIPE_SUCCESS_URL", "http://127.0.0.1:8000/success.html")
    cancel_url = os.getenv("STRIPE_CANCEL_URL", "http://127.0.0.1:8000/store.html")

    if not stripe_secret_key:
        return {
            "checkoutUrl": "#",
            "message": "Stripe Checkout is not configured yet. Set STRIPE_SECRET_KEY to enable live checkout.",
        }

    line_items = []
    for item in cart:
        unit_amount = max(1, int(round((float(item.get("price", 0) or 0)) * 100)))
        line_items.append({
            "price_data": {
                "currency": "nzd",
                "product_data": {
                    "name": f"{item.get('title', 'Trail Map')} ({item.get('size', '8x10')})",
                },
                "unit_amount": unit_amount,
            },
            "quantity": int(item.get("quantity", 1) or 1),
        })

    if not line_items:
        raise RuntimeError("Cart is empty")

    payload = {
        "mode": "payment",
        "success_url": success_url,
        "cancel_url": cancel_url,
        "line_items": line_items,
        "metadata": {
            "summary": summary,
            "subtotal": str(subtotal),
        },
    }

    request = urllib.request.Request(
        "https://api.stripe.com/v1/checkout/sessions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {stripe_secret_key}",
            "Content-Type": "application/json",
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
        "html": f"<p><strong>Name:</strong> {name}</p><p><strong>Email:</strong> {email}</p><p><strong>Message:</strong><br />{message}</p>",
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

"""Guest support payments; secrets and SQLite stay outside the static site."""
import base64
import hashlib
import json
import os
import re
import sqlite3
import threading
import time
import uuid
from contextlib import contextmanager
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, build_opener, HTTPRedirectHandler


class PaymentError(Exception):
    def __init__(self, status, message):
        self.status, self.message = status, message


@dataclass(frozen=True)
class Config:
    shop_id: str
    secret: str
    description: str
    database: str
    minimum: int = 100
    maximum: int = 100000
    origin: str = "https://hramgo.ru"


def request_id(value):
    if not isinstance(value, str) or not re.fullmatch(
        r"[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}", value
    ):
        raise PaymentError(400, "Не удалось определить платёж. Начните заново.")
    return value


def validate_input(data, config):
    if not isinstance(data, dict) or data.get("personalDataConsent") is not True:
        raise PaymentError(400, "Подтвердите согласие с условиями поддержки.")
    try:
        amount = Decimal(str(data.get("amount", "")))
        if not amount.is_finite() or amount * 100 != (amount * 100).to_integral_value():
            raise InvalidOperation
        if not Decimal(config.minimum) <= amount <= Decimal(config.maximum):
            raise InvalidOperation
        kopecks = int(amount * 100)
    except (InvalidOperation, ValueError, OverflowError):
        raise PaymentError(400, f"Укажите сумму от {config.minimum} до {config.maximum} ₽.") from None
    email = data.get("email")
    if not isinstance(email, str):
        raise PaymentError(400, "Укажите email для связи по платежу.")
    email = email.strip().lower()
    if len(email) > 254 or not re.fullmatch(r"[^\s@\x00-\x1f]+@[^\s@\x00-\x1f]+\.[^\s@\x00-\x1f]+", email):
        raise PaymentError(400, "Проверьте адрес email.")
    return request_id(data.get("idempotencyKey")), kopecks, email


def confirmation_url(value):
    if not isinstance(value, str):
        raise PaymentError(502, "ЮKassa не вернула страницу оплаты. Попробуйте ещё раз.")
    parsed = urlparse(value)
    host = parsed.hostname or ""
    if (parsed.scheme != "https" or parsed.username or parsed.password
            or parsed.netloc != host or not any(host == d or host.endswith("." + d)
                                               for d in ("yoomoney.ru", "yookassa.ru"))):
        raise PaymentError(502, "Не удалось проверить адрес страницы оплаты.")
    return value


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise URLError("Provider redirects are not allowed")


class YooKassa:
    def __init__(self, config):
        self.config = config

    def call(self, path, body=None, key=None):
        headers = {"Authorization": "Basic " + base64.b64encode(
            f"{self.config.shop_id}:{self.config.secret}".encode()).decode(),
            "Content-Type": "application/json"}
        if key:
            headers["Idempotence-Key"] = key
        req = Request("https://api.yookassa.ru/v3/" + path,
                      data=json.dumps(body).encode() if body is not None else None,
                      headers=headers)
        try:
            with build_opener(NoRedirect).open(req, timeout=20) as response:
                return json.load(response)
        except (HTTPError, URLError, TimeoutError, ValueError):
            # Do not log provider bodies, credentials or payer email.
            raise PaymentError(503, "ЮKassa временно недоступна. Повторите попытку.") from None

    def create(self, key, kopecks, email):
        # Preserve the former merchant's redirect/capture configuration.
        return self.call("payments", {
            "amount": {"value": f"{kopecks // 100}.{kopecks % 100:02}", "currency": "RUB"},
            "capture": True,
            "confirmation": {"type": "redirect", "return_url": self.config.origin + "/support/?payment=" + key},
            "description": self.config.description,
            "metadata": {"email": email, "support_request_id": key}
        }, key)

    def get(self, payment_id):
        if not re.fullmatch(r"[0-9a-f-]{36}", payment_id):
            raise PaymentError(502, "Не удалось проверить платёж.")
        return self.call("payments/" + payment_id)


class Payments:
    def __init__(self, config, provider=None):
        self.config, self.provider = config, provider or YooKassa(config)
        self.locks = [threading.Lock() for _ in range(64)]
        with self.connect() as db:
            db.execute("""CREATE TABLE IF NOT EXISTS payments (
                request_id TEXT PRIMARY KEY, amount_kopecks INTEGER NOT NULL,
                email_hash TEXT NOT NULL, payment_id TEXT UNIQUE, confirmation_url TEXT,
                status TEXT NOT NULL DEFAULT 'CREATED', created_at REAL NOT NULL,
                updated_at REAL NOT NULL)""")

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.config.database, timeout=10)
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()

    def checked_status(self, payment, row):
        try:
            amount = Decimal(str(payment["amount"]["value"])) * 100
            valid = (payment["amount"]["currency"] == "RUB" and
                     amount == row["amount_kopecks"] and
                     payment["metadata"]["support_request_id"] == row["request_id"])
        except (KeyError, TypeError, InvalidOperation):
            valid = False
        if not valid or payment.get("status") not in ("pending", "waiting_for_capture", "succeeded", "canceled"):
            raise PaymentError(502, "Ответ платёжной системы требует проверки.")
        if payment["status"] == "succeeded" and payment.get("paid") is not True:
            raise PaymentError(502, "Подтверждение оплаты ещё не получено.")
        return payment["status"]

    def create(self, data):
        key, kopecks, email = validate_input(data, self.config)
        email_hash = hashlib.sha256(email.encode()).hexdigest()
        with self.locks[uuid.UUID(key).int % len(self.locks)]:
            with self.connect() as db:
                row = db.execute("SELECT * FROM payments WHERE request_id=?", (key,)).fetchone()
                if row and (row["amount_kopecks"] != kopecks or row["email_hash"] != email_hash):
                    raise PaymentError(409, "Сумма или email изменились. Начните новый платёж.")
                if not row:
                    now = time.time()
                    db.execute("INSERT INTO payments(request_id,amount_kopecks,email_hash,created_at,updated_at) VALUES(?,?,?,?,?)",
                               (key, kopecks, email_hash, now, now))
                    db.commit()
                    row = db.execute("SELECT * FROM payments WHERE request_id=?", (key,)).fetchone()
                if row["status"] in ("succeeded", "canceled"):
                    return {"status": row["status"]}
                if row["confirmation_url"]:
                    return {"confirmationUrl": confirmation_url(row["confirmation_url"]), "status": row["status"]}
                if time.time() - row["created_at"] > 23 * 3600:
                    raise PaymentError(410, "Время попытки истекло. Начните новый платёж.")
                payment = self.provider.create(key, kopecks, email)
                status = self.checked_status(payment, row)
                payment_id = payment.get("id", "")
                if not re.fullmatch(r"[0-9a-f-]{36}", payment_id):
                    raise PaymentError(502, "Не удалось проверить идентификатор платежа.")
                url = confirmation_url(payment.get("confirmation", {}).get("confirmation_url"))
                db.execute("UPDATE payments SET payment_id=?,confirmation_url=?,status=?,updated_at=? WHERE request_id=?",
                           (payment_id, url, status, time.time(), key))
                return {"confirmationUrl": url, "status": status}

    def status(self, key):
        key = request_id(key)
        with self.connect() as db:
            row = db.execute("SELECT * FROM payments WHERE request_id=?", (key,)).fetchone()
            if not row or not row["payment_id"]:
                raise PaymentError(404, "Этот платёж не найден. Проверьте ссылку или начните заново.")
            # The return URL and client status are never proof of payment.
            payment = self.provider.get(row["payment_id"])
            if payment.get("id") != row["payment_id"]:
                raise PaymentError(502, "Не удалось проверить платёж.")
            status = self.checked_status(payment, row)
            db.execute("UPDATE payments SET status=?,updated_at=? WHERE request_id=?",
                       (status, time.time(), key))
            return {"status": status, "amount": row["amount_kopecks"] / 100}

    def notify(self, data):
        payment_id = data.get("object", {}).get("id") if isinstance(data.get("object"), dict) else None
        if not isinstance(payment_id, str):
            raise PaymentError(400, "Некорректное уведомление.")
        with self.connect() as db:
            row = db.execute("SELECT request_id FROM payments WHERE payment_id=?", (payment_id,)).fetchone()
        if not row:
            return {"received": True}
        # Incoming notification fields cannot mark a payment as paid.
        self.status(row["request_id"])
        return {"received": True}


class LimitedServer(ThreadingHTTPServer):
    daemon_threads = True
    slots = threading.BoundedSemaphore(16)

    def process_request(self, request, client_address):
        if not self.slots.acquire(blocking=False):
            self.shutdown_request(request)
            return
        try:
            super().process_request(request, client_address)
        except Exception:
            self.slots.release()
            raise

    def process_request_thread(self, request, client_address):
        try:
            super().process_request_thread(request, client_address)
        finally:
            self.slots.release()


def handler(payments):
    recent, guard = {}, threading.Lock()

    class Handler(BaseHTTPRequestHandler):
        def setup(self):
            super().setup()
            self.connection.settimeout(25)

        def log_message(self, *args):
            pass

        def reply(self, payload, status=200):
            body = json.dumps(payload, ensure_ascii=False).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            if self.path == "/api/support/health":
                self.reply({"enabled": True, "minAmount": payments.config.minimum, "maxAmount": payments.config.maximum})
            else:
                self.reply({"message": "Не найдено."}, 404)

        def do_POST(self):
            try:
                webhook = self.path == "/api/support/yookassa/webhook"
                if self.path not in ("/api/support/payment", "/api/support/payment-status") and not webhook:
                    raise PaymentError(404, "Не найдено.")
                if not webhook and self.headers.get("Origin") != payments.config.origin:
                    raise PaymentError(403, "Откройте форму поддержки на hramgo.ru.")
                if self.headers.get("Content-Type", "").split(";")[0] != "application/json":
                    raise PaymentError(415, "Не удалось прочитать форму.")
                length = int(self.headers.get("Content-Length", "0"))
                if not 0 < length <= (65536 if webhook else 4096):
                    raise PaymentError(413, "Не удалось прочитать форму.")
                ip = self.headers.get("X-Real-IP", self.client_address[0]) + self.path
                now = time.time()
                with guard:
                    for old_ip in list(recent):
                        if not recent[old_ip] or recent[old_ip][-1] < now - 60:
                            del recent[old_ip]
                    count = recent.setdefault(ip, [])
                    count[:] = [stamp for stamp in count if stamp > now - 60]
                    if len(count) >= (5 if self.path.endswith("/payment") else 20):
                        raise PaymentError(429, "Слишком много попыток. Подождите минуту.")
                    count.append(now)
                data = json.loads(self.rfile.read(length))
                if not isinstance(data, dict):
                    raise ValueError
                result = payments.notify(data) if webhook else payments.create(data) if self.path.endswith("/payment") else payments.status(data.get("requestId"))
                self.reply(result)
            except PaymentError as error:
                self.reply({"message": error.message}, error.status)
            except (ValueError, UnicodeDecodeError):
                self.reply({"message": "Не удалось прочитать форму."}, 400)
            except Exception:
                self.reply({"message": "Не удалось обработать платёж. Повторите попытку."}, 503)

    return Handler


if __name__ == "__main__":
    config = Config(shop_id=os.environ["YOOKASSA_SHOP_ID"], secret=os.environ["YOOKASSA_SECRET_KEY"],
                    description=os.environ["YOOKASSA_RECEIPT_ITEM_NAME"],
                    database=os.environ.get("SUPPORT_DATABASE", "/var/lib/hramgo-support/payments.sqlite3"),
                    minimum=int(os.environ.get("MIN_SUPPORT_AMOUNT_RUB", "100")),
                    maximum=int(os.environ.get("MAX_SUPPORT_AMOUNT_RUB", "100000")))
    os.umask(0o077)
    LimitedServer((os.environ.get("SUPPORT_BIND_HOST", "127.0.0.1"), 8788), handler(Payments(config))).serve_forever()

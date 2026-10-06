import copy
import http.client
import json
import tempfile
import threading
import unittest
import uuid
from pathlib import Path
from support_api import Config, LimitedServer, PaymentError, Payments, confirmation_url, handler


class FakeProvider:
    def __init__(self):
        self.calls, self.payment = 0, None
        self.fail_once = False

    def create(self, key, kopecks, email):
        self.calls += 1
        if self.fail_once:
            self.fail_once = False
            raise PaymentError(503, "Temporary failure")
        self.payment = {"id": str(uuid.uuid4()), "status": "pending", "paid": False,
                        "amount": {"value": f"{kopecks / 100:.2f}", "currency": "RUB"},
                        "metadata": {"support_request_id": key},
                        "confirmation": {"confirmation_url": "https://yoomoney.ru/checkout/payments/v2/test"}}
        return copy.deepcopy(self.payment)

    def get(self, payment_id):
        return copy.deepcopy(self.payment)


class PaymentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.config = Config("not-a-shop", "not-a-secret", "Support", str(Path(self.temp.name) / "payments.sqlite3"))
        self.provider = FakeProvider()
        self.payments = Payments(self.config, self.provider)
        self.data = {"idempotencyKey": str(uuid.uuid4()), "amount": 100,
                     "email": "payer@example.org", "personalDataConsent": True}

    def tearDown(self):
        self.temp.cleanup()

    def test_same_attempt_is_idempotent_across_restarts(self):
        first = self.payments.create(self.data)
        reopened = Payments(self.config, self.provider)
        self.assertEqual(first, reopened.create(self.data))
        self.assertEqual(self.provider.calls, 1)

    def test_concurrent_submissions_create_only_one_payment(self):
        results = []
        workers = [threading.Thread(target=lambda: results.append(self.payments.create(self.data))) for _ in range(8)]
        for worker in workers:
            worker.start()
        for worker in workers:
            worker.join(timeout=5)
        self.assertEqual(len(results), 8)
        self.assertEqual(self.provider.calls, 1)
        self.assertTrue(all(row == results[0] for row in results))

    def test_changed_amount_or_email_cannot_reuse_attempt(self):
        self.payments.create(self.data)
        for changed in ({"amount": 300}, {"email": "other@example.org"}):
            with self.assertRaises(PaymentError) as caught:
                self.payments.create({**self.data, **changed})
            self.assertEqual(caught.exception.status, 409)
        self.assertEqual(self.provider.calls, 1)

    def test_timeout_retry_keeps_the_original_key(self):
        self.provider.fail_once = True
        with self.assertRaises(PaymentError):
            self.payments.create(self.data)
        self.payments.create(self.data)
        self.assertEqual(self.provider.payment["metadata"]["support_request_id"], self.data["idempotencyKey"])
        with self.payments.connect() as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM payments").fetchone()[0], 1)

    def test_amount_consent_and_email_are_validated_before_provider(self):
        for changed in ({"amount": 99}, {"amount": 100001}, {"amount": "nan"},
                        {"amount": 100.001}, {"email": "broken"}, {"email": "a@b.c\nInjected"},
                        {"personalDataConsent": False}, {"idempotencyKey": "invalid"}):
            with self.assertRaises(PaymentError):
                self.payments.create({**self.data, **changed})
        self.assertEqual(self.provider.calls, 0)

    def test_only_verified_provider_payment_can_be_paid(self):
        self.payments.create(self.data)
        self.assertEqual(self.payments.status(self.data["idempotencyKey"])["status"], "pending")
        self.provider.payment.update(status="succeeded", paid=True)
        self.assertEqual(self.payments.status(self.data["idempotencyKey"])["status"], "succeeded")
        for changed in ({"paid": False}, {"amount": {"value": "300.00", "currency": "RUB"}},
                        {"metadata": {"support_request_id": str(uuid.uuid4())}}):
            original = copy.deepcopy(self.provider.payment)
            self.provider.payment.update(changed)
            with self.assertRaises(PaymentError):
                self.payments.status(self.data["idempotencyKey"])
            self.provider.payment = original

    def test_confirmation_cannot_redirect_to_untrusted_host(self):
        for url in ("http://yoomoney.ru/pay", "https://yoomoney.ru.attacker.org/pay",
                    "https://yoomoney.ru@attacker.org/", "https://attacker.org/", "javascript:alert(1)"):
            with self.assertRaises(PaymentError):
                confirmation_url(url)

    def test_notification_is_not_trusted_as_payment_confirmation(self):
        self.payments.create(self.data)
        self.payments.notify({"event": "payment.succeeded", "object": {"id": self.provider.payment["id"], "status": "succeeded", "paid": True}})
        with self.payments.connect() as db:
            self.assertEqual(db.execute("SELECT status FROM payments").fetchone()[0], "pending")
        self.provider.payment.update(status="succeeded", paid=True)
        self.payments.notify({"event": "payment.succeeded", "object": {"id": self.provider.payment["id"]}})
        with self.payments.connect() as db:
            self.assertEqual(db.execute("SELECT status FROM payments").fetchone()[0], "succeeded")

    def test_expired_unresolved_attempt_is_not_recreated(self):
        self.provider.fail_once = True
        with self.assertRaises(PaymentError):
            self.payments.create(self.data)
        with self.payments.connect() as db:
            db.execute("UPDATE payments SET created_at=0")
        with self.assertRaises(PaymentError) as caught:
            self.payments.create(self.data)
        self.assertEqual(caught.exception.status, 410)
        self.assertEqual(self.provider.calls, 1)

    def test_http_rejects_foreign_origin_and_has_no_store(self):
        server = LimitedServer(("127.0.0.1", 0), handler(self.payments))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            connection = http.client.HTTPConnection("127.0.0.1", server.server_port)
            connection.request("POST", "/api/support/payment", json.dumps(self.data),
                               {"Content-Type": "application/json", "Origin": "https://attacker.org"})
            response = connection.getresponse()
            self.assertEqual(response.status, 403)
            self.assertEqual(response.getheader("Cache-Control"), "no-store")
            response.read()
            self.assertEqual(self.provider.calls, 0)
            connection.close()
            connection = http.client.HTTPConnection("127.0.0.1", server.server_port)
            connection.request("POST", "/api/support/payment", json.dumps(self.data),
                               {"Content-Type": "application/json", "Origin": self.config.origin})
            response = connection.getresponse()
            self.assertEqual(response.status, 200)
            self.assertIn("confirmationUrl", json.loads(response.read()))
            connection.close()
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)


if __name__ == "__main__":
    unittest.main()

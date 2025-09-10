def test_idempotent_creation(client):
    payload = {
        "amount": 1000,
        "currency": "ZAR",
        "destination": {"type": "bank_account", "last4": "1234"},
    }

    r1 = client.post("/api/v1/payouts", json=payload, headers={"Idempotency-Key": "abc-123"})
    assert r1.status_code == 200, r1.text
    id1 = r1.json()["id"]

    r2 = client.post("/api/v1/payouts", json=payload, headers={"Idempotency-Key": "abc-123"})
    assert r2.status_code == 200, r2.text
    id2 = r2.json()["id"]

    assert id1 == id2

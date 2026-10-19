from tests.factories import add_audit, add_channel, add_qualification, add_time_entry, add_worker, grant


def test_list_workers_sorted_by_name_with_qualifications(conn, client):
    barista, bakery = add_qualification(conn, "barista", "Barista"), add_qualification(conn, "bakery", "Bakery")
    jonas = add_worker(conn, first_name="Jonas", last_name="Willems", contract_type="student")
    mila = add_worker(conn, first_name="Mila", last_name="Claes")
    add_worker(conn, first_name="Old", last_name="Timer", is_active=0)
    grant(conn, jonas, barista)
    grant(conn, jonas, bakery)

    response = client.get("/api/v1/workers")

    assert response.json() == {
        "items": [
            {"workerId": mila, "firstName": "Mila", "lastName": "Claes", "contractType": "part_time",
             "qualifications": []},
            {"workerId": jonas, "firstName": "Jonas", "lastName": "Willems", "contractType": "student",
             "qualifications": [{"code": "bakery", "name": "Bakery"}, {"code": "barista", "name": "Barista"}]},
        ],
        "nextCursor": None,
    }


def test_search_matches_first_last_or_full_name(conn, client):
    jonas = add_worker(conn, first_name="Jonas", last_name="Willems")
    add_worker(conn, first_name="Mila", last_name="Claes")

    for search in ("jon", "WILL", "jonas wil"):
        items = client.get("/api/v1/workers", params={"search": search}).json()["items"]
        assert [i["workerId"] for i in items] == [jonas], search


def test_search_treats_wildcards_literally(conn, client):
    add_worker(conn, first_name="Jonas", last_name="Willems")

    assert client.get("/api/v1/workers", params={"search": "%"}).json()["items"] == []
    assert client.get("/api/v1/workers", params={"search": "_"}).json()["items"] == []


def test_list_workers_paginates_by_name(conn, client):
    for last in ("Dubois", "Claes", "Peeters", "Adams", "Willems"):
        add_worker(conn, last_name=last)

    first = client.get("/api/v1/workers", params={"limit": 3}).json()
    second = client.get("/api/v1/workers", params={"limit": 3, "cursor": first["nextCursor"]}).json()

    names = [i["lastName"] for i in first["items"] + second["items"]]
    assert names == ["Adams", "Claes", "Dubois", "Peeters", "Willems"]
    assert second["nextCursor"] is None


def test_limit_is_validated(client):
    for limit in (0, 101):
        response = client.get("/api/v1/workers", params={"limit": limit})
        assert response.status_code == 422
        assert response.json() == {"error": "VALIDATION_ERROR"}


def test_worker_detail(conn, client):
    barista, first_aid = add_qualification(conn, "barista", "Barista"), add_qualification(conn, "first_aid")
    jonas = add_worker(conn, first_name="Jonas", last_name="Willems", hourly_rate_cents=1650, priority_factor=2,
                       contract_hours_per_week=32)
    grant(conn, jonas, barista)
    grant(conn, jonas, first_aid, valid_until="2027-03-31")
    add_channel(conn, jonas, "phone", "+32470123456")
    add_channel(conn, jonas, "telegram", "123456789", is_preferred=True)
    add_time_entry(conn, jonas, "2026-10-19T06:00Z", "2026-10-19T14:00Z")  # this week: 8h
    add_time_entry(conn, jonas, "2026-10-12T06:00Z", "2026-10-12T14:00Z")  # last week

    response = client.get(f"/api/v1/workers/{jonas}")

    assert response.json() == {
        "workerId": jonas,
        "firstName": "Jonas",
        "lastName": "Willems",
        "contractType": "part_time",
        "contractHoursPerWeek": 32.0,
        "hourlyRateCents": 1650,
        "priorityFactor": 2,
        "language": "nl",
        "studentHoursExternalYtd": 0.0,
        "isActive": True,
        "qualifications": [
            {"code": "barista", "name": "Barista", "validUntil": None},
            {"code": "first_aid", "name": "First aid", "validUntil": "2027-03-31"},
        ],
        "contactChannels": [
            {"type": "telegram", "address": "123456789", "isPreferred": True},
            {"type": "phone", "address": "+32470123456", "isPreferred": False},
        ],
        "workedHoursThisWeek": 8.0,
    }


def test_inactive_worker_detail_is_still_available(conn, client):
    worker = add_worker(conn, is_active=0)

    assert client.get(f"/api/v1/workers/{worker}").json()["isActive"] is False


def test_contact_info(conn, client):
    worker = add_worker(conn)
    add_channel(conn, worker, "telegram", "123456789", is_preferred=True)

    response = client.get(f"/api/v1/workers/{worker}/contact-info")

    assert response.json() == {"channels": [{"type": "telegram", "address": "123456789", "isPreferred": True}]}


def test_history_newest_first_with_changes_only_on_worker_updates(conn, client):
    worker = add_worker(conn)
    accepted = {"occurred_at": "2026-10-19T07:09Z", "actor": f"worker:{worker}", "shift_id": 102}
    add_audit(conn, "offer_accepted", worker_id=worker, payload={"ignored": True}, **accepted)
    add_audit(conn, "worker_updated", occurred_at="2026-10-19T09:12Z", worker_id=worker, actor="manager",
              payload=[{"field": "priorityFactor", "from": 2, "to": 3}])
    add_audit(conn, "worker_updated", worker_id=add_worker(conn), payload=[])  # someone else

    response = client.get(f"/api/v1/workers/{worker}/history")

    assert response.json() == {
        "items": [
            {"occurredAt": "2026-10-19T09:12Z", "actor": "manager", "action": "worker_updated", "shiftId": None,
             "changes": [{"field": "priorityFactor", "from": 2, "to": 3}]},
            {"occurredAt": "2026-10-19T07:09Z", "actor": f"worker:{worker}", "action": "offer_accepted",
             "shiftId": 102, "changes": None},
        ],
        "nextCursor": None,
    }


def test_history_paginates_newest_first(conn, client):
    worker = add_worker(conn)
    for minute in range(5):
        add_audit(conn, "offer_sent", occurred_at=f"2026-10-19T07:0{minute}Z", worker_id=worker)

    first = client.get(f"/api/v1/workers/{worker}/history", params={"limit": 2}).json()
    rest = client.get(f"/api/v1/workers/{worker}/history", params={"limit": 5, "cursor": first["nextCursor"]}).json()

    times = [i["occurredAt"][-3:-1] for i in first["items"] + rest["items"]]
    assert times == ["04", "03", "02", "01", "00"]


def test_unknown_worker_is_404(client):
    for path in ("/api/v1/workers/999", "/api/v1/workers/999/contact-info", "/api/v1/workers/999/history"):
        response = client.get(path)
        assert response.status_code == 404
        assert response.json() == {"error": "WORKER_NOT_FOUND"}


def test_unknown_route_uses_error_format(client):
    response = client.get("/api/v1/nope")

    assert response.status_code == 404
    assert response.json() == {"error": "NOT_FOUND"}

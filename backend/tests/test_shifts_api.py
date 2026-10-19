from tests.factories import add_offer, add_qualification, add_shift, add_worker

# The clock is pinned to 2026-10-20T07:00Z (see conftest.fixed_now).


def test_current_shifts_lists_scheduled_shifts_in_progress(conn, client):
    q = add_qualification(conn, "barista", "Barista")
    anna = add_worker(conn, first_name="Anna", last_name="Peeters")
    tom = add_worker(conn, first_name="Tom", last_name="Dubois")
    in_progress = add_shift(conn, q, anna, "2026-10-20T06:00Z", "2026-10-20T14:00Z")
    add_shift(conn, q, tom, "2026-10-20T07:00Z", "2026-10-20T15:00Z", status="cancelled")
    add_shift(conn, q, None, "2026-10-20T06:00Z", "2026-10-20T14:00Z")  # open
    add_shift(conn, q, tom, "2026-10-20T08:00Z", "2026-10-20T16:00Z")  # not started yet
    add_shift(conn, q, tom, "2026-10-19T23:00Z", "2026-10-20T07:00Z")  # just ended

    response = client.get("/api/v1/shifts/current")

    assert response.status_code == 200
    assert response.json() == {
        "items": [{
            "shiftId": in_progress, "workerId": anna, "firstName": "Anna", "lastName": "Peeters",
            "qualification": {"code": "barista", "name": "Barista"}, "endsAt": "2026-10-20T14:00Z",
        }],
        "nextCursor": None,
    }


def test_calendar_returns_shifts_overlapping_the_range(conn, client):
    q = add_qualification(conn)
    anna = add_worker(conn)
    overlapping_start = add_shift(conn, q, anna, "2026-10-19T22:00Z", "2026-10-20T06:00Z")
    open_shift = add_shift(conn, q, None, "2026-10-20T07:00Z", "2026-10-20T15:00Z")
    add_shift(conn, q, anna, "2026-10-21T00:00Z", "2026-10-21T08:00Z")  # starts exactly at `to`

    response = client.get("/api/v1/shifts", params={"from": "2026-10-20T00:00Z", "to": "2026-10-21T00:00Z"})

    items = response.json()["items"]
    assert [i["shiftId"] for i in items] == [overlapping_start, open_shift]
    assert items[1] == {
        "shiftId": open_shift, "status": "open", "workerId": None, "firstName": None, "lastName": None,
        "startsAt": "2026-10-20T07:00Z", "endsAt": "2026-10-20T15:00Z",
    }


def test_calendar_validates_the_range(client):
    bad_format = client.get("/api/v1/shifts", params={"from": "2026-10-20T00:00:00Z", "to": "2026-10-21T00:00Z"})
    reversed_range = client.get("/api/v1/shifts", params={"from": "2026-10-21T00:00Z", "to": "2026-10-20T00:00Z"})
    missing = client.get("/api/v1/shifts")

    for response in (bad_format, reversed_range, missing):
        assert response.status_code == 422
        assert response.json() == {"error": "VALIDATION_ERROR"}


def test_calendar_paginates_with_cursor(conn, client):
    q = add_qualification(conn)
    ids = [add_shift(conn, q, None, f"2026-10-20T0{h}:00Z", f"2026-10-20T1{h}:00Z") for h in range(5)]
    params = {"from": "2026-10-20T00:00Z", "to": "2026-10-21T00:00Z", "limit": 2}

    seen, cursor, pages = [], None, 0
    while True:
        page = client.get("/api/v1/shifts", params=params | ({"cursor": cursor} if cursor else {})).json()
        seen += [i["shiftId"] for i in page["items"]]
        pages += 1
        cursor = page["nextCursor"]
        if cursor is None:
            break

    assert seen == ids
    assert pages == 3


def test_invalid_cursor_is_a_validation_error(client):
    response = client.get("/api/v1/shifts/current", params={"cursor": "not-a-cursor"})

    assert response.status_code == 422
    assert response.json() == {"error": "VALIDATION_ERROR"}


def test_shift_detail(conn, client):
    q = add_qualification(conn, "bakery", "Bakery")
    shift = add_shift(conn, q, None, "2026-10-20T07:00Z", "2026-10-20T15:00Z")

    response = client.get(f"/api/v1/shifts/{shift}")

    assert response.json() == {
        "shiftId": shift, "status": "open", "workerId": None, "firstName": None, "lastName": None,
        "startsAt": "2026-10-20T07:00Z", "endsAt": "2026-10-20T15:00Z",
        "qualification": {"code": "bakery", "name": "Bakery"},
    }


def test_unknown_shift_is_404(client):
    for path in ("/api/v1/shifts/999", "/api/v1/shifts/999/offers"):
        response = client.get(path)
        assert response.status_code == 404
        assert response.json() == {"error": "SHIFT_NOT_FOUND"}


def test_shift_offers_in_send_order(conn, client):
    q = add_qualification(conn)
    shift = add_shift(conn, q, None, "2026-10-20T07:00Z", "2026-10-20T15:00Z")
    jonas, mila = add_worker(conn, first_name="Jonas"), add_worker(conn, first_name="Mila")
    first = add_offer(conn, shift, jonas, status="accepted", sent_at="2026-10-20T07:05Z",
                      responded_at="2026-10-20T07:09Z")
    second = add_offer(conn, shift, mila, status="cancelled", sent_at="2026-10-20T07:05Z")
    add_offer(conn, add_shift(conn, q, None, "2026-10-21T07:00Z", "2026-10-21T15:00Z"), jonas)  # other shift

    response = client.get(f"/api/v1/shifts/{shift}/offers")

    assert response.json() == {
        "items": [
            {"offerId": first, "workerId": jonas, "wave": 1, "status": "accepted",
             "sentAt": "2026-10-20T07:05Z", "respondedAt": "2026-10-20T07:09Z"},
            {"offerId": second, "workerId": mila, "wave": 1, "status": "cancelled",
             "sentAt": "2026-10-20T07:05Z", "respondedAt": None},
        ],
        "nextCursor": None,
    }

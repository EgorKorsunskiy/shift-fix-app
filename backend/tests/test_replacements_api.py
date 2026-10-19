import pytest

from tests.factories import (
    add_absence, add_channel, add_offer, add_qualification, add_shift, add_worker, grant,
)


@pytest.fixture
def scenario(conn):
    """07:00 scenario: Anna is sick, her 09:00-17:00 (local) bakery shift is open."""
    bakery = add_qualification(conn, "bakery", "Bakery")
    people = {
        "anna": add_worker(conn, first_name="Anna", last_name="Peeters"),
        "jonas": add_worker(conn, first_name="Jonas", last_name="Willems", priority_factor=3),
        "mila": add_worker(conn, first_name="Mila", last_name="Claes", priority_factor=0),
        "tom": add_worker(conn, first_name="Tom", last_name="Dubois"),
    }
    for name in ("anna", "jonas", "mila"):
        grant(conn, people[name], bakery)
    add_absence(conn, people["anna"], "2026-10-20T05:00Z", "2026-10-20T22:00Z")
    shift = add_shift(conn, bakery, None, "2026-10-20T07:00Z", "2026-10-20T15:00Z")
    add_offer(conn, shift, people["mila"])
    return {"shift": shift, "bakery": bakery, **people}


def test_replacements_are_eligible_workers_best_first(client, scenario):
    response = client.get(f"/api/v1/shifts/{scenario['shift']}/replacements")

    assert response.status_code == 200
    items = response.json()["items"]
    assert [(i["workerId"], i["offerStatus"]) for i in items] == [(scenario["jonas"], None),
                                                                  (scenario["mila"], "pending")]
    assert items[0] == {"workerId": scenario["jonas"], "firstName": "Jonas", "lastName": "Willems",
                        "score": 93, "offerStatus": None}
    assert items[0]["score"] > items[1]["score"]


def test_exclusions_list_failed_rules(client, scenario):
    response = client.get(f"/api/v1/shifts/{scenario['shift']}/exclusions")

    assert response.json() == {
        "items": [
            {"workerId": scenario["tom"], "firstName": "Tom", "lastName": "Dubois", "failedRules": ["qualification"]},
            {"workerId": scenario["anna"], "firstName": "Anna", "lastName": "Peeters", "failedRules": ["availability"]},
        ],
        "nextCursor": None,
    }


def test_equal_scores_prefer_workers_reachable_on_a_preferred_channel(conn, client, scenario):
    lena = add_worker(conn, first_name="Lena", last_name="Aerts", priority_factor=3)
    zoe = add_worker(conn, first_name="Zoe", last_name="Zeeman", priority_factor=3)
    for worker in (lena, zoe):
        grant(conn, worker, scenario["bakery"])
    add_channel(conn, zoe, "telegram", "42", is_preferred=True)

    items = client.get(f"/api/v1/shifts/{scenario['shift']}/replacements").json()["items"]

    top = [i["workerId"] for i in items if i["score"] == items[0]["score"]]
    assert top[0] == zoe
    assert set(top) == {zoe, lena, scenario["jonas"]}


def test_replacements_paginate(client, scenario):
    url = f"/api/v1/shifts/{scenario['shift']}/replacements"

    first = client.get(url, params={"limit": 1}).json()
    second = client.get(url, params={"limit": 1, "cursor": first["nextCursor"]}).json()

    assert [i["workerId"] for i in first["items"] + second["items"]] == [scenario["jonas"], scenario["mila"]]
    assert second["nextCursor"] is None


def test_replacements_need_an_open_shift(conn, client, scenario):
    filled = add_shift(conn, scenario["bakery"], scenario["jonas"], "2026-10-22T07:00Z", "2026-10-22T15:00Z")

    for path in ("replacements", "exclusions"):
        response = client.get(f"/api/v1/shifts/{filled}/{path}")
        assert response.status_code == 409
        assert response.json() == {"error": "SHIFT_NOT_OPEN"}


def test_replacements_for_unknown_shift(client):
    for path in ("replacements", "exclusions"):
        response = client.get(f"/api/v1/shifts/999/{path}")
        assert response.status_code == 404
        assert response.json() == {"error": "SHIFT_NOT_FOUND"}

import requests
import json
from pathlib import Path
import io
import time
import re

HOME = Path(__file__).parent
INSTANCES = {}
MAX_N_PEOPLE = 2000
MAX_N_WORKS_PER_PEOPLE = 5
CATEGORY = "all"
DIRNAME = f"category/{CATEGORY}/{MAX_N_PEOPLE}/json"


def get_wikidata_json(key: str) -> dict:
    url = (
        f"https://www.wikidata.org/w/api.php?action=wbgetentities&ids={key}&format=json"
    )
    data = requests.get(url)
    time.sleep(0.1)

    return data.json()["entities"][key]


def get_name(jobj: dict):
    lang = "en"
    if "en" not in jobj["labels"].keys():
        lang = list(jobj["labels"].keys())[0]
    return jobj["labels"][lang]["value"]


def get_date(jobj: dict, which: str) -> str:
    if which == "birth":
        key = "P569"
    elif which == "death":
        key = "P570"
    elif which == "inception":
        key = "P571"
    if key not in jobj["claims"].keys():
        return None
    if jobj["claims"][key][0]["mainsnak"]["snaktype"] == "somevalue":
        return None
    iso_date = jobj["claims"][key][0]["mainsnak"]["datavalue"]["value"]["time"]
    m = re.search(
        r"^(?P<year>[-+]?[0-9]{4})-(?P<month>[0-9]{2})-(?P<day>[0-9]{2})", iso_date
    )
    # yuck yuck yuck js
    return [int(m.group("year")), int(m.group("month")), int(m.group("day"))]


def get_instance_name(jobj: dict):
    instanceof_key = "P31"
    if instanceof_key not in jobj["claims"].keys():
        return None

    key = jobj["claims"][instanceof_key][0]["mainsnak"]["datavalue"]["value"]["id"]
    if key in INSTANCES.keys():
        return INSTANCES[key]
    else:
        jobj = get_wikidata_json(key)
        name = get_name(jobj)
        INSTANCES[key] = name
        return name


def get_notable_work_keys(jobj: dict) -> list:
    key = "P800"
    works = []
    for item in jobj["claims"][key]:
        if "datavalue" in item["mainsnak"].keys():
            if "value" in item["mainsnak"]["datavalue"].keys():
                item_value = item["mainsnak"]["datavalue"]["value"]
                if item_value["entity-type"] == "item":
                    works.append(item_value["id"])

    return works


def has_notable_works(jobj: dict) -> bool:
    return "P800" in jobj["claims"].keys()


def process_people_keys():
    keys = (
        io.open(Path(HOME, f"category/{CATEGORY}/raw/keys.txt"), "r", encoding="utf8")
        .read()
        .splitlines()
    )
    n = 0
    work_keys_dict = {}
    people_dict = {}
    for key in keys:
        jobj = get_wikidata_json(key)
        name = get_name(jobj)

        birthdate = get_date(jobj, "birth")
        deathdate = get_date(jobj, "death")

        if has_notable_works(jobj):
            works = get_notable_work_keys(jobj)
            if works != []:
                work_keys_dict[name] = works
        if birthdate is not None and deathdate is not None:
            print(f"{key} -- {name}")
            people_dict[name] = [key, birthdate, deathdate]

        n += 1
        if n == MAX_N_PEOPLE:
            break

    return people_dict, work_keys_dict


def save_people(
    people_dict: dict,
    work_keys_dict: dict,
):
    with io.open(Path(HOME, f"{DIRNAME}/work_keys.json"), "w+", encoding="utf8") as f:
        f.write(json.dumps(work_keys_dict, ensure_ascii=False))

    with io.open(Path(HOME, f"{DIRNAME}/people.json"), "w+", encoding="utf8") as f:
        f.write(json.dumps(people_dict, ensure_ascii=False))


def save_works(detail_work_dict: dict):
    with io.open(Path(HOME, f"{DIRNAME}/works.json"), "w+", encoding="utf8") as f:
        f.write(json.dumps(detail_work_dict, ensure_ascii=False))


def load_people():
    with io.open(Path(HOME, f"{DIRNAME}/work_keys.json"), "r", encoding="utf8") as f:
        wk = json.loads(f.read())

    with io.open(Path(HOME, f"{DIRNAME}/people.json"), "r", encoding="utf8") as f:
        p = json.loads(f.read())

    return p, wk


def store_works(work_keys_dict: dict):
    detail_work_dict = {}
    for artist in work_keys_dict.keys():
        detail_work_dict[artist] = []
        n_works = 0
        for work_key in work_keys_dict[artist]:
            jobj = get_wikidata_json(work_key)
            work_name = get_name(jobj)
            inception = get_date(jobj, "inception")
            instanceof = get_instance_name(jobj)
            if inception is not None and instanceof is not None:
                print(f"{work_key} -- {work_name} by {artist}")
                detail_work_dict[artist].append(
                    [work_key, work_name, inception, instanceof]
                )
                n_works += 1
            if n_works == MAX_N_WORKS_PER_PEOPLE:
                break
        if detail_work_dict[artist] == []:
            del detail_work_dict[artist]
    return detail_work_dict


if __name__ == "__main__":

    people_dict, work_keys_dict = process_people_keys()
    save_people(people_dict, work_keys_dict)

    # people_dict, work_keys_dict = load_people()
    detail_work_dict = store_works(work_keys_dict)
    save_works(detail_work_dict)

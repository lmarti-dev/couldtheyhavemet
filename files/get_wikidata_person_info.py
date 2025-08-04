import requests
import json
from pathlib import Path
import io
import time
import re
import os

HOME = Path(__file__).parent
INSTANCES = {}


def get_wikidata_json(key: str) -> dict:
    url = (
        f"https://www.wikidata.org/w/api.php?action=wbgetentities&ids={key}&format=json"
    )
    data = requests.get(url)
    time.sleep(0.5)
    jobj = data.json()
    info = jobj["entities"][key]
    if "missing" in info.keys():
        return None
    return info


def get_wikidata_links(key: str) -> dict:
    url = f"https://www.wikidata.org/w/api.php?action=wbgetentities&ids={key}&format=json&props=sitelinks/urls"
    data = requests.get(url)
    time.sleep(0.5)
    jobj = data.json()
    info = jobj["entities"][key]
    if "missing" in info.keys():
        return None
    return info


def get_name(jobj: dict):
    lang = "en"
    if "en" not in jobj["labels"].keys():
        lang = list(jobj["labels"].keys())[0]
    return jobj["labels"][lang]["value"]


def try_date_types(jobj: dict, whichs: list[str]) -> str:
    for which in whichs:
        date = get_date(jobj, which)
        if date is not None:
            return date, which
    return None


def get_date(jobj: dict, which: str) -> str:
    if which == "birth":
        key = "P569"
    elif which == "death":
        key = "P570"
    elif which == "inception":
        key = "P571"
    elif which == "publication":
        key = "P577"
    elif which == "performance":
        key = "P1191"
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


def scrape_people_from_nature(keys_fpath: str, max_n_persons: int):

    keys = (
        io.open(
            Path(HOME, keys_fpath),
            "r",
            encoding="utf8",
        )
        .read()
        .splitlines()
    )
    return process_wikidata_keys(keys, max_n_persons)


def process_wikidata_keys(keys: str, max_n_persons: int):

    n = 0
    n_char = len(str(max_n_persons))
    work_keys_dict = {}
    people_dict = {}
    for key in keys:
        payload = get_person_data_from_key(key)
        if payload is not None:
            name, birthdate, deathdate, has_dates, works, wiki_link = payload

            if works != [] and has_dates:
                work_keys_dict[name] = works

            if has_dates:
                print(f"{n: <{n_char}}/{max_n_persons} {key} -- {name}")
                people_dict[name] = [key, birthdate, deathdate, wiki_link]

            n += 1
            if n == max_n_persons:
                break

    return people_dict, work_keys_dict


def get_person_data_from_key(key: str):
    jobj = get_wikidata_json(key)
    if jobj is None:
        return None
    instance_name = get_instance_name(jobj)
    if instance_name != "human":
        return None
    name = get_name(jobj)

    birthdate = get_date(jobj, "birth")
    deathdate = get_date(jobj, "death")

    wiki_link = get_wikilink(key)

    has_dates = birthdate is not None and deathdate is not None
    works = []
    if has_notable_works(jobj):
        works = get_notable_work_keys(jobj)
    return name, birthdate, deathdate, has_dates, works, wiki_link


def ensure_dir(dirname: str):
    if not Path(HOME, dirname).is_dir():
        os.makedirs(Path(HOME, dirname))


def save_people(
    people_dict: dict,
    work_keys_dict: dict,
    dirname: str,
):
    ensure_dir(dirname)
    with io.open(Path(HOME, f"{dirname}/work_keys.json"), "w+", encoding="utf8") as f:
        f.write(json.dumps(work_keys_dict, ensure_ascii=False))

    with io.open(Path(HOME, f"{dirname}/people.json"), "w+", encoding="utf8") as f:
        f.write(json.dumps(people_dict, ensure_ascii=False))


def save_works(detail_work_dict: dict, dirname: str):
    ensure_dir(dirname)
    with io.open(Path(HOME, f"{dirname}/works.json"), "w+", encoding="utf8") as f:
        f.write(json.dumps(detail_work_dict, ensure_ascii=False))


def load_people(dirname: str):
    with io.open(Path(HOME, f"{dirname}/work_keys.json"), "r", encoding="utf8") as f:
        wk = json.loads(f.read())

    with io.open(Path(HOME, f"{dirname}/people.json"), "r", encoding="utf8") as f:
        p = json.loads(f.read())

    return p, wk


def load_works(dirname: str) -> dict:
    with io.open(Path(HOME, f"{dirname}/works.json"), "r", encoding="utf8") as f:
        w = json.loads(f.read())
    return w


def load_work_keys(dirname: str) -> dict:
    with io.open(Path(HOME, f"{dirname}/work_keys.json"), "r", encoding="utf8") as f:
        w = json.loads(f.read())
    return w


def obtain_works(work_keys_dict: dict, max_works_per_person: int = 5):
    detail_work_dict = {}
    n_works = 0
    n_chars = len(str(len(work_keys_dict.keys())))
    for artist in work_keys_dict.keys():
        detail_work_dict[artist] = []
        for work_key in work_keys_dict[artist]:
            try:
                jobj = get_wikidata_json(work_key)
                work_name = get_name(jobj)
                wiki_link = get_wikilink(work_key)
                inception, which_date = try_date_types(
                    jobj, ["publication", "performance", "inception"]
                )
                instanceof = get_instance_name(jobj)
                if inception is not None and instanceof is not None:
                    print(
                        f"{n_works: <{n_chars}}/{len(work_keys_dict)} {work_key} -- {work_name} by {artist} ({which_date})"
                    )
                    detail_work_dict[artist].append(
                        [work_key, work_name, inception, instanceof, wiki_link]
                    )
                    n_works += 1
            except Exception:
                pass
            if n_works == max_works_per_person:
                break
        if detail_work_dict[artist] == []:
            del detail_work_dict[artist]
    return detail_work_dict


def scrape_qs_from_wikidata():
    keys = ["Q" + str(n) for n in range(1, int(1e4))]
    return process_wikidata_keys(keys)


def get_wikilink(key: dict, lang: str = "en") -> str:
    jobj = get_wikidata_links(key)
    if jobj is None:
        return None

    sitelinks = jobj.get("sitelinks")
    if sitelinks:
        if lang:
            # filter only the specified language
            sitelink = sitelinks.get(f"{lang}wiki")
            if sitelink:
                wiki_url = sitelink.get("url")
                if wiki_url:
                    return Path(wiki_url).name
    return None


def append_pk_to_people():
    dirname = "complete/json"
    people_dict, _ = load_people(dirname)
    qkeys = load_complete_keys()
    for pk, q in enumerate(qkeys):
        for name in people_dict:
            if people_dict[name][0] == q:
                people_dict[name].append(pk)
                break

    with io.open(Path(HOME, f"{dirname}/people.json"), "w+", encoding="utf8") as f:
        f.write(json.dumps(people_dict, ensure_ascii=False))


def load_complete_keys():
    fpath = r"c:\projects\Resources\listes\most_famous_1538_d1999.json"
    with io.open(fpath, "r", encoding="utf8") as f:
        jobj = json.loads(f.read())
    qkeys = [j[0] for j in jobj]

    return qkeys


def get_complete():
    qkeys = load_complete_keys()

    dirname = f"complete/json"

    # people_dict, work_keys_dict = process_wikidata_keys(qkeys, -1)

    # save_people(people_dict, work_keys_dict, dirname)

    work_keys_dict = load_work_keys("complete/json")

    detail_work_dict = obtain_works(work_keys_dict)
    save_works(detail_work_dict, dirname)


def get_new_people(n_people: int):

    keys_fpath = f"nature/category/d1999/raw/keys_d1999.txt"
    dirname = f"nature/category/d1999/json/{n_people}"

    people_dict, work_keys_dict = scrape_people_from_nature(keys_fpath, n_people)

    save_people(people_dict, work_keys_dict, dirname)

    detail_work_dict = obtain_works(work_keys_dict)
    save_works(detail_work_dict, dirname)


if __name__ == "__main__":
    get_complete()

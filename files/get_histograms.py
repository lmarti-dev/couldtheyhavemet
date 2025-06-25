import io, json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

HOME = Path(__file__).parent


def count_lifespan_years(jobj: list, miny, person: list):
    by = person[1][0]
    dy = person[2][0]
    print(f"Range: {by} - {dy}")
    for yrs in range(by, dy + 1):
        jobj[yrs - miny] += 1


def get_min_max_year(persons):
    bys = [persons[k][1][0] for k in persons.keys()]
    dys = [persons[k][2][0] for k in persons.keys()]
    bys.extend(dys)
    return min(bys), max(dys)


if __name__ == "__main__":

    dirname = "complete/json"
    fig, ax = plt.subplots()

    fpath = Path(HOME, dirname, "people.json")
    with io.open(fpath, "r", encoding="utf8") as f:
        persons = json.loads(f.read())

    miny, maxy = get_min_max_year(persons)
    hist = [0 for _ in range(miny, maxy + 1)]
    for k in persons.keys():
        print(k)

        count_lifespan_years(hist, miny, persons[k])

    fpath_out = Path(HOME, dirname, "hist.json")

    hist_out = {"vals": hist, "miny": miny, "maxy": maxy}

    with io.open(fpath_out, "w+", encoding="utf8") as f:

        f.write(json.dumps(hist_out, ensure_ascii=False))

    ax.plot(
        range(miny, maxy + 1),
        hist,
    )
    ax.set_yscale("log")

    plt.show()

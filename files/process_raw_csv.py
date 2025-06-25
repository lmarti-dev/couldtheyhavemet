import io
import re
import json


def split_row(row: str) -> list:
    out = []
    in_str = False
    s = 0
    for k, c in enumerate(row):
        if not in_str and c == '"':
            in_str = True
        elif in_str and c == '"':
            in_str = False
        if not in_str and c == ",":
            out.append(row[s:k])
            s = k + 1

    return out


def print_rowkeys(row: list):
    print([f"{k}: {v}" for k, v in enumerate(row)])


[
    "0: wikidata_code",
    "1: birth",
    "2: death",
    "3: updated_death_date",
    "4: approx_birth",
    "5: approx_death",
    "6: birth_min",
    "7: birth_max",
    "8: death_min",
    "9: death_max",
    "10: gender",
    "11: level1_main_occ",
    "12: name",
    "13: un_subregion",
    "14: birth_estimation",
    "15: death_estimation",
    "16: bigperiod_birth_graph_b",
    "17: bigperiod_death_graph_b",
    "18: curid",
    "19: level2_main_occ",
    "20: freq_main_occ",
    "21: freq_second_occ",
    "22: level2_second_occ",
    "23: level3_main_occ",
    "24: bigperiod_birth",
    "25: bigperiod_death",
    "26: wiki_readers_2015_2018",
    "27: non_missing_score",
    "28: total_count_words_b",
    "29: number_wiki_editions",
    "30: total_noccur_links_b",
    "31: sum_visib_ln_5criteria",
    "32: ranking_visib_5criteria",
    "33: all_geography_groups",
    "34: string_citizenship_raw_d",
    "35: citizenship_1_b",
    "36: citizenship_2_b",
    "37: list_areas_of_rattach",
    "38: area1_of_rattachment",
    "39: area2_of_rattachment",
    "40: list_wikipedia_editions",
    "41: un_region",
    "42: group_wikipedia_editions",
    "43: bplo1",
    "44: dplo1",
    "45: bpla1",
    "46: dpla1",
    "47: pantheon_1",
    "48: level3_all_occ\r\n",
]
rank_max = 3000
dy_max = 1999
by_max = 1900
fpath = r"c:\projects\Resources\listes\cross-verified-database.csv"

out = []
with io.open(fpath, "rb") as f:

    n = 0
    for row in f:
        # 0, 1, 2, 12, 32

        row = str(row, encoding="utf8", errors="ignore")
        row = split_row(row)

        try:
            if (
                len(row) > 35
                and n > 0
                and float(row[32]) < rank_max
                and row[1] != ""
                and row[2] != ""
            ):
                if int(row[1]) < by_max:

                    data = [
                        row[0],
                        int(row[1]),
                        int(row[2]),
                        row[12],
                        float(row[32]),
                        row[35],
                    ]

                    out.append(data)
                    print(n, data)
                    n += 1
        except:
            pass
        else:
            n += 1

print(f"total lines: {n}")

out = sorted(out, key=lambda v: v[4])

fpath_out = rf"c:\projects\Resources\listes\most_famous_{len(out)}_b{by_max}.json"
with io.open(fpath_out, "w+", encoding="utf8") as f:
    f.write(json.dumps(out, ensure_ascii=False))

async function test_stats (gamemode, n_samples = 100) {
  setup_params(gamemode.n_fam, gamemode.calibration)
  await load_all()

  var people_names = new Map()
  Object.keys(PEOPLE).map(k => people_names.set(k, 0))
  var work_names = new Map()
  Object.keys(WORKS).map(artist =>
    WORKS[artist].map(details => work_names.set(details[1], 0))
  )

  setup_params(gamemode.n_fam, gamemode.calibration)
  for (let n = 0; n < n_samples; n++) {
    let [person_left, thing_right, type_of_right] = two_random_items()
    people_names.set(person_left[0], people_names.get(person_left[0]) + 1)
    if (type_of_right == 'work') {
      work_names.set(thing_right[1][1], work_names.get(thing_right[1][1]) + 1)
    } else if (type_of_right == 'person') {
      people_names.set(thing_right[0], people_names.get(thing_right[0]) + 1)
    }
  }

  console.log(people_names)
  console.log(work_names)

  let people_values = [...people_names.values()]
  let work_values = [...work_names.values()]
  let all_values = [people_values, work_values]

  for (let arr_ind in all_values) {
    SVG_W = 1000
    SVG_H = 500
    svg = create_svg('test-stats')

    svg.innerHTML += line(0, SVG_VB_W, 0, 0)
    svg.innerHTML += line(0, 0, 0, SVG_VB_H)
    let max_sampled = Math.max(...all_values[arr_ind])
    for (let nk = 0; nk < all_values[arr_ind].length; nk++) {
      let x_pos = (SVG_VB_W * nk) / all_values[arr_ind].length
      let y_height = (SVG_VB_H * all_values[arr_ind][nk]) / max_sampled
      svg.innerHTML += line(x_pos, x_pos, 0, y_height, (color = 'red'))
      svg.innerHTML += line(x_pos, x_pos, -5, 5, (width = 0.1))
      if (arr_ind == 0) {
        svg.innerHTML += text(
          SVG_VB_W / 2,
          SVG_VB_H / 2,
          'People',
          null,
          (_styles = 'fill:red;')
        )
      } else {
        svg.innerHTML += text(
          SVG_VB_W / 2,
          SVG_VB_H / 2,
          'Works',
          null,
          (_styles = 'fill:red;')
        )
      }
    }

    let content = document.getElementById('content')
    content.appendChild(svg)
  }
}

async function test_yesno_ratio (gamemode, n_samples) {
  setup_params(gamemode.n_fam, gamemode.calibration)
  await load_all()

  arr = { yes: 0, no: 0 }

  for (let n = 0; n < n_samples; n++) {
    document.getElementById('content').innerHTML = `yes: ${arr.yes} no: ${
      arr.no
    } ratio: ${(arr.yes / arr.no).toPrecision(4)}`

    person1 = rand_thing(null, PEOPLE, 'person')

    let [person_left, thing_right, type_of_right] = two_random_items()
    let [b1, d1] = [
      date_from_arr(person_left[1][1]),
      date_from_arr(person_left[1][2])
    ]
    QUESTION_TYPE = type_of_right

    if (type_of_right == 'person') {
      let [b2, d2] = [
        date_from_arr(thing_right[1][1]),
        date_from_arr(thing_right[1][2])
      ]
      SOLUTION = get_solution(spans_overlap(b1, d1, b2, d2))
    } else if (type_of_right == 'work') {
      let inception = date_from_arr(thing_right[1][2])
      SOLUTION = get_solution(is_older(inception, d1))
    }
    arr[SOLUTION] += 1
  }
}

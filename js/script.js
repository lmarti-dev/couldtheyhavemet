
var PEOPLE 
var YEAR_DICT
var WORKS
var DIFFICULTY
var SOLUTION
var QUESTION_TYPE

const CATEGORY = "all"
const N_FAM = 200
const URL = `./files/category/${CATEGORY}/json/${N_FAM}`

function get_solution(b){
// next level coding watch out 10x moves here
if (b==true){
  return "yes"
}else if(b==false){
  return "no"
}
}
async function load_files(url) {
  return await (await fetch(url, { method: "GET" })).json()
}


async function load_people(){
  return await load_files(`${URL}/people.json`)
}


async function load_works(){
  return await load_files(`${URL}/works.json`)
}

function rand_arr_item(arr){
  return arr[Math.round(Math.random()*(arr.length-1))]
}
// that's actually pretty nice
const cumsum = (sum => value => sum += value)(0);

function weighted_rand_arr_item(arr,weights){
  var cdf = weights.map(cumsum)
  var r = Math.random()
  for (let ind=0;ind<cdf.length;ind++){
    if (r>cdf[ind]){
      return arr[ind]
    }
  }
}

function date_distance_weights(ref_year,years){
  let weights= years.map((item)=>{return 1/(1+Math.abs(ref_year-item))})
  let tot =weights.reduce((a, b) => a + b, 0)
  weights = weights.map((item)=>item/tot)
  return weights
}

function get_people_years(){
  var years =  Object.keys(PEOPLE).map((k)=>{return Math.round((PEOPLE[k][2][0]+PEOPLE[k][1][0])/2)})
  var d = Object.fromEntries(years.map((item,index)=>[Object.keys(PEOPLE)[index],item]))
  return d
}

function rand_person(ref_year,persons){
  let arr=Object.keys(persons)
  if (ref_year == null){
    var p = rand_arr_item(arr)
  }else{
    var years = Object.keys(persons).map(item=>YEAR_DICT[item])
    var weights = date_distance_weights(ref_year,years)
    var p = weighted_rand_arr_item(persons,weights)}
  return [p,persons[p]]
}

function rand_work(ref_year,works){
  var arr = Object.keys(works)
  if (ref_year == null){
    var p=rand_arr_item(arr)
  }else{
    var years = Object.keys(works).map(item=>YEAR_DICT[item])
    var weights = date_distance_weights(ref_year,years)
    var p = weighted_rand_arr_item(persons,weights)
  }
  return [p,rand_arr_item(works[p])]
}


function is_older(time1,time2){
  return date_difference(time2,time1)>=0
}

function parse_iso_date(s){
  var b = String(s).match(/^(?<year>[-+]?[0-9]{4})-(?<month>[0-9]{2})-(?<day>[0-9]{2})/)
  return new Date(parseInt(b.groups.year),parseInt(b.groups.month)-1,parseInt(b.groups.day))
}

function spans_overlap(start1,end1,start2,end2){
  first_end = Math.min(end1,end2)
  last_start = Math.max(start1,start2)
  return last_start-first_end<0

}

function date_from_arr(arr){
  d = new Date(arr[0],arr[1],arr[2])
  // this is MDN's preferred method for creating a date with two-digits years.
  // I cannot overstate how much this language sucks
  // this is like batteries included except the batteries are leaking acid
  d.setFullYear(arr[0])
  return d
}


function date_difference(time1,time2){
  // "1791-00-00T00:00:00Z" 
  return time1-time2
} 

function bind_difficulty(button){
  button.addEventListener("click",(e)=>{
    let content = document.getElementById("content")
    DIFFICULTY = button.innerHTML
    init_game()
    game_loop()
    choice = document.getElementById("choice")
    content.removeChild(choice)
  })
}


function toggle_revealable(which){
  elems = document.getElementsByClassName("revealable")
  for (let ind=0;ind<elems.length;ind++){
    elems[ind].style.visibility=which
  }
}

function toggle_freezable(which){
  elems = document.getElementsByClassName("freezable")
  for (let ind=0;ind<elems.length;ind++){
    if (which == "disable"){
      elems[ind].setAttribute("disabled","")}
  else if (which=="enable"){
    elems[ind].removeAttribute("disabled")
  }}
}

function resolve(choice){
  let banner = document.getElementById("banner")
  
  banner_result(choice)
  toggle_freezable("disable")
  toggle_revealable("visible")


}

function answer(button){
  button.addEventListener("click",(e)=>{
    resolve(button.innerHTML)
  })
}

function move_on(button){
  button.addEventListener("click",(e)=>{
    game_loop()
  })
}

function init_game(){
  let left = document.createElement("div")
  left.setAttribute("id","left-item")
  let right = document.createElement("div")
  right.setAttribute("id","right-item")

  let info = document.createElement("div")
  info.setAttribute("class","info")

  info.appendChild(left)
  info.appendChild(right)


  let yes = document.createElement("button")
  yes.setAttribute("class","freezable")
  yes.innerHTML = "yes"
  answer(yes)

  let no = document.createElement("button")
  no.setAttribute("class","freezable")
  no.innerHTML = "no"
  answer(no)

  let next = document.createElement("button")
  next.innerHTML = "next"
  move_on(next)

  let action = document.createElement("div")
  action.setAttribute("id","action")

  action.appendChild(yes)
  action.appendChild(no)
  action.appendChild(next)

  let banner = document.createElement("div")
  banner.setAttribute("id","banner")

  let content = document.getElementById("content")
  content.appendChild(banner)
  content.appendChild(info)
  content.appendChild(action)


}

function choose_difficulty(){
  let content = document.getElementById("content")
  let choice = document.createElement("div")
  choice.setAttribute("id","choice")
  let button_easy = document.createElement("button")
  button_easy.innerHTML = "Easy"
  bind_difficulty(button_easy)
  let button_mix = document.createElement("button")
  bind_difficulty(button_mix)
  button_mix.innerHTML = "Mix"
  let button_hard = document.createElement("button")
  bind_difficulty(button_hard)
  button_hard.innerHTML = "Hard"
  choice.appendChild(button_easy)
  choice.appendChild(button_mix)
  choice.appendChild(button_hard)
  content.appendChild(choice)
}


function clear_board(){
  ids = ["left-item","right-item","banner"]
  for (let ind=0;ind<ids.length;ind++){
    let item = document.getElementById(ids[ind])
    item.innerHTML=""

  }
  toggle_freezable("enable")
  toggle_revealable("hidden")

}

function wikidata_link(key){
  return `<a target='_blank' href='https://www.wikidata.org/wiki/${key}'>${key}</a>`
}

function process_thing(thing,pos,which){
  div = document.getElementById(`${pos}-item`)
  let res;
  if (which=="person"){
    let person = document.createElement("div")
    person.innerHTML = thing[0]
    person.setAttribute("class","name")
    let person_details  =document.createElement("div")
    person_details.innerHTML = wikidata_link(thing[1][0])
    person_details.setAttribute("class","details")
    let person_date = document.createElement("div")
    person_date.setAttribute("class","revealable")
    let b = date_from_arr(thing[1][1])
    let d = date_from_arr(thing[1][2])
    person_date.innerHTML = `b. ${b.getFullYear()} d. ${d.getFullYear()}`
    div.append(person)
    div.append(person_details)
    div.append(person_date)
    res = [b,d]
  }else if (which=="work"){
    let work_name = document.createElement("div")
    work_name.innerHTML = thing[1][1]
    work_name.setAttribute("class","name")
    let work_details  =document.createElement("div")
    work_details.innerHTML = `by ${thing[0]} — ${thing[1][3]} — ${wikidata_link(thing[1][0])}`
    work_details.setAttribute("class","details")
    let work_date = document.createElement("div")
    work_date.setAttribute("class","revealable")
    let inception = date_from_arr(thing[1][2])
    work_date.innerHTML = inception.getFullYear()
    div.append(work_name)
    div.append(work_details)
    div.append(work_date)
    res = inception
  }
  return res
}

function process_person(person,pos){
  return process_thing(person,pos,"person")
}

function process_work(work,pos){
  return process_thing(work,pos,"work")
}


function banner_result(choice){
  
  let banner=document.getElementById("banner")
  let msg;
  if (SOLUTION == choice){
    msg = "Correct"
  }
  else{
    msg="False"
  }
  let neg = " "
  if (SOLUTION == "no"){
    neg = " not "
  }
  let done = "met"
  if (QUESTION_TYPE == "work"){
    done = "known that work"
  }
  banner.innerHTML = `${msg}. They could${neg}have ${done}!`
}

function banner_question(question){
  let banner=document.getElementById("banner")
  banner.innerHTML=question
}

function game_loop(){
  clear_board()
  person1 = rand_person(null,PEOPLE)
  let person_year = YEAR_DICT[person1[0]]
  let [b1,d1]=process_person(person1,pos="left")

  thing2 = rand_arr_item(["person","work"])
  QUESTION_TYPE = thing2
  
  let question;

  if (thing2 == "person"){

    question ="Could they have met?"
    
    let _people = {...PEOPLE}
    delete _people[[person1[0]]]
    let [b2,d2]=process_person(rand_person(person_year,_people),pos="right")
    SOLUTION = get_solution(spans_overlap(b1,d1,b2,d2))
  }
  else if (thing2=="work"){

    question = "Could they have known that work?"

    let rw;
    if (Object.keys(WORKS).includes(person1[0])){
      let _works = {...WORKS}
      delete _works[[person1[0]]]
      rw = rand_work(person_year,_works)
    }
    else{
      rw = rand_work(person_year,WORKS)
    }
    inception=process_work(rw,pos="right")
    SOLUTION = get_solution(is_older(inception,d1))
    
  }
  banner_question(question)
  

}

async function main() {
  PEOPLE = await load_people()
  YEAR_DICT = get_people_years()
  WORKS = await load_works()
  // choose_difficulty()
  init_game()
    game_loop()
};


document.addEventListener('DOMContentLoaded', (event) => {
  main()
});
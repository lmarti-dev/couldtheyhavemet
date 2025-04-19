
var PEOPLE 
var YEAR_DICT
var WORKS
var DIFFICULTY
var SOLUTION
var QUESTION_TYPE
var SCORE = 0

var DATES = {"left":null,"right":null}

const CATEGORY = "all"
const N_FAM = 2000
const URL = `./files/nature/category/${CATEGORY}/json/${N_FAM}`

const SVG_W = 200
const SVG_H = 100

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
const cumsum = (sum => value => sum += value);

function weighted_rand_arr_item(arr,weights){
  var cdf = weights.map(cumsum(0))
  var r = Math.random()
  for (let ind=0;ind<cdf.length;ind++){
    if (r<cdf[ind]){
      return arr[ind]

    }
  }
}

function date_distance_weights(ref_year,years){
  let weights= years.map((item)=>{return Math.exp(-Math.abs(ref_year-item)/100)})
  let tot =weights.reduce((a, b) => a + b, 0)
  weights = weights.map((item)=>item/tot)
  return weights
}

function get_people_years(){
  var years =  Object.keys(PEOPLE).map((k)=>{return Math.round((PEOPLE[k][2][0]+PEOPLE[k][1][0])/2)})
  var d = Object.fromEntries(years.map((item,index)=>[Object.keys(PEOPLE)[index],item]))
  return d
}

function rand_thing(ref_year,things,which){
  var arr=Object.keys(things)
  var p;
  if (ref_year == null){
    p = rand_arr_item(arr)
  }else{
    var years = Object.keys(things).map(item=>YEAR_DICT[item])
    var weights = date_distance_weights(ref_year,years)
    p = weighted_rand_arr_item(arr,weights)}
  if (which == "person"){
  return [p,things[p]]}
  else if (which=="work"){return [p,rand_arr_item(things[p])]}
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
  reveal_dates()
  draw_diagram(DATES)
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

  let score = document.createElement("div")
  score.setAttribute("id","score")

  let content = document.getElementById("content")

  let svg = create_svg()

  content.innerHTML=""
  content.appendChild(score)
  content.appendChild(banner)
  content.appendChild(info)
  content.appendChild(svg)
  content.appendChild(action)
  
  set_score()


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
  clear_dates()
  clear_svg()
  draw_diagram(null)

}

function wikidata_link(key){
  return `<a target='_blank' href='https://www.wikidata.org/wiki/${key}'>${key}</a>`
}


function populate_dates(pos,deets){
  DATES[[pos]] = deets
}



function create_svg(){
  let svg = document.createElementNS("http://www.w3.org/2000/svg","svg")
  svg.setAttribute("id","date-diagram")
  svg.setAttribute("viewBox",`0 0 ${SVG_W} ${SVG_H}`)
  svg.setAttribute("height","100")
  svg.setAttribute("width","300")
  svg.setAttribute("xmlns","http://www.w3.org/2000/svg")
  return svg
}

function line(x1,x2,y1,y2,width=1.22,color="black"){
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke:${color};stroke-width:${width}" />`
}


function text(x,y,text,_class=null){
  let classes = Boolean(_class) ? "svg-text " + _class : "svg-text"
  return `<text x="${x}" y="${y}" class="${classes}">${text}</text>`
}

function circle(x,y,r,width=1.22,color="black"){
  return `<circle cx="${x}" cy="${y}" r="${r}" stroke-width="${width}" stroke="${color}" fill="none" />`
}

function get_date_kind(date){
  let which = date.length != undefined ? "person" : "work";
  return which
}

function get_extremal_years(dates){
  let arr=[]
  let keys = Object.keys(dates)
  for (let ind=0;ind<keys.length;ind++){
    arr.push(...thing_to_years(dates[[keys[ind]]]))

  }
  // of course Math.min/max doesn't take an array as input
  // because the people who wrote it are not used to go past 10 fingers
  // who ever uses the number 34 it's way too high
  return [Math.min(...arr), Math.max(...arr)]
}

function thing_to_years(thing){
  let arr = []
    let which = get_date_kind(thing)
    if (which=="person"){
      arr.push(...thing.map(x=>x.getFullYear()))
    }
    else if (which=="work"){
      arr.push(thing.getFullYear())
    }
    return arr
  
}


function draw_diagram(dates){

  let n_ticks = 20;
  let stack_height = 13;
  let tick_height = 3;
  let colors = ["red","blue"]


  let svg = document.getElementById("date-diagram")
  svg.innerHTML =""

  svg.innerHTML+= line(0,SVG_W,SVG_H,SVG_H,1.33) 

  for(x in [...Array(n_ticks).keys()]){
    var linterp = (x/(n_ticks-1)) * SVG_W
    svg.innerHTML+=line(linterp,linterp,SVG_H,SVG_H-tick_height,1) 
    svg.innerHTML+=line(linterp,linterp,SVG_H,0,.1,"silver") 
  }

  if (dates != null){
    let years = get_extremal_years(dates)
    // svg.innerHTML += text(0,SVG_H-stack_height,years[0])
    // svg.innerHTML += text(SVG_W,SVG_H-stack_height,years[1])

    let year_coor = (x) => SVG_W*(x-years[0]) / (years[1]-years[0])
    let nudge = SVG_W*.02

    let keys = Object.keys(dates)
    for (let ind=0;ind<keys.length;ind++){
      let span = thing_to_years(dates[[keys[ind]]])
      if (span.length==1){
        let tick_start = SVG_H-(2*(ind+1)*stack_height)
        svg.innerHTML+= circle(year_coor(span[0]),tick_start,stack_height/2,1.22,colors[ind]) 
        svg.innerHTML+= line(year_coor(span[0]),year_coor(span[0]),tick_start,tick_start-stack_height/2,1.22,colors[ind]) 
        svg.innerHTML += text(year_coor(span[0]),tick_start-stack_height,span[0],"small")
      } else if  (span.length==2){
        let bar_height =SVG_H-(2*(ind+1)*stack_height)
        svg.innerHTML += line(year_coor(span[0]),year_coor(span[1]),bar_height,bar_height,12,colors[ind]) 
        svg.innerHTML += text(year_coor(span[0])-nudge,bar_height-stack_height,span[0],"small")
        svg.innerHTML += text(year_coor(span[1])+nudge,bar_height-stack_height,span[1],"small")

      }
    } 

  }else{
    svg.innerHTML += text(0,SVG_H-stack_height,"0")
    svg.innerHTML += text(SVG_W,SVG_H-stack_height,"2025")
    
  }
}

function clear_svg(){
  let svg = document.getElementById("date-diagram")
  svg.innerHTML=""
}

function reveal_dates(){
    
    // date_div.setAttribute("class","revealable")
  let keys = Object.keys(DATES)
  for (let ind=0;ind<keys.length;ind++){
    let date_div = document.createElement("div")
    let which = get_date_kind(DATES[[keys[ind]]])
    let pos = keys[ind]
    let div = document.getElementById(`${pos}-item`)
    if (which=="person"){
      let b = DATES[[pos]][0]
      let d = DATES[[pos]][1]
      date_div.innerHTML = `b. ${b.getFullYear()} d. ${d.getFullYear()}`
    } else if(which=="work"){
      let inception = DATES[[pos]]
      date_div.innerHTML = inception.getFullYear()
    }
    date_div.setAttribute("id",`${pos}-date`)
    date_div.setAttribute("class",`date`)
    div.insertBefore(date_div, div.childNodes[1]);
}

}

function clear_dates(){
  for (pos in {"left":0,"right":1}){ 
  let div = document.getElementById(`${pos}-date`)
  if (div != null){
  div.remove()}
  }
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
    // div.append(person_date)
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
    // div.append(work_date)
    res = inception
  }
  populate_dates(pos,res)
  return res
}

function process_person(person,pos){
  return process_thing(person,pos,"person")
}

function process_work(work,pos){
  return process_thing(work,pos,"work")
}


function left_pad(item,pad_len,pad_with){
  let int_len = String(item).split("").length 
  return Array(pad_len-int_len).fill(pad_with).join("") + item
}


function set_score(){
  let score=document.getElementById("score")
  score.innerHTML = `Score: ${left_pad(SCORE,4,"0")}`
}

function banner_result(choice){
  
  let banner=document.getElementById("banner")
  let msg;
  if (SOLUTION == choice){
    msg = "Correct"
    SCORE++
  }
  else{
    msg="False"
    SCORE = 0
  }
  let neg = " "
  if (SOLUTION == "no"){
    neg = " not "
  }
  let done = "met"
  if (QUESTION_TYPE == "work"){
    done = "known this"
  }
  banner.innerHTML = `${msg}. They could${neg}have ${done}!`
  set_score()
}

function banner_question(question){
  let banner=document.getElementById("banner")
  banner.innerHTML=question
}

function game_loop(){
  clear_board()
  person1 = rand_thing(null,PEOPLE,"person")
  let person_year = YEAR_DICT[person1[0]]
  let [b1,d1]=process_person(person1,pos="left")

  thing2 = rand_arr_item(["person","work"])
  QUESTION_TYPE = thing2
  
  let question;

  if (thing2 == "person"){

    question ="Could they have met?"
    
    let _people = {...PEOPLE}
    delete _people[[person1[0]]]
    let [b2,d2]=process_person(rand_thing(person_year,_people,"person"),pos="right")
    SOLUTION = get_solution(spans_overlap(b1,d1,b2,d2))
  }
  else if (thing2=="work"){

    question = "Could they have known this?"

    let rw;
    if (Object.keys(WORKS).includes(person1[0])){
      let _works = {...WORKS}
      delete _works[[person1[0]]]
      rw = rand_thing(person_year,_works,"work")
    }
    else{
      rw = rand_thing(person_year,WORKS,"work")
    }
    inception=process_work(rw,pos="right")
    SOLUTION = get_solution(is_older(inception,d1))
    
  }
  banner_question(question)
}



async function load_all(){
  let content = document.getElementById("content")
  content.innerHTML = "Loading 1/3";
  PEOPLE = await load_people()
  content.innerHTML = "Loading 2/3";
  YEAR_DICT = get_people_years()
  content.innerHTML = "Loading 3/3";
  WORKS = await load_works()
}

async function main() {
  await load_all()
  // choose_difficulty()
  init_game()
  game_loop()
};


document.addEventListener('DOMContentLoaded', (event) => {
  main()
});
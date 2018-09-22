// Auto-scheduler calendar has to be created automatically 
// These should happen in the GUI: selecting the calendar, select the delay_between tasks, days to plan ahead,  minimum_acceptable_time (slot)


var preserved_calendars = ['']; // main calendars the events of which must be preserved, example ['firstlastname.gmail.com','lastname@university.edu']
var target_calendar = '' // The target calendar ID you've created manually to write the events on. You can get the ID from the "setting and shring" page of your calendar
var minimum_acceptable_time = (30*60*1000) ; 
var days_to_plan_ahead = 3;
var delay_between_tasks = (30 * 60 * 1000);
var delay_between_created_tasks = (5 * 60 * 1000)



var time_zone = CalendarApp.getDefaultCalendar().getTimeZone();
tmp_date = new Date();
var start_day_to_plan = new Date(tmp_date); // the day of the week the planning starts (which is today)
var last_day_of_plan = new Date(tmp_date.getTime() +  (  days_to_plan_ahead * 24 * 60 * 60 * 1000) )
var all_days = [];


function priority_calculator(inp_task)
{
  if (!isNaN(inp_task['days_remaining']))
  { // this will be used for one-time tasks
    var hours = parseInt(inp_task['estimated_time']) / (60*60*1000)
    var hours_per_day = hours/parseInt(inp_task['days_remaining'])
    var calc_priority = hours_per_day / parseInt(inp_task['priority'])
    calc_priority = calc_priority.toFixed(6)
    return calc_priority
  }
  else
  { // this will be used for recurrent tasks
    var hours = parseInt(inp_task['estimated_time']) / (60*60*1000)
    if (hours < 1) 
      hours = 1 
      var reversed_hours = 1/ hours
      var calc_priority = reversed_hours / parseInt(inp_task['priority'])
      calc_priority = calc_priority.toFixed(6)
      return calc_priority
  }
}

Date.prototype.getWeek = function() {
  var onejan = new Date(this.getFullYear(),0,1);
  return Math.ceil((((this - onejan) / 86400000) + onejan.getDay()+1)/7);
} 

function event_creator()
{
  Logger.log("Creating events...")
  var all_tasks = get_all_tasks();
  var sorted_indices = task_sorter(all_tasks,'one-time');
  var available_slots = available_time_finder(); 
  var days_array = recurrent_event_finder(all_tasks);
  
  // deleting all current events
  var fromDate = new Date(new Date() - (20 * 24 * 60 * 60 * 1000));
  var toDate = new Date(fromDate.getTime() + (35 * 24 * 60 * 60 * 1000));
  var calendar = CalendarApp.getCalendarById(target_calendar);
  var events = calendar.getEvents(fromDate, toDate);
  
  var events_done_counter = 1
  var previously_done_events = []
  var previously_done_events_today = []
  for(var i=0; i<events.length;i++){
    var current_event = events[i];
    var current_task_end_time = current_event.getEndTime()
    var today_now =  new Date(new Date)
    var today_beginning = new Date(new Date(new Date).setHours(0,0,0,0))
    if (current_task_end_time < today_now)// && current_event.getDescription() == 'one-time')
    {
      var current_title = current_event.getTitle();
      if (current_task_end_time > today_beginning)
        previously_done_events_today.push(current_title);
      else if (current_event.getDescription() == 'one-time')
        previously_done_events.push(current_title);
    }
    else
    {
      try
      { current_event.deleteEvent();}
      catch (e) { }
    }
  }
  
  var all_available_slots_array = []
  for (var jj =0; jj < available_slots.length ; jj++)
  {
    all_available_slots_array = all_available_slots_array.concat(available_slots[jj]["available_times"])
  }
  
  for (var j=0; j < days_array.length ; j++)
  {
    days_array[j]['tasks_already_set'] = [] 
    var recurrent_tasks_for_the_day = days_array[j]['tasks']
    var one_time_tasks_sorted_indices = sorted_indices.slice()
    var all_tasks_reviewed = 0
    while (all_tasks_reviewed == 0)
    {
      var recurrent_task_set_flag = 0
      var one_time_task_set_flag = 0
      var last_picked_index = -1
      if (one_time_tasks_sorted_indices.length > 0 && days_array[j]['sorted_order'].length > 0) 
      {
        if (all_tasks[one_time_tasks_sorted_indices[0]]['calculated_priority'] > recurrent_tasks_for_the_day[days_array[j]['sorted_order'][0]]['calculated_priority'])
        {
          var tmp_task_to_create_event_for = all_tasks[one_time_tasks_sorted_indices[0]];
          last_picked_index = one_time_tasks_sorted_indices[0]
          one_time_tasks_sorted_indices.splice(0,1);
          one_time_task_set_flag = 1
        }
        else
        {
          var tmp_task_to_create_event_for = recurrent_tasks_for_the_day[days_array[j]['sorted_order'][0]];
          days_array[j]['sorted_order'].splice(0,1);
          recurrent_task_set_flag = 1 
        }       
      }
      
      
      else if (one_time_tasks_sorted_indices.length > 0)
      {
        var tmp_task_to_create_event_for = all_tasks[sorted_indices[0]];
        last_picked_index = one_time_tasks_sorted_indices[0]
        one_time_tasks_sorted_indices.splice(0,1);
        one_time_task_set_flag = 1 
      }
      
      
      else if (days_array[j]['sorted_order'].length > 0)
      {
        var tmp_task_to_create_event_for = recurrent_tasks_for_the_day[days_array[j]['sorted_order'][0]];
        days_array[j]['sorted_order'].splice(0,1);
        recurrent_task_set_flag = 1 
      }
      
      else 
      {
        all_tasks_reviewed = 1;
      }
      
      if (all_tasks_reviewed == 0 && days_array[j]['tasks_already_set'].indexOf(tmp_task_to_create_event_for['task_name']) == -1 )
      {
        for (var q=0; q < available_slots[j]['available_times'].length ; q ++ )  
        {
          var slot_capacity = available_slots[j]['available_times'][q][1]-available_slots[j]['available_times'][q][0];
          if (slot_capacity > new Date(tmp_task_to_create_event_for['estimated_time']))
          {
            var new_start = new Date(available_slots[j]['available_times'][q][0].getTime() +  tmp_task_to_create_event_for['estimated_time']);
            if (previously_done_events_today.indexOf(tmp_task_to_create_event_for['task_name']) == -1)
            {
              if (previously_done_events.indexOf(tmp_task_to_create_event_for['task_name']) == -1)
              {
                if (tmp_task_to_create_event_for['recurrent_on'] != "")
                  var desc = 'recurrent'
                  else 
                    var desc = 'one-time'
                    CalendarApp.getCalendarById(target_calendar).createEvent(tmp_task_to_create_event_for['task_name'], available_slots[j]['available_times'][q][0],new_start,{description:desc,sendNotifications: true});
                var remaining_time_from_slot = available_slots[j]['available_times'][q][1].getTime() -  new_start.getTime() - delay_between_created_tasks
                if (remaining_time_from_slot  > minimum_acceptable_time )
                {
                  var new_available_start_time = new Date(new_start.getTime()  + delay_between_created_tasks)
                  available_slots[j]['available_times'][q][0] = new_available_start_time
                }
                else {
                  available_slots[j]['available_times'].splice(q,1);
                }
                days_array[j]['tasks_already_set'].push(tmp_task_to_create_event_for['task_name'])
              }
              else{
                var idx_ = previously_done_events.indexOf(tmp_task_to_create_event_for['task_name'])
                previously_done_events.splice(idx_,1)
              }
              
            }
            else // if the task is already done before (during today), it's not added once, then let's remove it for possible future instances of the same task
            {
              
              var idx_ = previously_done_events_today.indexOf(tmp_task_to_create_event_for['task_name'])
              previously_done_events_today.splice(idx_,1)
              days_array[j]['tasks_already_set'].push(tmp_task_to_create_event_for['task_name'])
            }
            if (one_time_task_set_flag == 1 )
            {
              sorted_indices.splice(sorted_indices.indexOf(last_picked_index),1)
            }
            
            
            break;
          }
        }
      }
    } // end of checking for available spot in a day 
  } // end of going through the days
}


var DateDiff = {    
  inDays: function(d1, d2) {
    var t2 = d2.getTime();
    var t1 = d1.getTime();
    
    return parseInt((t2-t1)/(24*3600*1000));
  },
  inWeeks: function(d1, d2) {
    var t2 = d2.getTime();
    var t1 = d1.getTime();
    
    return parseInt((t2-t1)/(24*3600*1000*7));
  },
  inMonths: function(d1, d2) {
    var d1Y = d1.getFullYear();
    var d2Y = d2.getFullYear();
    var d1M = d1.getMonth();
    var d2M = d2.getMonth();
    
    return (d2M+12*d2Y)-(d1M+12*d1Y);
  },
  inYears: function(d1, d2) {
    return d2.getFullYear()-d1.getFullYear();
  }
}



function get_all_tasks(){
  var all_tasks = []
  var taskLists = Tasks.Tasklists.list();
  for (var i = 0; i < taskLists.items.length; i++){
    var taskList = taskLists.items[i];
    var tasks = Tasks.Tasks.list(taskList.id);
    if (tasks.items != undefined)
    {
      for (var j=0; j< tasks.items.length ; j++){
        if (tasks.items[j].status != 'completed' && tasks.items[j].notes!= undefined && (tasks.items[j].notes.indexOf("pr") > -1) && 
          (tasks.items[j].notes.indexOf("est") > -1) && tasks.items[j].title.indexOf('#') != 0 ) // # is for commented tasks 
        {
          var son =  '{"' + tasks.items[j].notes  + '"}';
          son = son.replace(/:/g,'":"').replace(/,/g,'","').replace(/\s/g,'');
          try {
            var json_data = JSON.parse(son); 
          }
          catch (e) {
          }
          var tmp_dict = {}
          tmp_dict['task_name'] = tasks.items[j].title
          tmp_dict['due'] = tasks.items[j].due
          tmp_dict['extended_every'] = json_data.ext
          if (tmp_dict['extended_every'] != undefined)
          {
            // This if statement is for extendable tasks. If the deadline of a task is already passed but it's extendable, the deadline will be set to the next extended day. 
            if (tmp_dict['extended_every'].indexOf('d') > -1 ) 
            {             
              var days_to_extend = parseInt(tmp_dict['extended_every'].substr(0,recurrency.indexOf('d')))
              } 
            else if (tmp_dict['extended_every'].indexOf('w') > -1 ) 
            {
              var days_to_extend = parseInt(tmp_dict['extended_every'].substr(0,recurrency.indexOf('w')))*7
            }
            var tmp_date = new Date()
            var tmp_due_date = Utilities.formatDate(new Date(new Date(tasks.items[j].due).getTime()), "EDT", "yyyy-MM-dd'T'HH:mm:ss'Z'")
            while (new Date(tmp_due_date) <= new Date(tmp_date))
            {              
              tmp_due_date = Utilities.formatDate(new Date(new Date(tmp_due_date).getTime() +  (days_to_extend* 24 * 60 * 60 * 1000)), "EDT", "yyyy-MM-dd'T'HH:mm:ss'Z'")
            }
            var patchTask = {
              due: tmp_due_date
            };
            var updatedTask = Tasks.Tasks.patch(patchTask, taskList.id, tasks.items[j].id);
          }
            
          tmp_dict['days_remaining'] = DateDiff.inDays(new Date(),new Date(tmp_dict['due']))
          tmp_dict['priority'] = json_data.pr
          tmp_dict['divide_into'] = json_data.div
          tmp_dict['estimated_time'] = estimate_to_ms(json_data.est)
          if (json_data.rec != undefined)
          {
            var recurrency = json_data.rec
            tmp_dict['recurrent_on'] = recurrency.substr(0,recurrency.indexOf('-')).toLowerCase();
            tmp_dict['recurrent_every'] = recurrency.substr(recurrency.indexOf('-')+1).toLowerCase();
            if (tmp_dict['recurrent_every'].indexOf('start') > -1) {
              tmp_dict['start_date'] = new Date(recurrency.substr(recurrency.indexOf('start')+5))
            }
          }
          else{
            tmp_dict['recurrent_on'] = ''
            tmp_dict['recurrent_every'] = ''
          }
          tmp_dict['calculated_priority'] = priority_calculator(tmp_dict)
          // breaking the big task
          if (tmp_dict['divide_into'] != undefined && tmp_dict['divide_into'] != 1)
          {
            var hours_to_dedicate = tmp_dict['estimated_time']
            var chunk_time = tmp_dict['estimated_time']/ tmp_dict['divide_into']
            while (hours_to_dedicate > 0) 
            {
              if  ((hours_to_dedicate  - 2 * chunk_time) >= 0)
              {
                var tmp_broken_dict = tmp_dict
                tmp_broken_dict['estimated_time'] = chunk_time
                all_tasks.push(tmp_broken_dict)
                hours_to_dedicate -= chunk_time
              }
              else
              {
                var tmp_broken_dict = tmp_dict
                tmp_broken_dict['estimated_time'] = hours_to_dedicate
                all_tasks.push(tmp_broken_dict)
                hours_to_dedicate = 0
              }
            }
          }
          else
          {
            all_tasks.push(tmp_dict);
          }
        }
      }
    }
  }
return all_tasks; 

}


function recurrent_event_finder(all_tasks){
  
  var tmp_date = new Date();  
  var days_array = [];
  
  for (var i= 0 ; i< days_to_plan_ahead ; i++) 
  {
    var tmp_dict = {}
    tmp_dict['date'] = new Date(tmp_date.getTime() + ( i * 24 * 60 * 60 * 1000) );
    tmp_dict['tasks'] = []
    days_array.push(tmp_dict)
  }
  
  for (var i= 0 ; i< all_tasks.length ; i++) 
  {
    if (all_tasks[i]['recurrent_every'].indexOf('d') > -1 ) 
    {
      // check "every X day" recurrency. For "every X days" recurrency, google calendar considers the day of the week irrelevant. This can't be the case here because this auto-scheduler updates the whole calendar every time. 
      // It might cause that the event repeats every day after each update (since there is no update for it).
      // Therefore: we calculate the sequence of days of the week for this event and then find the first day that match our "days_to_plan_ahead" 
      
      var tmp_rec_on = all_tasks[i]['recurrent_on']
      var tmp_rec_every =all_tasks[i]['recurrent_every'] 
      all_tasks[i]['task_days'] = recurrence_day_seq_finder(all_tasks[i]['start_date'],tmp_rec_on,tmp_rec_every.substr(0,tmp_rec_every.indexOf('d')),last_day_of_plan,start_day_to_plan)
      
    } 
    else if (all_tasks[i]['recurrent_every'].indexOf('w') > -1 ) 
    {
      var tmp_rec_on = all_tasks[i]['recurrent_on'].split('&').map(day_to_number).sort()
      var tmp_rec_every = parseInt(all_tasks[i]['recurrent_every'].substr(0,all_tasks[i]['recurrent_every'].indexOf('w')))
      all_tasks[i]['task_days'] = recurrence_week_seq_finder(all_tasks[i]['start_date'],tmp_rec_on,tmp_rec_every,last_day_of_plan,start_day_to_plan)
      
    }
    
  }
  
  // now we have the target days for each task, we will iterate through all planning days and assign each of them to them
  
  for (var j= 0 ; j< all_tasks.length ; j++) // check each of the tasks
  {
    if (all_tasks[j]['task_days'] != undefined) // check if the task is recurrent 
    {
      for (var i= 0 ; i< days_array.length ; i++)  //go through each day
      {
        for (var k = 0 ; k < all_tasks[j]['task_days'].length ; k++) // each each day of that task 
        {
          if (sameDay(days_array[i]['date'], all_tasks[j]['task_days'][k]))
          {
            days_array[i]['tasks'].push(all_tasks[j])
          }
        }
      }
    }
  }
  for (var i= 0 ; i< days_array.length ; i++)
  {
    if (days_array[i]['tasks'].length > 0 )
      days_array[i]['sorted_order'] = task_sorter(days_array[i]['tasks'],'recurrent')
      else 
        days_array[i]['sorted_order'] = [] 
  }
  return days_array; 
}


function sameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
}

function recurrence_week_seq_finder(start_date,on_days,repeat_every_X_week,last_day_of_plan)
{
  var day_differences = [] // this array has the difference between the days of the repeat. If the event is going to be repeated on every day of the week then it will be [1 1 1 1 1 1 1] 
  day_differences[0] = on_days[0] + 7 - on_days[on_days.length -1 ]
  for (var i = 1 ; i < on_days.length ; i++)
  {
    day_differences[i] = on_days[i] - on_days[i-1]
  }
  
  
  var target_days_seq = []
  var counter = 0
  var first_day_found = 0
  var index_of_current_day = -1 
  while (first_day_found != 1) // finding the first day 
  { 
    var tmp_start_day = new Date(start_date.getTime()+( counter * 24 * 60 * 60 * 1000)) ; 
    for (var j = 0; j < on_days.length ; j++ )
    {
      if (tmp_start_day.getDay() == on_days[j])
      {
        target_days_seq.push(tmp_start_day)
        first_day_found = 1 ;
        index_ofcurrent_day = j ;
        break;
      }
    }
    counter += 1 
  }
  
  for (var i = 1; i < on_days.length-j; i++)
  { // complete the day sequence till we get to the first day of the repetition again
    var last_found_day = target_days_seq[target_days_seq.length -1]
    if  (new Date(last_found_day.getTime() + (day_differences[j+i] * 24 * 60 * 60 * 1000) ) < last_day_of_plan) // the big part in parenthesis is the difference between the next day and the last found date 
    {
      target_days_seq.push(new Date(last_found_day.getTime() + (day_differences[j+i] * 24 * 60 * 60 * 1000)))
    }
  }
  
  var week_coefficient = 0
  var last_date_found = 0 
  while (last_date_found != 1 )
  { // we go through each day of the week one by one and then in the next iteration we add 7 days to the first day again
    week_coefficient += repeat_every_X_week;
    var last_found_applying_week_coefficient = target_days_seq[target_days_seq.length -1]
    last_found_applying_week_coefficient = new Date(last_found_applying_week_coefficient.getTime() + (week_coefficient* 7 * 24* 60 * 60 * 1000 ) );  
    for (var j = 0; j < on_days.length ; j++ )
    {
      if (new Date(last_found_applying_week_coefficient.getTime() + (day_differences[j] * 24 * 60 * 60 * 1000) ) < last_day_of_plan) 
      {target_days_seq.push(new Date(last_found_applying_week_coefficient.getTime() + (day_differences[j] * 24 * 60 * 60 * 1000) ));  
       last_found_applying_week_coefficient = target_days_seq[target_days_seq.length -1]}
      else {
        last_date_found = 1 
      }
    }
  }
  return target_days_seq;
}

function recurrence_day_seq_finder(start_date, start_day,repeat_every,last_day_of_plan,start_day_to_plan)
{
  var target_days_seq = []
  var counter = 0
  if (start_date != undefined)
    var start_date_ = new Date( start_date.getTime())
    else 
      var start_date_ = start_day_to_plan
      while (1)
      { 
        var tmp_start_day =new Date(start_date_.getTime() - ( counter * 24 * 60 * 60 * 1000)) ; 
        if (tmp_start_day.getDay() == day_to_number(start_day))
        break;
        counter += 1 
      }
  
  while (target_days_seq.length == 0)
  {
    if (tmp_start_day.getDay() >= start_day_to_plan.getDay())
    target_days_seq.push(tmp_start_day);
    else
      tmp_start_day = new Date(tmp_start_day.getTime() + ( parseInt(repeat_every) * 24 * 60 * 60 * 1000))
  }
  
  while (target_days_seq[target_days_seq.length-1] < last_day_of_plan)
  { 
    target_days_seq.push(new Date(target_days_seq[target_days_seq.length -1].getTime() + ( parseInt(repeat_every) * 24 * 60 * 60 * 1000) ));
  }
  return target_days_seq;
}




function day_to_number(inp_day)
{
  if (inp_day.toLowerCase().indexOf('sun') > -1) {return 0;}
  if (inp_day.toLowerCase().indexOf('mon') > -1) {return 1;}
  if (inp_day.toLowerCase().indexOf('tue') > -1) {return 2;}
  if (inp_day.toLowerCase().indexOf('wed') > -1) {return 3;}
  if (inp_day.toLowerCase().indexOf('thu') > -1) {return 4;}
  if (inp_day.toLowerCase().indexOf('fri') > -1) {return 5;}
  if (inp_day.toLowerCase().indexOf('sat') > -1) {return 6;}
}


function estimate_to_ms(inp_estimate) {
  if (inp_estimate.indexOf("h")> -1){
    inp_estimate = parseInt(inp_estimate.replace("h",""));
    return inp_estimate * 60 * 60 * 1000 ; 
  }
  else if (inp_estimate.indexOf("m")> -1){
    inp_estimate = parseInt(inp_estimate.replace("m",""));
    return inp_estimate * 60 * 1000
  }
  else{
    throw ("error: input must be a number"); 
  }
  
}


function sortNumber(a,b) {
  return b-a;
}


function task_sorter(all_tasks,mode){ // mode can be 'recurrent' and 'one-time', when sorting 'one-time' tasks, the recurrent tasks are removed from the result
  var ranks = []
  var indices = []
  for (var i=0; i < all_tasks.length; i++) {         // Here is the rule for prioritizing tasks
    ranks.push(all_tasks[i]['calculated_priority'])
    indices.push(i);
  }  
  var score = {};
  for( var i=0,n=all_tasks.length; i<n; i++){
    if (ranks[i] in score)
    {
      score[ranks[i]] = score[ranks[i]].concat([indices[i]]);
    }
    else
    {
      score[ranks[i]] = [indices[i]]
    }
  }
  var sorted_indices = []
  for( var key in keys=Object.keys(score).sort(sortNumber) ){
    var prop = keys[key];
    if (mode == 'one-time')
    {
      var target_idx = score[prop]
      for (var ii = 0 ; ii < target_idx.length ; ii++)
      {
        if (!isNaN(all_tasks[target_idx[ii]]['days_remaining'])) // This is to only consider the non-recurrent tasks
          sorted_indices.push(target_idx[ii])
          }
    }
    else if (mode == 'recurrent')
    {
      var target_idx = score[prop]
      for (var ii = 0 ; ii < target_idx.length ; ii++)
      {
        sorted_indices.push(target_idx[ii])
      }
    }
  }
  return sorted_indices;
  
}




function available_time_finder() {
  
  var all_days = [];
  
  for (var i=0;i<days_to_plan_ahead;i++){
    
    var tmp_date = new Date()
    tmp_date.setDate(tmp_date.getDate()+i);
    
    all_days[i] = {};
    all_days[i]["day"] =  Utilities.formatDate(new Date(tmp_date), time_zone, "dd/MM/yyyy");
    
    
    for (var current_cal=0; current_cal < preserved_calendars.length; current_cal++){
      all_days[i][preserved_calendars[current_cal]] = CalendarApp.getCalendarById(preserved_calendars[current_cal]).getEventsForDay(tmp_date);
    }
    all_days[i]["events"] = []
    
    earliest_event = 0;
    while (earliest_event != undefined){
      
      
      var earliest_event = undefined; 
      var calendar_to_pop = 0
      for (var current_cal=0; current_cal < preserved_calendars.length; current_cal++){
        if (all_days[i][preserved_calendars[current_cal]].length > 0){
          earliest_event = all_days[i][preserved_calendars[current_cal]][0];
          calendar_to_pop = current_cal;
        }
      }  
      
      if (earliest_event != undefined){
        for (var current_cal=0; current_cal < preserved_calendars.length; current_cal++){
          if (all_days[i][preserved_calendars[current_cal]].length > 0){
            if (all_days[i][preserved_calendars[current_cal]][0].getStartTime() < earliest_event.getStartTime()){
              earliest_event =  all_days[i][preserved_calendars[current_cal]][0] ; 
              calendar_to_pop = current_cal ; 
            }
          }
        }
        all_days[i][preserved_calendars[calendar_to_pop]].splice(0,1);
      }
      if (earliest_event != undefined){
        all_days[i]["events"].push(earliest_event)
      }
      
    }
    
    all_days[i]["available_times"] = []
    
    // Start working time
    var working_start_time = new Date(tmp_date);
    
    if (i == 0)// if the day is today, start it from current time
    {
      var working_start_time_today;
      tmp_working_time = new Date(tmp_date)
      tmp_working_time.setHours(09,00,00)
      if (new Date(new Date().getTime() +  5*60*1000) > tmp_working_time)
        working_start_time_today = new Date(new Date().getTime() +  5*60*1000) // 5 minutes delay between now and today's first task 
      else 
        working_start_time_today = tmp_working_time
      }
    else
    {
      working_start_time.setHours(09,00,00);
    }
    
    // End working time
    var working_end_time = new Date(tmp_date);
    working_end_time.setHours(23,00,00);
    
    if (i==0 && new Date(tmp_date) > working_end_time) { // if today is already past 21:00, skip today
      continue ;
    }
    
    if (i==0)
    {
      var first_event_after_now = -1
      var start_time_is_late = 0
      if (all_days[i]["events"].length > 0 ) 
      { // Check if there is any event in the day
        for (var j =0;j < all_days[i]["events"].length;j++) // find first event after now
        {
          if (new Date(all_days[i]["events"][j].getStartTime().getTime()) < working_start_time_today && new Date(all_days[i]["events"][j].getEndTime().getTime()) > working_start_time_today) // check if we are currently in a task
          {
            working_start_time_today = new Date(all_days[i]["events"][j].getEndTime().getTime() + delay_between_tasks) 
            if (working_start_time_today > working_end_time ) { // if today is already past 21:00, skip today
              start_time_is_late = 1
            }
          }
          if (new Date(all_days[i]["events"][j].getStartTime().getTime()) > working_start_time_today)
          {
            first_event_after_now = j ;
            all_days[i]["available_times"].push([working_start_time_today,new Date(all_days[i]["events"][j].getStartTime().getTime() - delay_between_tasks)]);
            break; 
          }
        }
        if (start_time_is_late == 1 )
          continue ; 
      }
      else
      { // No event in the day -> whole day available
        all_days[i]["available_times"].push([working_start_time_today,working_end_time]);
      }
      
      if (all_days[i]["events"].length > 1 && first_event_after_now != -1) 
      {
        for (var j =first_event_after_now;j < all_days[i]["events"].length-1;j++)
        { // iterate through all events during the day except the first and the last one
          if (new Date(all_days[i]["events"][j+1].getStartTime().getTime() - delay_between_tasks) - new Date(all_days[i]["events"][j].getEndTime().getTime() + delay_between_tasks) >= minimum_acceptable_time) 
          { 
            all_days[i]["available_times"].push([new Date(all_days[i]["events"][j].getEndTime().getTime() + delay_between_tasks),new Date(all_days[i]["events"][j+1].getStartTime().getTime() - delay_between_tasks)]);
          }
        }
      }
      
      if (all_days[i]["events"].length > 0) 
      { // last event of the day 
        if (new Date(all_days[i]["events"][all_days[i]["events"].length -1 ].getEndTime().getTime() + delay_between_tasks) > working_start_time_today)
        {
          if (working_end_time - new Date(all_days[i]["events"][all_days[i]["events"].length -1 ].getEndTime().getTime() + delay_between_tasks) >= minimum_acceptable_time)
          {
            all_days[i]["available_times"].push([new Date(all_days[i]["events"][all_days[i]["events"].length -1 ].getEndTime().getTime() + delay_between_tasks), working_end_time])
          }
        }
        else 
        {
          all_days[i]["available_times"].push([working_start_time_today,working_end_time]);
        }
      }
    }
    
    
    
    else{
      if (all_days[i]["events"].length > 0 ) { // Check if there is any event in the day
        
        if (all_days[i]["events"][0].getStartTime() < working_start_time ) { //First event starts before working hours, the second condition is to check if the event ends after NOW
          
          if (all_days[i]["events"].length > 1 ){ //if there is a second event after that ( in case there is just one event, the proper time would be added in the last if statement afterwards)
            if (new Date(all_days[i]["events"][1].getStartTime().getTime() - delay_between_tasks) - new Date(all_days[i]["events"][0].getEndTime().getTime() + delay_between_tasks) >= minimum_acceptable_time) {
              
              all_days[i]["available_times"].push([new Date(all_days[i]["events"][0].getEndTime().getTime() + delay_between_tasks),new Date(all_days[i]["events"][1].getStartTime().getTime() - delay_between_tasks)]);
              
            }
          } 
        }
        else{ // First event starts after working 
          if (new Date(all_days[i]["events"][0].getStartTime() - delay_between_tasks) - working_start_time >= minimum_acceptable_time){
            
            all_days[i]["available_times"].push([working_start_time,new Date(all_days[i]["events"][0].getStartTime().getTime() - delay_between_tasks)]);
          }
        }
      }
      else{ // No event in the day -> whole day available
        all_days[i]["available_times"].push([working_start_time,working_end_time]);
      }
      
      
      for (var j =0;j < all_days[i]["events"].length-1;j++){ // iterate through all events during the day except the first and the last one
        if (new Date(all_days[i]["events"][j+1].getStartTime().getTime() - delay_between_tasks) - new Date(all_days[i]["events"][j].getEndTime().getTime() + delay_between_tasks) >= minimum_acceptable_time) 
        { 
          all_days[i]["available_times"].push([new Date(all_days[i]["events"][j].getEndTime().getTime() + delay_between_tasks),new Date(all_days[i]["events"][j+1].getStartTime().getTime() - delay_between_tasks)]);
        }
      }
      
      if (all_days[i]["events"].length > 0 ) { // last event of the day 
        if (working_end_time - new Date(all_days[i]["events"][all_days[i]["events"].length -1 ].getEndTime().getTime() + delay_between_tasks) >= minimum_acceptable_time )
        {
          all_days[i]["available_times"].push([new Date(all_days[i]["events"][all_days[i]["events"].length -1 ].getEndTime().getTime() + delay_between_tasks), working_end_time]);   
        }
      }
    }  
  }
  
  return all_days; 
  
}

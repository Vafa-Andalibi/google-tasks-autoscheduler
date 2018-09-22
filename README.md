Google Tasks Auto Scheduler
===========================

This autoscheduler reads from the note section of the tasks in your Google Tasks and automatically plan your daily routine in an efficient way so to meet your goals. Currently this script is in a very alpha phase. The tasks are either recurrent, e.g. practice piano every two days, or one-time, e.g. Math Exercise, or extendable deadlines, e.g. weekly assignments. Note that the goals are assumed to be realistic; if you have 10 deadlines in 48 hours and each needs 10 hours, you definitely will not see some of the tasks in your calendar.  

Disclaimer
-----------
None of the authors, contributors, administrators or anyone else connected with this repository, in any way whatsoever, can be responsible for any mistakes or missing events in your calendar/schedule and they assume no responsibility or liability for any errors or omissions in your calendar/schedule. **Use this auto-scheduler at your own risk.**

Limitations
------------

- The script does not have a GUI 
- All of the configuration parameters are set on the top of the script
- The new calendar must be manually created in your Google Calendar

Important Note
---------------

- This script works based on priority and estimated time of the task. Since the available time during the day is limited, some of the recurrent tasks (or even one-time events if the deadlines are not realistic) might be ommited for some days and they might not show up in your calendar until the next occurence.  **Do not plan your important recurrent tasks with this scheduler.** Instead plan them with your google calendar inside your main calendar, so that they won't be removed. 

Script/Parameters Setup
------------------------
- Go to https://script.google.com and create a new script
- Copy/Paste the code from `autoscheduler.gs` into the new script. 
- Save (Ctrl+s)
- Add the calendar-ID of your main calendars inside the `preserved_calendars` array. The events of these calendars will be considered as non-changable, e.g. meeting events, class schedule, etc. 
- Create a new calendar in your google account for the auto-scheduler events
- Set the `target_calendar` variable to the calendar-ID of the new calendar
- In the script page, select `Resources` then `Advanced Google Services` and enable `Calendar API` and `Tasks API` in the list. 
- Then go to `console.cloud.google.com` and select `APIs & Services` in the menu bar and then select `Dashboard`. Click on `Enable APIS AND SERVICES`. Search for `Google Calendar API` then click and enable it. Do the same thing for `Tasks API`.
- Setting up the trigger: go to the script page, select `Edit`, then `Current project's triggers`, then `No triggers set up. Click here to add one now.`. Select `event creator` under `Run` and `from calendar` under `Events`. Click Save.
- By default the working hours in this script is from `9:00-23:00`. If you want to change this, search for `working_start_time` and `working_end_time` parameters and change them accordingly. 
  
  (Optional) Set the values of these parameters: 
  - `minimum_acceptable_time`: This variable sets the minimum acceptable free time-slot. For instance, if you set it to 30 minutes (`30*60*1000`),  any available time-slot shorter than 30-minutes would not be considered. 
  - `days_to_plan_ahead`: How many days to plan ahead, the larger the number, the longer it takes for the algorithm to plan
  - `delay_between_tasks`: This variable sets the rest/commute time between the un-changable tasks and auto-scheduler tasks. 
  - `delay_between_created_tasks`: This variable sets the rest time between the events created by auto-scheduler

- Select `event_creator` in the function selection menu (on the right side of the debug button)
- Create your tasks in Google Tasks according to the tutorial below
- Press run button (note that it might take tens of seconds for the events to show up in your calendar) 


Quick Syntax tutorial
----------------------

- You can comment a task by putting a `#` in the beginning of its title. 
- In the note section of the task, add the parameters (mentioned below) one after another with a comma `,` in between
- The order of parameters is not important
- One-time tasks need a deadline
- Use `est` keyword to input your estimate of the work either in minutes (`180m`) or in hours (`4h`). Example: `est:2h`

- Use `pr` keyword to enforce the priority (higher number means lower priority). Example:`est:60min,pr:1`

- Use `div` keyword to break your tasks into smaller chunks to be done in different days. For instance if you have a long work that might take 11 horus, break it into 3 or 4 parts. Example: `pr:1,est:10h,div:3`

- Use `rec` keyword to assign recurrent tasks. Currently daily/weekly recurrency is implemented in this way:
   - If a task starts on a particular week day (Monday) and is repeated every 2 days and each time it takes 1 hour, you can use: `pr:3,est:1h, rec:mon-2d`
   - If a task starts on a particular date, and is repeated on Mondays, Thursdays and Saturdays every 2 weeks, use: `pr:3, est:30m, rec:thu&mon&sat-2w-start 6/8/2018`
   - You can create tasks with extendable deadlines using `ext` parameter. For instance a task with these parameters `pr:1,est:6h,div:3,ext:7d` implies 3 slots of time, 2 hours each (6 hours in total) per week. Note that this is different from recurrent tasks since recurrent tasks specify one or several days (i.e. assigning task to particular days). Extendable deadlines are more flexible since the time will be distributed over the period of days between the deadlines.  

Bug Report/Feature suggestion
------------------------------
Bug reports and feature suggestions are welcome, but I won’t promise I’ll implement them 


Main Missing Features 
----------------------

- Make use of subtasks (how? since they don't have a note section) 
- Monthly, Yearly recurrency (is it useful really?) 

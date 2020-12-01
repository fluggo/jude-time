import * as d3shape from 'd3-shape';
import * as d3scaleChromatic from 'd3-scale-chromatic';
import React, { useState, useEffect, useMemo } from 'react';
import { DateTime, Duration } from 'luxon';

function fromTime(time: string): DateTime {
  return DateTime.fromFormat(time, 'h:mm a', { zone: 'local' });
}

interface ScheduleEntry<DateType extends string | DateTime> {
  activity: string;
  startTime: DateType;
  live?: boolean;
}

const SPECIALS_SCHEDULE: ScheduleEntry<string>[] = [
  { activity: 'Music', startTime: '1:10 PM', live: true },
  { activity: 'P.E.', startTime: '1:10 PM', live: true },
  { activity: 'DREAMS Lab', startTime: '1:10 PM', live: true },
  { activity: 'Art', startTime: '1:10 PM', live: true },
  { activity: 'P.E.', startTime: '1:10 PM', live: false },
  { activity: 'Creative Expressions', startTime: '1:10 PM', live: true },
];

function generateSchedule(date: DateTime): ScheduleEntry<DateTime>[] {
  const result: ScheduleEntry<DateTime>[] = [
    { activity: 'Breakfast!', startTime: fromTime('7:20 AM') },
    { activity: 'Morning Meeting', startTime: fromTime('7:40 AM'), live: true },
  ];

  const mwf = date.weekday === 1 || date.weekday === 3 || date.weekday === 5;

  if(mwf) {
    result.push({activity: 'Reading Workshop', startTime: fromTime('8:10 AM'), live: true});
  }
  else {
    result.push({activity: date.weekday === 4 ? 'Writing Workshop (all 2nd)' : 'Writing Workshop', startTime: fromTime('8:10 AM'), live: true});
  }

  if(mwf) {
    result.push({activity: 'Writing Workshop', startTime: fromTime('9:00 AM')});
  }
  else {
    result.push({activity: 'Reading Workshop', startTime: fromTime('9:00 AM')});
  }

  if(mwf) {
    result.push({activity: 'Phonics', startTime: fromTime('9:50 AM')});
  }
  else {
    result.push({activity: 'Catch-up/Redo Time', startTime: fromTime('9:50 AM')});
  }

  result.push({activity: 'Math Workshop', startTime: fromTime('10:15 AM'), live: mwf});
  result.push({activity: 'Lunch/Recess', startTime: fromTime('11:30 AM')});
  result.push({activity: 'Social Studies', startTime: fromTime('12:30 PM')});

  const firstSpecial = 0;
  const special = SPECIALS_SCHEDULE[(firstSpecial + date.weekday - 1) % SPECIALS_SCHEDULE.length];
  result.push({ ...special, startTime: fromTime(special.startTime) });

  result.push({activity: 'Science', startTime: fromTime('1:55 PM')});
  result.push({activity: 'School is over!', startTime: fromTime('2:55 PM')});

  return result;
}

function entryColor(index: number): string {
  return d3scaleChromatic.schemeCategory10[index % d3scaleChromatic.schemeCategory10.length];
}

const NEXT_UP_TIME = Duration.fromObject({minutes: 5});

function ScheduleEntryName({entry}: {entry: ScheduleEntry<DateTime>}) {
  return <>{entry.activity} {entry.live ? <span className="live">LIVE</span> : null}</>;
}

function RemainingTime({duration}: {duration: Duration}) {
  return <>{duration.hours ? `${duration.hours} hour${duration.hours === 1 ? '' : 's'} ` : ''}
    {duration.minutes >= 1 ? `${duration.minutes} minute${duration.minutes === 1 ? '' : 's'}` :
      (duration.hours || 0 === 0) ? 'Less than one minute' : ''} left</>;
}

function Schedule({schedule, time}: {schedule: ScheduleEntry<DateTime>[], time: DateTime}) {
  return <>
    {schedule.map((entry, i) => {
      const nextEntry = schedule[i + 1];
      const duration = nextEntry ? nextEntry.startTime.diff(entry.startTime) : Duration.fromObject({hours: 1});
      let timeSpent = time.diff(entry.startTime);

      if(+timeSpent < 0)
        timeSpent = Duration.fromMillis(0);

      if(+timeSpent > +duration)
        timeSpent = duration;

      return <div className="schedule-entry" key={i} style={{height: `${duration.as('minutes') * 1.5}px`}}>
        <div className="schedule-progress">
          <div style={{backgroundColor: entryColor(i), height: `${timeSpent.as('minutes') * 1.5}px`}}></div>
        </div>
        <div className="schedule-time-text">{entry.startTime.toFormat('h:mm a')}</div>
        <div className="schedule-entry-text"><ScheduleEntryName entry={entry}></ScheduleEntryName></div>
      </div>;
    })}
  </>;
}

function Timer({schedule, currentEntryIndex, currentTime}: {schedule: ScheduleEntry<DateTime>[], currentEntryIndex: number, currentTime: DateTime}) {
  const currentEntry = schedule[currentEntryIndex];

  const startTime = currentEntry.startTime;
  const targetTime = (currentEntryIndex + 1) < schedule.length ? schedule[currentEntryIndex + 1].startTime : null;

  const totalTime = targetTime ? targetTime.diff(startTime) : null;
  const usedTime = currentTime.diff(startTime);

  const arc = d3shape.arc()
    .innerRadius(0)
    .outerRadius(200)
    .startAngle(2 * Math.PI * usedTime.milliseconds / (totalTime ? totalTime.milliseconds : 1))
    .endAngle(2 * Math.PI) as any;

  const minutes = Math.floor(totalTime?.as('minutes') ?? 0);
  const ticks = useMemo(() => new Array(minutes).fill(0).map((_, i) => 360 * i / minutes), [minutes]);

  return <>
    <svg width="400" height="400" id="timer">
      <g transform="translate(200, 200)">
        <path fill={entryColor(currentEntryIndex)} d={arc()}></path>
        <g>{ticks.map((rot, i) =>
          <g key={i} transform={`rotate(${rot})`}><line stroke="black" y1="-200" y2="-190"></line></g>
        )}</g>
      </g>
    </svg>
  </>;
}

function HomePage() {
  const [currentTime, setCurrentTime] = useState(DateTime.local());
  const [currentEntryIndex, setCurrentEntryIndex] = useState(0);

  const schedule = useMemo(() => generateSchedule(currentTime), [currentTime.day]);

  const currentEntry = schedule[currentEntryIndex];

  const targetTime = (currentEntryIndex + 1) < schedule.length ? schedule[currentEntryIndex + 1].startTime : null;
  const remainingTime = targetTime ? targetTime.diff(currentTime).shiftTo('hours', 'minutes', 'seconds') : null;

  useEffect(() => {
    const interval = setInterval(() => {
      const newTime = DateTime.local();
      setCurrentTime(newTime);

      let entry = currentEntryIndex;

      if(newTime < schedule[0].startTime)
        entry = 0;

      while(entry + 1 < schedule.length && schedule[entry + 1].startTime < newTime)
        entry++;

      if(entry !== currentEntryIndex)
        setCurrentEntryIndex(entry);
    }, 1000);

    return function cleanup() {
      clearInterval(interval);
    }
  });

  return <>
    <div id="clock">{currentTime.toFormat('h:mm a')}</div>

    <div id="app-container">
      <div id="schedule-pane"><Schedule schedule={schedule} time={currentTime}></Schedule></div>
      <div id="timer-pane">
        <Timer schedule={schedule} currentEntryIndex={currentEntryIndex} currentTime={currentTime}></Timer>

        { remainingTime ?
          <>
            <div id="current-activity"><ScheduleEntryName entry={currentEntry}></ScheduleEntryName></div>
            <div id="time-left"><RemainingTime duration={remainingTime}></RemainingTime></div>
            { (+remainingTime < +NEXT_UP_TIME) ?
              <p id="next-up"><span style={{color: entryColor(currentEntryIndex + 1)}}>⬤</span> Next up: <ScheduleEntryName entry={schedule[currentEntryIndex + 1]}></ScheduleEntryName></p> :
              null }
          </> :
          <p id="current-activity">School has ended!</p> }
      </div>
    </div>
  </>;
}

export default HomePage;

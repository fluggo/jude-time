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

function HomePage() {
  const [currentTime, setCurrentTime] = useState(DateTime.local());
  const [currentEntryIndex, setCurrentEntryIndex] = useState(0);

  const schedule = useMemo(() => generateSchedule(currentTime), [currentTime.day]);

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

  const remainingTime = targetTime ? targetTime.diff(currentTime).shiftTo('hours', 'minutes', 'seconds') : null;

  useEffect(() => {
    const interval = setInterval(() => {
      const newTime = DateTime.local();
      setCurrentTime(newTime);

      let entry = currentEntryIndex;

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

    <svg width="400" height="400" id="timer">
      <g transform="translate(200, 200)">
        <path fill={entryColor(currentEntryIndex)} d={arc()}></path>
      </g>
    </svg>

    { remainingTime ?
      <>
        { +remainingTime < +NEXT_UP_TIME ?
        <div id="current-activity"><ScheduleEntryName entry={currentEntry}></ScheduleEntryName></div>
        <div id="time-left"><RemainingTime duration={remainingTime}></RemainingTime></div>
          <p id="next-up"><span style={{color: entryColor(currentEntryIndex + 1)}}>⬤</span> Next up: <ScheduleEntryName entry={schedule[currentEntryIndex + 1]}></ScheduleEntryName></p> :
          null }
      </> :
      <p id="current-activity">School has ended!</p> }
  </>;
}

export default HomePage;

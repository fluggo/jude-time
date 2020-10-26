import * as d3shape from 'd3-shape';
import * as d3scaleChromatic from 'd3-scale-chromatic';
import React, { useState, useEffect } from 'react';
import { DateTime } from 'luxon';

function fromTime(time: string): DateTime {
  return DateTime.fromFormat(time, 'h:mm a', { zone: 'local' });
}

interface ScheduleEntry<DateType extends string | DateTime> {
  activity: string;
  startTime: DateType;
}

const TEST_SCHEDULE: ScheduleEntry<string>[] = [
  { activity: 'Breakfast!', startTime: '7:20 AM' },
  { activity: 'Morning Meeting', startTime: '7:40 AM' },
  { activity: 'Writing Workshop', startTime: '8:10 AM' },
  { activity: 'Reading Workshop', startTime: '9:00 AM' },
  { activity: 'Catch-up', startTime: '9:45 AM' },
  { activity: 'Math Workshop', startTime: '10:15 AM' },
  { activity: 'Lunch/Recess', startTime: '11:30 AM' },
  { activity: 'Social Studies', startTime: '12:30 PM' },
  { activity: 'Music', startTime: '1:10 PM' },
  { activity: 'Science', startTime: '1:55 PM' },
  { activity: 'School is over!', startTime: '2:55 PM' },
];

const schedule: ScheduleEntry<DateTime>[] = TEST_SCHEDULE
  .map(entry => ({activity: entry.activity, startTime: fromTime(entry.startTime)}));

function HomePage() {
  const [currentTime, setCurrentTime] = useState(DateTime.local());
  const [currentEntryIndex, setCurrentEntryIndex] = useState(0);

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

  const remainingTime = targetTime ? targetTime.diff(currentTime).shiftTo('hours', 'minutes', 'seconds').toObject() : null;

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
    <svg width="400" height="400" style={ { display: 'block', marginLeft: 'auto', marginRight: 'auto', width: '400px' } }>
      <g transform="translate(200, 200)">
        <path fill={d3scaleChromatic.schemeCategory10[currentEntryIndex % d3scaleChromatic.schemeCategory10.length]} d={arc()}></path>
      </g>
    </svg>

    { remainingTime ?
      <p style={ { fontSize: '72px', textAlign: 'center' }}>{currentEntry.activity}<br></br>
        {remainingTime.hours ? `${remainingTime.hours} hour${remainingTime.hours === 1 ? '' : 's'} ` : ''}
        {remainingTime.minutes ? `${remainingTime.minutes} minute${remainingTime.minutes === 1 ? '' : 's'}` : ''} left</p> :
      <p style={ { fontSize: '72px' }}>All done!</p> }
  </>;
}

export default HomePage;

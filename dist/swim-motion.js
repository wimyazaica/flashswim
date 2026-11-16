/* Original illustration and deterministic, reversible motion for FLASH SWIM. */
(() => {
  'use strict';
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const records = new Set();
  let frame = 0;
  let previousTime = 0;
  let scheduleRecord;
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const styles = [
    { key: 'butterfly', name: 'Дельфин' },
    { key: 'backstroke', name: 'Спина' },
    { key: 'breaststroke', name: 'Брасс' },
    { key: 'freestyle', name: 'Кроль' }
  ];

  function swimmerMarkup(style = 'freestyle') {
    const symmetrical = style === 'butterfly' || style === 'breaststroke';
    const frog = style === 'breaststroke';
    const armFront = frog ? 'M67 28 82 22 101 28' : 'M67 28 81 12 101 16';
    const armBack = symmetrical
      ? (frog ? 'M67 44 82 50 101 44' : 'M67 44 81 60 101 56')
      : 'M67 44 53 59 34 56';
    const legTop = frog ? 'M46 31 29 21 17 31' : 'M46 31 27 29 12 31';
    const legBottom = frog ? 'M46 41 29 51 17 41' : 'M46 41 27 43 12 41';
    const cap = style === 'backstroke' ? '#ffcf3a' : '#158bcb';
    const head = style === 'backstroke'
      ? `<circle cx="85" cy="36" r="11" fill="#f7c7a5"/><path d="M84 25c6-1 12 4 12 11s-5 12-12 11l2-4c5-1 6-4 6-7s-2-6-6-7Z" fill="${cap}"/><rect x="83" y="28" width="6" height="5" rx="2" fill="#083f48"/><rect x="83" y="39" width="6" height="5" rx="2" fill="#083f48"/><path d="m86 33-1 6M80 33q-3 3 0 6" stroke="#d18b69" stroke-width="1.3" stroke-linecap="round"/><path d="M86 29h2M86 40h2" stroke="#b8f7ec" stroke-width="1.2"/>`
      : `<circle cx="85" cy="36" r="10.5" fill="#f7c7a5"/><path d="M81 26c6-3 15 2 15 10s-8 13-15 10l3-10Z" fill="${cap}"/><path d="M86 28q6 1 7 6" stroke="#ffffffa8" stroke-width="1.8" stroke-linecap="round"/><path d="M81 29v14" stroke="#083f48" stroke-width="2"/><rect x="78" y="29" width="6" height="5" rx="2" fill="#083f48"/><rect x="78" y="38" width="6" height="5" rx="2" fill="#083f48"/><path d="M80 30h2M80 39h2" stroke="#b8f7ec" stroke-width="1.2"/>`;
    return `<div class="swim-lane-wake"></div><svg class="swimmer-illustration swimmer-${style}" viewBox="0 0 116 72" fill="none" aria-hidden="true" focusable="false"><g class="swimmer-facing"><ellipse cx="57" cy="38" rx="29" ry="15" fill="#087f80" opacity=".09"/><g class="swimmer-leg-top"><path d="${legTop}" stroke="#f4c1a0" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="${frog ? 'm17 31-5-4' : 'm12 31-6 1'}" stroke="#e8ad8b" stroke-width="4" stroke-linecap="round"/></g><g class="swimmer-leg-bottom"><path d="${legBottom}" stroke="#f4c1a0" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="${frog ? 'm17 41-5 4' : 'm12 41-6-1'}" stroke="#e8ad8b" stroke-width="4" stroke-linecap="round"/></g><path d="M43 27c6-3 20-5 28-1 6 3 7 16 0 20-7 4-23 1-28-1z" fill="#f7c7a5"/><path d="M42 27c4 1 9 1 13-1v20c-4-1-9-1-13-1Z" fill="#f1263d"/><path d="M43 29h10M44 42l8 1" stroke="#ff8392" stroke-width="1.3" stroke-linecap="round"/><path d="M55 29v14" stroke="#bd1128" stroke-width="1.4"/><path d="${style === 'backstroke' ? 'M63 29q5 3 7 0M62 43q5-3 8 0' : 'M61 29q5 7 0 14'}" stroke="#e7a47e" stroke-width="1" opacity=".65"/><g class="swimmer-arm-front"><path d="${armFront}" stroke="#f7c7a5" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="101" cy="${frog ? '28' : '16'}" r="3.8" fill="#f4c1a0"/></g><g class="swimmer-arm-back"><path d="${armBack}" stroke="#f7c7a5" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></g><path d="M72 31h8v11h-8z" fill="#efb38e"/>${head}</g></svg>`;
  }

  function makeLane(className, style = 'freestyle') {
    const lane = document.createElement('div');
    lane.className = className;
    lane.setAttribute('aria-hidden', 'true');
    lane.dataset.stroke = style;
    lane.innerHTML = `<span class="swim-rope"></span><span class="swim-rope swim-rope-bottom"></span><div class="swim-lane-swimmer">${swimmerMarkup(style)}</div>`;
    return lane;
  }

  function recordFor(element, lane, kind) {
    const swimmer = lane.querySelector('.swim-lane-swimmer');
    const record = { element, lane, kind, swimmer, stroke: lane.dataset.stroke || 'freestyle', phase: 0, current: null, previous: null, visible: true, lastDirection: 1,
      facing: swimmer.querySelector('.swimmer-facing'),
      wake: swimmer.querySelector('.swim-lane-wake'),
      frontArm: swimmer.querySelector('.swimmer-arm-front'),
      backArm: swimmer.querySelector('.swimmer-arm-back'),
      topLeg: swimmer.querySelector('.swimmer-leg-top'),
      bottomLeg: swimmer.querySelector('.swimmer-leg-bottom') };
    records.add(record);
    if (visibilityObserver) visibilityObserver.observe(element);
    resizeObserver?.observe(element);
    return record;
  }

  const visibilityObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const entry of entries) {
      for (const record of records) if (record.element === entry.target) record.visible = entry.isIntersecting;
    }
    requestFrame();
  }, { rootMargin: '0px' }) : null;
  const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(requestFrame) : null;

  document.querySelectorAll('.swim-divider').forEach((divider, index) => {
    if (divider.dataset.swimReady) return;
    divider.dataset.swimReady = 'true';
    const stroke = styles[index % styles.length];
    const lane = makeLane('swim-divider-stage', stroke.key);
    const styleLabel = document.createElement('span');
    styleLabel.className = 'swim-style-label';
    styleLabel.innerHTML = `<span class="swim-style-number">0${index + 1}</span><strong>${stroke.name}</strong>`;
    lane.append(styleLabel);
    if (divider.dataset.lane) {
      const label = document.createElement('span');
      label.className = 'swim-lane-label';
      label.textContent = divider.dataset.lane;
      lane.append(label);
    }
    divider.append(lane);
    recordFor(divider, lane, 'divider');
  });

  function updateSchedule() {
    const weekdays = document.querySelector('.pool-schedule .weekdays');
    if (scheduleRecord && scheduleRecord.element !== weekdays) {
      visibilityObserver?.unobserve(scheduleRecord.element);
      resizeObserver?.unobserve(scheduleRecord.element);
      records.delete(scheduleRecord);
      scheduleRecord = undefined;
    }
    if (!weekdays) return;
    if (!scheduleRecord) {
      let lane = weekdays.parentElement.querySelector('.schedule-swimmer-lane');
      if (!lane) {
        lane = makeLane('schedule-swimmer-lane');
        weekdays.insertAdjacentElement('afterend', lane);
      }
      scheduleRecord = recordFor(weekdays, lane, 'schedule');
      // Start at the first tab, so the first selection gets the same animation.
      scheduleRecord.current = 0;
    }
    requestFrame();
  }

  function targetPosition(record) {
    const box = record.lane.getBoundingClientRect();
    const swimmerWidth = record.swimmer.offsetWidth;
    const travel = Math.max(0, box.width - swimmerWidth);
    if (record.kind === 'schedule') {
      const activeDay = record.element.querySelector('.schedule-day[aria-selected="true"]') || record.element.querySelector('.schedule-day');
      if (!activeDay) return travel * .5;
      const dayBox = activeDay.getBoundingClientRect();
      return clamp(dayBox.left + dayBox.width / 2 - box.left - swimmerWidth / 2, 0, travel);
    }
    if (motionPreference.matches) return travel * .45;
    const progress = clamp((window.innerHeight - box.top) / (window.innerHeight + box.height));
    return progress * travel;
  }

  function pose(record, position, moving) {
    const phase = motionPreference.matches ? .6 : record.phase + position * .025;
    const stroke = Math.sin(phase);
    const sweep = (stroke + 1) / 2;
    let front, back, top, bottom;
    if (record.stroke === 'butterfly') {
      // Both arms recover and sweep together; the legs stay joined for a dolphin kick.
      front = -90 * sweep;
      back = 90 * sweep;
      top = stroke * 7;
      bottom = stroke * 7;
    } else if (record.stroke === 'backstroke') {
      // Face up, one long arm forward as the opposite arm recovers.
      front = -15 + stroke * 65;
      back = -15 - stroke * 65;
      top = Math.sin(phase * 2) * 10;
      bottom = -top;
    } else if (record.stroke === 'breaststroke') {
      // A symmetrical arm sweep and knees turned out for the characteristic frog kick.
      front = -58 * sweep;
      back = 58 * sweep;
      top = -10 + Math.sin(phase + 1.2) * 19;
      bottom = -top;
    } else {
      front = stroke * 37;
      back = -stroke * 37;
      top = Math.sin(phase * 2) * 11;
      bottom = -top;
    }
    record.frontArm.style.transform = `rotate(${front.toFixed(2)}deg)`;
    record.backArm.style.transform = `rotate(${back.toFixed(2)}deg)`;
    record.topLeg.style.transform = `rotate(${top.toFixed(2)}deg)`;
    record.bottomLeg.style.transform = `rotate(${bottom.toFixed(2)}deg)`;
  }

  function tick(time) {
    frame = 0;
    if (document.hidden) { previousTime = 0; return; }
    const elapsed = previousTime ? Math.min(time - previousTime, 42) : 16;
    previousTime = time;
    let continueMotion = false;
    const reads = [];
    for (const record of records) {
      if (!record.element.isConnected || !record.visible) continue;
      reads.push([record, targetPosition(record)]);
    }
    for (const [record, target] of reads) {
      if (!motionPreference.matches) {
        record.phase = (record.phase + elapsed * (record.stroke === 'breaststroke' ? .0034 : .0042)) % (Math.PI * 2);
        continueMotion = true;
      }
      if (record.current === null || motionPreference.matches) record.current = target;
      const distance = target - record.current;
      const moving = Math.abs(distance) > .15;
      record.current = moving ? record.current + distance * (1 - Math.exp(-elapsed / (record.kind === 'schedule' ? 115 : 75))) : target;
      if (Math.abs(distance) > .15 && !motionPreference.matches) continueMotion = true;
      // Face forward across the lane; a return uses the same recognizable figure.
      if (moving && record.kind === 'schedule') record.lastDirection = distance < 0 ? -1 : 1;
      record.facing.style.transform = record.lastDirection < 0 ? 'scaleX(-1)' : 'scaleX(1)';
      record.wake.style.transform = record.lastDirection < 0 ? 'translateX(150%) scaleX(-1)' : 'scaleX(1)';
      record.swimmer.style.transform = `translate3d(${record.current.toFixed(2)}px,-50%,0)`;
      pose(record, record.current, moving);
    }
    if (continueMotion) frame = requestAnimationFrame(tick);
    else previousTime = 0;
  }

  function requestFrame() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(tick);
  }

  updateSchedule();
  const poolPanel = document.querySelector('#pool-panel');
  if (poolPanel) new MutationObserver(updateSchedule).observe(poolPanel, {childList:true, subtree:true});
  document.addEventListener('flashswim:daychange', updateSchedule);
  window.addEventListener('scroll', requestFrame, {passive:true});
  window.addEventListener('resize', requestFrame, {passive:true});
  motionPreference.addEventListener('change', requestFrame);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; previousTime = 0; }
    else requestFrame();
  });
  requestFrame();
})();

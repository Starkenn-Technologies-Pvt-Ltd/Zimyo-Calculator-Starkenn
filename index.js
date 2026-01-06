(() => {
  const DAY_CELL_SELECTOR = ".row-box-calendar";
  const REQUIRED_HOURS = 9.25;
  const HALF_DAY_CREDIT = REQUIRED_HOURS / 2;
  const ALLOWED_MONTHLY_DEFICIT = 6.0;

  const todayDate = new Date().getDate();

  const parseTime = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const diffHours = (start, end) => {
    let diff = end - start;
    if (diff < 0) diff += 24 * 60;
    return diff / 60;
  };

  // ⏱ Fetch live worked time for today
  const todayTimerText = document.querySelector(
    ".MuiTypography-root.MuiTypography-h5.MuiTypography-gutterBottom"
  )?.innerText || "00:00";

  const [th, tm] = todayTimerText.replace("hrs", "").trim().split(":").map(Number);
  const todayWorkedHours = ((th || 0) * 60 + (tm || 0)) / 60;

  const daily = [];

  document.querySelectorAll(DAY_CELL_SELECTOR).forEach((cell) => {
    const dayNum = parseInt(cell.querySelector("button p")?.innerText, 10);
    if (!dayNum) return;

    const text = cell.innerText;

    // ❌ Skip week offs
    if (/Week\s*Off/i.test(text)) return;

    let status = "Absent";
    let hours = 0;
    let start = "-";
    let end = "-";

    // 🎉 Holidays & special full days
    if (
      /New Year|Republic Day|Christmas|Office Picnic/i.test(text)
    ) {
      status = "Holiday";
      hours = REQUIRED_HOURS;
    }

    // 🏖 Any Leave (Personal / Earned / Casual / Medical)
    else if (/Leave/i.test(text)) {
      status = "Leave";
      hours = REQUIRED_HOURS;
    }

    // 🕓 Half Day
    else if (/Half Day/i.test(text)) {
      const matches = [...text.matchAll(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/g)];
      if (matches.length) {
        const h = diffHours(parseTime(matches[0][1]), parseTime(matches[0][2]));
        hours = Number((h + HALF_DAY_CREDIT).toFixed(2));
        start = matches[0][1];
        end = matches[0][2];
        status = "Half Day";
      }
    }

    // 🧑‍💼 Normal worked day
    else {
      const matches = [...text.matchAll(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/g)];
      if (matches.length) {
        let max = 0;
        let best = null;
        matches.forEach(m => {
          const h = diffHours(parseTime(m[1]), parseTime(m[2]));
          if (h > max) {
            max = h;
            best = m;
          }
        });
        hours = Number(max.toFixed(2));
        start = best[1];
        end = best[2];
        status = "Worked";
      }
    }

    // 🔴 TODAY override
    if (dayNum === todayDate) {
      status = "Today";
      hours = Number(todayWorkedHours.toFixed(2));
    }

    const delta = Number((hours - REQUIRED_HOURS).toFixed(2));

    daily.push({ day: dayNum, status, start, end, hours, delta });
  });

  // ===== DAY TABLE =====
  console.table(daily);

  // ===== TILL DATE (EXCLUDING TODAY) =====
  const tillDate = daily.filter(d => d.day < todayDate);
  const expectedTillDate = Number((tillDate.length * REQUIRED_HOURS).toFixed(2));
  const actualTillDate = Number(tillDate.reduce((s, d) => s + d.hours, 0).toFixed(2));
  const deficitTillDate = Number((expectedTillDate - actualTillDate).toFixed(2));

  // ===== MONTHLY =====
  const expectedMonthly = Number((daily.length * REQUIRED_HOURS).toFixed(2));
  const actualMonthly = Number(daily.reduce((s, d) => s + d.hours, 0).toFixed(2));
  const rawDeficit = Number(Math.max(0, expectedMonthly - actualMonthly).toFixed(2));

  // ===== REMAINING =====
  const remainingDays = daily.filter(d => d.day > todayDate).length;
  const todayRemaining = Number((REQUIRED_HOURS - todayWorkedHours).toFixed(2));

  const remainingHoursNoBuffer = Number(
    (expectedMonthly - actualMonthly).toFixed(2)
  );

  const remainingHoursWithBuffer = Number(
    Math.max(0, remainingHoursNoBuffer - ALLOWED_MONTHLY_DEFICIT).toFixed(2)
  );

  const dailyTargetNoBuffer = remainingDays
    ? Number((remainingHoursNoBuffer / remainingDays).toFixed(2))
    : 0;

  const dailyTargetWithBuffer = remainingDays
    ? Number((remainingHoursWithBuffer / remainingDays).toFixed(2))
    : 0;

  // ===== OUTPUT =====
  console.log("📅 TILL DATE SUMMARY (Excl. Today)");
  console.log("Expected Hours:", expectedTillDate);
  console.log("Actual Hours:", actualTillDate);
  console.log("Deficit Till Date:", deficitTillDate);

  console.log("\n🕘 TODAY");
  console.log("Worked Today:", todayWorkedHours.toFixed(2));
  console.log("Remaining Today:", todayRemaining.toFixed(2));

  console.log("\n📆 MONTHLY SUMMARY");
  console.log("Expected Monthly Hours:", expectedMonthly);
  console.log("Actual Monthly Hours:", actualMonthly);
  console.log("Raw Monthly Deficit:", rawDeficit);

  console.log("\n🚀 REMAINING PLAN");
  console.log("Remaining Working Days:", remainingDays);
  console.log("Remaining Hours (No Buffer):", remainingHoursNoBuffer);
  console.log("Daily Target (No Buffer):", dailyTargetNoBuffer);
  console.log("Remaining Hours (With Buffer):", remainingHoursWithBuffer);
  console.log("Daily Target (With Buffer):", dailyTargetWithBuffer);

  return { daily };
})();

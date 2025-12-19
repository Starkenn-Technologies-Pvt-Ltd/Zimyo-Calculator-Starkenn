(() => {
  const DAY_CELL_SELECTOR = ".row-box-calendar";
  const REQUIRED_HOURS = 9.25;
  const ALLOWED_MONTHLY_DEFICIT = 6.0;
  const todayDate = new Date().getDate();

  const parseTime = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  // Handles cross-midnight punches
  const diffHours = (start, end) => {
    let diff = end - start;
    if (diff < 0) diff += 24 * 60;
    return diff / 60;
  };

  const daily = [];

  document.querySelectorAll(DAY_CELL_SELECTOR).forEach((cell) => {
    const dayNum = parseInt(cell.querySelector("button p")?.innerText, 10);
    if (!dayNum) return;

    const text = cell.innerText;

    // Skip week off & holidays
    if (/Week\s*Off|Holiday|Christmas/i.test(text)) return;

    let status = "Absent";
    let hours = 0;
    let start = "-";
    let end = "-";

    // Personal Leave
    if (/Personal Leave\s*\(Full Day\)/i.test(text)) {
      status = "Leave";
      hours = REQUIRED_HOURS;
    } else {
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

    const delta = Number((hours - REQUIRED_HOURS).toFixed(2));

    daily.push({
      day: dayNum,
      status,
      start,
      end,
      hours,
      delta
    });
  });

  // ===== DAY-WISE TABLE =====
  console.table(daily);

  // ===== TILL DATE =====
  const tillDate = daily.filter(d => d.day <= todayDate);
  const attendedTillDate = tillDate.filter(d => d.hours > 0).length;

  const expectedTillDateHours = Number((tillDate.length * REQUIRED_HOURS).toFixed(2));
  const actualTillDateHours = Number(
    tillDate.reduce((s, d) => s + d.hours, 0).toFixed(2)
  );
  const deficitTillDate = Number(
    (expectedTillDateHours - actualTillDateHours).toFixed(2)
  );

  // ===== MONTHLY =====
  const expectedMonthlyHours = Number((daily.length * REQUIRED_HOURS).toFixed(2));
  const actualMonthlyHours = Number(
    daily.reduce((s, d) => s + d.hours, 0).toFixed(2)
  );
  const rawMonthlyDeficit = Number(
    Math.max(0, expectedMonthlyHours - actualMonthlyHours).toFixed(2)
  );

  // ===== REMAINING PLAN =====
  const remainingDays = daily.filter(d => d.day > todayDate).length;

  const remainingHoursNoBuffer = Number(
    Math.max(0, expectedMonthlyHours - actualTillDateHours).toFixed(2)
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
  console.log("📅 TILL DATE SUMMARY");
  console.log("Days Attended Till Date:", attendedTillDate);
  console.log("Expected Hours Till Date:", expectedTillDateHours);
  console.log("Actual Hours Till Date:", actualTillDateHours);
  console.log("Deficit Till Date:", deficitTillDate);

  console.log("\n📆 MONTHLY SUMMARY");
  console.log("Total Working Days:", daily.length);
  console.log("Expected Monthly Hours:", expectedMonthlyHours);
  console.log("Actual Monthly Hours:", actualMonthlyHours);
  console.log("Raw Monthly Deficit:", rawMonthlyDeficit);

  console.log("\n🚀 REMAINING PLAN");
  console.log("Remaining Working Days:", remainingDays);
  console.log("Hours Remaining (No Buffer):", remainingHoursNoBuffer);
  console.log("Required Daily Avg (No Buffer):", dailyTargetNoBuffer);
  console.log("Hours Remaining (With 6hr Buffer):", remainingHoursWithBuffer);
  console.log("Required Daily Avg (With Buffer):", dailyTargetWithBuffer);

  return {
    daily,
    tillDate: {
      attendedTillDate,
      expectedTillDateHours,
      actualTillDateHours,
      deficitTillDate
    },
    monthly: {
      expectedMonthlyHours,
      actualMonthlyHours,
      rawMonthlyDeficit
    },
    remainingPlan: {
      remainingDays,
      dailyTargetNoBuffer,
      dailyTargetWithBuffer
    }
  };
})();

(() => {
  const DAY_CELL_SELECTOR = ".row-box-calendar";

  const REQUIRED_HOURS = 9.25;              // 9h 15m
  const HALF_DAY_CREDIT = REQUIRED_HOURS / 2;
  const ALLOWED_MONTHLY_DEFICIT = 6.0;

  const LATE_MARK_TIME = 11 * 60;            // 11:00 AM
  const EARLY_GO_TIME = 17 * 60;              // 5:00 PM

  const today = new Date();
  const todayDate = today.getDate();

  /* ================= HELPERS ================= */
  const parseTime = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const diffHours = (start, end) => {
    let diff = end - start;
    if (diff < 0) diff += 24 * 60;
    return diff / 60;
  };

  const hoursToMinutes = (h) => Math.round(h * 60);

  const minutesToClock = (minsFromNow) => {
    const d = new Date(Date.now() + minsFromNow * 60 * 1000);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  /* ================= TODAY TIMER ================= */
  const getTodayWorkedHours = () => {
    const values = [...document.querySelectorAll("div")]
      .filter(d => d.innerText?.includes("Today"))
      .flatMap(d =>
        [...d.querySelectorAll("*")]
          .map(n => n.innerText?.trim())
          .filter(t => /^\d{1,2}:\d{2}\s*hrs?$/.test(t))
      )
      .map(t => t.replace(/\s*hrs?/, "").replace(/\n/g, "").trim());

    const unique = [...new Set(values)];
    if (!unique.length) return 0;

    const hours = unique.map(v => {
      const [h, m] = v.split(":").map(Number);
      return ((h || 0) * 60 + (m || 0)) / 60;
    });

    return Number(Math.max(...hours).toFixed(2));
  };

  const todayWorkedLive = getTodayWorkedHours();

  /* ================= DAILY PARSE ================= */
  const daily = [];

  document.querySelectorAll(DAY_CELL_SELECTOR).forEach(cell => {
    const dayNum = parseInt(cell.querySelector("button p")?.innerText, 10);
    if (!dayNum) return;

    const text = cell.innerText;

    if (/Week\s*Off/i.test(text)) return;

    let status = "Absent";
    let remarks = "";
    let hours = 0;
    let start = "-";
    let end = "-";

    if (/Holiday|New Year|Republic|Christmas/i.test(text)) {
      status = "Holiday";
      hours = REQUIRED_HOURS;
      remarks = "Holiday";
    }
    else if (/Leave/i.test(text)) {
      status = "Leave";
      hours = REQUIRED_HOURS;
      remarks = "Leave";
    }
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
        status = dayNum === todayDate ? "Today" : "Worked";

        const flags = [];
        flags.push(/Half Day/i.test(text) ? "Half Day Applied" : "Regular Day");

        if (parseTime(start) > LATE_MARK_TIME) flags.push("Late Mark");
        if (parseTime(end) < EARLY_GO_TIME) flags.push("Early Go");

        remarks = flags.join(", ");
      }
    }

    const delta = Number((hours - REQUIRED_HOURS).toFixed(2));

    daily.push({ day: dayNum, status, start, end, hours, delta, remarks });
  });

  /* ================= DAY-WISE TABLE ================= */
  console.table(daily);

  /* ================= TILL DATE (EXCL TODAY) ================= */
  const tillDate = daily.filter(d => d.day < todayDate);

  const expectedTillDateHours = Number(
    (tillDate.length * REQUIRED_HOURS).toFixed(2)
  );

  const actualTillDateHours = Number(
    tillDate.reduce((s, d) => s + d.hours, 0).toFixed(2)
  );

  const deficitTillDate = Number(
    Math.max(0, expectedTillDateHours - actualTillDateHours).toFixed(2)
  );

  /* ================= TODAY ================= */
  const remainingToday = Number(
    Math.max(0, REQUIRED_HOURS - todayWorkedLive).toFixed(2)
  );

  const leaveTimeNormal = minutesToClock(
    hoursToMinutes(remainingToday)
  );

  const leaveTimeWithDeficit = minutesToClock(
    hoursToMinutes(remainingToday + deficitTillDate)
  );

  /* ================= MONTHLY ================= */
  const expectedMonthlyHours = Number(
    (daily.length * REQUIRED_HOURS).toFixed(2)
  );

  const actualMonthlyHours = Number(
    (actualTillDateHours + todayWorkedLive).toFixed(2)
  );

  const rawMonthlyDeficit = Number(
    Math.max(0, expectedMonthlyHours - actualMonthlyHours).toFixed(2)
  );

  /* ================= REMAINING PLAN ================= */
  const remainingDays = daily.filter(d => d.day > todayDate).length;

  const remainingHoursNoBuffer = Number(
    Math.max(0, expectedMonthlyHours - actualMonthlyHours).toFixed(2)
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

  /* ================= LOG OUTPUT ================= */
  console.log("📅 TILL DATE (Excl. Today)");
  console.log("Expected Hours:", expectedTillDateHours);
  console.log("Actual Hours:", actualTillDateHours);
  console.log("Deficit Till Date:", deficitTillDate);

  console.log("\n⏱ TODAY");
  console.log("Worked Today:", todayWorkedLive);
  console.log("Remaining Today:", remainingToday);
  console.log("Leave Time (Normal):", leaveTimeNormal);
  console.log("Leave Time (Cover Deficit):", leaveTimeWithDeficit);

  console.log("\n📆 MONTHLY");
  console.log("Expected Monthly Hours:", expectedMonthlyHours);
  console.log("Actual Monthly Hours:", actualMonthlyHours);
  console.log("Raw Monthly Deficit:", rawMonthlyDeficit);

  console.log("\n🚀 REMAINING PLAN");
  console.log("Remaining Working Days:", remainingDays);
  console.log("Daily Target (No Buffer):", dailyTargetNoBuffer);
  console.log("Daily Target (With Buffer):", dailyTargetWithBuffer);

  return {
    daily,
    tillDate: {
      expectedTillDateHours,
      actualTillDateHours,
      deficitTillDate
    },
    today: {
      workedToday: todayWorkedLive,
      remainingToday,
      leaveTimeNormal,
      leaveTimeWithDeficit
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

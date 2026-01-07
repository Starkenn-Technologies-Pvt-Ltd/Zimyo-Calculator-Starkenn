(() => {
  const DAY_CELL_SELECTOR = ".row-box-calendar";
  const REQUIRED_HOURS = 9.25;
  const ALLOWED_MONTHLY_DEFICIT = 6.0;

  const LATE_MARK_MIN = 11 * 60;   // 11:00
  const EARLY_GO_MIN = 17 * 60;    // 17:00

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

  // ---- XPath helper for today's live time ----
  const getTextByXPath = (xpath) => {
    const r = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    return r.singleNodeValue?.innerText || "";
  };

  const todayTimerText = getTextByXPath(
    "/html/body/div[1]/div[2]/div/div/div/div[1]/div/div[3]/div/div[2]/div/div[2]/div[1]/div[2]/div/h5"
  );

  const todayWorkedHours = (() => {
    if (!todayTimerText) return 0;
    const clean = todayTimerText.replace("hrs", "").trim();
    const [h, m] = clean.split(":").map(Number);
    return ((h || 0) * 60 + (m || 0)) / 60;
  })();

  const daily = [];

  document.querySelectorAll(DAY_CELL_SELECTOR).forEach((cell) => {
    const dayNum = parseInt(cell.querySelector("button p")?.innerText, 10);
    if (!dayNum) return;

    const text = cell.innerText;

    // Skip week offs
    if (/Week\s*Off/i.test(text)) return;

    let status = "Absent";
    let remarks = [];
    let hours = 0;
    let start = "-";
    let end = "-";

    // ---- Holidays / Picnic ----
    if (/New Year|Republic Day|Christmas|Picnic/i.test(text)) {
      status = "Holiday";
      hours = REQUIRED_HOURS;
      remarks.push("Holiday");
    }

    // ---- Any Leave ----
    else if (/Leave/i.test(text)) {
      status = "Leave";
      hours = REQUIRED_HOURS;
      remarks.push("Leave");
    }

    // ---- Work punches ----
    else {
      const matches = [...text.matchAll(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/g)];

      if (matches.length) {
        let maxHrs = 0;
        let best = null;

        matches.forEach(m => {
          const s = parseTime(m[1]);
          const e = parseTime(m[2]);
          const h = diffHours(s, e);
          if (h > maxHrs) {
            maxHrs = h;
            best = m;
          }
        });

        hours = Number(maxHrs.toFixed(2));
        start = best[1];
        end = best[2];
        status = "Worked";

        const startMin = parseTime(start);
        const endMin = parseTime(end);

        if (/Half Day/i.test(text)) remarks.push("Half Day Applied");
        else remarks.push("Regular Day");

        if (startMin > LATE_MARK_MIN) remarks.push("Late Mark");
        if (endMin < EARLY_GO_MIN) remarks.push("Early Go");
      }
    }

    // ---- TODAY override ----
    if (dayNum === todayDate) {
      status = "Today";
      hours = Number(todayWorkedHours.toFixed(2));
      remarks.push("Live Day");
    }

    const delta = Number((hours - REQUIRED_HOURS).toFixed(2));

    daily.push({
      day: dayNum,
      status,
      start,
      end,
      hours,
      delta,
      remarks: remarks.join(", ")
    });
  });

  // ===== DAY TABLE =====
  console.table(daily);

  // ===== TILL DATE (EXCL. TODAY) =====
  const tillDate = daily.filter(d => d.day < todayDate);
  const expectedTill = Number((tillDate.length * REQUIRED_HOURS).toFixed(2));
  const actualTill = Number(tillDate.reduce((s, d) => s + d.hours, 0).toFixed(2));
  const deficitTill = Number((expectedTill - actualTill).toFixed(2));

  // ===== MONTHLY =====
  const expectedMonthly = Number((daily.length * REQUIRED_HOURS).toFixed(2));
  const actualMonthly = Number(daily.reduce((s, d) => s + d.hours, 0).toFixed(2));
  const rawDeficit = Number(Math.max(0, expectedMonthly - actualMonthly).toFixed(2));

  // ===== REMAINING =====
  const remainingDays = daily.filter(d => d.day > todayDate).length;
  const remainingHoursNoBuffer = Number((expectedMonthly - actualMonthly).toFixed(2));
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
  console.log("Expected Hours:", expectedTill);
  console.log("Actual Hours:", actualTill);
  console.log("Deficit Till Date:", deficitTill);

  console.log("\n🕘 TODAY");
  console.log("Worked Today:", todayWorkedHours.toFixed(2));
  console.log("Remaining Today:", Number((REQUIRED_HOURS - todayWorkedHours).toFixed(2)));

  console.log("\n📆 MONTHLY SUMMARY");
  console.log("Expected Monthly Hours:", expectedMonthly);
  console.log("Actual Monthly Hours:", actualMonthly);
  console.log("Raw Monthly Deficit:", rawDeficit);

  console.log("\n🚀 REMAINING PLAN");
  console.log("Remaining Working Days:", remainingDays);
  console.log("Daily Target (No Buffer):", dailyTargetNoBuffer);
  console.log("Daily Target (With Buffer):", dailyTargetWithBuffer);

  return { daily };
})();

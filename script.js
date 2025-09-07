let whoData = null;

// === Загрузка WHO LMS ===
fetch("who_lms_5_19.json")
  .then(res => res.json())
  .then(data => {
    whoData = data;
    console.log("✅ WHO LMS данные загружены");
  })
  .catch(err => console.error("❌ Ошибка загрузки WHO LMS:", err));

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

// определяем: ключи возраста в месяцах или в годах
function detectKeyScale(domain) {
  const keys = Object.keys(domain).map(k => parseFloat(k)).filter(n => !isNaN(n));
  if (keys.length === 0) return null;
  const maxKey = Math.max(...keys);
  return maxKey > 30 ? "months" : "years";
}

// берём ближайшую LMS-запись
function getLMS(domain, ageMonths) {
  if (!domain) return null;
  const keys = Object.keys(domain).map(k => parseFloat(k)).filter(n => !isNaN(n));
  if (keys.length === 0) return null;

  const scale = detectKeyScale(domain);
  let target = scale === "months" ? Math.round(ageMonths) : Math.round(ageMonths / 12);

  let closest = keys.reduce((a, b) =>
    Math.abs(b - target) < Math.abs(a - target) ? b : a
  );

  return domain[String(closest)] || null;
}

// считаем Z-score
function calcZscore(value, ageMonths, sex, type) {
  const domain = whoData?.[sex]?.[type];
  if (!domain) return null;
  const ref = getLMS(domain, ageMonths);
  if (!ref) return null;

  const L = parseFloat(ref.L);
  const M = parseFloat(ref.M);
  const S = parseFloat(ref.S);
  if (isNaN(L) || isNaN(M) || isNaN(S) || M === 0) return null;

  if (L === 0) {
    return Math.log(value / M) / S;
  } else {
    return (Math.pow(value / M, L) - 1) / (L * S);
  }
}

// erf для нормального распределения
function erf(x) {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741,
        a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

// Z → перцентиль
function zToPercentile(z) {
  if (z === null || isNaN(z)) return "-";
  const p = 0.5 * (1 + erf(z / Math.SQRT2));
  const pct = Math.round(p * 100);
  return Math.max(0, Math.min(100, pct));
}

// === КАЛЬКУЛЯТОР WHO ===
function calculateBMI() {
  if (!whoData) {
    alert("⚠ Данные WHO ещё не загружены");
    return;
  }

  const measureDate = new Date(document.getElementById("measure").value);
  const birthDate = new Date(document.getElementById("birth").value);
  const sex = document.getElementById("sex").value;
  const height = parseFloat(document.getElementById("height").value);
  const weight = parseFloat(document.getElementById("weight").value);

  if (isNaN(measureDate) || isNaN(birthDate) || isNaN(height) || isNaN(weight)) {
    alert("⚠ Заполните все поля калькулятора");
    return;
  }

  const ageMonths = Math.round(
    (measureDate - birthDate) / (1000 * 60 * 60 * 24 * 30.4375)
  );
  const bmi = weight / Math.pow(height / 100, 2);

  const zH = calcZscore(height, ageMonths, sex, "height_for_age");
  const zW = calcZscore(weight, ageMonths, sex, "weight_for_age");
  const zB = calcZscore(bmi, ageMonths, sex, "bmi_for_age");

  const pH = zToPercentile(zH);
  const pW = zToPercentile(zW);
  const pB = zToPercentile(zB);

  document.getElementById("result").innerHTML = `
    <p><b>Возраст:</b> ${ageMonths} мес (${(ageMonths/12).toFixed(1)} лет)</p>
    <p><b>Рост:</b> ${height} см — Z=${zH !== null ? zH.toFixed(2) : "-"}, p=${pH}</p>
    <p><b>Вес:</b> ${weight} кг — Z=${zW !== null ? zW.toFixed(2) : "-"}, p=${pW}</p>
    <p><b>ИМТ:</b> ${bmi.toFixed(1)} — Z=${zB !== null ? zB.toFixed(2) : "-"}, p=${pB}</p>
  `;

  // сохраним для экспорта
  window.lastCalc = { ageMonths, height, weight, bmi, zH, pH, zW, pW, zB, pB };
}

// === ОПРОСНИК ===
function calculateResult() {
  const clinic = document.getElementById("clinic").value.trim();
  if (!clinic) {
    alert("⚠ Введите номер поликлиники!");
    return;
  }

  const form = document.getElementById("quizForm");
  const answers = new FormData(form);

  let scores = {
    medical: 0,
    nutritive: 0,
    feeding: 0,
    psychosocial: 0,
    parents: 0,
    redflags: 0
  };

  // собираем ответы
  for (let [key, val] of answers.entries()) {
    if (key.startsWith("q")) {
      const num = parseInt(key.substring(1));
      if (num <= 7) scores.medical += +val;
      else if (num <= 16) scores.nutritive += +val;
      else if (num <= 20) scores.feeding += +val;
      else if (num <= 24) scores.psychosocial += +val;
    }
  }

  // родительский блок
  document.querySelectorAll("input[name='parent']:checked").forEach(() => {
    scores.parents += 1;
  });

  // красные флаги
  document.querySelectorAll("input[name='redflag']:checked").forEach(() => {
    scores.redflags += 1;
  });

  // интерпретации по доменам
  function interpretMedical(n) {
    if (n === 0) return "нет значимых заболеваний";
    if (n <= 2) return "лёгкая медицинская отягощенность";
    return "Высокий риск (следует исключить органическую патологию)";
  }

  function interpretNutritive(n) {
    if (n === 0) return "питание удовлетворительное";
    if (n === 1) return "лёгкие трудности";
    if (n === 2) return "выраженные ограничения";
    return "риск нутритивной недостаточности";
  }

  function interpretFeeding(n) {
    if (n === 0) return "адекватные навыки";
    if (n === 1) return "умеренные трудности";
    return "тяжёлые нарушения навыков кормления";
  }

  function interpretPsychosocial(n) {
    if (n === 0) return "нет влияния";
    if (n <= 2) return "умеренное влияние";
    return "выраженные психосоциальные последствия";
  }

  // общий риск ARFID
  let domainsPositive = 0;
  if (scores.medical > 0) domainsPositive++;
  if (scores.nutritive > 0) domainsPositive++;
  if (scores.feeding > 0) domainsPositive++;
  if (scores.psychosocial > 0) domainsPositive++;

  let arfidx;
  if (scores.redflags > 0) {
    arfidx = "‼ Хоть 1 красный флаг = вызвать 103, госпитализация";
  } else if (scores.medical + scores.nutritive + scores.feeding + scores.psychosocial <= 3 && domainsPositive === 0) {
    arfidx = "низкая вероятность ARFID";
  } else if ((scores.medical + scores.nutritive + scores.feeding + scores.psychosocial <= 6) || domainsPositive === 1) {
    arfidx = "средняя вероятность ARFID → консультация гастроэнтеролога + анализы";
  } else {
    arfidx = "высокая вероятность ARFID → мультидисциплинарная команда (гастроэнтеролог, feeding терапевт, психиатр, нутрициолог)";
  }

  const resultText = `
    <p><b>Медицинский домен:</b> ${scores.medical} — ${interpretMedical(scores.medical)}</p>
    <p><b>Нутритивный домен:</b> ${scores.nutritive} — ${interpretNutritive(scores.nutritive)}</p>
    <p><b>Навыки кормления:</b> ${scores.feeding} — ${interpretFeeding(scores.feeding)}</p>
    <p><b>Психосоциальный домен:</b> ${scores.psychosocial} — ${interpretPsychosocial(scores.psychosocial)}</p>
    <p><b>Родительский блок:</b> ${scores.parents} отмечено</p>
    <p><b>Красные флаги:</b> ${scores.redflags} отмечено</p>
    <hr>
    <p><b>Заключение:</b> ${arfidx}</p>
  `;

  document.getElementById("testResult").innerHTML = resultText;
}

// === ЭКСПОРТ В EXCEL ===
function exportToExcel() {
  const wb = XLSX.utils.book_new();
  const ws_data = [
    ["Поликлиника", document.getElementById("clinic").value],
    ["Результаты теста", document.getElementById("testResult").innerText],
    ["Результаты WHO", document.getElementById("result").innerText]
  ];
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  XLSX.utils.book_append_sheet(wb, ws, "Results");
  XLSX.writeFile(wb, "results.xlsx");
}
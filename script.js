// скрипт: подсчёт ARFID + экспорт в Excel
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("quizForm");

  // перехватываем submit: сначала валидность формы (покажет встроенные подсказки),
  // затем — расчёт результата.
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    // покажет нативные подсказки для required/мин/макс и т.д.
    if (!form.reportValidity()) return;
    calculateResult();
  });

  // кнопка экспорта
  document.getElementById("exportBtn").addEventListener("click", exportToExcel);
});

function calculateResult() {
  const clinic = document.getElementById("clinic").value.trim();
  const age = document.getElementById("age").value.trim();
  const gender = document.getElementById("gender").value;
  const height = document.getElementById("height").value.trim();
  const weight = document.getElementById("weight").value.trim();

  // Дополнительная (резервная) проверка — на случай, если форма не прошла reportValidity
  if (!clinic) { alert("⚠ Введите номер поликлиники!"); return; }
  if (!age)    { alert("⚠ Укажите возраст!"); return; }
  if (!gender) { alert("⚠ Укажите пол!"); return; }
  if (!height) { alert("⚠ Укажите рост!"); return; }
  if (!weight) { alert("⚠ Укажите вес!"); return; }

  const form = document.getElementById("quizForm");
  const answers = new FormData(form);

  let scores = { medical:0, nutritive:0, feeding:0, psychosocial:0, parents:0, redflags:0 };

  for (let [key, val] of answers.entries()) {
    if (key.startsWith("q")) {
      const num = parseInt(key.substring(1));
      const v = Number(val) || 0;
      if (num <= 7) scores.medical += v;
      else if (num <= 16) scores.nutritive += v;
      else if (num <= 20) scores.feeding += v;
      else if (num <= 24) scores.psychosocial += v;
    }
  }

  document.querySelectorAll("input[name='parent']:checked").forEach(() => scores.parents++);
  document.querySelectorAll("input[name='redflag']:checked").forEach(() => scores.redflags++);

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
  } else if (scores.medical + scores.nutritive + scores.feeding + scores.psychosocial <= 6 || domainsPositive === 1) {
    arfidx = "средняя вероятность ARFID → консультация гастроэнтеролога + анализы";
  } else {
    arfidx = "высокая вероятность ARFID → мультидисциплинарная команда (гастроэнтеролог, feeding терапевт, психиатр, нутрициолог)";
  }

  const resultText = `
    <p><b>Поликлиника:</b> ${escapeHtml(clinic)}</p>
    <p><b>Возраст:</b> ${escapeHtml(age)} лет</p>
    <p><b>Пол:</b> ${gender === "male" ? "Мужчина" : "Женщина"}</p>
    <p><b>Рост:</b> ${escapeHtml(height)} см</p>
    <p><b>Вес:</b> ${escapeHtml(weight)} кг</p>
    <hr>
    <p><b>Медицинский домен:</b> ${scores.medical} — ${interpretMedical(scores.medical)}</p>
    <p><b>Нутритивный домен:</b> ${scores.nutritive} — ${interpretNutritive(scores.nutritive)}</p>
    <p><b>Навыки кормления:</b> ${scores.feeding} — ${interpretFeeding(scores.feeding)}</p>
    <p><b>Психосоциальный домен:</b> ${scores.psychosocial} — ${interpretPsychosocial(scores.psychosocial)}</p>
    <p><b>Родительский блок:</b> ${scores.parents} отмечено</p>
    <p><b>Красные флаги:</b> ${scores.redflags} отмечено</p>
    <hr>
    <p><b>Заключение:</b> ${arfidx}</p>
  `;

  // показываем результат в контейнере
  document.getElementById("testResult").innerHTML = resultText;

  // сохраняем последний результат (для экспорта, если нужно)
  window.lastARFIDResult = {
    clinic, age, gender, height, weight, scores, arfidx, plainText: document.getElementById("testResult").innerText
  };
}

// безопасный escape для вывода в HTML (необязательно, но лучше)
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function exportToExcel() {
  // берем значения прямо из полей / результата
  const clinic = document.getElementById("clinic").value || "";
  const age = document.getElementById("age").value || "";
  const gender = document.getElementById("gender").value || "";
  const height = document.getElementById("height").value || "";
  const weight = document.getElementById("weight").value || "";
  const resultText = document.getElementById("testResult").innerText || "";

  const wb = XLSX.utils.book_new();
  const ws_data = [
    ["Поликлиника", clinic],
    ["Возраст", age],
    ["Пол", gender],
    ["Рост (см)", height],
    ["Вес (кг)", weight],
    ["Результаты теста", resultText]
  ];
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  XLSX.utils.book_append_sheet(wb, ws, "Results");
  XLSX.writeFile(wb, "results.xlsx");
}






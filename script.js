// ===== WHO LMS калькулятор =====
function calculateBMI() {
  const measureDate = new Date(document.getElementById('measure').value);
  const birthDate = new Date(document.getElementById('birth').value);
  const sex = document.getElementById('sex').value;
  const height = parseFloat(document.getElementById('height').value);
  const weight = parseFloat(document.getElementById('weight').value);

  if (!measureDate || !birthDate || !height || !weight) {
    document.getElementById('result').innerText = "Заполните все поля WHO LMS!";
    return;
  }

  const ageMonths = (measureDate - birthDate) / (1000 * 60 * 60 * 24 * 30.4375);
  const bmi = weight / ((height / 100) ** 2);

  document.getElementById('result').innerText =
    Возраст: ${ageMonths.toFixed(1)} мес\nBMI: ${bmi.toFixed(2)};
}

// ===== ARFID тест =====
function calculateResult() {
  const form = document.getElementById('quizForm');
  const data = new FormData(form);
  let total = 0;

  for (let [key, value] of data.entries()) {
    if (!isNaN(value)) total += parseInt(value);
  }

  // Чекбоксы
  const parentChecked = form.querySelector('input[name="parent"]').checked;
  const redflagChecked = form.querySelector('input[name="redflag"]').checked;

  let resultText = Сумма баллов: ${total}\n;
  resultText += parentChecked ? "Родительский блок отмечен ✅\n" : "";
  resultText += redflagChecked ? "Красные флаги отмечены ❌\n" : "";

  document.getElementById('testResult').innerText = resultText;
}

// ===== Экспорт в Excel =====
function exportToExcel() {
  const wb = XLSX.utils.book_new();

  // WHO LMS
  const whoData = [
    ["Дата измерения", document.getElementById('measure').value],
    ["Дата рождения", document.getElementById('birth').value],
    ["Пол", document.getElementById('sex').value],
    ["Рост (см)", document.getElementById('height').value],
    ["Вес (кг)", document.getElementById('weight').value],
    ["BMI / Возраст (мес)", document.getElementById('result').innerText]
  ];
  const whoSheet = XLSX.utils.aoa_to_sheet(whoData);
  XLSX.utils.book_append_sheet(wb, whoSheet, "WHO LMS");

  // ARFID
  const form = document.getElementById('quizForm');
  const data = new FormData(form);
  const arfidData = [["Вопрос", "Ответ"]];
  for (let [key, value] of data.entries()) {
    arfidData.push([key, value]);
  }
  arfidData.push(["Результат теста", document.getElementById('testResult').innerText]);
  const arfidSheet = XLSX.utils.aoa_to_sheet(arfidData);
  XLSX.utils.book_append_sheet(wb, arfidSheet, "ARFID");

  XLSX.writeFile(wb, "results.xlsx");
}


const whoData = [
  // Пример данных
  { name: "Alice", score: 10 },
  { name: "Bob", score: 8 },
  { name: "Charlie", score: 12 }
];

// -------------------
// WHO LMS калькулятор
// -------------------
function calculateBMI() {
  const height = parseFloat(document.getElementById("height").value);
  const weight = parseFloat(document.getElementById("weight").value);

  if (!height || !weight) {
    alert("Введите рост и вес!");
    return;
  }

  const bmi = weight / ((height / 100) ** 2);
  let category = "";

  if (bmi < 18.5) category = "Недостаточный вес";
  else if (bmi < 25) category = "Нормальный вес";
  else if (bmi < 30) category = "Избыточный вес";
  else category = "Ожирение";

  document.getElementById("result").innerText = BMI: ${bmi.toFixed(1)} (${category});
}

// -------------------
// ARFID опросник
// -------------------
function calculateResult() {
  const form = document.getElementById("quizForm");
  const formData = new FormData(form);
  const result = {};

  // Считаем суммы по доменам
  result.medical = 0;
  result.nutrition = 0;
  result.skills = 0;

  for (const [key, value] of formData.entries()) {
    const num = parseInt(value);
    if (key.startsWith("q1") || key.startsWith("q2")) result.medical += num;
    if (key.startsWith("q8")) result.nutrition += num;
    if (key.startsWith("q17")) result.skills += num;
    // checkbox
    if (key === "parent") result.parent = true;
    if (key === "redflag") result.redflag = true;
  }

  document.getElementById("testResult").innerText =
    Результаты ARFID:\nМедицинский домен: ${result.medical}\nНутритивный домен: ${result.nutrition}\nНавыки кормления: ${result.skills}\n +
    (result.parent ? "Родительский блок отмечен\n" : "") +
    (result.redflag ? "Красные флаги отмечены\n" : "");
}

// -------------------
// Экспорт в Excel
// -------------------
function exportToExcel() {
  const wb = XLSX.utils.book_new();
  const whoSheet = XLSX.utils.json_to_sheet(whoData);

  // Добавим данные ARFID с формы
  const arfidForm = document.getElementById("quizForm");
  const formData = new FormData(arfidForm);
  const arfidData = {};
  for (const [key, value] of formData.entries()) arfidData[key] = value;

  const arfidSheet = XLSX.utils.json_to_sheet([arfidData]);

  XLSX.utils.book_append_sheet(wb, whoSheet, "WHO LMS");
  XLSX.utils.book_append_sheet(wb, arfidSheet, "ARFID");

  XLSX.writeFile(wb, "results.xlsx");
}

// -------------------
// Запуск после загрузки
// -------------------
document.addEventListener("DOMContentLoaded", () => {
  // Можно добавить обработчики кнопок через JS
  // Но в HTML мы уже указали onclick, так что необязательно
});

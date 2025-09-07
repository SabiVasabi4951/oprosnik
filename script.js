// ===== WHO LMS калькулятор =====const GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxEt2avTH2SAyL1TCgswa_p8P05fYteRfvQYyh1HqtbXSWdiMM_BjcXfH91xcxutPLR/exec';

// --- ARFID ---
function calculateResult() {
  const form = document.getElementById('quizForm');
  const formData = new FormData(form);

  // Считаем суммы по доменам
  let medical = 0;
  let nutritive = 0;
  let skills = 0;
  formData.forEach((value, key) => {
    if (key === 'q1' || key === 'q2') medical += Number(value);
    if (key === 'q8') nutritive += Number(value);
    if (key === 'q17') skills += Number(value);
  });

  const parentChecked = formData.getAll('parent').length > 0 ? 'Да' : 'Нет';
  const redflagChecked = formData.getAll('redflag').length > 0 ? 'Да' : 'Нет';

  const resultText = 
    ARFID Результаты:\n +
    Медицинский домен: ${medical}\n +
    Нутритивный домен: ${nutritive}\n +
    Навыки кормления: ${skills}\n +
    Родительский блок: ${parentChecked}\n +
    Красные флаги: ${redflagChecked};

  document.getElementById('testResult').innerText = resultText;

  return {
    medical, nutritive, skills, parentChecked, redflagChecked,
    clinic: document.getElementById('clinic').value,
    timestamp: new Date().toISOString()
  };
}

// --- WHO LMS / BMI ---
function calculateBMI() {
  const height = Number(document.getElementById('height').value);
  const weight = Number(document.getElementById('weight').value);
  const sex = document.getElementById('sex').value;
  const birth = document.getElementById('birth').value;
  const measure = document.getElementById('measure').value;

  if (!height || !weight) {
    document.getElementById('result').innerText = "Введите рост и вес!";
    return null;
  }

  const bmi = weight / ((height / 100) ** 2);
  const bmiRounded = bmi.toFixed(2);

  document.getElementById('result').innerText = 
    BMI: ${bmiRounded}\nПол: ${sex}\nДата рождения: ${birth}\nДата измерения: ${measure};

  return {
    height, weight, sex, birth, measure, bmi: bmiRounded
  };
}

// --- Отправка в Google Sheets ---
async function sendToSheets(arfidData, bmiData) {
  const payload = {
    ...arfidData,
    ...bmiData
  };

  try {
    await fetch(GAS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log("Данные отправлены в Google Sheets ✅");
  } catch (err) {
    console.error("Ошибка отправки в Google Sheets:", err);
  }
}

// --- Экспорт в Excel ---
function exportToExcel() {
  const arfidData = calculateResult();
  const bmiData = calculateBMI();
  if (!arfidData || !bmiData) return;

  const ws_data = [
    ["Номер поликлиники", "Медицинский домен", "Нутритивный домен", "Навыки кормления", "Родительский блок", "Красные флаги",
     "Рост", "Вес", "Пол", "Дата рождения", "Дата измерения", "BMI", "Timestamp"],
    [
      arfidData.clinic, arfidData.medical, arfidData.nutritive, arfidData.skills,
      arfidData.parentChecked, arfidData.redflagChecked,
      bmiData.height, bmiData.weight, bmiData.sex, bmiData.birth, bmiData.measure, bmiData.bmi,
      arfidData.timestamp
    ]
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  XLSX.utils.book_append_sheet(wb, ws, "Результаты");
  XLSX.writeFile(wb, "ARFID_WHO_Results.xlsx");

  // Отправляем в Google Sheets
  sendToSheets(arfidData, bmiData);
}


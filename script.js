var GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxEt2avTH2SAyL1TCgswa_p8P05fYteRfvQYyh1HqtbXSWdiMM_BjcXfH91xcxutPLR/exec';

// --- ARFID ---
function calculateResult() {
  var form = document.getElementById('quizForm');
  var formData = new FormData(form);

  var medical = 0;
  var nutritive = 0;
  var skills = 0;

  formData.forEach(function(value, key) {
    if (key === 'q1' || key === 'q2') medical += Number(value);
    if (key === 'q8') nutritive += Number(value);
    if (key === 'q17') skills += Number(value);
  });

  var parentChecked = formData.getAll('parent').length > 0 ? 'Да' : 'Нет';
  var redflagChecked = formData.getAll('redflag').length > 0 ? 'Да' : 'Нет';

  var resultText = 
    'ARFID Результаты:\n' +
    'Медицинский домен: ' + medical + '\n' +
    'Нутритивный домен: ' + nutritive + '\n' +
    'Навыки кормления: ' + skills + '\n' +
    'Родительский блок: ' + parentChecked + '\n' +
    'Красные флаги: ' + redflagChecked;

  document.getElementById('testResult').innerText = resultText;

  return {
    medical: medical,
    nutritive: nutritive,
    skills: skills,
    parentChecked: parentChecked,
    redflagChecked: redflagChecked,
    clinic: document.getElementById('clinic').value,
    timestamp: new Date().toISOString()
  };
}

// --- WHO LMS / BMI ---
function calculateBMI() {
  var height = Number(document.getElementById('height').value);
  var weight = Number(document.getElementById('weight').value);
  var sex = document.getElementById('sex').value;
  var birth = document.getElementById('birth').value;
  var measure = document.getElementById('measure').value;

  if (!height || !weight) {
    document.getElementById('result').innerText = 'Введите рост и вес!';
    return null;
  }

  var bmi = weight / ((height / 100) * (height / 100));
  var bmiRounded = bmi.toFixed(2);

  document.getElementById('result').innerText = 
    'BMI: ' + bmiRounded + '\nПол: ' + sex + '\nДата рождения: ' + birth + '\nДата измерения: ' + measure;

  return {
    height: height,
    weight: weight,
    sex: sex,
    birth: birth,
    measure: measure,
    bmi: bmiRounded
  };
}

// --- Отправка в Google Sheets ---
function sendToSheets(arfidData, bmiData) {
  var payload = {};
  for (var key in arfidData) payload[key] = arfidData[key];
  for (var key in bmiData) payload[key] = bmiData[key];

  fetch(GAS_ENDPOINT, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  }).then(function() {
    console.log('Данные отправлены в Google Sheets ✅');
  }).catch(function(err) {
    console.error('Ошибка отправки в Google Sheets:', err);
  });
}

// --- Экспорт в Excel ---
function exportToExcel() {
  var arfidData = calculateResult();
  var bmiData = calculateBMI();
  if (!arfidData || !bmiData) return;

  var ws_data = [
    ['Номер поликлиники','Медицинский домен','Нутритивный домен','Навыки кормления','Родительский блок','Красные флаги',
     'Рост','Вес','Пол','Дата рождения','Дата измерения','BMI','Timestamp'],
    [
      arfidData.clinic, arfidData.medical, arfidData.nutritive, arfidData.skills,
      arfidData.parentChecked, arfidData.redflagChecked,
      bmiData.height, bmiData.weight, bmiData.sex, bmiData.birth, bmiData.measure, bmiData.bmi,
      arfidData.timestamp
    ]
  ];

  var wb = XLSX.utils.book_new();
  var ws = XLSX.utils.aoa_to_sheet(ws_data);
  XLSX.utils.book_append_sheet(wb, ws, 'Результаты');
  XLSX.writeFile(wb, 'ARFID_WHO_Results.xlsx');

  sendToSheets(arfidData, bmiData);
}

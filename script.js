const form = document.getElementById('expense-form');
const scheduleDateInput = document.getElementById('schedule-date');
const tableBody = document.querySelector('#expense-table tbody');
const chartCanvas = document.getElementById('expenseChart');

let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
let exchangeRates = {};

async function loadRates() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/SAR');
    const json = await res.json();
    if (json.result === 'success') {
      exchangeRates = json.rates; // تحويل من SAR إلى العملات الأخرى
    }
  } catch (err) {
    console.error('Failed to fetch exchange rates', err);
  }
}

function convertToDaily(amount, frequency) {
  switch (frequency) {
    case 'شهري': return amount / 30;
    case 'سنوي': return amount / 365;
    case 'مرة واحدة': return amount;
    case 'يومي':
    default: return amount;
  }
}

form.addEventListener('submit', async function(e) {
  e.preventDefault();

  let name = document.getElementById('name').value;
  let category = document.getElementById('category').value;
  let amount = parseFloat(document.getElementById('amount').value);
  let currency = document.getElementById('currency').value;
  let frequency = document.getElementById('frequency').value;
  let notification = document.getElementById('notification').value;
  let date = document.getElementById('date').value;
  let scheduleDate = document.getElementById('schedule-date').value;
  let notes = document.getElementById('notes').value;

  if (currency !== 'SAR' && exchangeRates[currency]) {
    amount = amount / exchangeRates[currency];
    currency = 'SAR';
  }

  const dailyAmount = convertToDaily(amount, frequency);

  const entry = {
    id: Date.now(),
    name,
    category,
    amount: dailyAmount,
    currency,
    frequency,
    date,
    notes,
    notification,
    scheduleDate
  };

  expenses.push(entry);
  localStorage.setItem('expenses', JSON.stringify(expenses));

  form.reset();
  scheduleDateInput.style.display = 'none';
  renderTable();
  renderChart();

  if (notification.includes('فوري')) sendWhatsApp(entry);
});

function renderTable() {
  tableBody.innerHTML = '';
  let total = 0;

  expenses.forEach(exp => {
    total += exp.amount;
    tableBody.innerHTML += `
      <tr>
        <td>${exp.name}</td>
        <td>${exp.category}</td>
        <td>${Math.round(exp.amount)}</td>
        <td>SAR</td>
        <td>${exp.frequency}</td>
        <td>${exp.date}</td>
        <td>${exp.notes || ''}</td>
        <td><button onclick="deleteEntry(${exp.id})">🗑️ حذف</button></td>
      </tr>`;
  });

  document.getElementById('total-expenses').innerText = `${Math.round(total)} ريال / يوم`;
  calculateNetProfit(total);
}

function deleteEntry(id) {
  expenses = expenses.filter(e => e.id !== id);
  localStorage.setItem('expenses', JSON.stringify(expenses));
  renderTable();
  renderChart();
}

function renderChart() {
  const grouped = expenses.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {});

  const chartData = {
    labels: Object.keys(grouped),
    datasets: [{
      label: 'المصاريف اليومية',
      data: Object.values(grouped).map(val => Math.round(val)),
      backgroundColor: '#00a8e8'
    }]
  };

  if (window.myChart) window.myChart.destroy();
  window.myChart = new Chart(chartCanvas, {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function calculateNetProfit(totalExpenses) {
  const sales = parseFloat(document.getElementById('daily-sales').value) || 0;
  const profit = parseFloat(document.getElementById('daily-profit').value) || 0;
  const net = profit - totalExpenses;
  document.getElementById('net-profit').innerText = `${Math.round(net)} ريال / يوم`;
}

document.getElementById('daily-sales').addEventListener('input', () => {
  calculateNetProfit(expenses.reduce((s, e) => s + e.amount, 0));
});
document.getElementById('daily-profit').addEventListener('input', () => {
  calculateNetProfit(expenses.reduce((s, e) => s + e.amount, 0));
});

function sendWhatsApp(entry) {
  const url = `https://api.whatsapp.com/send?phone=+966554520700&text=${encodeURIComponent(`Reminder: Your ${entry.name} payment is due today.`)}`;
  window.open(url, '_blank');
}

function exportReport() {
  const reportArea = document.querySelector('main');

  html2canvas(reportArea, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff'
  }).then(canvas => {
    const link = document.createElement('a');
    link.download = 'تقرير_المصاريف.jpg';
    link.href = canvas.toDataURL('image/jpeg', 1.0);
    link.click();
  });
}

async function init() {
  await loadRates();
  renderTable();
  renderChart();
}

window.onload = init;

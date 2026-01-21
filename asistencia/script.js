const ADMIN_PASSWORD = "admin123";
const EMPLOYEE_PASSWORD = "empleado";

let employees = JSON.parse(localStorage.getItem("employees")) || [];
let attendances = JSON.parse(localStorage.getItem("attendances")) || [];
let editIndex = null;

/* ======================
   LOGIN
====================== */
function login(){
  const role = loginRole.value;
  const pass = loginPassword.value;

  if((role==="admin" && pass===ADMIN_PASSWORD) || 
     (role==="employee" && pass===EMPLOYEE_PASSWORD)){
    localStorage.setItem("role", role);
    loginContainer.style.display="none";
    systemContainer.style.display="block";
    applyRolePermissions();
    renderEmployeeTable();
    renderAttendanceTable();
  } else {
    alert("Credenciales incorrectas");
  }
}

function applyRolePermissions(){
  const role = localStorage.getItem("role");
  document.querySelectorAll(".admin-only").forEach(el=>el.style.display="none");
  document.querySelectorAll(".employee-only").forEach(el=>el.style.display="none");

  if(role==="admin"){
    document.querySelectorAll(".admin-only").forEach(el=>el.style.display="block");
  }
  if(role==="employee"){
    document.querySelectorAll(".employee-only").forEach(el=>el.style.display="block");
  }
}

function logout(){
  localStorage.removeItem("role");
  loginContainer.style.display="block";
  systemContainer.style.display="none";
}

/* ======================
   EMPLEADOS
====================== */
function addEmployee(){
  const empName = document.getElementById("name").value.trim();
  const empCode = document.getElementById("code").value.trim();
  const empSalary = document.getElementById("salary").value.trim();

  if(!empName || !empCode || !empSalary){
    alert("Complete todos los campos");
    return;
  }

  if(editIndex === null){
    if(employees.some(e => e.code === empCode)){
      alert("Código ya existe");
      return;
    }

    employees.push({
      id: Date.now(),
      name: empName,
      code: empCode,
      salary: parseFloat(empSalary)
    });
  } else {
    employees[editIndex].name = empName;
    employees[editIndex].code = empCode;
    employees[editIndex].salary = parseFloat(empSalary);
    editIndex = null;
  }

  localStorage.setItem("employees", JSON.stringify(employees));
  renderEmployeeTable();
  renderAttendanceTable();

  document.getElementById("name").value = "";
  document.getElementById("code").value = "";
  document.getElementById("salary").value = "";
}

function renderEmployeeTable(){
  const tbody = document.getElementById("employeeTable");
  tbody.innerHTML = "";

  employees.sort((a,b)=>a.name.localeCompare(b.name)).forEach((e,i)=>{
    tbody.innerHTML += `
      <tr>
        <td>${e.name}</td>
        <td>${e.code}</td>
        <td>S/ ${e.salary}</td>
        <td>
          <button onclick="editEmployee(${i})">Editar</button>
          <button onclick="deleteEmployee(${i})" style="background:#dc3545">Borrar</button>
        </td>
      </tr>`;
  });
}

function editEmployee(i){
  const e = employees[i];
  document.getElementById("name").value = e.name;
  document.getElementById("code").value = e.code;
  document.getElementById("salary").value = e.salary;
  editIndex = i;
}

function deleteEmployee(i){
  if(!confirm("¿Eliminar empleado?")) return;

  const id = employees[i].id;
  attendances = attendances.filter(a=>a.employeeId !== id);
  employees.splice(i,1);

  localStorage.setItem("employees", JSON.stringify(employees));
  localStorage.setItem("attendances", JSON.stringify(attendances));

  renderEmployeeTable();
  renderAttendanceTable();
}

/* ======================
   ASISTENCIAS
====================== */
function checkInBarcode(){
  const barcode = document.getElementById("barcodeInput").value.trim();
  const emp = employees.find(e=>e.code === barcode);
  if(!emp){ alert("Empleado no encontrado"); return; }

  const today = new Date().toLocaleDateString();
  if(attendances.some(a=>a.employeeId===emp.id && a.date===today)){
    alert("Ya registró hoy");
    return;
  }

  const now = new Date();
  const official = new Date(); official.setHours(8,15,0,0);

  let late=0, discount=0;
  if(now > official){
    late = Math.floor((now-official)/60000);
    discount = Math.ceil(late/15)*5;
  }

  attendances.push({
    employeeId: emp.id,
    date: today,
    checkIn: now.toLocaleTimeString(),
    checkOut: "",
    lateMinutes: late,
    discount,
    justified:false
  });

  localStorage.setItem("attendances", JSON.stringify(attendances));
  renderAttendanceTable();
  document.getElementById("barcodeInput").value="";
}

function checkOutBarcode(){
  const barcode = document.getElementById("barcodeInput").value.trim();
  const emp = employees.find(e=>e.code === barcode);
  if(!emp){ alert("Empleado no encontrado"); return; }

  const today = new Date().toLocaleDateString();
  const rec = attendances.find(a=>a.employeeId===emp.id && a.date===today && !a.checkOut);
  if(!rec){ alert("No hay entrada activa"); return; }

  rec.checkOut = new Date().toLocaleTimeString();
  localStorage.setItem("attendances", JSON.stringify(attendances));
  renderAttendanceTable();
  document.getElementById("barcodeInput").value="";
}

/* ======================
   CONTROL
====================== */
function toggleJustify(i){
  attendances[i].justified = !attendances[i].justified;
  attendances[i].discount = attendances[i].justified ? 0 : attendances[i].discount;
  localStorage.setItem("attendances", JSON.stringify(attendances));
  renderAttendanceTable();
}

function deleteAttendance(i){
  if(!confirm("¿Eliminar asistencia?")) return;
  attendances.splice(i,1);
  localStorage.setItem("attendances", JSON.stringify(attendances));
  renderAttendanceTable();
}

/* ======================
   TABLA
====================== */
function renderAttendanceTable(list = attendances){
  const table = document.getElementById("attendanceTable");
  table.innerHTML = "";

  list.forEach((a,i)=>{
    const emp = employees.find(e=>e.id===a.employeeId);
    const sueldo = emp?.salary || 0;
    const desc = a.justified ? 0 : a.discount;
    const neto = sueldo - desc;

    table.innerHTML += `
      <tr>
        <td>${emp?.name || ""}</td>
        <td>${a.date}</td>
        <td>${a.checkIn}</td>
        <td>${a.checkOut}</td>
        <td>${a.lateMinutes}</td>
        <td>S/ ${neto}</td>
        <td>S/ ${desc}</td>
        <td>
          <button onclick="toggleJustify(${i})">${a.justified?"Puntual":"Justificar"}</button>
          <button onclick="deleteAttendance(${i})" style="background:#dc3545">Borrar</button>
        </td>
      </tr>`;
  });
}

/* ======================
   BUSCAR POR NOMBRE
====================== */
function searchByEmployee(){
  const txt = document.getElementById("searchEmployee").value.toLowerCase();
  const filtered = attendances.filter(a=>{
    const emp = employees.find(e=>e.id===a.employeeId);
    return emp && emp.name.toLowerCase().includes(txt);
  });
  renderAttendanceTable(filtered);
}

/* ======================
   REPORTE POR FECHAS
====================== */
function filterByDates(){
  const d1 = new Date(fromDate.value);
  const d2 = new Date(toDate.value);

  const filtered = attendances.filter(a=>{
    const d = new Date(a.date.split('/').reverse().join('-'));
    return d>=d1 && d<=d2;
  });

  renderAttendanceTable(filtered);
  renderWeeklyReport(filtered);
}

function renderWeeklyReport(list){
  const report = document.getElementById("reportTable");
  report.innerHTML = "";
  let totals={};

  list.forEach(a=>{
    const emp = employees.find(e=>e.id===a.employeeId);
    if(!emp) return;
    const net = emp.salary - (a.justified?0:a.discount);
    totals[emp.name]=(totals[emp.name]||0)+net;
  });

  Object.entries(totals).forEach(([n,t])=>{
    report.innerHTML+=`<tr><td>${n}</td><td>S/ ${t.toFixed(2)}</td></tr>`;
  });
}

/* ======================
   EXCEL
====================== */
function exportToExcel(){
  const data = attendances.map(a=>{
    const emp = employees.find(e=>e.id===a.employeeId);
    const sueldo = emp?.salary||0;
    const desc = a.justified?0:a.discount;

    return {
      Empleado: emp?.name||"",
      Fecha: a.date,
      Entrada: a.checkIn,
      Salida: a.checkOut,
      Tardanza: a.lateMinutes,
      Descuento: desc,
      Sueldo: sueldo,
      PagoNeto: sueldo-desc
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,"Asistencias");
  XLSX.writeFile(wb,"Reporte_Empresarial.xlsx");
}

/* ======================
   INICIO
====================== */
window.onload=()=>{
  if(localStorage.getItem("role")){
    loginContainer.style.display="none";
    systemContainer.style.display="block";
    applyRolePermissions();
    renderEmployeeTable();
    renderAttendanceTable();
  }
};

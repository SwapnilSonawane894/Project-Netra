// src/components/specific/AttendanceTable.js
import styles from './AttendanceTable.module.css';

const exportToCSV = (data) => {
  if (data.length === 0) {
    alert("No attendance data to export.");
    return;
  }
  const headers = "Roll No,Name,Timestamp\n";
  const rows = data.map(row => `${row.rollNo},${row.name},${row.timestamp}`).join('\n');
  const csvContent = headers + rows;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", "attendance_report.csv");
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


export default function AttendanceTable({ attendanceData }) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2>Confirmed Attendance</h2>
        <button onClick={() => exportToCSV(attendanceData)} className={styles.exportButton}>
          Export to CSV
        </button>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Roll No</th>
            <th>Name</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {attendanceData.map((student) => (
            <tr key={student.rollNo}>
              <td>{student.rollNo}</td>
              <td>{student.name}</td>
              <td>{student.timestamp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
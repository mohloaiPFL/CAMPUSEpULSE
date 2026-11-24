import { jsPDF } from "jspdf";

const sampleModules = [
  { name: "Module 1", grade: "A", gradePoints: 4.0 },
  { name: "Module 2", grade: "B+", gradePoints: 3.3 },
  { name: "Module 3", grade: "A-", gradePoints: 3.7 },
  { name: "Module 4", grade: "B", gradePoints: 3.0 },
  { name: "Module 5", grade: "A", gradePoints: 4.0 },
  { name: "Module 6", grade: "B+", gradePoints: 3.3 },
];

export function createTranscriptPdf({ course, studentId, studentName }) {
  const details = {
    course: course?.trim(),
    studentId: studentId?.trim(),
    studentName: studentName?.trim(),
  };
  if (!details.course || !details.studentId || !details.studentName) {
    throw new Error("A student name, student ID, and course are required to create this sample transcript.");
  }

  const document = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = document.internal.pageSize.getWidth();
  const margin = 20;
  const gpa = (
    sampleModules.reduce((total, module) => total + module.gradePoints, 0) / sampleModules.length
  ).toFixed(2);

  document.setTextColor(17, 24, 39);
  document.setFont("helvetica", "bold");
  document.setFontSize(18);
  document.text("ACADEMIC TRANSCRIPT", margin, 25);

  document.setTextColor(17, 24, 39);
  document.setFont("helvetica", "normal");
  document.setFontSize(11);
  document.text(`Student name: ${details.studentName}`, margin, 70);
  document.text(`Student ID: ${details.studentId}`, margin, 80);
  document.text(`Course / programme: ${details.course}`, margin, 90);

  document.setFillColor(17, 24, 39);
  document.rect(margin, 105, pageWidth - margin * 2, 10, "F");
  document.setTextColor(255, 255, 255);
  document.setFont("helvetica", "bold");
  document.setFontSize(10);
  document.text("MODULE", margin + 4, 111.5);
  document.text("GRADE", margin + 91, 111.5);
  document.text("GRADE POINTS", margin + 139, 111.5);

  document.setTextColor(31, 41, 55);
  document.setFont("helvetica", "normal");
  sampleModules.forEach((module, index) => {
    const y = 126 + index * 13;
    document.setFillColor(index % 2 === 0 ? 247 : 255, index % 2 === 0 ? 249 : 255, index % 2 === 0 ? 247 : 255);
    document.rect(margin, y - 7, pageWidth - margin * 2, 11, "F");
    document.text(module.name, margin + 4, y);
    document.text(module.grade, margin + 104, y);
    document.text(module.gradePoints.toFixed(1), margin + 151, y);
  });

  document.setDrawColor(17, 24, 39);
  document.line(margin, 211, pageWidth - margin, 211);
  document.setFont("helvetica", "bold");
  document.setFontSize(12);
  document.text(`Sample GPA (4.0 scale): ${gpa}`, margin, 225);
  document.setFont("helvetica", "normal");
  document.setFontSize(9);
  document.setTextColor(17, 24, 39);
  document.text(
    "Module names, grades, and GPA.",
    margin,
    238,
    { maxWidth: pageWidth - margin * 2 },
  );
  document.text(
    "This document is issued, verified, or certified by the LIMKOKWING UNIVERSITY LESOTHO.",
    margin,
    246,
  );

  return document;
}

export function downloadTranscript(details) {
  const document = createTranscriptPdf(details);
  const safeStudentId = details.studentId.replace(/[^a-zA-Z0-9-]/g, "");
  document.save(`sample-transcript-${safeStudentId}.pdf`);
}

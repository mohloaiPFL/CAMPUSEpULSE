import { jsPDF } from "jspdf";

export function createRecommendationLetterPdf({
  faculty,
  studentId,
  studentName,
}) {
  const details = {
    faculty: faculty?.trim(),
    studentId: studentId?.trim(),
    studentName: studentName?.trim(),
  };
  if (!details.faculty || !details.studentId || !details.studentName) {
    throw new Error("A student name, student ID, and faculty are required to create this letter.");
  }

  const document = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = document.internal.pageSize.getWidth();
  const margin = 20;
  const textWidth = pageWidth - margin * 2;

  document.setFillColor(24, 69, 45);
  document.rect(0, 0, pageWidth, 39, "F");
  document.setTextColor(255, 255, 255);
  document.setFont("helvetica", "bold");
  document.setFontSize(16);
  document.text("LIMKOKWING", margin, 17);
  document.setFontSize(10);
  document.text("UNIVERSITY OF CREATIVE TECHNOLOGY", margin, 24);
  document.setFont("helvetica", "normal");
  document.setFontSize(9);
  document.text("REGISTRY | CAMPUS PULSE STUDENT SERVICES", margin, 31);

  document.setTextColor(31, 41, 55);
  document.setFontSize(10);
  document.text(new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }), pageWidth - margin, 53, { align: "right" });

  document.setTextColor(24, 69, 45);
  document.setFont("helvetica", "bold");
  document.setFontSize(17);
  document.text("LETTER OF RECOMMENDATION", margin, 72);
  document.setDrawColor(209, 213, 217);
  document.line(margin, 79, pageWidth - margin, 79);

  document.setTextColor(17, 24, 39);
  document.setFontSize(11);
  document.text("To whom it may concern,", margin, 96);

  document.setFont("helvetica", "normal");
  document.setFontSize(11);
  const paragraphs = [
    `The University is pleased to recommend ${details.studentName} for consideration. ${details.studentName} is a registered student in the ${details.faculty}, identified by Student ID ${details.studentId}.`,
    "This letter is issued at the student's request following approval by the University Registry. We trust that the student's application will receive your consideration.",
    "Please contact the University Registry through its official channels if further verification is required.",
  ];
  let y = 110;
  paragraphs.forEach((paragraph) => {
    const lines = document.splitTextToSize(paragraph, textWidth);
    document.text(lines, margin, y);
    y += lines.length * 6 + 9;
  });

  document.setFont("helvetica", "normal");
  document.text("Yours faithfully,", margin, y + 4);
  document.setFont("helvetica", "bold");
  document.text("University Registry", margin, y + 20);
  document.setFont("helvetica", "normal");
  document.setTextColor(75, 85, 99);
  document.text("Electronically issued after administrator approval", margin, y + 27);

  document.setDrawColor(209, 213, 217);
  document.line(margin, 274, pageWidth - margin, 274);
  document.setFontSize(8);
  document.text(
    "Campus Pulse | System-generated document for the approved student request",
    pageWidth / 2,
    281,
    { align: "center" },
  );
  return document;
}

export function downloadRecommendationLetter(details) {
  const document = createRecommendationLetterPdf(details);
  const safeStudentId = details.studentId.replace(/[^a-zA-Z0-9-]/g, "");
  document.save(`recommendation-letter-${safeStudentId}.pdf`);
}

const { TextDecoder, TextEncoder } = require("util");

global.TextDecoder = TextDecoder;
global.TextEncoder = TextEncoder;

const { createTranscriptPdf } = require("./transcript");

test("creates a clearly labeled sample A4 transcript with student details, six modules, and a calculated GPA", () => {
  const document = createTranscriptPdf({
    studentName: "Mpho Ndlovu",
    studentId: "901019001",
    course: "Bachelor of Design",
  });
  const output = document.output();

  expect(document.internal.pageSize.getWidth()).toBeCloseTo(210, 1);
  expect(document.internal.pageSize.getHeight()).toBeCloseTo(297, 1);
  expect(output).toContain("Mpho Ndlovu");
  expect(output).toContain("901019001");
  expect(output).toContain("Bachelor of Design");
  expect(output).toContain("Module 1");
  expect(output).toContain("Module 6");
  expect(output).toContain("3.55");
  expect(output).toContain("NOT AN OFFICIAL ACADEMIC RECORD");
});

test("requires real student identity and course details before creating a sample transcript", () => {
  expect(() => createTranscriptPdf({
    studentName: "Mpho Ndlovu",
    studentId: "901019001",
    course: "",
  })).toThrow(/student name, student ID, and course are required/i);
});

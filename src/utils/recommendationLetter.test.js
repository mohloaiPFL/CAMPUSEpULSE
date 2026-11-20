const { TextDecoder, TextEncoder } = require("util");

global.TextDecoder = TextDecoder;
global.TextEncoder = TextEncoder;

const { createRecommendationLetterPdf } = require("./recommendationLetter");

test("creates a personalized printable A4 recommendation letter", () => {
  const document = createRecommendationLetterPdf({
    studentName: "Mpho Ndlovu",
    studentId: "901019001",
    faculty: "Faculty of Design and Innovation",
  });

  expect(document.internal.pageSize.getWidth()).toBeCloseTo(210, 1);
  expect(document.internal.pageSize.getHeight()).toBeCloseTo(297, 1);
  expect(document.output()).toContain("Mpho Ndlovu");
  expect(document.output()).toContain("901019001");
  expect(document.output()).toContain("Faculty of Design and Innovation");
});

test("requires the approved student identity fields before creating a letter", () => {
  expect(() => createRecommendationLetterPdf({
    studentName: "Mpho Ndlovu",
    studentId: "",
    faculty: "Faculty of Design and Innovation",
  })).toThrow(/student name, student ID, and faculty are required/i);
});

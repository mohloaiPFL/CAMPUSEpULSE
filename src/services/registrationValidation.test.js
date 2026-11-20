import {
  sanitizeRegistrationInput,
  validateRegistrationDetails,
} from "./registrationValidation";

const validDetails = {
  firstName: "Neo",
  surname: "Mokoena",
  faculty: "Faculty of Design and Innovation",
  course: "Bachelor of Design",
  level: "Degree",
  sponsorship: "Self-sponsored",
  gender: "Male",
  phoneNumber: "+266 5012 3456",
  address: "Plot 123, Maseru",
  kinName: "Palesa Mokoena",
  kinRelationship: "Parent",
  kinPhoneNumber: "+266 5888 1234",
};

test("accepts valid details, including accented and hyphenated names", () => {
  expect(validateRegistrationDetails({
    ...validDetails,
    firstName: "Néo",
    surname: "Mokoena-Smith",
    kinName: "Palesa Dlamini",
  })).toEqual({});
});

test("rejects digits and punctuation in person names and relationship", () => {
  const errors = validateRegistrationDetails({
    ...validDetails,
    firstName: "Neo2",
    surname: "Mokoena!",
    kinName: "Palesa3",
    kinRelationship: "Guardian2",
  });

  expect(errors.firstName).toMatch(/letters only/i);
  expect(errors.surname).toMatch(/letters only/i);
  expect(errors.kinName).toMatch(/letters only/i);
  expect(errors.kinRelationship).toMatch(/letters only/i);
});

test("filters unsupported characters from names and phone numbers as they are entered", () => {
  expect(sanitizeRegistrationInput("firstName", "Neo...,/5677?")).toBe("Neo");
  expect(sanitizeRegistrationInput("kinName", "Palesa3 Dlamini!")).toBe("Palesa Dlamini");
  expect(sanitizeRegistrationInput("course", "Computer Science;;;;.,/,[98877]")).toBe("Computer Science");
  expect(sanitizeRegistrationInput("phoneNumber", "jbjvgvv][';]")).toBe("");
  expect(sanitizeRegistrationInput("phoneNumber", "+266 5012 3456 78901")).toBe("+266 5012 3456 7890");
});

test("requires real phone digits and rejects letters or too many digits", () => {
  expect(validateRegistrationDetails({
    ...validDetails,
    phoneNumber: "-------",
    kinPhoneNumber: "1234567890123456",
  })).toMatchObject({
    phoneNumber: expect.stringMatching(/7–15 digits/),
    kinPhoneNumber: expect.stringMatching(/7–15 digits/),
  });
  expect(validateRegistrationDetails({
    ...validDetails,
    phoneNumber: "+266 50AB 1234",
  }).phoneNumber).toMatch(/7–15 digits/);
  expect(validateRegistrationDetails({
    ...validDetails,
    phoneNumber: "+266 (5012 3456",
  }).phoneNumber).toMatch(/7–15 digits/);
});

test("requires a named sponsor and female residence only when applicable", () => {
  const otherSponsor = validateRegistrationDetails({
    ...validDetails,
    sponsorship: "Other",
    sponsorDetails: "",
  });
  expect(otherSponsor.sponsorDetails).toMatch(/name of your sponsor/i);

  const femaleResidence = validateRegistrationDetails({
    ...validDetails,
    gender: "Female",
  });
  expect(femaleResidence.residence).toMatch(/On campus or Off campus/);

  const maleResidence = validateRegistrationDetails({
    ...validDetails,
    gender: "Male",
    residence: undefined,
  });
  expect(maleResidence.residence).toBeUndefined();
});

test("requires a valid course or programme name", () => {
  expect(validateRegistrationDetails({
    ...validDetails,
    course: "",
  }).course).toMatch(/enter your course or programme/i);
  expect(validateRegistrationDetails({
    ...validDetails,
    course: ";;;;.,/,[98877]",
  }).course).toMatch(/letters and spaces only/i);
  expect(validateRegistrationDetails({
    ...validDetails,
    course: "Bachelor of Design",
  }).course).toBeUndefined();
  expect(validateRegistrationDetails({
    ...validDetails,
    course: "A".repeat(9),
  }).course).toMatch(/10–35/i);
  expect(validateRegistrationDetails({
    ...validDetails,
    course: "A".repeat(10),
  }).course).toBeUndefined();
  expect(validateRegistrationDetails({
    ...validDetails,
    course: "A".repeat(35),
  }).course).toBeUndefined();
  expect(validateRegistrationDetails({
    ...validDetails,
    course: "A".repeat(36),
  }).course).toMatch(/10–35/i);
});

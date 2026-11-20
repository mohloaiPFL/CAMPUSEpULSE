const facultyOptions = [
  "Faculty of Design and Innovation",
  "Faculty of Information Communication Technology",
  "Faculty of Communication, Media & Broadcasting",
  "Faculty of Business Management and Globalization",
  "Faculty of Creativity in Tourism and Hospitality",
  "Faculty of Architecture and Built Environment",
];

const namePattern = /^\p{L}+(?:[ '\u2019-]\p{L}+)*$/u;
const addressPattern = /^[\p{L}\p{N}][\p{L}\p{N}\s,.'/#()-]*$/u;
const phonePattern = /^\+?[0-9][0-9 ()-]*$/;

const personNameFields = new Set(["firstName", "surname", "kinName", "kinRelationship"]);
const phoneFields = new Set(["phoneNumber", "kinPhoneNumber"]);

export function sanitizeRegistrationInput(field, value) {
  if (personNameFields.has(field)) {
    return value.replace(/[^\p{L} '\u2019-]/gu, "");
  }
  if (phoneFields.has(field)) {
    let sanitized = "";
    let digitCount = 0;
    for (const character of value) {
      if (/[0-9]/.test(character)) {
        if (digitCount >= 15) continue;
        digitCount += 1;
        sanitized += character;
      } else if (character === "+" && sanitized.length === 0) {
        sanitized += character;
      } else if (/[ ()-]/.test(character)) {
        sanitized += character;
      }
      if (sanitized.length === 20) break;
    }
    return sanitized;
  }
  if (field === "sponsorDetails") {
    return value.replace(/[^\p{L}\p{N} &.'’()-]/gu, "");
  }
  if (field === "course") {
    return value.replace(/[^\p{L} ]/gu, "");
  }
  if (field === "address") {
    return value.replace(/[^\p{L}\p{N}\s,.'/#()-]/gu, "");
  }
  return value;
}

export function getRegistrationInputFilterMessage(field) {
  if (personNameFields.has(field)) {
    return "Only letters, spaces, apostrophes, and hyphens are accepted. Other characters were removed.";
  }
  if (phoneFields.has(field)) {
    return "Only digits and basic phone formatting (+, spaces, hyphens, parentheses) are accepted. Other characters were removed.";
  }
  if (field === "sponsorDetails") {
    return "Some unsupported characters were removed from the sponsor name.";
  }
  if (field === "course") {
    return "Only letters and spaces are accepted for the course. Other characters were removed.";
  }
  if (field === "address") {
    return "Some unsupported characters were removed from the address.";
  }
  return "";
}

export function validateCourse(value) {
  const course = typeof value === "string" ? value.trim() : "";
  if (!course) return "Enter your course or programme.";
  if (course.length < 10 || course.length > 35 || !/^[\p{L}]+(?: +[\p{L}]+)*$/u.test(course)) {
    return "Use 10–35 letters and spaces only.";
  }
  return "";
}

function isValidPhone(value) {
  const digits = value.replace(/\D/g, "");
  const openParentheses = (value.match(/\(/g) || []).length;
  const closeParentheses = (value.match(/\)/g) || []).length;
  return phonePattern.test(value)
    && digits.length >= 7
    && digits.length <= 15
    && openParentheses === closeParentheses;
}

export function validateRegistrationDetails(details) {
  const errors = {};
  const firstName = (details.firstName || "").trim();
  const surname = (details.surname || "").trim();
  const address = (details.address || "").trim();
  const kinName = (details.kinName || "").trim();
  const kinRelationship = (details.kinRelationship || "").trim();
  const phoneNumber = (details.phoneNumber || "").trim();
  const kinPhoneNumber = (details.kinPhoneNumber || "").trim();
  const sponsorDetails = (details.sponsorDetails || "").trim();

  if (!firstName) errors.firstName = "Enter your first name.";
  else if (firstName.length > 49 || !namePattern.test(firstName)) {
    errors.firstName = "Use letters only. Spaces, apostrophes, and hyphens are allowed (up to 49 characters).";
  }

  if (!surname) errors.surname = "Enter your surname.";
  else if (surname.length > 49 || !namePattern.test(surname)) {
    errors.surname = "Use letters only. Spaces, apostrophes, and hyphens are allowed (up to 49 characters).";
  }

  if (!facultyOptions.includes(details.faculty)) errors.faculty = "Choose a faculty from the list.";
  const courseError = validateCourse(details.course);
  if (courseError) errors.course = courseError;
  if (!["Diploma", "Degree", "TVET"].includes(details.level)) errors.level = "Choose Diploma, Degree, or TVET.";
  if (!["Female", "Male"].includes(details.gender)) errors.gender = "Choose Female or Male.";
  if (!["Self-sponsored", "NMDS", "Other"].includes(details.sponsorship)) {
    errors.sponsorship = "Choose Self-sponsored, NMDS, or Other.";
  }

  if (details.sponsorship === "Other") {
    if (!sponsorDetails) errors.sponsorDetails = "Enter the name of your sponsor.";
    else if (sponsorDetails.length > 100 || !/^[\p{L}\p{N}][\p{L}\p{N} &.'’()-]*$/u.test(sponsorDetails)) {
      errors.sponsorDetails = "Enter a valid sponsor name using letters, numbers, spaces, or basic punctuation.";
    }
  }

  if (details.gender === "Female" && !["On campus", "Off campus"].includes(details.residence)) {
    errors.residence = "Choose On campus or Off campus.";
  }

  if (!isValidPhone(phoneNumber)) errors.phoneNumber = "Enter 7–15 digits. You may use a leading +, spaces, hyphens, or parentheses.";

  if (!address) errors.address = "Enter your residential address.";
  else if (address.length < 5 || address.length > 300 || !addressPattern.test(address)) {
    errors.address = "Use 5–300 characters. Include a street/area and town; letters, numbers, spaces, and , . ' / # ( ) - are allowed.";
  }

  if (!kinName) errors.kinName = "Enter your next of kin’s full name.";
  else if (kinName.length > 100 || !namePattern.test(kinName)) {
    errors.kinName = "Use letters only. Spaces, apostrophes, and hyphens are allowed (up to 100 characters).";
  }

  if (!kinRelationship) errors.kinRelationship = "Enter your relationship to your next of kin.";
  else if (kinRelationship.length > 50 || !namePattern.test(kinRelationship)) {
    errors.kinRelationship = "Use letters only. Spaces, apostrophes, and hyphens are allowed (up to 50 characters).";
  }

  if (!isValidPhone(kinPhoneNumber)) errors.kinPhoneNumber = "Enter 7–15 digits. You may use a leading +, spaces, hyphens, or parentheses.";

  return errors;
}

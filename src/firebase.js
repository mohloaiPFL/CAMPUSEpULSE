// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA3RoHZdG77XyEMnCXEs4xclFrIP6QfPUs",
  authDomain: "campuspulse-5d349.firebaseapp.com",
  projectId: "campuspulse-5d349",
  storageBucket: "campuspulse-5d349.firebasestorage.app",
  messagingSenderId: "1046078464004",
  appId: "1:1046078464004:web:3a9f937e565565451cd551",
  measurementId: "G-Y8WTXJR2C3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);


import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";
import nanoid from "./nanoid";

const firebaseConfig = {
  apiKey: "AIzaSyCdoXabnYTan6YI-3WbeUxxzh4Ag1svnZs",
  authDomain: "meza-money.firebaseapp.com",
  databaseURL: "https://meza-money.firebaseio.com",
  projectId: "meza-money",
  storageBucket: "meza-money.appspot.com",
  messagingSenderId: "524714147490",
  appId: "1:524714147490:web:d422ff4cfc053bb04661fb",
};

class Firebase {
  constructor() {
    firebase.initializeApp(firebaseConfig);
    this.auth = firebase.auth();
    this.recaptchaVerifier = firebase.auth.RecaptchaVerifier;
    this.firestore = firebase.firestore();
    this.firestoreRaw = firebase.firestore;
  }

  signInWithEmail(email, password) {
    return this.auth.signInWithEmailAndPassword(email, password);
  }

  signInWithPhone(phoneNumber, appVerifier) {
    return this.auth.signInWithPhoneNumber(phoneNumber, appVerifier);
  }

  signOut() {
    return this.auth.signOut();
  }

  getCurrentUser() {
    return this.auth.currentUser;
  }

  timestampFromDate(date) {
    return firebase.firestore.Timestamp.fromDate(date);
  }

  isInitialized() {
    return new Promise((resolve) => {
      this.auth.onAuthStateChanged(resolve);
    });
  }

  createDoc(collection, data) {
    return this.firestore.collection(collection).doc(nanoid()).set(data);
  }

  async getAllDocs(
    collection,
    condition = { attribute: null, comparator: null, value: null }
  ) {
    let docs = [];
    let snapshot;
    condition.attribute
      ? (snapshot = await this.firestore
          .collection(collection)
          .where(condition.attribute, condition.comparator, condition.value)
          .get())
      : (snapshot = await this.firestore.collection(collection).get());
    snapshot.forEach((doc) => {
      let docData = doc.data();
      docData.id = doc.id;
      docs.push(docData);
    });
    return docs;
  }

  updateDoc(collection, docId, data) {
    return this.firestore.collection(collection).doc(docId).update(data);
  }

  deleteDoc(collection, docId) {
    return this.firestore.collection(collection).doc(docId).delete();
  }
}

export default new Firebase();

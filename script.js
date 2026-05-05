import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/12.12.1/firebase-analytics.js';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyAbtJMRobtsVc9UYc7GXRk3kV3KWuEe-WM',
  authDomain: 'emden-app.firebaseapp.com',
  projectId: 'emden-app',
  storageBucket: 'emden-app.firebasestorage.app',
  messagingSenderId: '684531562125',
  appId: '1:684531562125:web:5ff91711236744536e94c4',
  measurementId: 'G-41030HFZ08',
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const recordsCollection = collection(db, 'records');

const form = document.querySelector('.contact-form');
const resultMessage = document.querySelector('.result-message');

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = form.querySelector('input[name="name"]').value.trim();
    const code = form.querySelector('textarea[name="code"]').value.trim();

    if (!name || !code) {
      showMessage('الرجاء إدخال الاسم والكود معاً.', 'error');
      return;
    }

    try {
      await addDoc(recordsCollection, {
        name,
        code,
        createdAt: serverTimestamp(),
      });

      showMessage('تم الحفظ في Firebase بنجاح.', 'success');
      form.reset();
    } catch (error) {
      console.error(error);
      showMessage('فشل الحفظ في Firebase. تأكد من إعداد المشروع.', 'error');
    }
  });
}

const searchForm = document.querySelector('.search-form');
if (searchForm) {
  const searchResult = searchForm.querySelector('.result-message');

  searchForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const code = searchForm.querySelector('input[name="code"]').value.trim();

    if (!code) {
      searchResult.textContent = 'الرجاء إدخال الكود للبحث.';
      searchResult.className = 'result-message error';
      searchResult.style.display = 'block';
      return;
    }

    try {
      const q = query(recordsCollection, where('code', '==', code));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        searchResult.textContent = 'لم يتم العثور على أي اسم لهذا الكود.';
        searchResult.className = 'result-message error';
      } else {
        const data = querySnapshot.docs[0].data();
        searchResult.textContent = `الاسم: ${data.name}`;
        searchResult.className = 'result-message success';
      }

      searchResult.style.display = 'block';
    } catch (error) {
      console.error(error);
      searchResult.textContent = 'فشل الاتصال بقاعدة البيانات. تأكد من إعداد Firebase.';
      searchResult.className = 'result-message error';
      searchResult.style.display = 'block';
    }
  });
}

function showMessage(message, type) {
  resultMessage.textContent = message;
  resultMessage.className = `result-message ${type}`;
  resultMessage.style.display = 'block';

  setTimeout(() => {
    resultMessage.style.display = 'none';
  }, 5000);
}

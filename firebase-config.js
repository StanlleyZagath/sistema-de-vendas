/* Configuração do Firebase (deixe null para usar o sistema só neste aparelho).
   Para ligar a nuvem, troque null pelo objeto do seu app web:
   Console do Firebase -> Configurações do projeto -> Seus apps -> Configuração do SDK.
   Esses dados NÃO são segredo; quem protege os dados são as regras do Firestore (firestore.rules).

   window.FIREBASE_CONFIG = {
     apiKey: "...",
     authDomain: "seu-projeto.firebaseapp.com",
     projectId: "seu-projeto",
     storageBucket: "seu-projeto.appspot.com",
     messagingSenderId: "...",
     appId: "..."
   };
*/
window.FIREBASE_CONFIG = null;

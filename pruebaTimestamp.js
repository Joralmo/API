const admin = require('firebase-admin');
const moment = require('moment');
require('moment/locale/es');
moment.locale('es');
var serviceAccount = require('./covid-19-jp-firebase-adminsdk-ffufw-8c154a1321.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://covid-19-jp.firebaseio.com'
});

const db = admin.firestore();

const b = moment().endOf('day').format();
db.collection('fecha').doc('fecha').set({timestamp: b});

// async function main() {
//     const fecha = await db
//         .collection('countries')
//         .doc('fecha')
//         .get();
//     console.log(moment().format());
//     console.log(moment(fecha.data().timestamp).format());
//     if (moment() < moment(fecha.data().timestamp)) {
//         console.log('utilizar los datos');
//     } else {
//         const b = moment().endOf('day').format();
//         db.collection('countries').doc('fecha').set({timestamp: b});
//         console.log('subir los datos de nuevo');
//     }
// }

// main();

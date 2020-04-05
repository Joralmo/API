var admin = require('firebase-admin');
var serviceAccount = require('../covid-19-jp-firebase-adminsdk-ffufw-8c154a1321.json');
const _ = require('lodash');

async function main () {
    // initializing firebase
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://covid-19-jp.firebaseio.com"
    });
    const db = admin.firestore();
    const tokens = (await db.collection('tokens').get());
    let data = tokens.docs.map(token => token.data());
    console.log('Cantidad de dispositivos => ', data.length);
    data = _.groupBy(data, 'country');
    Object.keys(data).forEach(d => {
        console.log(`${d.charAt(0).toUpperCase()}${d.substring(1)} tiene ${data[d].length} usuarios`);
    });
    process.exit();
}

main();

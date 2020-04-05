
var admin = require('firebase-admin');
const moment = require('moment');
const { redis, config } = require('../instances');
const { keys } = config;
const { NovelCovid } = require('novelcovid');
const track = new NovelCovid();

const notifications = async () => {
	const db = admin.firestore();
	const messagin = admin.messaging();
	let result = await track.countries();
	if (!(await redis.get(keys.countries_old))) {
		console.log('Registro de países');
		const arrayTemp = {};
		let countryTemp = {};
		result.map(country => {
			countryTemp = {
				country: country.country,
				cases: country.cases
			};
			arrayTemp[country.country] = countryTemp;
		});
		await redis.set(keys.countries_old, JSON.stringify(arrayTemp));
	} else {
		console.log('NO GUARDÓ LOS PAÍSES');
	}
	if (!(await redis.get(keys.fecha))) {
		console.log('Registro de fecha para actualizar países');
		const b = moment().endOf('day').format();
		await redis.set(keys.fecha, b);
	} else {
		console.log('NO GUARDÓ LA FECHA');
	}
	const fecha = await redis.get(keys.fecha);
	console.log(moment().format(), moment(fecha).format());
	if (moment() < moment(fecha)) {
		console.log('usando países guardados');
		let countries = await redis.get(keys.countries_old);
		countries = JSON.parse(countries);
		let newCases = 0;
		const mensajes = [];
		let mensaje = {};
		let country;
		Object.keys(countries).forEach(value => {
			country = countries[value];
			let countryData = result.filter(obj => obj.country.toLowerCase() == country.country.toLowerCase());
			countryData = countryData[0];
			if (countryData.cases > country.cases) {
				newCases = countryData.cases - country.cases;
				mensaje = {
					country: countryData.country.toLowerCase(),
					newCases,
					totalCases: countryData.cases
				};
				mensajes.push(mensaje);
				countries[country.country].cases = countryData.cases;
			}
		});
		redis.set(keys.countries_old, JSON.stringify(countries));
		for (const msg of mensajes) {
			console.log(msg);
			db.collection('tokens')
				.where('country', '==', msg.country)
				.get()
				.then(docs => {
					docs.forEach(doc => {
						const upper = msg.country.charAt(0).toUpperCase() + msg.country.substring(1);
						try {
							messagin
								.sendToDevice(doc.data().token, {
									notification: {
										title: `${msg.newCases} Nuevos infectados`,
										body: `Para un total de ${msg.totalCases} casos en ${upper}`,
										icon:
											'https://firebasestorage.googleapis.com/v0/b/covid-19-jp.appspot.com/o/covid19_v02_circle.png?alt=media&token=816c7cda-22de-447e-b39f-e00fcc52d7a6'
									}
								})
								.then(() => console.log('mensaje envíado'))
								.catch(err =>
									console.log('error en la notificación', err)
								);
						} catch (error) {
							console.log('Error messaging', error);
						}
					});
				})
				.catch(() => {});
		}
	} else {
		console.log('actualizando países');
		const arrayTemp = {};
		let countryTemp = {};
		result.map(country => {
			countryTemp = {
				country: country.country,
				cases: country.cases
			}
			arrayTemp[country.country] = countryTemp;
		});
		redis.set(keys.countries_old, JSON.stringify(arrayTemp));
		console.log('Actualizando fecha');
		const b = moment().endOf('day').format();
		redis.set(keys.fecha, b);
	}
}

module.exports = notifications;
var axios = require("axios");
var cheerio = require("cheerio");
var countryUtils = require('./../utils/country_utils');
const admin = require('firebase-admin');
const moment = require('moment');

var getcountries = async (keys, redis) => {
    let response;
    const db = admin.firestore();
    const messagin = admin.messaging();
    let FieldValue = admin.firestore.FieldValue;
    try {
        response = await axios.get("https://www.worldometers.info/coronavirus/");
        if (response.status !== 200) {
            console.log("Error", response.status);
        }
    } catch (err) {
        return null;
    }
    // to store parsed data
    const result = [];
    // get HTML and parse death rates
    const html = cheerio.load(response.data);
    const countriesTable = html("table#main_table_countries_today");
    const countriesTableCells = countriesTable
        .children("tbody")
        .children("tr")
        .children("td");
    // NOTE: this will change when table format change in website
    const totalColumns = 11;
    const countryColIndex = 0;
    const casesColIndex = 1;
    const todayCasesColIndex = 2;
    const deathsColIndex = 3;
    const todayDeathsColIndex = 4;
    const curedColIndex = 5;
    const activeColIndex = 6;
    const criticalColIndex = 7;
    const casesPerOneMillionColIndex = 8;
    const deathsPerOneMillionColIndex = 9;
    const dayOfFirstCaseIndex = 10;
    // minus totalColumns to skip last row, which is total
    for (let i = 0; i < countriesTableCells.length - totalColumns; i += 1) {
        const cell = countriesTableCells[i];

        // get country
        if (i % totalColumns === countryColIndex) {
            let country =
                cell.children[0].data ||
                cell.children[0].children[0].data ||
                // country name with link has another level
                cell.children[0].children[0].children[0].data ||
                cell.children[0].children[0].children[0].children[0].data ||
                "";
            country = country.trim();
            if (country.length === 0) {
                // parse with hyperlink
                country = cell.children[0].next.children[0].data || "";
            }
            const countryData = countryUtils.getCountryData(country.trim());
            result.push({
                country: countryData.country || country.trim(),
                countryInfo: {
                    _id: countryData._id,
                    lat: countryData.lat,
                    long: countryData.long,
                    flag: countryData.flag,
                    iso3: countryData.iso3,
                    iso2: countryData.iso2,
                }
            });
        }
        // get cases
        if (i % totalColumns === casesColIndex) {
            let cases = cell.children.length != 0 ? cell.children[0].data : "";
            result[result.length - 1].cases = parseInt(
                cases.trim().replace(/,/g, "") || "0",
                10
            );
        }
        // get today cases
        if (i % totalColumns === todayCasesColIndex) {
            let cases = cell.children.length != 0 ? cell.children[0].data : "";
            result[result.length - 1].todayCases = parseInt(
                cases.trim().replace(/,/g, "") || "0",
                10
            );
        }
        // get deaths
        if (i % totalColumns === deathsColIndex) {
            let deaths = cell.children.length != 0 ? cell.children[0].data : "";
            result[result.length - 1].deaths = parseInt(
                deaths.trim().replace(/,/g, "") || "0",
                10
            );
        }
        // get today deaths
        if (i % totalColumns === todayDeathsColIndex) {
            let deaths = cell.children.length != 0 ? cell.children[0].data : "";
            result[result.length - 1].todayDeaths = parseInt(
                deaths.trim().replace(/,/g, "") || "0",
                10
            );
        }
        // get cured
        if (i % totalColumns === curedColIndex) {
            let cured = cell.children.length != 0 ? cell.children[0].data : "";
            result[result.length - 1].recovered = parseInt(
                cured.trim().replace(/,/g, "") || 0,
                10
            );
        }
        // get active
        if (i % totalColumns === activeColIndex) {
            let cured = cell.children.length != 0 ? cell.children[0].data : "";
            result[result.length - 1].active = parseInt(
                cured.trim().replace(/,/g, "") || 0,
                10
            );
        }
        // get critical
        if (i % totalColumns === criticalColIndex) {
            let critical = cell.children.length != 0 ? cell.children[0].data : "";
            result[result.length - 1].critical = parseInt(
                critical.trim().replace(/,/g, "") || "0",
                10
            );
        }
        // get total cases per one million population
        if (i % totalColumns === casesPerOneMillionColIndex) {
            let casesPerOneMillion = cell.children.length != 0 ? cell.children[0].data : "";
            result[result.length - 1].casesPerOneMillion = parseFloat(
                casesPerOneMillion.trim().replace(/,/g, "") || "0"
            );
        }

        // get total deaths per one million population
        if (i % totalColumns === deathsPerOneMillionColIndex) {
            let deathsPerOneMillion = cell.children.length != 0 ? cell.children[0].data : "";
            result[result.length - 1].deathsPerOneMillion = parseFloat(
                deathsPerOneMillion.trim().replace(/,/g, "") || "0"
            );
        }

        // get the day of the first case in the country
        if (i % totalColumns === dayOfFirstCaseIndex) {
            let dayOfFirstCase = cell.children.length != 0 ? cell.children[0].data : "";
            result[result.length - 1].dayOfFirstCase = dayOfFirstCase.trim().replace(/,/g, "") || "0";
        }
    }

    const string = JSON.stringify(result);
    redis.set(keys.countries, string);
    // const fecha = await db
    //     .collection('fecha')
    //     .doc('fecha')
    //     .get();
    if (!(await redis.get(keys.fecha))) {
        console.log('Registro de fecha para actualizar países');
        const b = moment().endOf('day').format();
        redis.set(keys.fecha, b);
    }
    if (!(await redis.get(keys.countries_old))) {
        console.log('Registro de países');
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
                // db.collection('countries').doc(countryData.country).update({cases: countryData.cases});
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
                .catch(() => {})
        }
    } else {
        // const b = moment().endOf('day').format();
        // db.collection('fecha').doc('fecha').set({timestamp: b});
        console.log('actualizando países');
        const arrayTemp = {};
        let countryTemp = {};
        result.map(country => {
            countryTemp = {
                country: country.country,
                cases: country.cases
            }
            arrayTemp[country.country] = countryTemp;
            // db.collection('countries')
            //     .doc(country.country)
            //     .set({
            //         country: country.country,
            //         cases: country.cases,
            //         timestamp: FieldValue.serverTimestamp()
            //     });
        });
        redis.set(keys.countries_old, JSON.stringify(arrayTemp));
        console.log('Actualizando fecha');
        const b = moment().endOf('day').format();
        redis.set(keys.fecha, b);
    }
    console.log(`Updated countries: ${result.length} countries`);
}

module.exports = getcountries;

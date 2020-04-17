const axios = require('axios');
const _ = require('lodash');
const { config } = require('../instances');
const URLS = {
    ETARIO:
        'https://infogram.com/api/live/flex/4524241a-91a7-4bbd-a58e-63c12fb2952f/deaa9e7c-8797-4ed9-9607-76d7fc391cb6',
    CIUDADES: 'https://www.datos.gov.co/resource/gt2j-8ykr.json',
};

async function etarioColombia() {
    const { data } = (await axios.get(URLS.ETARIO)).data;
    let rangos = [];
    for (let d of data[0].splice(1)) {
        rangos.push({ rango: d[0], m: d[1], f: d[2] });
    }
    return rangos;
}

async function datosColombia() {
    const { data } = await axios.get(
        `${URLS.CIUDADES}?$$app_token=${config.appToken}&$limit=50000`
    );
    let departments = [];
    departments = formatArray(data, 'departamento', 'department');
    let cities = [];
    cities = formatArray(data, 'ciudad_de_ubicaci_n', 'city');
    let attentions = [];
    data.map(key => {
        attentions.push({atenci_n: key['atenci_n'].toUpperCase()})
    });
    attentions = formatArray(attentions, 'atenci_n', 'attention');
    let sexArr = [];
    sexArr = formatArray(data, 'sexo', 'sexArr');
    let type = [];
    data.map(key => {
        type.push({tipo: key['tipo'].toUpperCase()})
    });
    type = formatArray(type, 'tipo', 'type');
    let originCountry = [];
    data.map(key => {
        originCountry.push({pa_s_de_procedencia: key['pa_s_de_procedencia'].toUpperCase()})
    });
    originCountry = formatArray(originCountry, 'pa_s_de_procedencia', 'country');
    attention = attentions.map(d => { return {attention: d.attention, quantity: d.quantity, color: randomColor()}});
    return { originCountry, type, sexArr, attentions, departments, cities };
}
function formatArray(array, key, newName) {
    array = _.groupBy(array, key);
    array = _.orderBy(array, 'length', 'desc');
    array = array.map((data) => {
        return {
            [newName]: data[0][key],
            quantity: data.length,
            color: randomColor()
        };
    });
    return array;
}
function randomColor () {
    return '#' + (function co(lor){   return (lor +=
        [0,1,2,3,4,5,6,7,8,9,'a','b','c','d','e','f'][Math.floor(Math.random()*16)])
        && (lor.length == 6) ?  lor : co(lor); })('');
}

module.exports = [etarioColombia, datosColombia];

/**
 * Example data send to the app
 * 
 * Etario
    [
        ['', '1529 Masculino', '1450 Femenino'],
        ['0-9', '34', '40'],
        ['10-19', '64', '52'],
        ['20-29', '261', '273'],
        ['30-39', '330', '323'],
        ['40-49', '242', '256'],
        ['50-59', '288', '227'],
        ['60-69', '161', '157'],
        ['70-79', '112', '73'],
        ['80-89', '32', '37'],
        ['90-99', '5', '12'],
    ];

 */

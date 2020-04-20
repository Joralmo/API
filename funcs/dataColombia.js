const axios = require('axios');
const _ = require('lodash');
const { config } = require('../instances');
const URLS = {
    ETARIO:
        'https://infogram.com/api/live/flex/4524241a-91a7-4bbd-a58e-63c12fb2952f/deaa9e7c-8797-4ed9-9607-76d7fc391cb6',
    CIUDADES: 'https://www.datos.gov.co/resource/gt2j-8ykr.json',
};

async function etarioColombia() {
    const { data } = await axios.get(
        `${URLS.CIUDADES}?$$app_token=${config.appToken}&$limit=50000`
    );
    let rangos = [
        {
            rango: "0-9",
            f: 0,
            m: 0
        },
        {
            rango: "10-19",
            f: 0,
            m: 0
        },
        {
            rango: "20-29",
            f: 0,
            m: 0
        },
        {
            rango: "30-39",
            f: 0,
            m: 0
        },
        {
            rango: "40-49",
            f: 0,
            m: 0
        },
        {
            rango: "50-59",
            f: 0,
            m: 0
        },
        {
            rango: "60-69",
            f: 0,
            m: 0
        },
        {
            rango: "70-79",
            f: 0,
            m: 0
        },
        {
            rango: "80-89",
            f: 0,
            m: 0
        },
        {
            rango: "90-99",
            f: 0,
            m: 0
        }
    ];
    for (let i = 0; i <= 9; i++){
        for (let rango of data) {
            const { edad } = rango;
            if (_.inRange(parseInt(edad), parseInt(`${i}0`), parseInt(`${i}9`))) {
                if (rango.sexo == 'F') rangos[i].m += 1;
                else rangos[i].f += 1;
            }
        }
    }
    // for (let rango of data) {
    //     const { edad } = rango;
    //     if (_.inRange(parseInt(edad), 0, 9)) {
    //         if (rango.sexo == 'F') rangos[0].m += 1;
    //         else rangos[0].f += 1;
    //     } else if (_.inRange(parseInt(edad), 10, 19)) {
    //         if (rango.sexo == 'F') rangos[1].m += 1;
    //         else rangos[1].f += 1;
    //     } else if (_.inRange(parseInt(edad), 20, 29)) {
    //         if (rango.sexo == 'F') rangos[2].m += 1;
    //         else rangos[2].f += 1;
    //     } else if (_.inRange(parseInt(edad), 30, 39)) {
    //         if (rango.sexo == 'F') rangos[3].m += 1;
    //         else rangos[3].f += 1;
    //     } else if (_.inRange(parseInt(edad), 40, 49)) {
    //         if (rango.sexo == 'F') rangos[4].m += 1;
    //         else rangos[4].f += 1;
    //     } else if (_.inRange(parseInt(edad), 50, 59)) {
    //         if (rango.sexo == 'F') rangos[5].m += 1;
    //         else rangos[5].f += 1;
    //     } else if (_.inRange(parseInt(edad), 60, 69)) {
    //         if (rango.sexo == 'F') rangos[6].m += 1;
    //         else rangos[6].f += 1;
    //     } else if (_.inRange(parseInt(edad), 70, 79)) {
    //         if (rango.sexo == 'F') rangos[7].m += 1;
    //         else rangos[7].f += 1;
    //     } else if (_.inRange(parseInt(edad), 80, 89)) {
    //         if (rango.sexo == 'F') rangos[8].m += 1;
    //         else rangos[8].f += 1;
    //     } else if (_.inRange(parseInt(edad), 90, 99)) {
    //         if (rango.sexo == 'F') rangos[9].m += 1;
    //         else rangos[9].f += 1;
    //     }
    // }
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
        if (key['pa_s_de_procedencia']) {
            originCountry.push({pa_s_de_procedencia: key['pa_s_de_procedencia'].toUpperCase()})
        } else {
            originCountry.push({pa_s_de_procedencia: "NO REPORTADO"})
        }
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

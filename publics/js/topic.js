let tempChart, humidChart;


function getParameterByName(name, url = window.location.href) {
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}


let topic = getParameterByName('t');

function getTempDataFromSocket() {
    socket.on(`${topic}/data/temp`, data => {
        let [date, value] = data;
        let point = [new Date(date).getTime(), Number(value)];
        let series = tempChart.series[0],
            shift = series.data.length > 20; // shift if the series is longer than 20

        // add the point
        tempChart.series[0].addPoint(point, true, shift);
        document.querySelector(`#temp-data`).innerText = Math.round(value * 100) / 100;
    });
}

function getHumidDataFromSocket() {
    socket.on(`${topic}/data/humid`, data => {
        let [date, value] = data;
        let point = [new Date(date).getTime(), Number(value)];
        let series = humidChart.series[0],
            shift = series.data.length > 20; // shift if the series is longer than 20

        // add the point
        humidChart.series[0].addPoint(point, true, shift);
        document.querySelector('#humid-data').innerText = Math.round(value * 100) / 100;
    });
}

window.addEventListener('load', function () {
    Highcharts.setOptions({
        time: {
            useUTC: false
        }
    });

    tempChart = new Highcharts.Chart({
        chart: {
            renderTo: 'temp',
            defaultSeriesType: 'line',
            // line, spline, line, spline, area, areaspline, column, bar, pie, scatter, gauge, arearange, areasplinerange and columnrange
            events: {
                load: getTempDataFromSocket
            }
        },
        title: null,
        xAxis: {
            type: 'datetime',
            labels: {
                enabled: true,
                format: '{value:%H:%M:%S}',
            },
        },
        yAxis: {
            type: 'linear',
            title: {
                text: '°C',
                margin: 10
            }
        },
        series: [{
            name: 'Nhiệt độ',
            data: [],
            color: '#F84343'
        }]
    });

    humidChart = new Highcharts.Chart({
        chart: {
            renderTo: 'humid',
            defaultSeriesType: 'areaspline',
            // line, spline, line, spline, area, areaspline, column, bar, pie, scatter, gauge, arearange, areasplinerange and columnrange
            events: {
                load: getHumidDataFromSocket
            }
        },
        title: null,
        xAxis: {
            type: 'datetime',
            labels: {
                enabled: true,
                format: '{value:%H:%M:%S}',
            },
        },
        yAxis: {
            type: 'linear',
            max: 100,
            title: {
                text: '%',
                margin: 10
            }
        },
        series: [{
            name: 'Độ ẩm',
            data: [],
            color: '#00B2EB'
        }]
    });
});


function toggleSwitch(checkbox, stt) {
    let device = checkbox.parentNode.parentNode;
    let statusText = device.children[2];

    // device.classList.toggle('active');
    // if(stt != undefined){
        checkbox.checked = stt;
        statusText.innerText = stt? 'ON':'OFF';
        if(stt){
            device.classList.add('active')
        }else{
            device.classList.remove('active')
        }
        console.log("switch:", checkbox.checked, stt, typeof(stt));
    // } 
    // else {
    //     if (checkbox.checked) {
    //         statusText.innerText = 'ON';
    //     } else {
    //         statusText.innerText = 'OFF';
    //     }
    // }
    
}

socket.on(`${topic}/ctrl`, data => {
    let [time, id, stt] = data;
    let checkbox = document.getElementById(`device-${id}`);
    
    // if(stt)
    //  checkbox.checked = !checkbox.checked;
    // checkbox.checked = stt;
    toggleSwitch(checkbox, Number(stt));
    console.log(data);
})

function toggleStatus(checkbox) {
    let device = checkbox.parentNode.parentNode;
    checkbox.checked = !checkbox.checked

    $.ajax({
        "url": '/devices',
        "method": 'POST',
        "headers": {
            "Content-Type": "application/json"
        },
        "data": JSON.stringify({
            topic: topic,
            id: device.getAttribute('deviceid'),
            stt: Number(!checkbox.checked) 
        }),
        "success": data => {
            // toggleSwitch();
        },
        "error": (xhr, status, error) => {
            alert(`Error`);
            console.log(xhr, status, error);
            checkbox.checked = !checkbox.checked;
        }
    });
}
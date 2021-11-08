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
$(window).on('popstate', function(event) {
    alert("pop");
   });

function getTempDataFromSocket() {
    socket.on(`${topic}/temp`, data => {
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
    socket.on(`${topic}/humid`, data => {
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


function toggleStatus(checkbox) {
    let device = checkbox.parentNode.parentNode;
    let statusText = device.children[2];

    device.classList.toggle('active');

    if (checkbox.checked) {
        statusText.innerText = 'ON';
    } else {
        statusText.innerText = 'OFF';
    }
}
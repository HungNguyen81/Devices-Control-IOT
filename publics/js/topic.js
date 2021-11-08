let tempChart, humidChart;
/**
* Request data from the server, add it to the graph and set a timeout to request again
*/
async function requestData() {
    const result = await fetch('https://demo-live-data.highcharts.com/time-rows.json'); //["2021-11-07T13:40:19.156Z",1.2404696998244558]
    if (result.ok) {
        const data = await result.json();
        const [date, value] = data[0];
        const point = [new Date(date).getTime(), value * 10];
        const series1 = tempChart.series[0],
            series2 = humidChart.series[0],
            shift1 = series1.data.length > 20, // shift if the series is longer than 20
            shift2 = series2.data.length > 20;
        // add the point
        tempChart.series[0].addPoint(point, true, shift1);
        humidChart.series[0].addPoint(point, true, shift2);
        // call it again after one second
        setTimeout(requestData, 1000);
    }
}

window.addEventListener('load', function () {
    tempChart = new Highcharts.Chart({
        chart: {
            renderTo: 'temp',
            defaultSeriesType: 'line',
            // line, spline, line, spline, area, areaspline, column, bar, pie, scatter, gauge, arearange, areasplinerange and columnrange
            events: {
                load: requestData
            }
        },
        title: null,
        xAxis: {
            type: 'datetime',
            tickPixelInterval: 150,
            maxZoom: 20 * 1000
        },
        yAxis: {
            minPadding: 0.2,
            maxPadding: 0.2,
            title: {
                text: '°C',
                margin: 10
            }
        },
        series: [{
            name: 'Nhiệt độ',
            data: []
        }]
    });

    humidChart = new Highcharts.Chart({
        chart: {
            renderTo: 'humid',
            defaultSeriesType: 'areaspline',
            // line, spline, line, spline, area, areaspline, column, bar, pie, scatter, gauge, arearange, areasplinerange and columnrange
            events: {
                load: requestData
            }
        },
        title: null,
        xAxis: {
            type: 'datetime',
            tickPixelInterval: 150,
            maxZoom: 20 * 1000
        },
        yAxis: {
            minPadding: 0.2,
            maxPadding: 0.2,
            title: {
                text: '%',
                margin: 10
            }
        },
        series: [{
            name: 'Độ ẩm',
            data: []
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
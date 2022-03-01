let tempChart, humidChart;
var isActive = false;
var isUpdated = false;

//#region SET UP DATA FOR LIVE-DATA CHARTS
function getParameterByName(name, url = window.location.href) {
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

// Hiện thị cảnh báo không có dữ liệu khi sensor không hoạt động
let topic = getParameterByName('t');
let dataTimeout;
let warn = document.querySelector('.warning');

let removeWarning = () => {
    warn.classList.add('hidden');
    clearTimeout(dataTimeout);
    isActive = true;
}
let addWarning = () => {
    warn.classList.remove('hidden');
    isActive = false;
}

addWarning();
console.log("topic:", topic);

$.ajax({
    "url": `/devices-loaded?t=${topic}`,
    "method": 'GET',
    "error": (xhr, status, error) => {
        console.log("Update err");
    }
});

socket.on(`${topic}/updated`, data => {
    console.log('updated');
    isUpdated = true;
    document.querySelector('#loading').classList.add('hidden')
})

var container = document.getElementById('container');
var hw = new Widget.Humidity(container, 0, 100, 10);
hw.draw();

var container2 = document.getElementById('container2');
var tw = new Widget.Termometer(container2, 0, 100);
tw.draw();

function getTempDataFromSocket() {
    socket.on(`${topic}/data/temp`, data => {
        let [date, value] = data;
        let point = [new Date(date).getTime(), Number(value)];
        let series = tempChart.series[0],
            shift = series.data.length > 5; // shift if the series is longer than 5

        // add the point
        tempChart.series[0].addPoint(point, true, shift);
        // document.querySelector(`#temp-data`).innerText = Math.round(value * 100) / 100;
        tw.setTemperature(Number(value));
        
        removeWarning();
        dataTimeout = setTimeout(addWarning, 6000);
    });
}

function getHumidDataFromSocket() {
    socket.on(`${topic}/data/humid`, data => {
        let [date, value] = data;
        let point = [new Date(date).getTime(), Number(value)];
        let series = humidChart.series[0],
            shift = series.data.length > 5; // shift if the series is longer than 5

        // add the point
        humidChart.series[0].addPoint(point, true, shift);
        // document.querySelector('#humid-data').innerText = Math.round(value * 100) / 100;
        hw.setHumidity(Number(value));
    });
}
//#endregion


//#region SETUP EVENT LISTENER FOR CHARTS
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
            defaultSeriesType: 'area',
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
//#endregion


/**
 * lắng nghe luồng điều khiển từ server
 */
socket.on(`${topic}/ctrl`, data => {
    let [time, id, stt] = data;
    let checkbox = document.getElementById(`device-${id}`);

    toggleSwitch(checkbox, Number(stt));
    console.log(data);
})


/**
 * thay đổi trạng thái thiết bị trên giao diện khi có msg điều khiển
 * @param {*} checkbox 
 * @param {*} stt 
 */
function toggleSwitch(checkbox, stt) {
    let device = checkbox.parentNode.parentNode;
    let statusText = device.children[2];

    checkbox.checked = stt;
    statusText.innerText = stt ? 'ON' : 'OFF';
    if (stt) {
        device.classList.add('active')
    } else {
        device.classList.remove('active')
    }
    console.log("switch:", checkbox.checked, stt, typeof (stt));
}


/**
 * thay đổi trạng thái thiết bị khi click switch button
 * @param {*} checkbox 
 */
function toggleStatus(checkbox) {
    checkbox.checked = !checkbox.checked
    
    if(!isActive || !isUpdated){
        alert('Thiết bị của bạn chưa sẵn sàng, vui lòng kiểm tra.')
        return
    }
    let device = checkbox.parentNode.parentNode;    

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
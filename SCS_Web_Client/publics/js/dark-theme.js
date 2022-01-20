
let stored = localStorage.getItem('dark-mode');
let darkMode = Number(stored? stored : 0);
let bodyEle = document.children[0].children[1];
let darkModeBtn = document.querySelector('.dark-theme-btn');

if (!darkMode) {
    localStorage.setItem('dark-mode', 0);
    darkMode = 0;
    bodyEle.classList.remove('dark');
    darkModeBtn.classList.add('light');
} else {
    bodyEle.classList.add('dark');
    darkMode = 1;
    darkModeBtn.classList.add('dark');
}

function toggleDarkMode() {
    darkMode = Number(localStorage.getItem('dark-mode'));
    console.log(darkMode);
    if (!darkMode) {
        localStorage.setItem('dark-mode', 1);
        darkMode = 0;
        bodyEle.classList.add('dark');
    } else {
        localStorage.setItem('dark-mode', 0);
        darkMode = 1;
        bodyEle.classList.remove('dark');
    }
    darkModeBtn.classList.toggle('dark')
    darkModeBtn.classList.toggle('light')
}
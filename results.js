document.addEventListener("DOMContentLoaded", function() {
    // Firebase configuration
    const firebaseConfig = {
        apiKey: "AIzaSyCtt44XXVAVYmqmFg6w438paP5vrfjkPv0",
        authDomain: "plannerweb-5fdad.firebaseapp.com",
        projectId: "plannerweb-5fdad",
        storageBucket: "plannerweb-5fdad.appspot.com",
        messagingSenderId: "154230568093",
        appId: "1:154230568093:web:cf6508b7baa0b1cd8dd074"
    };

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    const resultsChartCtx = document.getElementById('resultsChart').getContext('2d');
    let resultsChart;


    const userGreeting = document.getElementById('user-greeting');
    const logoutButton = document.getElementById('logout');
    const loginLink = document.getElementById('login-link');

    const handleUserStateChange = (user) => {
        if (userGreeting) {
            if (user) {
                userGreeting.textContent = `Hello, ${user.email}`;
                if (logoutButton) {
                    logoutButton.style.display = 'inline';
                }
                if (loginLink) {
                    loginLink.style.display = 'none';
                }
                if (document.getElementById('current-day')) {
                    loadTasks(user.uid);
                    loadSpecialTasks(user.uid, false, daysOfWeek[currentDay]);
                }
            } else {
                userGreeting.textContent = '';
                if (logoutButton) {
                    logoutButton.style.display = 'none';
                }
                if (loginLink) {
                    loginLink.style.display = 'inline';
                }
            }
        }
    };

    // Function to fetch and plot data
    const fetchAndPlotData = async (userId, days) => {
        let q;
        const today = new Date();
        const pastDate = new Date();
        pastDate.setDate(today.getDate() - days);

        if (days > 0) {
            q = db.collection('taskCompletion').doc(userId).collection('dailyCompletion')
                    .where('date', '>=', firebase.firestore.Timestamp.fromDate(pastDate));
        } else {
            q = db.collection('taskCompletion').doc(userId).collection('dailyCompletion');
        }

        const snapshot = await q.get();
        const data = [];
        snapshot.forEach(doc => {
            const docData = doc.data();
            data.push({ x: docData.date.toDate(), y: docData.percentage });
        });

        // Sort data by date
        data.sort((a, b) => a.x - b.x);

        // Update the chart
        if (resultsChart) {
            resultsChart.destroy();
        }
        resultsChart = new Chart(resultsChartCtx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Task Completion Percentage',
                    data: data,
                    fill: false,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            },
            options: {
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day'
                        },
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Completion Percentage'
                        },
                        min: 0,
                        max: 100
                    }
                }
            }
        });
    };

    auth.onAuthStateChanged(user => {
        handleUserStateChange(user);
        if (user) {
            document.getElementById('all-time-btn').addEventListener('click', () => {
                fetchAndPlotData(user.uid, 0);
            });

            document.getElementById('last-30-days-btn').addEventListener('click', () => {
                fetchAndPlotData(user.uid, 30);
            });

            document.getElementById('last-7-days-btn').addEventListener('click', () => {
                fetchAndPlotData(user.uid, 7);
            });

            // Load all-time data by default
            fetchAndPlotData(user.uid, 0);
        } else {
            alert('You need to be logged in to view results.');
            window.location.href = 'index.html';
        }
    });
});

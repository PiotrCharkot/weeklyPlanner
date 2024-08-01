import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore, collection, doc, getDocs, query, where, addDoc, updateDoc, deleteDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

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
    const app = initializeApp(firebaseConfig);
    const auth = getAuth();
    const db = getFirestore(app);

    const userGreeting = document.getElementById('user-greeting');
    const logoutButton = document.getElementById('logout');

    // Function to handle user state change
    const handleUserStateChange = (user) => {
        if (userGreeting) {
            if (user) {
                userGreeting.textContent = `Hello, ${user.email}`;
                if (logoutButton) {
                    logoutButton.style.display = 'inline';
                }
                if (document.getElementById('current-day')) {
                    loadTasks(user.uid);
                    loadSpecialTasks(user.uid, false, daysOfWeek[currentDay]);  // Do not show delete button
                }
            } else {
                userGreeting.textContent = '';
                if (logoutButton) {
                    logoutButton.style.display = 'none';
                }
            }
        }
    };

    // Authentication event listeners
    onAuthStateChanged(auth, user => {
        handleUserStateChange(user);
        if (user && document.getElementById('day-select')) {
            const selectedDay = document.getElementById('day-select').value;
            loadPlannerTasks(user.uid, selectedDay);
            loadSpecialTasks(user.uid, true, selectedDay);  // Show delete button
        }
    });

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            signOut(auth).then(() => {
                handleUserStateChange(null);
            }).catch((error) => {
                console.error('Error signing out: ', error);
                alert('Error signing out: ' + error.message);
            });
        });
    }

    const loginButton = document.getElementById('login');
    const signupButton = document.getElementById('signup');

    if (loginButton) {
        loginButton.addEventListener('click', () => {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            signInWithEmailAndPassword(auth, email, password)
                .then(userCredential => {
                    window.location.href = 'index.html';
                })
                .catch(error => {
                    console.error('Error signing in', error);
                    alert('Error signing in: ' + error.message);
                });
        });
    }

    if (signupButton) {
        signupButton.addEventListener('click', () => {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            createUserWithEmailAndPassword(auth, email, password)
                .then(userCredential => {
                    window.location.href = 'index.html';
                })
                .catch(error => {
                    console.error('Error signing up', error);
                    alert('Error signing up: ' + error.message);
                });
        });
    }

    const loadTasks = (userId) => {
        if (!userId) {
            return;
        }

        const day = daysOfWeek[currentDay];
        const userTasksCollection = collection(db, 'tasks', userId, day);
        getDocs(userTasksCollection).then(snapshot => {
            const tasks = [];
            snapshot.forEach(taskDoc => {
                const task = taskDoc.data();
                tasks.push({ id: taskDoc.id, ...task });
            });

            const morningTasks = [];
            const afternoonTasks = [];
            const eveningTasks = [];
            const unspecifiedTasks = [];

            tasks.forEach(task => {
                const li = document.createElement('li');
                li.textContent = task.description;
                if (task.done) {
                    li.classList.add('done');
                }
                li.addEventListener('click', () => {
                    li.classList.toggle('done');
                    const taskDocRef = doc(db, 'tasks', userId, day, task.id);
                    updateDoc(taskDocRef, {
                        done: li.classList.contains('done')
                    });
                });

                if (!task.time && !task.isSpecial) {
                    unspecifiedTasks.push(li);
                } else if (task.isSpecial) {
                    // Handle special tasks separately
                    const specialTaskList = document.getElementById('special-task-list');
                    if (specialTaskList) {
                        li.textContent = `${task.description} - Points: ${task.points} / ${task.maxPoints}`;
                        const addButton = document.createElement('button');
                        addButton.textContent = '+';
                        addButton.addEventListener('click', () => {
                            if (task.points < task.maxPoints) {
                                updateDoc(doc(db, 'tasks', userId, day, task.id), {
                                    points: task.points + 1
                                }).then(() => {
                                    task.points += 1;
                                    li.textContent = `${task.description} - Points: ${task.points} / ${task.maxPoints}`;
                                    li.appendChild(addButton);
                                    li.appendChild(subtractButton);
                                }).catch(error => {
                                    console.error('Error updating special task: ', error);
                                    alert('Error updating special task: ' + error.message);
                                });
                            }
                        });
                        const subtractButton = document.createElement('button');
                        subtractButton.textContent = '-';
                        subtractButton.addEventListener('click', () => {
                            if (task.points > 0) {
                                updateDoc(doc(db, 'tasks', userId, day, task.id), {
                                    points: task.points - 1
                                }).then(() => {
                                    task.points -= 1;
                                    li.textContent = `${task.description} - Points: ${task.points} / ${task.maxPoints}`;
                                    li.appendChild(addButton);
                                    li.appendChild(subtractButton);
                                }).catch(error => {
                                    console.error('Error updating special task: ', error);
                                    alert('Error updating special task: ' + error.message);
                                });
                            }
                        });
                        li.appendChild(addButton);
                        li.appendChild(subtractButton);
                        specialTaskList.appendChild(li);
                    }
                } else {
                    const time = task.time.toDate();
                    task.li = li;
                    task.timeDate = time;
                    if (time.getHours() < 12) {
                        morningTasks.push(task);
                    } else if (time.getHours() < 18) {
                        afternoonTasks.push(task);
                    } else {
                        eveningTasks.push(task);
                    }
                }
            });

            // Sort tasks by time within each section
            morningTasks.sort((a, b) => a.timeDate - b.timeDate);
            afternoonTasks.sort((a, b) => a.timeDate - b.timeDate);
            eveningTasks.sort((a, b) => a.timeDate - b.timeDate);

            // Append tasks to their respective lists
            const appendTasks = (taskListId, tasks) => {
                const taskList = document.getElementById(taskListId);
                if (taskList) {
                    taskList.innerHTML = ''; // Clear existing tasks
                    tasks.forEach(task => {
                        if (task instanceof Node) {
                            taskList.appendChild(task);
                        } else {
                            taskList.appendChild(task.li);
                        }
                    });
                }
            };

            appendTasks('unspecified-task-list', unspecifiedTasks);
            appendTasks('morning-task-list', morningTasks);
            appendTasks('afternoon-task-list', afternoonTasks);
            appendTasks('evening-task-list', eveningTasks);
        }).catch(error => {
            console.error('Error loading tasks: ', error);
            alert('Error loading tasks: ' + error.message);
        });
    };

    const loadSpecialTasks = (userId, showDeleteButton, day) => {
        if (!userId) {
            return;
        }

        const userSpecialTasksCollection = query(collection(db, 'tasks', userId, day.charAt(0).toUpperCase() + day.slice(1)), where("isSpecial", "==", true));
        getDocs(userSpecialTasksCollection).then(snapshot => {
            const specialTaskList = document.getElementById('special-task-list');
            if (specialTaskList) {
                specialTaskList.innerHTML = ''; // Clear existing tasks
                snapshot.forEach(taskDoc => {
                    const task = taskDoc.data();
                    const li = document.createElement('li');
                    li.textContent = `${task.description} - Points: ${task.points} / ${task.maxPoints}`;

                    if (showDeleteButton) {
                        const deleteButton = document.createElement('button');
                        deleteButton.textContent = 'Delete';
                        deleteButton.addEventListener('click', () => {
                            deleteDoc(doc(db, 'tasks', userId, day.charAt(0).toUpperCase() + day.slice(1), taskDoc.id)).then(() => {
                                li.remove();
                            }).catch(error => {
                                console.error('Error deleting special task: ', error);
                                alert('Error deleting special task: ' + error.message);
                            });
                        });
                        li.appendChild(deleteButton);
                    } else {
                        const addButton = document.createElement('button');
                        addButton.textContent = '+';
                        addButton.addEventListener('click', () => {
                            if (task.points < task.maxPoints) {
                                updateDoc(doc(db, 'tasks', userId, day.charAt(0).toUpperCase() + day.slice(1), taskDoc.id), {
                                    points: task.points + 1
                                }).then(() => {
                                    task.points += 1;
                                    li.textContent = `${task.description} - Points: ${task.points} / ${task.maxPoints}`;
                                    li.appendChild(addButton);
                                    li.appendChild(subtractButton);
                                }).catch(error => {
                                    console.error('Error updating special task: ', error);
                                    alert('Error updating special task: ' + error.message);
                                });
                            }
                        });
                        const subtractButton = document.createElement('button');
                        subtractButton.textContent = '-';
                        subtractButton.addEventListener('click', () => {
                            if (task.points > 0) {
                                updateDoc(doc(db, 'tasks', userId, day.charAt(0).toUpperCase() + day.slice(1), taskDoc.id), {
                                    points: task.points - 1
                                }).then(() => {
                                    task.points -= 1;
                                    li.textContent = `${task.description} - Points: ${task.points} / ${task.maxPoints}`;
                                    li.appendChild(addButton);
                                    li.appendChild(subtractButton);
                                }).catch(error => {
                                    console.error('Error updating special task: ', error);
                                    alert('Error updating special task: ' + error.message);
                                });
                            }
                        });
                        li.appendChild(addButton);
                        li.appendChild(subtractButton);
                    }

                    specialTaskList.appendChild(li);
                });
            }
        }).catch(error => {
            console.error('Error loading special tasks: ', error);
            alert('Error loading special tasks: ' + error.message);
        });
    };

    const loadPlannerTasks = (userId, day) => {
        if (!userId) {
            return;
        }

        const userTasksCollection = collection(db, 'tasks', userId, day.charAt(0).toUpperCase() + day.slice(1));
        getDocs(userTasksCollection).then(snapshot => {
            const taskList = document.getElementById('task-list');
            const specialTaskList = document.getElementById('special-task-list'); // Ensure this is cleared first
            if (taskList) {
                taskList.innerHTML = ''; // Clear existing tasks
            }
            if (specialTaskList) {
                specialTaskList.innerHTML = ''; // Clear existing tasks
            }
            snapshot.forEach(taskDoc => {
                const task = taskDoc.data();
                const li = document.createElement('li');
                li.textContent = `${task.description} - ${task.time ? task.time.toDate().toLocaleTimeString() : 'No specific time'} - Importance: ${task.importance}`;
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.addEventListener('click', () => {
                    deleteDoc(doc(db, 'tasks', userId, day.charAt(0).toUpperCase() + day.slice(1), taskDoc.id)).then(() => {
                        li.remove();
                    }).catch(error => {
                        console.error('Error deleting task: ', error);
                        alert('Error deleting task: ' + error.message);
                    });
                });
                li.appendChild(deleteButton);
                
                if (task.isSpecial) {
                    li.textContent = `${task.description} - Points: ${task.points} / ${task.maxPoints}`;
                    li.appendChild(deleteButton);
                    specialTaskList.appendChild(li);
                } else {
                    taskList.appendChild(li);
                }
            });
        }).catch(error => {
            console.error('Error loading planner tasks: ', error);
            alert('Error loading planner tasks: ' + error.message);
        });
    };

    const daySelect = document.getElementById('day-select');
    if (daySelect) {
        daySelect.addEventListener('change', () => {
            const selectedDay = daySelect.value;
            const selectedDayElement = document.getElementById('selected-day');
            const selectedDaySpecialElement = document.getElementById('selected-day-special');
            if (selectedDayElement) {
                selectedDayElement.textContent = selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1);
            }
            if (selectedDaySpecialElement) {
                selectedDaySpecialElement.textContent = selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1);
            }
            onAuthStateChanged(auth, user => {
                if (user) {
                    loadPlannerTasks(user.uid, selectedDay);
                    loadSpecialTasks(user.uid, true, selectedDay);  // Show delete button
                }
            });
        });
    }

    const addTaskButton = document.getElementById('add-task-btn');
    if (addTaskButton) {
        addTaskButton.addEventListener('click', () => {
            const daySelect = document.getElementById('day-select');
            if (!daySelect) return;

            const day = daySelect.value;
            const description = document.getElementById('task-desc').value;
            const timeValue = document.getElementById('task-time').value;
            const importance = document.getElementById('importance').value;
            let time = null;
            let section = null;

            if (timeValue) {
                time = new Date(`1970-01-01T${timeValue}:00`);
                if (time.getHours() < 12) {
                    section = 'morning';
                } else if (time.getHours() < 18) {
                    section = 'afternoon';
                } else {
                    section = 'evening';
                }
            }

            const userTasksCollection = collection(db, 'tasks', auth.currentUser.uid, day.charAt(0).toUpperCase() + day.slice(1));
            addDoc(userTasksCollection, {
                description,
                time: time ? Timestamp.fromDate(time) : null,
                importance: parseInt(importance),
                section,
                done: false
            }).then(() => {
                document.getElementById('task-desc').value = '';
                document.getElementById('task-time').value = '';
                document.getElementById('importance').value = 3;
                alert('Task added!');
                loadPlannerTasks(auth.currentUser.uid, day);
                loadSpecialTasks(auth.currentUser.uid, true, day); // Show delete button
            }).catch(error => {
                console.error('Error adding task', error);
                alert('Error adding task: ' + error.message);
            });
        });
    }

    const addSpecialTaskButton = document.getElementById('add-special-task-btn');
    if (addSpecialTaskButton) {
        addSpecialTaskButton.addEventListener('click', () => {
            const daySelect = document.getElementById('day-select');
            if (!daySelect) return;

            const day = daySelect.value;
            const description = document.getElementById('special-task-desc').value;
            const maxPoints = parseInt(document.getElementById('special-task-max').value);
            if (!description || isNaN(maxPoints)) return;

            const userTasksCollection = collection(db, 'tasks', auth.currentUser.uid, day.charAt(0).toUpperCase() + day.slice(1));
            addDoc(userTasksCollection, {
                description,
                points: 0,
                maxPoints,
                isSpecial: true
            }).then(() => {
                document.getElementById('special-task-desc').value = '';
                document.getElementById('special-task-max').value = '';
                alert('Special task added!');
                loadPlannerTasks(auth.currentUser.uid, day); // Reload all tasks including special tasks
                loadSpecialTasks(auth.currentUser.uid, true, day); // Show delete button
            }).catch(error => {
                console.error('Error adding special task', error);
                alert('Error adding special task: ' + error.message);
            });
        });
    }

    // Helper to load tasks for the current day in index.html
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = new Date().getDay();
    if (document.getElementById('current-day')) {
        document.getElementById('current-day').textContent = daysOfWeek[currentDay];
        onAuthStateChanged(auth, user => {
            if (user) {
                loadTasks(user.uid);
                loadSpecialTasks(user.uid, false, daysOfWeek[currentDay]);  // Do not show delete button
            }
        });
    }
});

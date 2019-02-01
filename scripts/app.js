(function() {
    'use strict';

    var app = {
        isLoading: true,
        visibleCards: {},
        selectedTimetables: [],
        spinner: document.querySelector('.loader'),
        cardTemplate: document.querySelector('.cardTemplate'),
        container: document.querySelector('.main'),
        addDialog: document.querySelector('.dialog-container'),
        // In the following line, you should include the prefixes of implementations you want to test.
        indexedDB: window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB,
        // DON'T use "var indexedDB = ..." if you're not in a function.
        // Moreover, you may need references to some window.IDB* objects:
        iDBTransaction: window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction,
        iDBKeyRange: window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange,
        useIndexedDB: true
    };


    /*****************************************************************************
     *
     * Event listeners for UI elements
     *
     ****************************************************************************/

    document.getElementById('butRefresh').addEventListener('click', function() {
        // Refresh all of the metro stations
        app.updateSchedules();
    });

    document.getElementById('butAdd').addEventListener('click', function() {
        // Open/show the add new station dialog
        app.toggleAddDialog(true);
    });

    document.getElementById('butAddCity').addEventListener('click', function() {


        var select = document.getElementById('selectTimetableToAdd');
        var selected = select.options[select.selectedIndex];
        var key = selected.value;
        var label = selected.textContent;
        if (!app.selectedTimetables) {
            app.selectedTimetables = [];
        }
        app.getSchedule(key, label);
        app.selectedTimetables.push({ key: key, label: label });
        // Se llama función para guardar la estacion seleccionada en el localStorage
        app.saveSelectedTimetables();
        app.toggleAddDialog(false);
    });

    document.getElementById('butAddCancel').addEventListener('click', function() {
        // Close the add new station dialog
        app.toggleAddDialog(false);
    });


    /*****************************************************************************
     *
     * Methods to update/refresh the UI
     *
     ****************************************************************************/

    // Toggles the visibility of the add new station dialog.
    app.toggleAddDialog = function(visible) {
        if (visible) {
            app.addDialog.classList.add('dialog-container--visible');
        } else {
            app.addDialog.classList.remove('dialog-container--visible');
        }
    };

    // Updates a timestation card with the latest weather forecast. If the card
    // doesn't already exist, it's cloned from the template.

    app.updateTimetableCard = function(data) {
        var key = data.key;
        var dataLastUpdated = new Date(data.created);
        var schedules = data.schedules;
        var card = app.visibleCards[key];

        if (!card) {
            var label = data.label.split(', ');
            var title = label[0];
            var subtitle = label[1];
            card = app.cardTemplate.cloneNode(true);
            card.classList.remove('cardTemplate');
            card.querySelector('.label').textContent = title;
            card.querySelector('.subtitle').textContent = subtitle;
            card.removeAttribute('hidden');
            app.container.appendChild(card);
            app.visibleCards[key] = card;
        } else {
            var cardLastUpdatedElem = card.querySelector('.card-last-updated');
            var cardLastUpdated = cardLastUpdatedElem.textContent;
            if (cardLastUpdated) {
                cardLastUpdated = new Date(cardLastUpdated);
                // Bail if the card has more recent data then the data
                if (dataLastUpdated.getTime() < cardLastUpdated.getTime()) {
                    return;
                }
            }
        }

        card.querySelector('.card-last-updated').textContent = data.created;

        var scheduleUIs = card.querySelectorAll('.schedule');
        for (var i = 0; i < 4; i++) {
            var schedule = schedules[i];
            var scheduleUI = scheduleUIs[i];
            if (schedule && scheduleUI) {
                scheduleUI.querySelector('.message').textContent = schedule.message;
            }
        }

        if (app.isLoading) {
            app.spinner.setAttribute('hidden', true);
            app.container.removeAttribute('hidden');
            app.isLoading = false;
        }
    };

    /*****************************************************************************
     *
     * Methods for dealing with the model
     *
     ****************************************************************************/

    // Save list of times to localStorage.
    app.saveSelectedTimetables = function() {
        var selectedTimetables = JSON.stringify(app.selectedTimetables);
        if (!app.useIndexedDB) {
            localStorage.selectedTimetables = selectedTimetables;
        } else {
            var db;
            var request = app.indexedDB.open("ratpDB");
            request.onerror = function(event) {
                app.useIndexedDB = false;
                console.log("Why didn't you allow my web app to use IndexedDB?!");
            };
            request.onsuccess = function(event) {
                db = event.target.result;
                var transac = db.transaction(["times"], "readwrite");

                var objectStore = transac.objectStore("times");
                var request = objectStore.get("time");
                request.onsuccess = function(event) {
                    if (request.result == null)
                        objectStore.add({ id: "time", value: selectedTimetables });
                    else {
                        var data = request.result;
                        data.value = selectedTimetables;
                        store.put(data);
                    }
                };

            };
        }

    };


    app.getSchedule = function(key, label) {
        var url = 'https://api-ratp.pierre-grimaud.fr/v3/schedules/' + key;

        // Se valida existencia de objeto caches, se solicitan los datos
        if ('caches' in window) {
            caches.match(url).then(function(response) {
                if (response) {
                    response.json().then(function updateFromCache(json) {
                        var result = {};
                        result.key = key;
                        result.label = label;
                        result.created = json._metadata.date;
                        result.schedules = json.result.schedules;
                        app.updateTimetableCard(result);
                    });
                }
            });
        }

        var request = new XMLHttpRequest();
        request.onreadystatechange = function() {
            if (request.readyState === XMLHttpRequest.DONE) {
                if (request.status === 200) {
                    var response = JSON.parse(request.response);
                    var result = {};
                    result.key = key;
                    result.label = label;
                    result.created = response._metadata.date;
                    result.schedules = response.result.schedules;
                    app.updateTimetableCard(result);
                }
            } else {
                // Return the initial weather forecast since no data is available.
                app.updateTimetableCard(initialStationTimetable);
            }
        };
        request.open('GET', url);
        request.send();
    };

    // Iterate all of the cards and attempt to get the latest timetable data
    app.updateSchedules = function() {
        var keys = Object.keys(app.visibleCards);
        keys.forEach(function(key) {
            app.getSchedule(key);
        });
    };

    app.loadDefault = function() {
        app.updateTimetableCard(initialStationTimetable);
        app.selectedTimetables = [
            { key: initialStationTimetable.key, label: initialStationTimetable.label }
        ];
        app.saveSelectedTimetables();
    }

    /*
     * Fake timetable data that is presented when the user first uses the app,
     * or when the user has not saved any stations. See startup code for more
     * discussion.
     */

    var initialStationTimetable = {

        key: 'metros/1/bastille/A',
        label: 'Bastille, Direction La Défense',
        created: '2017-07-18T17:08:42+02:00',
        schedules: [{
                message: '0 mn'
            },
            {
                message: '2 mn'
            },
            {
                message: '5 mn'
            }
        ]


    };

    // Inicialización de IndexedDB
    if (window.indexedDB) {
        // Open (or create) the database
        var dataBase = app.indexedDB.open("ratpDB");

        dataBase.onerror = function(event) {
            app.useIndexedDB = false;
            console.log("Why didn't you allow my web app to use IndexedDB?!");
        };

        dataBase.onsuccess = function(event) {
            console.log('Base de datos cargada correctamente.');
        };

        // Create the schema
        dataBase.onupgradeneeded = function(event) {
            var db = event.target.result;
            db.createObjectStore("times", { keyPath: "id" });
        };
    } else {
        app.useIndexedDB = false;
    }


    /************************************************************************
     *
     * Code required to start the app
     *
     * NOTE: To simplify this codelab, we've used localStorage.
     *   localStorage is a synchronous API and has serious performance
     *   implications. It should not be used in production applications!
     *   Instead, check out IDB (https://www.npmjs.com/package/idb) or
     *   SimpleDB (https://gist.github.com/inexorabletash/c8069c042b734519680c)
     ************************************************************************/

    if (!app.useIndexedDB) {
        app.selectedTimetables = localStorage.selectedTimetables;
        if (app.selectedTimetables) {
            app.selectedTimetables = JSON.parse(app.selectedTimetables);
            app.selectedTimetables.forEach(function(sch) {
                app.getSchedule(sch.key, sch.label);
            });
        } else {
            app.updateTimetableCard(initialStationTimetable);
            app.selectedTimetables = [
                { key: initialStationTimetable.key, label: initialStationTimetable.label }
            ];
            app.saveSelectedTimetables();
            app.loadDefault();
        }
    } else {
        var dataBase = app.indexedDB.open("ratpDB");
        dataBase.onerror = function(event) {
            app.useIndexedDB = false;
            console.log("Why didn't you allow my web app to use IndexedDB?!");
        };

        dataBase.onsuccess = function(event) {
            var db = event.target.result;
            var tx = db.transaction(["times"], "readwrite");

            // Close the db when the transaction is done
            tx.oncomplete = function() {
                if (app.selectedTimetables.length == 0) {
                    app.loadDefault();
                }
                db.close();
            };
            var store = tx.objectStore("times");
            var request = store.get("time");

            request.onsuccess = function(event) {
                if (request.result != null) {
                    app.selectedTimetables = JSON.parse(request.result.value);
                    app.selectedTimetables.forEach(function(sch) {
                        app.getSchedule(sch.key, sch.label);
                    });
                }
            };
        };
    }


    // Agregar codigo de service worker

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
            .register('./service-worker.js')
            .then(function() { console.log('Service Worker Registered'); });
    }

})();
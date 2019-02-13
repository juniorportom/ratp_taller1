'use strict';

module.exports = {

    extends: 'lighthouse:default',

    passes: [{
        passName: 'defaultPass',
        gatherers: [
            'card-gatherer',
            'api-gatherer'
        ]
    }],

    audits: [
        'card-audit',
        'api-audit'
    ],

    categories: {
        ratp_pwa: {
            name: 'Ratp pwa metrics',
            description: 'Metrics for the ratp timetable site',
            audits: [
                { id: 'card-audit', weight: 1 }
            ]
        },
        ratp_pwa_api: {
            name: 'Ratp api pwa metrics',
            description: 'Metrics for the ratp api timetable site',
            audits: [
                { id: 'api-audit', weight: 1 }
            ]
        }
    }
};
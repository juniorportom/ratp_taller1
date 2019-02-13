'use strict';

const Audit = require('lighthouse').Audit;

const MAX_API_TIME = 3000;

class ApiAudit extends Audit {
    static get meta() {
        return {
            category: 'MyPerformance',
            name: 'api-audit',
            description: 'Schedule api initialized and ready',
            failureDescription: 'Schedule Api slow to initialize',
            helpText: 'Used to measure time from navigationStart to when the schedule' +
                ' api is shown.',

            requiredArtifacts: ['TimeToApi']
        };
    }

    static audit(artifacts) {
        const loadedTime = artifacts.TimeToApi;

        const belowThreshold = loadedTime <= MAX_API_TIME;

        return {
            rawValue: loadedTime,
            score: belowThreshold
        };
    }
}

module.exports = ApiAudit;
module.exports = {
    create: async function (data) {
        var _this = this;
        try {
            let probeKey;
            if (data.probeKey) {
                probeKey = data.probeKey;
            } else {
                probeKey = uuidv1();
            }
            let storedProbe = await _this.findOneBy({ probeName: data.probeName });
            if (storedProbe && storedProbe.probeName) {
                let error = new Error('Probe name already exists.');
                error.code = 400;
                ErrorService.log('probe.create', error);
                throw error;
            }
            else {
                let probe = new ProbeModel();
                probe.probeKey = probeKey;
                probe.probeName = data.probeName;
                var savedProbe = await probe.save();
                return savedProbe;
            }
        } catch (error) {
            ErrorService.log('probe.save', error);
            throw error;
        }
    },

    update: async function (query, data) {
        if (!query) {
            query = {};
        }

        query.deleted = false;

        try {
            var probe = await ProbeModel.findOneAndUpdate(query,
                { $set: data },
                {
                    new: true
                });
        } catch (error) {
            ErrorService.log('ProbeModel.findOneAndUpdate', error);
            throw error;
        }
        return probe;
    },

    findBy: async function (query, limit, skip) {

        if (!skip) skip = 0;

        if (!limit) limit = 0;

        if (typeof (skip) === 'string') {
            skip = parseInt(skip);
        }

        if (typeof (limit) === 'string') {
            limit = parseInt(limit);
        }

        if (!query) {
            query = {};
        }

        query.deleted = false;
        try {
            var probe = await ProbeModel.find(query)
                .sort([['createdAt', -1]])
                .limit(limit)
                .skip(skip);
        } catch (error) {
            ErrorService.log('ProbeModel.find', error);
            throw error;
        }
        return probe;
    },

    findOneBy: async function (query) {
        if (!query) {
            query = {};
        }

        query.deleted = false;
        try {
            var probe = await ProbeModel.findOne(query);
        } catch (error) {
            ErrorService.log('ProbeModel.findOne', error);
            throw error;
        }
        return probe;
    },

    countBy: async function (query) {
        if (!query) {
            query = {};
        }

        query.deleted = false;
        try {
            var count = await ProbeModel.count(query);
        } catch (error) {
            ErrorService.log('ProbeModel.count', error);
            throw error;
        }

        return count;
    },

    deleteBy: async function (query) {
        if (!query) {
            query = {};
        }
        query.deleted = false;
        try {
            var probe = await ProbeModel.findOneAndUpdate(query, { $set: { deleted: true, deletedAt: Date.now() } }, { new: true });
        } catch (error) {
            ErrorService.log('ProbeModel.findOneAndUpdate', error);
            throw error;
        }
        return probe;
    },

    hardDeleteBy: async function (query) {
        try {
            await ProbeModel.deleteMany(query);
        } catch (error) {
            ErrorService.log('ProbeModel.deleteMany', error);
            throw error;
        }
        return 'Probe(s) removed successfully!';
    },

    createMonitorLog: async function (data) {
        try {
            let Log = new MonitorLogModel();
            Log.monitorId = data.monitorId;
            Log.probeId = data.probeId;
            Log.responseTime = data.responseTime;
            Log.responseStatus = data.responseStatus;
            Log.data = data.data;
            Log.status = data.status;
            var savedLog = await Log.save();
        } catch (error) {
            ErrorService.log('Log.save', error);
            throw error;
        }
        await MonitorService.sendResponseTime(savedLog);
        return savedLog;
    },

    createMonitorStatus: async function (data) {
        try {
            let MonitorStatus = new MonitorStatusModel();
            MonitorStatus.monitorId = data.monitorId;
            MonitorStatus.probeId = data.probeId;
            MonitorStatus.responseTime = data.responseTime;
            MonitorStatus.status = data.status;
            if (data.startTime) {
                MonitorStatus.startTime = data.startTime;
            }
            if (data.endTime) {
                MonitorStatus.endTime = data.endTime;
            }
            if (data.createdAt) {
                MonitorStatus.createdAt = data.createdAt;
            }
            var savedMonitorStatus = await MonitorStatus.save();
        } catch (error) {
            ErrorService.log('MonitorStatus.save', error);
            throw error;
        }
        return savedMonitorStatus;
    },

    updateMonitorStatus: async function (monitorStatusId) {
        try {
            var MonitorStatus = await MonitorStatusModel.findOneAndUpdate({ _id: monitorStatusId },
                { $set: { endTime: Date.now() } },
                {
                    new: true
                });
        } catch (error) {
            ErrorService.log('MonitorStatusModel.findOneAndUpdate', error);
            throw error;
        }
        return MonitorStatus;
    },

    setTime: async function (data) {
        var _this = this;
        var mon, autoAcknowledge, autoResolve;
        try {
            var statuses = await MonitorStatusModel.find({ monitorId: data.monitorId, probeId: data.probeId })
                .sort([['createdAt', -1]])
                .limit(1);
            var log = await _this.createMonitorLog(data);
            var lastStatus = statuses && statuses[0] && statuses[0].status ? statuses[0].status : null;
            var lastStatusId = statuses && statuses[0] && statuses[0]._id ? statuses[0]._id : null;
            if (!lastStatus) {
                await _this.createMonitorStatus(data);
                mon = await _this.incidentCreateOrUpdate(data, lastStatus);
                autoAcknowledge = lastStatus && lastStatus === 'degraded' ? mon.criteria.degraded.autoAcknowledge : lastStatus === 'offline' ? mon.criteria.down.autoAcknowledge : false;
                autoResolve = lastStatus === 'degraded' ? mon.criteria.degraded.autoResolve : lastStatus === 'offline' ? mon.criteria.down.autoResolve : false;
                await _this.incidentResolveOrAcknowledge(data, lastStatus, autoAcknowledge, autoResolve);
            }
            else if (lastStatus && lastStatus !== data.status) {
                if (lastStatusId) {
                    await _this.updateMonitorStatus(lastStatusId);
                }
                await _this.createMonitorStatus(data);
                mon = await _this.incidentCreateOrUpdate(data, lastStatus);
                autoAcknowledge = lastStatus && lastStatus === 'degraded' ? mon.criteria.degraded.autoAcknowledge : lastStatus === 'offline' ? mon.criteria.down.autoAcknowledge : false;
                autoResolve = lastStatus === 'degraded' ? mon.criteria.degraded.autoResolve : lastStatus === 'offline' ? mon.criteria.down.autoResolve : false;
                await _this.incidentResolveOrAcknowledge(data, lastStatus, autoAcknowledge, autoResolve);
            }
        } catch (error) {
            ErrorService.log('setTime.findOne', error);
            throw error;
        }
        return log;
    },

    incidentCreateOrUpdate: async function (data) {
        try {
            var monitor = await MonitorService.findOneBy({ _id: data.monitorId });
            var incidents = await IncidentService.findBy({ monitorId: data.monitorId, incidentType: data.status, resolved: false });

            if (data.status === 'online' && monitor && monitor.criteria && monitor.criteria.up && monitor.criteria.up.createAlert) {
                if (incidents && incidents.length) {
                    incidents.map(async (incident) => {
                        await IncidentService.update({
                            _id: incident._id,
                            probes: incident.probes.concat({
                                probeId: data.probeId,
                                updatedAt: Date.now(),
                                status: true
                            })
                        });
                    });
                }
                else {
                    await IncidentService.create({
                        projectId: monitor.projectId,
                        monitorId: data.monitorId,
                        createdById: null,
                        incidentType: 'online',
                        probeId: data.probeId
                    });
                }
            }
            else if (data.status === 'degraded' && monitor && monitor.criteria && monitor.criteria.degraded && monitor.criteria.degraded.createAlert) {
                if (incidents && incidents.length) {
                    incidents.map(async (incident) => {
                        await IncidentService.update({
                            _id: incident._id,
                            probes: incident.probes.concat({
                                probeId: data.probeId,
                                updatedAt: Date.now(),
                                status: true
                            })
                        });
                    });
                }
                else {
                    await IncidentService.create({
                        projectId: monitor.projectId,
                        monitorId: data.monitorId,
                        createdById: null,
                        incidentType: 'degraded',
                        probeId: data.probeId
                    });
                }
            }
            else if (data.status === 'offline' && monitor && monitor.criteria && monitor.criteria.down && monitor.criteria.down.createAlert) {
                if (incidents && incidents.length) {
                    incidents.map(async (incident) => {
                        await IncidentService.update({
                            _id: incident._id,
                            probes: incident.probes.concat({
                                probeId: data.probeId,
                                updatedAt: Date.now(),
                                status: true
                            })
                        });
                    });
                }
                else {
                    await IncidentService.create({
                        projectId: monitor.projectId,
                        monitorId: data.monitorId,
                        createdById: null,
                        incidentType: 'offline',
                        probeId: data.probeId
                    });
                }
            }
        } catch (error) {
            ErrorService.log('ProbeService.incidentCreateOrUpdate', error);
            throw error;
        }
        return monitor;
    },

    incidentResolveOrAcknowledge: async function (data, lastStatus, autoAcknowledge, autoResolve) {
        try {
            var incidents = await IncidentService.findBy({ monitorId: data.monitorId, incidentType: lastStatus, resolved: false });
            var incidentsV1 = [];
            var incidentsV2 = [];
            if (incidents && incidents.length) {
                if (lastStatus && lastStatus !== data.status) {
                    incidents.map(async (incident) => {
                        incident = incident.toObject();
                        incident.probes.some(probe => {
                            if (probe.probeId === data.probeId.toString()) {
                                incidentsV1.push(incident);
                                return true;
                            }
                            else return false;
                        });
                    });
                }
            }
            await Promise.all(incidentsV1.map(async (v1) => {
                let newIncident = await IncidentService.update({
                    _id: v1._id,
                    probes: v1.probes.concat([{
                        probeId: data.probeId,
                        updatedAt: Date.now(),
                        status: false
                    }])
                });
                incidentsV2.push(newIncident);
                return newIncident;
            }));

            incidentsV2.map(async (v2) => {
                let trueArray = [];
                let falseArray = [];
                v2.probes.map(probe => {
                    if (probe.status) {
                        trueArray.push(probe);
                    }
                    else {
                        falseArray.push(probe);
                    }
                });
                if (trueArray.length === falseArray.length) {
                    if (autoAcknowledge) {
                        if (!v2.acknowledged) {
                            await IncidentService.acknowledge(v2._id, null, 'fyipe');
                        }
                    }
                    if (autoResolve) {
                        await IncidentService.resolve(v2._id, null, 'fyipe');
                    }
                }
            });
        } catch (error) {
            ErrorService.log('ProbeService.resolveOrAcknowledge', error);
            throw error;
        }
        return {};
    },

    getTime: async function (data) {
        try {
            var date = new Date();
            var log = await MonitorLogModel.findOne({ monitorId: data.monitorId, probeId: data.probeId, createdAt: { $lt: date } });
        } catch (error) {
            ErrorService.log('MonitorLogModel.findOne', error);
            throw error;
        }
        return log;
    },

    getLogs: async function (query) {
        if (!query) {
            query = {};
        }
        try {
            var log = await MonitorStatusModel.find(query).sort({ createdAt: -1 });
        } catch (error) {
            ErrorService.log('MonitorLogModel.find', error);
            throw error;
        }
        return log;
    },

    getMonitorData: async function (monitorId) {
        var _this = this;
        try {
            var probes = await _this.findBy({});
        } catch (error) {
            ErrorService.log('probeService.find', error);
            throw error;
        }
        var targetDate = moment(Date.now()).subtract(90, 'days').startOf('day');
        var newProbes = Promise.all(probes.map(async (probe) => {
            try {
                probe = probe.toObject();
                var probeStatus = await _this.getLogs({
                    probeId: probe._id, monitorId: monitorId,
                    $or: [
                        { 'startTime': { $gt: targetDate } }, { $or: [{ 'endTime': { $gt: targetDate } }, { 'endTime': null }] }
                    ]
                });
                var latestLog = await MonitorLogModel
                    .find({ probeId: probe._id, monitorId: monitorId })
                    .sort({ createdAt: -1 })
                    .limit(1);
                probe.probeStatus = probeStatus;
                probe.status = latestLog && latestLog[0] && latestLog[0].status ? latestLog[0].status : '';
                probe.responseTime = latestLog && latestLog[0] && latestLog[0].responseTime ? latestLog[0].responseTime : '';
                return probe;
            } catch (error) {
                ErrorService.log('probeService.find', error);
                throw error;
            }
        }));
        return newProbes;
    },

    updateProbeStatus: async function (probeId) {
        try {
            var probe = await ProbeModel.findOneAndUpdate({ _id: probeId }, { $set: { lastAlive: Date.now() } }, { new: true });
        } catch (error) {
            ErrorService.log('ProbeModel.findOneAndUpdate', error);
            throw error;
        }
        return probe;
    },

    conditions: async (payload, resp, con) => {
        let stat = true;
        let status = resp ? (resp.status ? resp.status : (resp.statusCode ? resp.statusCode : null)) : null;
        let body = resp && resp.body ? resp.body : null;

        if (con && con.and && con.and.length) {
            stat = await checkAnd(payload, con.and, status, body);
        }
        else if (con && con.or && con.or.length) {
            stat = await checkOr(payload, con.or, status, body);
        }
        return stat;
    },
};

var _ = require('lodash');

const checkAnd = async (payload, con, statusCode, body) => {
    let validity = true;
    for (let i = 0; i < con.length; i++) {
        if (con[i] && con[i].responseType && con[i].responseType === 'responseTime') {
            if (con[i] && con[i].filter && con[i].filter === 'greaterThan') {
                if (!(con[i] && con[i].field1 && payload && payload > con[i].field1)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'lessThan') {
                if (!(con[i] && con[i].field1 && payload && payload < con[i].field1)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'inBetween') {
                if (!(con[i] && con[i].field1 && payload && con[i].field2 && payload > con[i].field1 && payload < con[i].field2)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'equalTo') {
                if (!(con[i] && con[i].field1 && payload && payload == con[i].field1)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'notEqualTo') {
                if (!(con[i] && con[i].field1 && payload && payload != con[i].field1)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'gtEqualTo') {
                if (!(con[i] && con[i].field1 && payload && payload >= con[i].field1)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'ltEqualTo') {
                if (!(con[i] && con[i].field1 && payload && payload <= con[i].field1)) {
                    validity = false;
                }
            }
        }
        else if (con[i] && con[i].responseType === 'doesRespond') {
            if (con[i] && con[i].filter && con[i].filter === 'isUp') {
                if (!(con[i] && con[i].filter && payload)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'isDown') {
                if (!(con[i] && con[i].filter && !payload)) {
                    validity = false;
                }
            }
        }
        else if (con[i] && con[i].responseType === 'statusCode') {
            if (con[i] && con[i].filter && con[i].filter === 'greaterThan') {
                if (!(con[i] && con[i].field1 && statusCode && statusCode > con[i].field1)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'lessThan') {
                if (!(con[i] && con[i].field1 && statusCode && statusCode < con[i].field1)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'inBetween') {
                if (!(con[i] && con[i].field1 && statusCode && con[i].field2 && statusCode > con[i].field1 && statusCode < con[i].field2)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'equalTo') {
                if (!(con[i] && con[i].field1 && statusCode && statusCode == con[i].field1)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'notEqualTo') {
                if (!(con[i] && con[i].field1 && statusCode && statusCode != con[i].field1)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'gtEqualTo') {
                if (!(con[i] && con[i].field1 && statusCode && statusCode >= con[i].field1)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'ltEqualTo') {
                if (!(con[i] && con[i].field1 && statusCode && statusCode <= con[i].field1)) {
                    validity = false;
                }
            }
        }
        else if (con[i] && con[i].responseType === 'cpuLoad') {
            if (con[i] && con[i].filter && con[i].filter === 'greaterThan') {
                if (!(con[i] && con[i].field1 && payload.load && payload.load.currentload && payload.load.currentload > con[i].field1)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'lessThan') {
                if (!(con[i] && con[i].field1 && payload.load && payload.load.currentload && payload.load.currentload < con[i].field1)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'inBetween') {
                if (!(con[i] && con[i].field1 && payload.load && payload.load.currentload && con[i].field2 && payload.load.currentload > con[i].field1 && payload.load.currentload < con[i].field2)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'equalTo') {
                if (!(con[i] && con[i].field1 && payload.load && payload.load.currentload && payload.load.currentload == con[i].field1)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'notEqualTo') {
                if (!(con[i] && con[i].field1 && payload.load && payload.load.currentload && payload.load.currentload != con[i].field1)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'gtEqualTo') {
                if (!(con[i] && con[i].field1 && payload.load && payload.load.currentload && payload.load.currentload >= con[i].field1)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'ltEqualTo') {
                if (!(con[i] && con[i].field1 && payload.load && payload.load.currentload && payload.load.currentload <= con[i].field1)) {
                    validity = false;
                }
            }
        }
        else if (con[i] && con[i].responseType === 'memoryUsage') {
            if (con[i] && con[i].filter && con[i].filter === 'greaterThan') {
                if (!(con[i] && con[i].field1 && payload.memory && payload.memory.used && payload.memory.used > con[i].field1)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'lessThan') {
                if (!(con[i] && con[i].field1 && payload.memory && payload.memory.used && payload.memory.used < con[i].field1)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'inBetween') {
                if (!(con[i] && con[i].field1 && payload.memory && payload.memory.used && con[i].field2 && payload.memory.used > con[i].field1 && payload.memory.used < con[i].field2)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'equalTo') {
                if (!(con[i] && con[i].field1 && payload.memory && payload.memory.used && payload.memory.used == con[i].field1)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'notEqualTo') {
                if (!(con[i] && con[i].field1 && payload.memory && payload.memory.used && payload.memory.used != con[i].field1)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'gtEqualTo') {
                if (!(con[i] && con[i].field1 && payload.memory && payload.memory.used && payload.memory.used >= con[i].field1)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'ltEqualTo') {
                if (!(con[i] && con[i].field1 && payload.memory && payload.memory.used && payload.memory.used <= con[i].field1)) {
                    validity = false;
                }
            }
        }
        else if (con[i] && con[i].responseType === 'storageUsage') {
            if (con[i] && con[i].filter && con[i].filter === 'greaterThan') {
                if (!(con[i] && con[i].field1 && payload.disk && payload.disk[0] && payload.disk[0].use && payload.disk[0].use > con[i].field1)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'lessThan') {
                if (!(con[i] && con[i].field1 && payload.disk && payload.disk[0] && payload.disk[0].use && payload.disk[0].use < con[i].field1)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'inBetween') {
                if (!(con[i] && con[i].field1 && payload.disk && payload.disk[0] && payload.disk[0].use && con[i].field2 && payload.disk[0].use > con[i].field1 && payload.disk[0].use < con[i].field2)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'equalTo') {
                if (!(con[i] && con[i].field1 && payload.disk && payload.disk[0] && payload.disk[0].use && payload.disk[0].use == con[i].field1)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'notEqualTo') {
                if (!(con[i] && con[i].field1 && payload.disk && payload.disk[0] && payload.disk[0].use && payload.disk[0].use != con[i].field1)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'gtEqualTo') {
                if (!(con[i] && con[i].field1 && payload.disk && payload.disk[0] && payload.disk[0].use && payload.disk[0].use >= con[i].field1)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'ltEqualTo') {
                if (!(con[i] && con[i].field1 && payload.disk && payload.disk[0] && payload.disk[0].use && payload.disk[0].use <= con[i].field1)) {
                    validity = false;
                }
            }
        }
        else if (con[i] && con[i].responseType === 'temperature') {
            if (con[i] && con[i].filter && con[i].filter === 'greaterThan') {
                if (!(con[i] && con[i].field1 && payload.temperature && payload.temperature.main && payload.temperature.main > con[i].field1)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'lessThan') {
                if (!(con[i] && con[i].field1 && payload.temperature && payload.temperature.main && payload.temperature.main < con[i].field1)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'inBetween') {
                if (!(con[i] && con[i].field1 && payload.temperature && payload.temperature.main && con[i].field2 && payload.temperature.main > con[i].field1 && payload.temperature.main < con[i].field2)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'equalTo') {
                if (!(con[i] && con[i].field1 && payload.temperature && payload.temperature.main && payload.temperature.main == con[i].field1)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'notEqualTo') {
                if (!(con[i] && con[i].field1 && payload.temperature && payload.temperature.main && payload.temperature.main != con[i].field1)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'gtEqualTo') {
                if (!(con[i] && con[i].field1 && payload.temperature && payload.temperature.main && payload.temperature.main >= con[i].field1)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'ltEqualTo') {
                if (!(con[i] && con[i].field1 && payload.temperature && payload.temperature.main && payload.temperature.main <= con[i].field1)) {
                    validity = false;
                }
            }
        }
        else if (con[i] && con[i].responseType === 'responseBody') {
            if (con[i] && con[i].filter && con[i].filter === 'contains') {
                if (!(con[i] && con[i].field1 && body && body[con[i].field1])) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'doesNotContain') {
                if (!(con[i] && con[i].field1 && body && !body[con[i].field1])) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'jsExpression') {
                if (!(con[i] && con[i].field1 && body && body[con[i].field1] === con[i].field1)) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'empty') {
                if (!(con[i] && con[i].filter && body && _.isEmpty(body))) {
                    validity = false;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'notEmpty') {
                if (!(con[i] && con[i].filter && body && !_.isEmpty(body))) {
                    validity = false;
                }
            }
        }
        if (con[i] && con[i].collection && con[i].collection.and && con[i].collection.and.length) {
            let temp = await checkAnd(payload, con[i].collection.and, statusCode, body);
            if (!temp) {
                validity = temp;
            }
        }
        else if (con[i] && con[i].collection && con[i].collection.or && con[i].collection.or.length) {
            let temp1 = await checkOr(payload, con[i].collection.or, statusCode, body);
            if (!temp1) {
                validity = temp1;
            }
        }
    }
    return validity;
};
const checkOr = async (payload, con, statusCode, body) => {
    let validity = false;
    for (let i = 0; i < con.length; i++) {
        if (con[i] && con[i].responseType === 'responseTime') {
            if (con[i] && con[i].filter && con[i].filter === 'greaterThan') {
                if (con[i] && con[i].field1 && payload && payload > con[i].field1) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'lessThan') {
                if (con[i] && con[i].field1 && payload && payload < con[i].field1) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'inBetween') {
                if (con[i] && con[i].field1 && payload && con[i].field2 && payload > con[i].field1 && payload < con[i].field2) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'equalTo') {
                if (con[i] && con[i].field1 && payload && payload == con[i].field1) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'notEqualTo') {
                if (con[i] && con[i].field1 && payload && payload != con[i].field1) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'gtEqualTo') {
                if (con[i] && con[i].field1 && payload && payload >= con[i].field1) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'ltEqualTo') {
                if (con[i] && con[i].field1 && payload && payload <= con[i].field1) {
                    validity = true;
                }
            }
        }
        else if (con[i] && con[i].responseType === 'doesRespond') {
            if (con[i] && con[i].filter && con[i].filter === 'isUp') {
                if (con[i] && con[i].filter && payload) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'isDown') {
                if (con[i] && con[i].filter && !payload) {
                    validity = true;
                }
            }
        }
        else if (con[i] && con[i].responseType === 'statusCode') {
            if (con[i] && con[i].filter && con[i].filter === 'greaterThan') {
                if (con[i] && con[i].field1 && statusCode && statusCode > con[i].field1) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'lessThan') {
                if (con[i] && con[i].field1 && statusCode && statusCode < con[i].field1) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'inBetween') {
                if (con[i] && con[i].field1 && statusCode && con[i].field2 && statusCode > con[i].field1 && statusCode < con[i].field2) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'equalTo') {
                if (con[i] && con[i].field1 && statusCode && statusCode == con[i].field1) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'notEqualTo') {
                if (con[i] && con[i].field1 && statusCode && statusCode != con[i].field1) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'gtEqualTo') {
                if (con[i] && con[i].field1 && statusCode && statusCode >= con[i].field1) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'ltEqualTo') {
                if (con[i] && con[i].field1 && statusCode && statusCode <= con[i].field1) {
                    validity = true;
                }
            }
        }
        else if (con[i] && con[i].responseType === 'cpuLoad') {
            if (con[i] && con[i].filter && con[i].filter === 'greaterThan') {
                if (con[i] && con[i].field1 && payload.load && payload.load.currentload && payload.load.currentload > con[i].field1) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'lessThan') {
                if (con[i] && con[i].field1 && payload.load && payload.load.currentload && payload.load.currentload < con[i].field1) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'inBetween') {
                if (con[i] && con[i].field1 && payload.load && payload.load.currentload && con[i].field2 && payload.load.currentload > con[i].field1 && payload.load.currentload < con[i].field2) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'equalTo') {
                if (con[i] && con[i].field1 && payload.load && payload.load.currentload && payload.load.currentload == con[i].field1) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'notEqualTo') {
                if (con[i] && con[i].field1 && payload.load && payload.load.currentload && payload.load.currentload != con[i].field1) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'gtEqualTo') {
                if (con[i] && con[i].field1 && payload.load && payload.load.currentload && payload.load.currentload >= con[i].field1) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'ltEqualTo') {
                if (con[i] && con[i].field1 && payload.load && payload.load.currentload && payload.load.currentload <= con[i].field1) {
                    validity = true;
                }
            }
        }
        else if (con[i] && con[i].responseType === 'memoryUsage') {
            if (con[i] && con[i].filter && con[i].filter === 'greaterThan') {
                if (con[i] && con[i].field1 && payload.memory && payload.memory.used && payload.memory.used > con[i].field1) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'lessThan') {
                if (con[i] && con[i].field1 && payload.memory && payload.memory.used && payload.memory.used < con[i].field1) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'inBetween') {
                if (con[i] && con[i].field1 && payload.memory && payload.memory.used && con[i].field2 && payload.memory.used > con[i].field1 && payload.memory.used < con[i].field2) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'equalTo') {
                if (con[i] && con[i].field1 && payload.memory && payload.memory.used && payload.memory.used == con[i].field1) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'notEqualTo') {
                if (con[i] && con[i].field1 && payload.memory && payload.memory.used && payload.memory.used != con[i].field1) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'gtEqualTo') {
                if (con[i] && con[i].field1 && payload.memory && payload.memory.used && payload.memory.used >= con[i].field1) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'ltEqualTo') {
                if (con[i] && con[i].field1 && payload.memory && payload.memory.used && payload.memory.used <= con[i].field1) {
                    validity = true;
                }
            }
        }
        else if (con[i] && con[i].responseType === 'storageUsage') {
            if (con[i] && con[i].filter && con[i].filter === 'greaterThan') {
                if (con[i] && con[i].field1 && payload.disk && payload.disk[0] && payload.disk[0].use && payload.disk[0].use > con[i].field1) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'lessThan') {
                if (con[i] && con[i].field1 && payload.disk && payload.disk[0] && payload.disk[0].use && payload.disk[0].use < con[i].field1) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'inBetween') {
                if (con[i] && con[i].field1 && payload.disk && payload.disk[0] && payload.disk[0].use && con[i].field2 && payload.disk[0].use > con[i].field1 && payload.disk[0].use < con[i].field2) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'equalTo') {
                if (con[i] && con[i].field1 && payload.disk && payload.disk[0] && payload.disk[0].use && payload.disk[0].use == con[i].field1) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'notEqualTo') {
                if (con[i] && con[i].field1 && payload.disk && payload.disk[0] && payload.disk[0].use && payload.disk[0].use != con[i].field1) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'gtEqualTo') {
                if (con[i] && con[i].field1 && payload.disk && payload.disk[0] && payload.disk[0].use && payload.disk[0].use >= con[i].field1) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'ltEqualTo') {
                if (con[i] && con[i].field1 && payload.disk && payload.disk[0] && payload.disk[0].use && payload.disk[0].use <= con[i].field1) {
                    validity = true;
                }
            }
        }
        else if (con[i] && con[i].responseType === 'temperature') {
            if (con[i] && con[i].filter && con[i].filter === 'greaterThan') {
                if (con[i] && con[i].field1 && payload.temperature && payload.temperature.main && payload.temperature.main > con[i].field1) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'lessThan') {
                if (con[i] && con[i].field1 && payload.temperature && payload.temperature.main && payload.temperature.main < con[i].field1) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'inBetween') {
                if (con[i] && con[i].field1 && payload.temperature && payload.temperature.main && con[i].field2 && payload.temperature.main > con[i].field1 && payload.temperature.main < con[i].field2) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'equalTo') {
                if (con[i] && con[i].field1 && payload.temperature && payload.temperature.main && payload.temperature.main == con[i].field1) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'notEqualTo') {
                if (con[i] && con[i].field1 && payload.temperature && payload.temperature.main && payload.temperature.main != con[i].field1) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'gtEqualTo') {
                if (con[i] && con[i].field1 && payload.temperature && payload.temperature.main && payload.temperature.main >= con[i].field1) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'ltEqualTo') {
                if (con[i] && con[i].field1 && payload.temperature && payload.temperature.main && payload.temperature.main <= con[i].field1) {
                    validity = true;
                }
            }
        }
        else if (con[i] && con[i].responseType === 'responseBody') {
            if (con[i] && con[i].filter && con[i].filter === 'contains') {
                if (con[i] && con[i].field1 && body && body[con[i].field1]) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'doesNotContain') {
                if (con[i] && con[i].field1 && body && !body[con[i].field1]) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'jsExpression') {
                if (con[i] && con[i].field1 && body && body[con[i].field1] === con[i].field1) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'empty') {
                if (con[i] && con[i].filter && body && _.isEmpty(body)) {
                    validity = true;
                }
            }
            else if (con[i] && con[i].filter && con[i].filter === 'notEmpty') {
                if (con[i] && con[i].filter && body && !_.isEmpty(body)) {
                    validity = true;
                }
            }
        }
        if (con[i] && con[i].collection && con[i].collection.and && con[i].collection.and.length) {
            let temp = await checkAnd(payload, con[i].collection.and, statusCode, body);
            if (temp) {
                validity = temp;
            }
        }
        else if (con[i] && con[i].collection && con[i].collection.or && con[i].collection.or.length) {
            let temp1 = await checkOr(payload, con[i].collection.or, statusCode, body);
            if (temp1) {
                validity = temp1;
            }
        }
    }
    return validity;
};

let ProbeModel = require('../models/probe');
let MonitorLogModel = require('../models/monitorLog');
let MonitorStatusModel = require('../models/monitorStatus');
let ErrorService = require('./errorService');
let uuidv1 = require('uuid/v1');
var moment = require('moment');
let MonitorService = require('./monitorService');
let IncidentService = require('./incidentService');

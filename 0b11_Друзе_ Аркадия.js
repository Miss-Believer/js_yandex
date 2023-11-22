'use strict';

const isExtraTaskSolved = true;

const ROBBERY_DAYS = {};
ROBBERY_DAYS.ПН = 0;
ROBBERY_DAYS.ВТ = 1;
ROBBERY_DAYS.СР = 2;


/*const DAY_TO_NUMBER = {
    [ROBBERY_DAYS.MONDAY]: 0,
    [ROBBERY_DAYS.TUESDAY]: 1,
    [ROBBERY_DAYS.WEDNESDAY]: 2,
};

const NUMBER_TO_DAY = {
    0: [ROBBERY_DAYS.MONDAY],
    1: [ROBBERY_DAYS.TUESDAY],
    2: [ROBBERY_DAYS.WEDNESDAY],
};*/

const MINUTES_IN_DAY = 24 * 60;
const NEXT_ROBBERY_DELAY = 30;
const TIME_REGEXP = /^(\W+) (\d{2}):(\d{2})\+(\d+)$/;

let BANK_TIME_ZONE;

class MinutesInterval {
    constructor(from, to, day) {
        if (typeof day !== "undefined") {
            this.from = this.workingTimeToMinutes(from, day);
            this.to = this.workingTimeToMinutes(to, day);
        } else if (typeof from === "string" && typeof to === "string") {
            this.from = this.timeToMinutes(from);
            this.to = this.timeToMinutes(to, day);
        } else if (typeof from === "number" && typeof to === "number") {
            this.from = from;
            this.to = to;
        }
    }

    timeToMinutes(time) {
        let rawValues = time.match(TIME_REGEXP).slice(1);

        let day = rawValues[0];
        let [hours, minutes, timeZone] = rawValues.slice(1).map(x => parseInt(x));

        return this.getMinutes(day, hours, minutes, timeZone);
    }

    workingTimeToMinutes(time, day) {
        let [hours, minutes] = time.split(':').map(x => parseInt(x.slice(0, 2)));
        return this.getMinutes(day, hours, minutes, BANK_TIME_ZONE);
    }

    getMinutes(day, hours, minutes, timeZone) {
        minutes += (hours - timeZone + BANK_TIME_ZONE) * 60
        minutes += MINUTES_IN_DAY * ROBBERY_DAYS
        return minutes
    }
}

function getBankIntervals(workingHours) {
    let bankIntervals = [];
    for (let day in ROBBERY_DAYS)
        bankIntervals.push(new MinutesInterval(workingHours.from, workingHours.to, ROBBERY_DAYS[day]));

    return bankIntervals;
}

function isIntersected(interval, otherInterval) {
    return interval.to >= otherInterval.from && otherInterval.to >= interval.from;
}

function mergeIntervals(intervals) {
    const unitedIntervals = [intervals[0]];
    let lastInterval = unitedIntervals[unitedIntervals.length - 1];

    for (let interval of intervals) {
        if (isIntersected(interval, lastInterval))
            lastInterval.to = Math.max(lastInterval.to, interval.to);
        else {
            unitedIntervals.push(interval);
            lastInterval = interval;
        }
    }

    return unitedIntervals;
}

function getGangBusyIntervals(schedule) {
    let gangIntervals = [];
    for (let robber in schedule) {
        for (let freeHours of schedule[robber]) {
            let interval = new MinutesInterval(freeHours.from, freeHours.to);
            gangIntervals.push(interval);
        }
    }
    return mergeIntervals(gangIntervals.sort((a, b) => a.from - b.from));
}

function getGangFreeIntervals(gangBusyIntervals) {
    let startTime = 0;
    let lastTime = (60 - 1)
        + (24 - 1) * 60
        + MINUTES_IN_DAY * ROBBERY_DAYS.СР

    let gangFreeIntervals = []
    for (let interval of gangBusyIntervals) {
        gangFreeIntervals.push(new MinutesInterval(startTime,
            interval.from < lastTime ? interval.from : lastTime))
        startTime = interval.to;
    }
    if (startTime < lastTime)
        gangFreeIntervals.push(new MinutesInterval(startTime, lastTime))

    return gangFreeIntervals;
}

function getRobberyIntervals(schedule, bankIntervals, duration) {
    let gangBusyIntervals = getGangBusyIntervals(schedule);
    let gangFreeIntervals = getGangFreeIntervals(gangBusyIntervals);
    let robberyIntervals = [];

    for (let bankInterval of bankIntervals) {
        for (let gangInterval of gangFreeIntervals) {
            if (isIntersected(bankInterval, gangInterval)) {
                let interval = new MinutesInterval(
                    Math.max(bankInterval.from, gangInterval.from),
                    Math.min(bankInterval.to, gangInterval.to));
                if (interval.to - interval.from >= duration)
                    robberyIntervals.push(interval);
            }
        }
    }
    return robberyIntervals;
}


function getAppropriateMoment(schedule, duration, workingHours) {
    BANK_TIME_ZONE = parseInt(workingHours.from.slice(6));

    let bankIntervals = getBankIntervals(workingHours);
    let robberyIntervals = getRobberyIntervals(schedule, bankIntervals, duration);

    return {
        /**
         * Найдено ли время
         * @returns {boolean}
         */
        exists() {
            return robberyIntervals.length > 0;
        },


        format(template) {
            if (!this.exists())
                return '';

            const convertTime = (num) => num.toString().padStart(2, '0');
            let robberyTime = robberyIntervals[0].from;
            let dayNumber = Math.floor(robberyTime / MINUTES_IN_DAY)

            let dayName = ROBBERY_DAYS;
            let hours = Math.floor((robberyTime - ROBBERY_DAYS * MINUTES_IN_DAY) / 60);
            let minutes = (robberyTime - ROBBERY_DAYS * MINUTES_IN_DAY - hours * 60);

            return template
                .replace('%DD', dayName)
                .replace('%HH', convertTime(hours))
                .replace('%MM', convertTime(minutes));
        },


        tryLater() {
            if (!this.exists())
                return false;

            let nearestRobberyInterval = robberyIntervals[0];

            if (nearestRobberyInterval.to - (nearestRobberyInterval.from + NEXT_ROBBERY_DELAY) >= duration) {
                nearestRobberyInterval.from += NEXT_ROBBERY_DELAY;
                return true;
            } else if (typeof robberyIntervals[1] !== "undefined") {
                robberyIntervals.shift();
                return true;
            }
            return false;
        }
    };
}

module.exports = {
    getAppropriateMoment,
    isExtraTaskSolved
};

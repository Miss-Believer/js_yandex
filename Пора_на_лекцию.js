/**
  * Возвращает новый emitter
  * @returns {Object}
  */
const events = require("events");

function getEmitter() {
    const addEvent = (event, context, handler, times = Infinity, frequency = 1) => {
        if (!(event in events)) events[event] = [];
        handler = handler.bind(context);
        events[event].push({context, handler, times: times, frequency: frequency, "calls": 0});
    }

    return {


        /**
         * Подписаться на событие
         * @param {String} event
         * @param {Object} context
         * @param {Function} handler
         */
        on: function (event, context, handler) {
            if (!(event in events)) events[event] = []

            events[event].push({context, handler})

            return this;

        },

        /**
         * Отписаться от события
         * @param {String} event
         * @param {Object} context
         */
        off: function (event, context) {
            Object.keys(events).forEach(key => {
                if (key === event || key.startsWith(`${event}.`)) {
                    events[key] = events[key].filter(descriptor => descriptor.context !== context);
                }
            })
            return this;

        },

        /**
         * Уведомить о событии
         * @param {String} event
         */
        emit: function (event) {
            if (events[event])
                events[event].forEach(eventEmit => eventEmit.handler.apply(eventEmit.context))

            if (event.includes('.'))
                this.emit(event.substring(0, event.lastIndexOf('.')));

            return this;
        },

        /**
         * Подписаться на событие с ограничением по количеству полученных уведомлений
         * @star
         * @param {String} event
         * @param {Object} context
         * @param {Function} handler
         * @param {Number} times – сколько раз получить уведомление
         */


        several: function (event, context, handler, times) {
            if (times <= 0) return this.on(event, context, handler);

            addEvent(event, context, handler, times,)

            console.info(event, context, handler, times);
        },

        /**
         * Подписаться на событие с ограничением по частоте получения уведомлений
         * @star
         * @param {String} event
         * @param {Object} context
         * @param {Function} handler
         * @param {Number} frequency – как часто уведомлять
         */
        through: function (event, context, handler, frequency) {
            if (frequency <= 0) return this.on(event, context, handler)

            addEvent(event, context, handler, frequency)

			return this
            //console.info(event, context, handler, Infinity, frequency);
        }
    };


}


module.exports = {
    getEmitter,

};

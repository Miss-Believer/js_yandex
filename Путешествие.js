'use strict';

const fetch = require('node-fetch');

const API_KEY = require('./key.json');

const WEATHER = {
  sunny: 'sunny',
  cloudy: 'cloudy',
  overcast: 'overcast',
  partlyCloudy: 'partly-cloudy',
  clear: 'clear'
}

/**
 * @typedef {object} TripItem Город, который является частью маршрута.
 * @property {number} geoid Идентификатор города
 * @property {number} day Порядковое число дня маршрута
 */

class TripBuilder {
  constructor(geoids) {
    this.geoids = geoids;
    this.maxDaysInCity = 7;
    this.weatherPlan = [];
  }

  /**
   * Метод, добавляющий условие наличия в маршруте
   * указанного количества солнечных дней
   * Согласно API Яндекс.Погоды, к солнечным дням
   * можно приравнять следующие значения `condition`:
   * * `clear`;
   * * `partly-cloudy`.
   * @param {number} daysCount количество дней
   * @returns {object} Объект планировщика маршрута
   */
  sunny(daysCount) {
    this.addWeatherToPlan(WEATHER.sunny, daysCount);
    return this;
  }

  /**
   * Метод, добавляющий условие наличия в маршруте
   * указанного количества пасмурных дней
   * Согласно API Яндекс.Погоды, к солнечным дням
   * можно приравнять следующие значения `condition`:
   * * `cloudy`;
   * * `overcast`.
   * @param {number} daysCount количество дней
   * @returns {object} Объект планировщика маршрута
   */
  cloudy(daysCount) {
    this.addWeatherToPlan(WEATHER.cloudy, daysCount);
    return this;
  }

  /**
   * Метод, добавляющий условие максимального количества дней.
   * @param {number} daysCount количество дней
   * @returns {object} Объект планировщика маршрута
   */
  max(daysCount) {
    this.maxDaysInCity = daysCount;
    return this;
  }

  /**
   * Метод, возвращающий Promise с планируемым маршрутом.
   * @returns {Promise<TripItem[]>} Список городов маршрута
   */
  build() {
    return new Promise((resolve, reject) => {
      Promise.all(this.geoids.map(geoid => this.getWeatherReport(geoid)))
        .then(fullRawData => {
          let allCitiesInfo = fullRawData.map(cityRawData => this.parseAnswer(cityRawData))
          let finalRoute = this.getFinalRoute(allCitiesInfo);
          if (finalRoute.length !== this.weatherPlan.length)
            reject(new Error('Не могу построить маршрут!'));
          else
            resolve(finalRoute);
        })
        .catch(error => reject(error));
    });
  }

  getFinalRoute(allCitiesInfo) {
    let finalRoute = [];
    let visitedCities = [];

    let currentCity = {geoid: -1, weatherPlan: []};
    let daysInOneCity = 0;
    for (let dayNumber = 1; dayNumber <= this.weatherPlan.length; dayNumber++) {
      let weather = this.weatherPlan[dayNumber - 1];

      if (this.isCurrentCityFits(currentCity, weather, dayNumber - 1, daysInOneCity)) {
        daysInOneCity++;
        finalRoute.push({geoid: currentCity.geoid, day: dayNumber})
        continue;
      }

      for (let city of allCitiesInfo) {
        if (this.isNewCityFits(city, weather, dayNumber - 1, visitedCities)) {
          currentCity = city;
          visitedCities.push(currentCity.geoid);
          daysInOneCity = 1;

          finalRoute.push({geoid: city.geoid, day: dayNumber})
          break;
        }
      }
    }
    return finalRoute;
  }

  isNewCityFits(newCity, weather, dayNumber, visitedCities) {
    return this.isWeatherFits(weather, newCity.weatherPlan[dayNumber])
      && !visitedCities.includes(newCity.geoid);
  }

  isCurrentCityFits(currentCity, weather, dayNumber, daysInOneCity) {
    return this.isWeatherFits(weather, currentCity.weatherPlan[dayNumber])
      && daysInOneCity < this.maxDaysInCity;
  }

  parseAnswer(cityRawData) {
    return {
      geoid: cityRawData['info']['geoid'],
      weatherPlan: cityRawData['forecasts'].map(day =>
        day['parts']['day_short']['condition']
      )
    };
  }

  isWeatherFits(plannedWeather, cityWeather) {
    switch (plannedWeather) {
      case WEATHER.sunny:
        return this.isSunnyWeather(cityWeather);
      case WEATHER.cloudy:
        return this.isCloudyWeather(cityWeather);
      default:
        return false;
    }
  }

  isSunnyWeather(weather) {
    return [WEATHER.clear, WEATHER.partlyCloudy].includes(weather);
  }

  isCloudyWeather(weather) {
    return [WEATHER.cloudy, WEATHER.overcast].includes(weather);
  }

  getWeatherReport(geoid) {
    return fetch(`https://api.weather.yandex.ru/v2/forecast?geoid=${geoid}&hours=false&limit=7`, {
      headers: {
        'X-Yandex-API-Key': API_KEY,
      }
    })
      .then(response => response.json())
      .catch(err => console.log(err));
  }

  addWeatherToPlan(value, daysCount) {
    this.weatherPlan = this.weatherPlan.concat([...Array(daysCount)].map(_ => value));
  }
}

/**
 * Фабрика для получения планировщика маршрута.
 * Принимает на вход список идентификаторов городов, а
 * возвращает планировщик маршрута по данным городам.
 *
 * @param {number[]} geoids Список идентификаторов городов
 * @returns {TripBuilder} Объект планировщика маршрута
 * @see https://yandex.ru/dev/xml/doc/dg/reference/regions-docpage/
 */
function planTrip(geoids) {
  return new TripBuilder(geoids);
}

module.exports = {
  planTrip
};

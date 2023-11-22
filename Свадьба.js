'use strict';

const addFriendToFinalList = (sortedListOfFriends, currentLevel, numberOfCurrentLevel) => {
    const names = new Set();
    currentLevel
        .filter(item => names.has(item.name) ? false : names.add(item.name))
        .forEach(friend => sortedListOfFriends.push({
            friend: friend,
            friendLevel: numberOfCurrentLevel
        }));
};

const friendsReducer = (list, name, allFriends) => {
    allFriends.get(name).friends
        .forEach(friend => list.push(allFriends.get(friend)));

    return list;
};

const getSortedListOfFriends = (friends, filter) => {
    let allFriends = new Map();
    let visitedFriends = new Set();
    let sortedListOfFriends = [];
    friends.forEach(friend => allFriends.set(friend.name, friend));
    let i = 0;
    let currentLevel = friends.filter(friend => friend.best);
    do {
        currentLevel = currentLevel
            .filter(friend => !visitedFriends.has(friend.name))
            .sort((f1, f2) => {
                return f1.name.localeCompare(f2.name);
            });
        if (currentLevel.length === 0) {
            break;
        }
        currentLevel.forEach(x => visitedFriends.add(x.name));
        i += 1;
        addFriendToFinalList(sortedListOfFriends, currentLevel, i);
        currentLevel = currentLevel
            .map(x => x.name)
            .reduce((list, name) => friendsReducer(list, name, allFriends), []);
    }
    while (currentLevel.length !== 0);

    return sortedListOfFriends.filter(friend => filter.isValid(friend.friend));
};

/**
 * Итератор по друзьям
 * @constructor
 * @param {Object[]} friends
 * @param {Filter} filter
 */
function Iterator(friends, filter) {
    let currentLength = 0;
    this.sortedFriends = getSortedListOfFriends(friends, filter);
    this.done = () => currentLength >= this.sortedFriends.length;
    this.next = () => this.done() ? null : this.sortedFriends[currentLength++].friend;
}

/**
 * Итератор по друзям с ограничением по кругу
 * @extends Iterator
 * @constructor
 * @param {Object[]} friends
 * @param {Filter} filter
 * @param {Number} maxLevel – максимальный круг друзей
 */
function LimitedIterator(friends, filter, maxLevel) {
    Iterator.call(this, friends, filter);
    this.sortedFriends = this.sortedFriends.filter(friend => friend.friendLevel <= maxLevel);
}

Object.setPrototypeOf(LimitedIterator.prototype, Iterator.prototype);

/**
 * Фильтр друзей
 * @constructor
 */
function Filter() {
    this.isValid = () => true;
}

/**
 * Фильтр друзей
 * @extends Filter
 * @constructor
 */
function MaleFilter() {
    this.isValid = friend => friend.gender === 'male';
}

Object.setPrototypeOf(MaleFilter.prototype, Filter.prototype);

/**
 * Фильтр друзей-девушек
 * @extends Filter
 * @constructor
 */
function FemaleFilter() {
    this.isValid = friend => friend.gender === 'female';
}

Object.setPrototypeOf(FemaleFilter.prototype, Filter.prototype);

exports.Iterator = Iterator;
exports.LimitedIterator = LimitedIterator;

exports.Filter = Filter;
exports.MaleFilter = MaleFilter;
exports.FemaleFilter = FemaleFilter;

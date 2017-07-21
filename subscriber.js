// Handles all the subscription process
const Database = require('./database')

function Subscriber() {
  this.database = new Database("subscribers")
}

Subscriber.prototype.subscribe_user = function(subscriber_id, callback) {
  // subscribes an user
  this.database.store_data({id: subscriber_id}, callback)
}

Subscriber.prototype.user_is_subscribed = function(subscriber_id, callback) {
  // returns if a user is already subscribed
  this.database.read_data({id: subscriber_id}, callback)
}

Subscriber.prototype.all = function(callback) {
  // returns all subscribers
  this.database.read_data({}, callback)
}

Subscriber.prototype.delete_data = function(query, callback) {
  this.database.delete_data(query, callback)
}

module.exports = Subscriber;
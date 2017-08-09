const Subscriber = require('./models/subscriber')

subs = []
Subscriber.find({}, function(err, subscribers) {
  if (err) throw err;
  console.log(subscribers);
  subscribers.forEach((sub) => {
    sub.remove(function(err) {
      if (err) throw err;
    });
  })
});

ids = [123123, 345345]

ids.forEach((telegram_id) => {
  sub = new Subscriber({telegram_id: telegram_id})
  sub.save((err) => {
    console.log('Created!')
  })
})

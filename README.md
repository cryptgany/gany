# Gany The Bot


Gany is a CryptoCurrency Trading Analysis bot that monitors multiple exchanges and markets 24/7, giving its subscribers notifications when certain conditions happen in a given market.

It's information is not a direct buy or sell signal, it gives detailed information about changes during specific times so traders can analyse them and make wiser decisions about their investments.


### Requirements and installation

##### nvm (Node Version Manager) from creatonix

- https://github.com/creationix/nvm#installation

##### NodeJS (last stable version)

- After installing nvm, type the following so you have the last stable NodeJS.
```sh
$ sudo nvm install node
```

##### MongoDB (last stable version)

- Make sure it runs on boot so you don't need to start it manually by typing:
```sh
$ sudo systemctl enable mongod
```

##### Redis (last stable version)

- Make sure it runs on boot so you don't need to start it manually by typing:
```sh
$ sudo systemctl enable redis
```

##### Automattic/nodejs canvas

- https://github.com/Automattic/node-canvas#installation

##### Telegram Bot

- Go to your Telegram window and talk directly to @BotFather
- After you create your Telegram bot, it will give you an HTTP API, store it.
- Subscribe to @GanyTheBot and type /whatsmyid, store it.

##### Gany The Bot

- Clone this repo:
```sh
$ git clone http://github.com/carlosero/gany
```
- Create the .env file inside /gany/ directory with the following content replacing placeholders respectively so you can assign GanyTheBot:

```sh
GANY_KEY= HTTP_API_KEY_GIVEN_BY_BOTFATHER
PERSONAL_CHANNEL= PERSONAL_ID_GIVEN_BY_/whatsmyid
```

- Save changes with:
```sh
$ npm install
```

- Start GanyTheBot:
```sh
$ npm start
```
FROM node:10

# RUN sed -i '/jessie-updates/d' /etc/apt/sources.list

# RUN apt-get update -qq && apt-get install -y build-essential libpq-dev nodejs

RUN mkdir /gany
WORKDIR /gany

COPY package*.json ./

RUN npm install

COPY . /gany

CMD ["node", "run.js"]

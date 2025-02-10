FROM node:20

USER node

RUN mkdir /home/node/app

WORKDIR /home/node/app

COPY --chown=node:node . .

RUN npm ci

RUN npm run generate-swagger:docker

# CMD ["ls"] 
CMD ["npm", "run", "dev"] 
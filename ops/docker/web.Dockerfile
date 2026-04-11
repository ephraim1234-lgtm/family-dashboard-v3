FROM node:24-alpine
WORKDIR /app

COPY src/frontend/web/package.json ./
COPY src/frontend/web/package-lock.json* ./

RUN npm install

COPY src/frontend/web ./

EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]


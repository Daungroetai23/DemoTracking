FROM node:20-alpine

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy dependency files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies and build Prisma client
RUN npm install
RUN npx prisma generate

# Copy code
COPY . .

EXPOSE 5000

CMD ["npm", "run", "dev"]

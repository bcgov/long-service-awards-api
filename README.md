# Long Service Awards API

[![Lifecycle:Maturing](https://img.shields.io/badge/Lifecycle-Maturing-007EC6)](<http://gov.bc.ca>)

## Description

NodeJS RESTful API used to manage data for the Premier's Awards nomination and table registration data.

## Installation

### Local Development

To deploy locally:

1. Install the following initialized Postgres database using `docker-compose`:
```
version: '3.7'
services:
  postgresql:
    image: 'docker.io/bitnami/postgresql:latest'
    ports:
      - '5432:5432'
    environment:
      POSTGRESQL_USERNAME: lsa
      POSTGRESQL_PASSWORD: password
      POSTGRESQL_DATABASE: lsa_data
      POSTGRESQL_TIMEZONE: US/Pacific
    volumes:
      - ./docker-entrypoint-initdb.d:/docker-entrypoint-initdb.d
      - type: bind
        source: ./backups
        target: /data/backup
```

2. Create the following `.env` file and save it to the API root directory:

```
NODE_ENV=development
DEBUG=true

COOKIE_SECRET=cookie_secret

LSA_APPS_BASE_URL="http://localhost"
LSA_APPS_API_URL="http://localhost:3000"
LSA_APPS_API_PORT="3000"
LSA_APPS_ADMIN_URL="http://localhost:5173"
LSA_APPS_REGISTRATION_URL="http://localhost:3002"

DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=lsa
DATABASE_PASSWORD=password
DATABASE_NAME=lsa_data

SUPER_ADMIN_GUID=1234567abcdef
SUPER_ADMIN_IDIR=test_admin
SUPER_ADMIN_EMAIL=test_admin@gov.bc.ca
SUPER_ADMIN_PASSWORD=password
```
Set the ports to match the client ports deployed.

### Kubernetes Deployment

- TBA
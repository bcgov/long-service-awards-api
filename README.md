# Premier's Awards API

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
  mongodb_container:
    image: mongo
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: root_password
      MONGO_INITDB_DATABASE: premiersawards
    ports:
      - 27017:27017
    volumes:
      - mongodb_data_container:/data/db
volumes:
  mongodb_data_container:
```

2. Create the following `.env` file and save it to the API root directory:

```
NODE_ENV=development
DEBUG=true

COOKIE_SECRET=somesecret

PA_APPS_BASE_URL: "http://localhost"
PA_APPS_API_URL: "http://localhost:3000"
PA_APPS_API_PORT: "3000"
PA_APPS_ADMIN_URL: "http://localhost:3001"
PA_APPS_NOMINATIONS_URL: "http://localhost:3002"
PA_APPS_EVENTS_URL: "http://localhost:3003"

DATABASE_HOST=localhost
DATABASE_PORT=27017
DATABASE_USER=root
DATABASE_PASSWORD=rootpassword
DATABASE_NAME=premiersawards
DATABASE_AUTH=admin

SUPER_ADMIN_GUID=1234567abcdef
SUPER_ADMIN_USER=test_admin
```
Set the ports to match the client ports deployed.

### Kubernetes Deployment

- TBA
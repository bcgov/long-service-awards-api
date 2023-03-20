/// <reference types="cypress" />

const baseURL = 'http://localhost:3000';
const userData = {
    idir: 'test',
    guid: 'abc123',
    first_name: 'TEST',
    last_name: 'USER',
    email: 'test@gov.bc.ca',
    password: 'password',
    roles: ['administrator']
};
let userID;

describe('User Registration', () => {
    it('Registers new administrator user', async () => {
        cy.request(`${baseURL}/users/create`, userData)
            .should((response) => {
                // store userID
                userID = response.id;
                expect(response.status).to.eq(200)
                expect(response.body).to.have.property('length').and.be.oneOf([500, 501])
                expect(response).to.have.property('headers')
                expect(response).to.have.property('duration')
            })
    })
});

describe('User Login', () => {
    it('Log in user', async () => {
        cy.request(`${baseURL}/login`, userData)
            .should((response) => {
                expect(response.status).to.eq(200)
                expect(response.body).to.have.property('length').and.be.oneOf([500, 501])
                expect(response).to.have.property('headers')
                expect(response).to.have.property('duration')
            })
    })
});

describe('User Update', () => {
    it('Updates user record', async () => {
        cy.request(`${baseURL}/users/update`, userData)
            .should((response) => {
                expect(response.status).to.eq(200)
                expect(response.body).to.have.property('length').and.be.oneOf([500, 501])
                expect(response).to.have.property('headers')
                expect(response).to.have.property('duration')
            })
    })
});

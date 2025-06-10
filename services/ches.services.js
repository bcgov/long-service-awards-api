// chesService.js

const axios = require("axios");
const tokenProvider = require("axios-token-interceptor");

class ClientConnection {
  constructor({ tokenUrl, clientId, clientSecret }) {
    // console.log(
    //   "ClientConnection",
    //   `Constructed with ${tokenUrl}, ${clientId}, clientSecret`
    // );
    if (!tokenUrl || !clientId || !clientSecret) {
      log.error("Invalid configuration.", { function: "constructor" });
      throw new Error(
        "ClientConnection is not configured. Check configuration."
      );
    }

    const data = `client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`;
    // intercept axios calls with access token
    this.axios = axios.create();
    this.axios.interceptors.request.use(
      tokenProvider({
        getToken: () =>
          axios({
            method: "POST",
            url: tokenUrl,
            data: data,
            headers: {
              "Content-type": "application/x-www-form-urlencoded",
            },
            withCredentials: true,
          }).then((response) => {
            // Return token here
            return response.data.access_token;
          }),
      })
    );
  }
}

module.exports = ClientConnection;

class ChesService {
  constructor({ tokenUrl, clientId, clientSecret, apiUrl }) {
    console.log(
      "ChesService",
      `Constructed with ${tokenUrl}, ${clientId}, clientSecret, ${apiUrl}`
    );
    if (!tokenUrl || !clientId || !clientSecret || !apiUrl) {
      log.error("Invalid configuration.", { function: "constructor" });
      throw new Error("ChesService is not configured. Check configuration.");
    }
    this.connection = new ClientConnection({
      tokenUrl,
      clientId,
      clientSecret,
    });
    this.axios = this.connection.axios;
    this.apiUrl = `${apiUrl}/api/v1`;
  }

  /**
   * https://ches.api.gov.bc.ca/api/v1/docs#tag/Health/operation/getHealth
   * @returns json
   */
  async healthCheck() {
    try {
      //const token = getJwtToken();
      const { data, status } = await this.axios.get(`${this.apiUrl}/health`, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      return { data, status };
    } catch (e) {
      console.log(e);
    }
  }

  /**
   * https://ches.api.gov.bc.ca/api/v1/docs#tag/Message/operation/GetStatusQuery
   * @param {string <uuid>} txID
   * @returns Array
   */
  async transactionStatus(txID) {
    try {
      const status = await this.axios.get(`${this.apiUrl}/status?txId=${txID}`);
      return status.data[0];
    } catch (error) {
      console.log(error);
    }
    //if (status.data.status === "completed")
    //transactions-queue.deleteFromQueue
  }

  /**
   *  Function to send an email
   *  https://ches.api.gov.bc.ca/api/v1/docs#tag/Email/operation/postEmail
   * @param {object} emailData
   * @returns response from CHES
   */
  async sendEmail(emailData) {
    try {
      const response = await this.axios.post(`${this.apiUrl}/email`, emailData);
      return response; // Assuming the response contains details of the sent email
    } catch (error) {
      console.error("Error sending email", error);
      console.error("Error errors:", error.response.data.errors);
      throw error;
    }
  }
}
let chesService = new ChesService({
  tokenUrl: process.env.CHES_TOKEN_ENDPOINT,
  clientId: process.env.CHES_CLIENT_ID,
  clientSecret: process.env.CHES_CLIENT_SECRET,
  apiUrl: process.env.CHES_ENDPOINT,
});
module.exports = chesService;
